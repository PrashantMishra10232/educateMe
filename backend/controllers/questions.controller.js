import { Question } from "../models/questions.model.js";
import { asyncHandler } from "../utils/AsyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { mongoose } from "mongoose";

const getAllQuestions = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 30,
    query = "",
    sortBy,
    sortType,
    userId,
  } = req.query;

  const queryCondition = query
    ? { content: { $regex: query.toString(), options: "i" } }
    : {};

  if (sortBy === "mine" && userId) {
    queryCondition.asker = new mongoose.Types.ObjectId(userId);
  }

  const sortOptions = {
    upvotes: { upvotes: sortType === "asc" ? 1 : -1 },
    downvotes: { downvotes: sortType === "asc" ? 1 : -1 },
    recent: { createdAt: sortType === "asc" ? 1 : -1 },
    mine: { createdAt: -1 },
  };

  const questions = await Question.aggregate(
    {
      $match: { queryCondition },
    },
    {
      $lookup: {
        from: "users",
        localField: "asker",
        foriegnField: "_id",
        as: "askedBy",
      },
    },
    {
      $unwind: "askedby",
    },
    {
      $sort: sortOptions[sortBy] || { createdAt: -1 },
    },
    {
      $skip: (page - 1) * limit,
    },
    {
      limit: parseInt(limit),
    },
    {
      project: {
        _id: 1,
        "askedBy.fullName": 1,
        content: 1,
        upvotes: 1,
        downvotes: 1,
      },
    }
  );

  if (questions?.length === 0) {
    return res.status(404).json(new ApiResponse(404, {}, "No questions Found"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, { questions }, "All questions"));
});

const getQuestionsById = asyncHandler(async (req, res) => {
  const { questionId } = req.params;

  const question = await Question.findById(questionId).populate("asker");
  if (!question) {
    return res.status(404).json({ message: "No questions found" });
  }

  const replies = await Question.find({ parentQuestion: questionId }).populate(
    "asker"
  );

  return res
    .status(200)
    .json(
      new ApiResponse(200, { question, replies }, "Question and its replies")
    );
});

const addQuestion = asyncHandler(async (req, res) => {
  const { content, upvotes, downvotes, parentQuestion } = req.body;

  if (!content) {
    throw new ApiError(400, "Add a question first");
  }

  if (parentQuestion) {
    const parent = await Question.findById(parentQuestion);
    if (!parent) {
      throw new ApiError(404, "Parent Question/no reply found");
    }
    if (parent.parentQuestion) {
      throw new ApiError(401, "you cannot reply to a reply");
    }
  }

  const newQuestion = await Question.create({
    content,
    upvotes,
    downvotes,
    asker: req.user._id,
    parentQuestion: parentQuestion || null,
  });

  if (!newQuestion) {
    throw new ApiError(500, "can't save your question");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, newQuestion, "Your question added successfully")
    );
});

const deleteQuestion = asyncHandler(async (req, res) => {
  const questionId = req.params.id;
  const question = await Question.findByIdAndDelete(questionId);

  if (!question) {
    throw new ApiError(404, "question not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Your question deleted successfully"));
});

export { getAllQuestions, getQuestionsById, addQuestion, deleteQuestion };
