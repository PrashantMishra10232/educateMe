import mongoose, {Schema}  from "mongoose";
import JsonWebToken from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto"

const userSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        trim: true,
        index: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    role:{
        type:String,
        enum:['student','admin'],
        default:'student',
        required:true
    },
    profile: {
        profilePhoto:{
            type:String,
            default:""
        },
        profilePhoto_id:{
            type:String,
            default:""
        }
    },
    password: {
        type: String,
        required: [true,'Password is required']
    },
    subscribedCourses:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Course'
    },
    refreshToken:{
        type: String
    },
    resetPasswordToken:String,
    resetPasswordTokenExpiry:Date,
},
{
    timestamps: true,
})

userSchema.pre("save",async function (next){
    if(!this.isModified("password")) return next();
    this.password = await bcrypt.hash(this.password, 10)
    next();
})

userSchema.methods.isPasswordCorrect = async function(password){
    return await bcrypt.compare(password, this.password)
}

userSchema.methods.generateResetPasswordToken = async function(){
    //generate the token
    const resetToken = crypto.randomBytes(20).toString('hex')

    //hashing and adding resetpasswordtoken to userSchema
    this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex')

    this.resetPasswordTokenExpiry = Date.now() + 15*60*1000;

    return resetToken;
}

userSchema.methods.generateAccessToken = function(){
    return JsonWebToken.sign(
        {
            _id: this.id,
            email: this.email,
            fullName: this.fullName,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
    
userSchema.methods.generateRefreshToken = function(){
    return JsonWebToken.sign(
        {
            _id: this.id,
            
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User = mongoose.model("User",userSchema)