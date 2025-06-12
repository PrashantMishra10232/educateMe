import {asyncHandler} from "../utils/AsyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {Course} from "../models/course.model.js"
import Razorpay from "razorpay"

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_API_KEY,
    key_secret: process.env.RAZORPAY_SECRET_KEY
})

const processPayment = asyncHandler(async(req,res)=>{
    const courseId = req.params.id;
    const course = await Course.findById(courseId)

    if(!course){
        throw new ApiError(404,"No course found")
    }

    if(!course.price){
        throw new ApiError(400,"Course price is missing")
    }

    const options={
        amount: course.price*100, //for conversion to paise
        currency: 'INR',
        receipt: `reciept_${courseId}`,
        payment_capture: 1, //will auto capture payment
    }
    try {
        const razorpayOrder = await razorpay.orders.create(options);
        return res.status(200).json(new ApiResponse(200,razorpayOrder,"Payment API"));

    } catch (error) {
        throw new ApiError(500,"Error creating razorpay order", error)
    }
})

const verifyPayment = asyncHandler(async(req,res)=>{
    const {razorpay_order_id, razorpay_payment_id, razorpay_signature}= req.body;

    const body = razorpay_order_id + '|' + razorpay_payment_id //required format to recreate the signature

    const expectedSignature = crypto
    .createHmac('sha256',process.env.RAZORPAY_SECRET_KEY)
    .update(body.toString())
    .digest('hex');

    if(expectedSignature === razorpay_signature){
        res.json({success: true, message: 'Payment verified successfully'});
    }
    else{
        res.status(400).json({success:false, message: 'Invalid signature'});
    }
})

const sendRazorpayApiKey = asyncHandler(async(req,res)=>{
    return res.status(200)
    .json(new ApiResponse(200,{razorpayApiKey: process.env.RAZORPAY_API_KEY}))
})

export{processPayment, sendRazorpayApiKey, verifyPayment}

