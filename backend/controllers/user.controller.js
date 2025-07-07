import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import JsonWebToken from "jsonwebtoken";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/Cloudinary.js";
import { sendEmail } from "../utils/sendEmail.js";
import redis from "../utils/redis.js";
import crypto from "crypto";

const generateAccessAndRefereshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken; // Assign the refresh token to the user object
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

const requestOtp = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const ip = req.ip; //user ip address

  if (!email) {
    throw new ApiError(400, "Email is required");
  }

  const user = await User.findOne({ email });
  if (user) {
    throw new ApiError(400, "User already exists");
  }

  //redis stuff
  const emailKey = `otp_requests:email:${email}`;
  const ipKey = `otp_requests:ip:${ip}`;

  //check for email
  const emailRequests = await redis.get(emailKey);
  if (emailRequests && Number(emailRequests) >= 3) {
    throw new ApiError(
      429,
      "Too many OTP requests for this email. Try again later."
    );
  }

  //check for ip
  const ipRequests = await redis.get(ipKey);
  if (ipRequests && Number(ipRequests) >= 10) {
    throw new ApiError(
      429,
      "Too many requests from your device. Please try again later."
    );
  }

  // increament counts for email
  await redis.incr(emailKey);
  await redis.expire(emailKey, 60 * 60);

  // increament counts for ip
  await redis.incr(ipKey);
  await redis.expire(ipKey, 60 * 60);

  const otp = Math.floor(100000 + Math.random() * 900000);

  //hashing the otp before saving to redis
  const hashedOtp = crypto.createHash("sha256").update(`${otp}`).digest("hex");

  await redis.set(`otp:${email}`, hashedOtp, "EX", 15 * 60);

  //reseting the attempts for every new request for otp
  await redis.del(`otp_attempts:email:${email}`);

  await sendEmail({
    email: email,
    subject: "Your One-Time Password (OTP) for Registration",
    message: `Hello,

    Thank you for registering with us!

    Your One-Time Password (OTP) for completing your registration is:

    OTP: ${otp}

    This OTP is valid for the next 15 minutes. Please do not share it with anyone for security reasons.

    If you did not request this, please ignore this message.

    – The EducateMe Team
    -For any help! contact-prashantmishra10232@gmail.com`,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "OTP sent successfully"));
});

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, password, otp } = req.body;
  // console.log(fullName, email, username, password);

  if ([fullName, email, password, otp].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "all fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ fullName }, { email }],
  });

  const userCounts = await User.countDocuments();
  const role = userCounts === 0 ? "admin" : "student";

  if (existedUser) {
    throw new ApiError(409, "User with email or username already existed");
  }

  const profilePhoto = await uploadOnCloudinary(
    req.file.buffer,
    req.file.originalname
  );

  const profilePhoto_id = profilePhoto.public_id;

  if (!profilePhoto) {
    throw new ApiError(401, "Error while uploading the profile photo");
  }

  const attemptsKey = `otp_attempts:email:${email}`;
  const attempts = await redis.get(attemptsKey);

  if (attempts && Number(attempts) >= 5) {
    throw new ApiError(429, "Too many incorrect attempts. Try later.");
  }

  //fetching the otp from redis
  const hashedOtp = await redis.get(`otp:${email}`);

  if (!hashedOtp) {
    throw new ApiError(400, "OTP expired or not requested");
  }

  //hash the incoming otp to compare it with redis otp
  const incomingOtpHashed = crypto
    .createHash("sha256")
    .update(`${otp}`)
    .digest("hex");

  //now compare them
  if (hashedOtp !== incomingOtpHashed) {
    await redis.incr(attemptsKey); //here i am incrementing the counts of attempts
    await redis.expire(attemptsKey, 60 * 60);
    throw new ApiError(400, "Invalid OTP");
  }

  await redis.del(`otp:${email}`);
  await redis.del(attemptsKey);

  await redis
    .multi()
    .incr(attemptsKey)
    .expire(attemptsKey, 60 * 60)
    .exec();

  const user = await User.create({
    fullName,
    email,
    password,
    profile: {
      profilePhoto: profilePhoto.url,
      profilePhoto_id: profilePhoto_id,
    },
    role,
  });

  const createdUser = await User.findById(user._id).select("-password");

  if (!createdUser) {
    throw new ApiError(500, "something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, user, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    throw new ApiError(404, "All fields are required");
  }

  //check for user in DB
  const user = await User.findOne({
    $or: [{ fullName }, { email }],
  });
  if (!user) {
    throw new ApiError(404, "User does  not exist");
  }

  //check if trhe password is correct
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select("-password");

  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, { ...options, maxAge: 60 * 60 * 1000 })
    .cookie("refreshToken", refreshToken, {
      ...options,
      maxAge: 10 * 24 * 60 * 60 * 1000,
    })
    .json(new ApiResponse(200, loggedInUser, "User loggedIn successfully"));
});

