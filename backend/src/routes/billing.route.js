import express from "express";
import {
  createBillingOrder,
  getBillingProducts,
  getMyBillingAccess,
  handleRazorpayWebhook,
  verifyBillingPayment,
} from "../controllers/billing.controller.js";
import { optionalAuth, verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/products", optionalAuth, getBillingProducts);
router.get("/me", verifyJWT, getMyBillingAccess);
router.post("/orders", verifyJWT, createBillingOrder);
router.post("/verify", verifyJWT, verifyBillingPayment);
router.post("/webhook", handleRazorpayWebhook);

export default router;
