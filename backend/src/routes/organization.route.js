import { Router } from "express";
import {
  sendOrganizationOtp,
  registerOrganization,
  loginOrganization,
} from "../controllers/organization.controller.js";

const router = Router();

router.route("/send-otp").post(sendOrganizationOtp);
router.route("/register").post(registerOrganization);
router.route("/login").post(loginOrganization);

export default router;
