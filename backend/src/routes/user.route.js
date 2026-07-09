import { Router } from "express";
import multer from "multer";
import {
    sendOtp,
    getUserById,
    loginUser,
    logoutUser,
    registerUser,
    userForgetPassword,
    getProfile,
    updateProfile,
    updatePassword,
    getPrivacy,
    updatePrivacy,
    uploadAvatar,
    getLeaderboard,
    awardBrowserXp
} from "../controllers/user.controller.js";
import { getMyActivity } from "../controllers/activity.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { featureGate } from "../middlewares/feature-gate.middleware.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  },
});

router.route("/send-otp").post(sendOtp);
router.route("/register").post(featureGate("signup_enabled"), registerUser);
router.route("/login").post(loginUser);
router.route("/getUserById/:id").get(getUserById);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/forgotPassword").put(userForgetPassword);
router.route("/profile").get(verifyJWT, getProfile);
router.route("/profile").put(verifyJWT, updateProfile);
router.route("/password").put(verifyJWT, updatePassword);
router.route("/privacy").get(verifyJWT, getPrivacy).put(verifyJWT, updatePrivacy);
router.route("/avatar").post(verifyJWT, upload.single("avatar"), uploadAvatar);
router.route("/award-browser-xp").patch(verifyJWT, awardBrowserXp);
router.route("/leaderboard").get(featureGate("leaderboard_public"), getLeaderboard);
router.route("/activity").get(verifyJWT, getMyActivity);

export default router;
