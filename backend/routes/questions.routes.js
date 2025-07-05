import {Router} from "express";
import {getAllQuestions, getQuestionsById, addQuestion, deleteQuestion} from "../controllers/questions.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";


const router = Router();

router.route('/getAllQuestions').get(verifyJwt,getAllQuestions);
router.route('getQuestion/:id').get(verifyJwt,getQuestionsById);
router.route('addQuestion').post(verifyJwt,addQuestion);
router.route('deleteQuestion').delete(verifyJwt,deleteQuestion);


export default router;