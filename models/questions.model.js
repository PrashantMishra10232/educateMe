import mongoose, {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const questionSchema = new Schema(
    {
        content: {
            type: String,
            required: true
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: "User"
        },
        upvotes:{
            type:Number,
            default:0
        },
        downvotes:{
            type:Number,
            default:0
        },
        asker: {
            type:mongoose.Schema.Types.ObjectId,
            ref:'User'
        },
        parentQuestion:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'Questions',
            default:null
        }
    },
    {
        timestamps: true
    }
)

questionSchema.plugin(mongooseAggregatePaginate)

export const Question = mongoose.model("Question",questionSchema)