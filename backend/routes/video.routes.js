import { Router } from "express";
import {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
} from "../controllers/video.controller.js";
import { verifyJwt } from "../middlewares/auth.middleware.js";
import {upload} from '../middlewares/multer.middleware.js'

const router = Router();

router.route("/get/allVideos").get(verifyJwt,getAllVideos);
router.route("/publishVideo/:id").post(
  verifyJwt,
  upload.fields([
    { name: "video", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  publishAVideo
);
router.route('/getVideo/:id').get(verifyJwt,getVideoById);
router.route('/updateVideo/:id').patch(verifyJwt,upload.single('thumbnail'),updateVideo);
router.route('/deleteVideo/:id').delete(verifyJwt,deleteVideo);


export default router;