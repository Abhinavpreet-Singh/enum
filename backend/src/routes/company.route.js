import { Router } from "express";
import {
  sendCompanyOtp,
  registerCompany,
  loginCompany,
} from "../controllers/company.controller.js";

const router = Router();

router.route("/send-otp").post(sendCompanyOtp);
router.route("/register").post(registerCompany);
router.route("/login").post(loginCompany);

export default router;
