import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";

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
