import {Router} from 'express'
import {requestOtp, registerUser, loginUser, logout, refreshAccessToken, updateProfilePhoto, handleLoginSuccess} from '../controllers/user.controller.js'
import {upload} from '../middlewares/multer.middleware.js'
import {verifyJwt} from '../middlewares/auth.middleware.js'

const router = Router();

router.route("/requestOtp").get(requestOtp)
router.route("/register").post(upload.single('profilePhoto'),registerUser);
router.route("/login").post(loginUser);
router.route('/refreshAccessToken').post(refreshAccessToken);
router.route('/logout').post(verifyJwt,logout);
router.route('/update/photo').patch(verifyJwt,updateProfilePhoto);

//OAuth route
router.get("/auth/google", (req, res, next) => {
    const { role } = req.query;
    const state = Buffer.from(JSON.stringify({ role })).toString("base64");
  
    passport.authenticate("google", {
      scope: ["profile", "email"],
      state,
    })(req, res, next);
  });  
router.route("/auth/google/callback").get(passport.authenticate("google",{session: false, failureRedirect:"/login"}),
handleLoginSuccess
);

export default router;