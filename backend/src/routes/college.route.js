import { Router } from "express";
import { sendCollegeOtp, registerCollege } from "../controllers/college.controller.js";

const router = Router();

router.post("/send-otp", sendCollegeOtp);
router.post("/register", registerCollege);

export default router;
