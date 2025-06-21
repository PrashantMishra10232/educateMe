import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const videoSchema = new Schema({
    video: {
        videoFile:{
            type:String,
            required:true
        },
        videoFileId:{
            type:String,
            default:''
        }
    },
    thumbnail: {
        thumbnailFile:{
            type:String,
            required:true
        },
        thumbnailFileId:{
            type:String,
            default:''
        }
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String, 
        required: true
    },
    duration: {
        type: Number, 
        // required: true
    },
    views: {
        type: Number,
        default: 0
    },
    lectureNumber:{
        type: Number, 
        required: true
    },
    isPublished: {
        type: Boolean,
        default: true
    },
    owner:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    courseId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Course'
    }
},
{
    timestamps: true
})

videoSchema.plugin(mongooseAggregatePaginate)
export const Video = mongoose.model("Video",videoSchema)