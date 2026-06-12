import { Router } from "express";
import {
  sendOrganizationOtp,
  registerOrganization,
  loginOrganization,
} from "../controllers/organization.controller.js";
import { featureGate } from "../middlewares/feature-gate.middleware.js";

const router = Router();

router.route("/send-otp").post(sendOrganizationOtp);
router.route("/register").post(featureGate("org_self_register"), registerOrganization);
router.route("/login").post(loginOrganization);

export default router;
