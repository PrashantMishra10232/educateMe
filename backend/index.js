import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import passport from "passport";
import GoogleStrategy from "passport-google-oauth20";
import { googleCallback } from "./controllers/user.controller.js";
import bodyParser from "body-parser";
import axios from "axios";
import {verifyJwt} from "./middlewares/auth.middleware.js"

//configurations
const app = express();
dotenv.config({
  path: "./.env",
});
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "16mb" }));
app.use(
  express.urlencoded({
    extended: true,
  })
);
console.log("Allowed CORS Origin:", process.env.CORS_ORIGIN);

//config passport js
app.use(passport.initialize());
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      passReqToCallback: true,
    },
    googleCallback
  )
);

//mongoDb connect
const connectDB = async () => {
  try {
    const connectionInstance = await mongoose.connect(
      `${process.env.MONGODB_URI}`
    );
    console.log(
      `\n Mongodb connected !! DB Host: ${connectionInstance.connection.host}`
    );
  } catch (error) {
    console.log(("MongoDB connection error", error));
    process.exit(1);
  }
};

connectDB().then(() => {
  app.on("error", (error) => {
    console.log("Error:", error);
    throw error;
  });
  app.listen(process.env.PORT || 8000, () => {
    console.log(`server is running at ${process.env.PORT}`);
  });
});

//route declaration
import userRouter from "./routes/user.routes.js";
import videoRouter from "./routes/video.routes.js";
import razorpayRouter from "./routes/razorpay.routes.js";
import questionRouter from "./routes/questions.routes.js";
import courseRouter from "./routes/course.routes.js";

app.use("/api/v1/user", userRouter);
app.use("/api/v1/course", courseRouter);
app.use("/api/v1/question", questionRouter);
app.use("/api/v1/course/video", videoRouter);
app.use("/api/v1/course/payment", razorpayRouter);

//Quz generator - using together.ai and model = Mistral 7B instruct
app.use(bodyParser.json());

app.post("/api/v1/generate/quiz",verifyJwt, async (req, res) => {
  const { topic, numQuestions, difficulty } = req.body;

  //prompt
  const prompt = `
  Generate ${numQuestions} multiple choice quiz questions on the topic "${topic}".
  Difficulty level: ${difficulty}.

  for each question, provide:
  -The Question
  -Four answer choices labeled A, B, C, D
  -The correct answer letter
  -Aplanation why it's correct.

  Return ONLY raw JSON, no markdown code fences, no extra text.
  Format like:
  [
  {
    "question": "...",
    "options": ["A...", "B...", "C...", "D..."],
    "answer": "B",
    "explanation": "..."
  },
    ...
  ] 
  `;

  try {
    const response = await axios.post("https://api.together.xyz/v1/chat/completions",
      {
        model: "mistralai/Mistral-7B-Instruct-v0.1",
        messages:[
          {
            role: "system",
            content: "You are an AI quiz generator for students."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1024
      },
      {
        headers:{
          Authorization: `Bearer ${process.env.TOGETHER_API_KEY}`,
          "Content-Type": "application/json"
        }
      }
    );

    //the output 
    const rawText = response.data.choices[0].message.content;

    let quiz;
    try {
     quiz = JSON.parse(rawText)
    } catch (err) {
      console.error("Failed to parse JSON from Together.ai:", err);
      return res.status(500).json({
        error: "AI returned text that couldn't be parsed as JSON.",
        rawResponse: rawText
      });
    }

    res.json({quiz});
  
  } catch (error) {
    console.error("Together.ai error:", error.response?.data || error.message);
    res.status(500).json({
      error: "Something went wrong while calling Together.ai."
    });
  }
});
