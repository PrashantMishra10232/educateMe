import mongoose from "mongoose";
import {
  uploadOnCloudinary,
  deleteFromCloudinary,
} from "../utils/Cloudinary.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Video } from "../models/video.model.js";
import { Course } from "../models/course.model.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query = "",
    sortBy,
    sortType,
    userId,
  } = req.query;

  const queryCondition = query
    ? {
        $or: [
          { title: { $regex: query.toString(), $options: "i" } },
          { description: { $regex: query.toString(), $options: "i" } },
        ],
      }
    : {};

  const videos = await Video.aggregate([
    {
      $match: {
        $and: [
          queryCondition,
          ...(userId ? [{ owner: new mongoose.Types.ObjectId(userId) }] : []),
        ],
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "createdBy",
      },
    },
    {
      $unwind: "createdBy",
    },
    {
      $sort: {
        [sortBy]: sortType === "asc" ? 1 : -1,
      },
    },
    {
      $skip: (page - 1) * limit,
    },
    {
      $limit: parseInt(limit),
    },
    {
      $project: {
        _id: 1,
        thumbnail: 1,
        title: 1,
        description: 1,
        "createdBy.fullName": 1,
        createdAt: 1,
      },
    },
  ]);

  if (videos?.length === 0) {
    return res.status(404).json(new ApiResponse(404, {}, "No Videos Found"));
  }

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { videos },
        "here are all your videos related to your query"
      )
    );
});

const publishAVideo = asyncHandler(async (req, res) => {
  const courseId = req.params.id;
  const course = await Course.findById(courseId);
  let lectureNumber = req.body.lectureNumber;
  if (!lectureNumber) {
    lectureNumber = course.videos.length + 1;
  }

  const { title, description } = req.body;

  if ([title, description].some((field) => field?.trim() === "")) {
    throw new ApiError(404, "Title and Description both are required");
  }

  // Validate file presence
  if (!req.files?.video?.[0] || !req.files?.thumbnail?.[0]) {
    throw new ApiError(400, "Both video and thumbnail files are required");
  }

  const videoFile = await uploadOnCloudinary(
    req.files.video[0].buffer,
    req.files.video[0].originalname
  );

  const videoFileId = videoFile.public_id;

  if (!videoFile) {
    throw new ApiError(404, "Error while uploading the video");
  }

  const thumbnailFile = await uploadOnCloudinary(
    req.files?.thumbnail[0].buffer,
    req.files?.thumbnail[0].originalname
  );

  const thumbnailFileId = thumbnailFile.public_id;

  if (!thumbnailFileId) {
    throw new ApiError(404, "Error while uploading the thumbnail");
  }

  const publishedVideo = await Video.create({
    video: {
      videoFile: videoFile?.url || "",
      videoFileId: videoFileId,
    },
    thumbnail: {
      thumbnailFile: thumbnailFile?.url || "",
      thumbnailFileId: thumbnailFileId,
    },
    title,
    description,
    lectureNumber,
    duration: videoFile.duration,
    owner: req.user?._id,
    courseId: courseId,
  });

  if (!publishedVideo) {
    throw new ApiError(500, "Something went wrong on our side");
  }

  await Course.findByIdAndUpdate(courseId, {
    $push: { videos: publishedVideo._id },
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        publishedVideo,
        "Your video and Thumbnail uploaded successfully"
      )
    );
});

const getVideoById = asyncHandler(async (req, res) => {
  const videoId  = req.params.id;

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, video, "your requested video is here"));
});

const updateVideo = asyncHandler(async (req, res) => {
  const videoId = req.params.id;
  const { title, description, lectureNumber } = req.body;

  if (!(title || description || req.file)) {
    throw new ApiError(404, "Selected field is required");
  }

  const updatedFields = {};

  if (title) updatedFields.title = title;
  if (description) updatedFields.description = description;
  if (lectureNumber) updatedFields.lectureNumber = lectureNumber;

  if (req.file) {
    const newThumbnailFile = await uploadOnCloudinary(
      req.file.buffer,
      req.file.originalname
    );

    const newThumbnailFileId = newThumbnailFile.public_id;

    if (!newThumbnailFile) {
      throw new ApiError(401, "Error uploading thumbnail");
    }

    updatedFields.thumbnail = {
      thumbnailFile: newThumbnailFile.url,
      thumbnailFileId: newThumbnailFileId,
    };
  }

  const updatedVideo = await Video.findByIdAndUpdate(
    videoId,
    {
      $set: updatedFields,
    },
    {
      new: true,
    }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedVideo, "Your video details got updated"));
});

const deleteVideo = asyncHandler(async (req, res) => {
  const videoId = req.params.id;
  const videoDoc = await Video.findById(videoId);

  if (videoDoc.video?.videoFileId && videoDoc.thumbnail?.thumbnailFileId) {
    await deleteFromCloudinary(videoDoc.video?.videoFileId, "video");
    await deleteFromCloudinary(videoDoc.thumbnail?.thumbnailFileId, "image");
  }

  await Video.findByIdAndDelete(videoId);

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

export { getAllVideos, publishAVideo, getVideoById, updateVideo, deleteVideo };
