import mongoose from "mongoose"

const courseSchema = new mongoose.Schema({
    title:{
        type:String,
        required:true,
    },
    coverImage:{
        coverImageFile:{
            type:String,
            required:true
        },
        coverImageFileId:{
            type:String,
            required:true
        }
    },
    videos:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Video",
    }],
    subscribers:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User"
    }],
    price: {
      type: Number,
      required: [true, "Please Enter product Price"],
      maxLength: [8, "Price cannot exceed 8 characters"],
    },
    createdBy:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    }
},{timestamps:true})

export const Course = new mongoose.model("Course",courseSchema)