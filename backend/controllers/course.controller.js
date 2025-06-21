import { Course } from "../models/course.model.js";
import { Video } from "../models/video.model.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/Cloudinary.js";

const getAllCourses = asyncHandler(async (req, res) => {
  const keyword = req.query.keyword || "";

  const query = { title: { $regex: keyword, $options: "i" } };
  const courses = await Course.find(query).sort({ createdAt: -1 });
  if (courses.length === 0) {
    throw new ApiError(404, "No courses found");
  }
  return res.status(200).json(new ApiResponse(200, courses, "All Courses"));
});

const getCourseById = asyncHandler(async (req, res) => {
  const courseId = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    throw new ApiError(400, "Invalid Course ID");
  }

  const course = await Course.findById(courseId)
    .populate("videos")
    .populate("createdBy", "fullName")
    .populate("subscribers", "fullName email");

  if (!course) {
    throw new ApiError(404, "No such course found");
  }

  return res.status(200).json(new ApiResponse(200, course, "course"));
});

const setupCourse = asyncHandler(async (req, res) => {
  const { title, price } = req.body;

  if (!title || !price) {
    throw new ApiError(404, "All fields are required");
  }

  const coverImageFile = await uploadOnCloudinary(
    req.file.buffer,
    req.file.originalname
  );
  const coverImageFileId = coverImageFile.public_id;

  if (!coverImageFile) {
    throw new ApiError(401, "error uploading cover image");
  }

  const course = await Course.create({
    title,
    price,
    coverImage: {
      coverImageFile: coverImageFile.url,
      coverImageFileId: coverImageFileId,
    },
    createdBy: req.user?._id,
  });

  if (!course) {
    throw new ApiError(401, " error creating a course");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, course, "Course created successfully"));
});

const deleteCourse = asyncHandler(async (req, res) => {
  const courseId = req.params.id;
  try {
    const course = await Course.findById(courseId);
    if (!course) {
      throw new ApiError(404, "No course found");
    }

    const videos = await Video.find({ courseId: courseId });
    for (const video of videos) {
      if (video.video.videoFileId) {
        await deleteFromCloudinary(videoFileId);
      }

      if (video.thumbnail.thumbnailFileId) {
        await deleteFromCloudinary(thumbnailFileId);
      }
    }

    if (course.coverImage.coverImageFileId) {
      deleteFromCloudinary(coverImageFileId);
    }

    await Course.findByIdAndDelete(courseId);

    return res
      .status(200)
      .json(new ApiResponse(200, {}, "Course deleted successfully"));
  } catch (error) {
    console.error("Error deleting course", error);
    return res
      .status(500)
      .json(new ApiResponse(500, {}, "Failed to delete course"));
  }
});

export { getAllCourses, setupCourse, getCourseById, deleteCourse };