//google OAuth setup here
const googleCallback = asyncHandler(
  async (req, accessToken, refreshToken, profile, done) => {
    const user = await User.findOne({ googleId: profile.id });
    let role = "Student";

    if (req.query.state) {
      try {
        const stateObj = JSON.parse(
          Buffer.from(req.query.state, "base64").toString()
        );
        if (stateObj.role) role = stateObj.role;
      } catch (error) {
        console.error("Failed to parse state param", error);
      }
    }

    if (!user) {
      const imageResponse = await axios.get(profile.photo[0].value, {
        responseType: arrayBuffer,
      });

      const fileName = `${profile.displayName.replace(/\s+/g, "_")}_photo`;

      const profilePhoto = await uploadOnCloudinary(
        imageResponse.data,
        fileName
      );

      user = await User.create({
        googleId: profile.id,
        fullName: profile.displayName,
        email: profile.email[0].value,
        profile: {
          profilePhoto: profilePhoto?.url || "",
          profilePhoto_id: profilePhoto._id,
        },
      });

      done(null, user);
    }
  }
);

const handleLoginSuccess = asyncHandler(async () => {
  const user = req.user;

  const { accessToken, refreshToken } = await generateAccessAndRefereshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select("-password");

  const encodedUser = Buffer.from(JSON.stringify(loggedInUser)).toString(
    "base64"
  );

  const options = {
    httpOnly: true,
    secure: true,
    sameSite: none,
  };

  const redirectUrl = `${process.env.CLIENT_URL}/login/success?accessToken=${accessToken}&user=${encodedUser}`;

  return res
    .status(200)
    .cookie("accessToken", accessToken, { options, maxAge: 60 * 60 * 1000 })
    .cookie("refreshToken", refreshToken, {
      options,
      maxAge: 10 * 24 * 60 * 60 * 1000,
    })
    .redirect(redirectUrl);
});

const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    //verify the token
    const decodedToken = JsonWebToken.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    //get the user
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "'Invalid refresh token");
    }

    //verify both the tokens
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "refresh token is expired or used");
    }

    //generate new tokens
    const { accessToken, refreshToken: newRefreshToken } =
      generateAccessAndRefereshTokens(user._id);

    const options = {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, { options, maxAge: 60 * 60 * 1000 })
      .cookie("refreshToken", newRefreshToken, {
        options,
        maxAge: 10 * 24 * 60 * 60 * 1000,
      })
      .json(new ApiResponse(200, { accessToken }, "Access Token refreshed"));
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const updateProfilePhoto = asyncHandler(async (req, res) => {
  // Check if the user has an existing profile photo ID (only delete if it exists)
  if (User.profilePhoto_id) {
    try {
      await deleteFromCloudinary(User.profilePhoto_id, "image"); // Delete the previous profile photo from Cloudinary
    } catch (error) {
      throw new ApiError(500, "Error while deleting previous profile photo");
    }
  }

  const profilePhoto = await uploadOnCloudinary(
    req.file.buffer,
    req.file.originalname
  );
  const profilePhoto_id = profilePhoto.public_id;

  if (!profilePhoto) {
    throw new ApiError(400, "Error while uploading profile photo");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        "profile.profilePhoto": profilePhoto.url,
        "profile.profilePhoto_id": profilePhoto_id,
      },
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Profile Photo Updated successfully"));
});

const requestResetCode = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    throw new ApiError(404, "Enter the email first");
  }

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");
  const code = await user.generateResetPasswordToken();

  //saving the code to DB
  user.resetPasswordToken = code;
  await user.save({ validateBeforeSave: false });

  const options = {
    email: email,
    subject: "Code for password reset",
    message: `Here is your code to reset your password ${code}, Do not share it with anyone. The code is only valid for 15 minutes`,
  };
  await sendEmail(options);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const resetPassword = asyncHandler(async (req, res) => {
  const { email, resetCode, password } = req.body;

  if (!email || !password || !resetCode) {
    throw new ApiError(404, "All fields are required");
  }

  const user = await User.findOne({ email });
  if (!user) throw new ApiError(404, "User not found");

  //hash the code to comapre it
  const hashedCode = crypto.hash("sha256").update(resetCode).digest("hex"); //.digest finalize the hashing and return it in hexadecimal format as i am usind 'hex' can use different formats

  if (
    hashedCode !== user.resetPasswordToken ||
    Date.now() > user.resetPasswordTokenExpiry
  ) {
    throw new ApiError(400, "Invalid or expired reset code");
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordTokenExpiry = undefined;

  await user.save().select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password reset successfully"));
});

export {
  generateAccessAndRefereshTokens,
  requestOtp,
  registerUser,
  loginUser,
  logout,
  refreshAccessToken,
  updateProfilePhoto,
  requestResetCode,
  resetPassword,
  googleCallback,
  handleLoginSuccess
};
