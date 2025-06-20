import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { User } from "../models/user.model.js";
import JsonWebToken from "jsonwebtoken";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/Cloudinary.js";

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

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, password } = req.body;
  // console.log(fullName, email, username, password);

  if ([fullName, email, password].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "all fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ fullName }, { email }],
  });

  const userCounts = await User.countDocuments();
  const role = userCounts === 0 ? 'admin' : 'student'

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
  const isPasswordValid = await User.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid user credentials");
  }

  const { accessToken, refreshToken } = generateAccessAndRefereshTokens(
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
    .cookie("accessToken", accessToken, { options, maxAge: 60 * 60 * 1000 })
    .cookie("refreshToken", refreshToken, {
      options,
      maxAge: 10 * 24 * 60 * 60 * 1000,
    })
    .json(new ApiResponse(200, loggedInUser, "User loggedIn successfully"));
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
      await deleteFromCloudinary(User.profilePhoto_id); // Delete the previous profile photo from Cloudinary
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

export { generateAccessAndRefereshTokens, registerUser, loginUser, logout, refreshAccessToken, updateProfilePhoto };
