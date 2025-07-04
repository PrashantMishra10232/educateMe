import {Router} from 'express';
import {processPayment, sendRazorpayApiKey, verifyPayment} from "../controllers/razorpay.controller.js";
import {verifyJwt} from "../middlewares/auth.middleware.js";

const router = Router();

router.route('/processPayment').post(verifyJwt,processPayment);
router.route('/verifyPayment').post(verifyJwt,verifyPayment);
router.route('/sendingRazorpayAPiKey').post(verifyJwt,sendRazorpayApiKey);


export default router;