import {Router} from 'express'
import {registerUser, loginUser, logout, refreshAccessToken, updateProfilePhoto} from '../controllers/user.controller.js'
import {upload} from '../middlewares/multer.middleware.js'
import {verifyJwt} from '../middlewares/auth.middleware.js'

const router = Router();

router.route("/register").post(upload.single('profilePhoto'),registerUser);
router.route("/login").post(loginUser);
router.route('/refreshAccessToken').post(refreshAccessToken);
router.route('/logout').post(verifyJwt,logout);
router.route('/update/photo').patch(verifyJwt,updateProfilePhoto);

export default router;