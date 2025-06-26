import {Router} from 'express';
import {getAllCourses, setupCourse, getCourseById, deleteCourse} from "../controllers/course.controller.js"
import {upload} from "../middlewares/multer.middleware.js"
import {verifyJwt} from "../middlewares/auth.middleware.js"

const router = Router();
router.route('/getAllCourses').get(verifyJwt,getAllCourses);
router.route('/getCourse/:id').get(verifyJwt,getCourseById);
router.route('/setupCourse').post(verifyJwt,upload.single('coverImage'),setupCourse);
router.route('/deleteCourse/:id').delete(verifyJwt,deleteCourse)

export default router;