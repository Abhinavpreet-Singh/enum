import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { getStatus, join, leave, match } from "../controllers/competition.controller.js";

const router = express.Router();

router.get("/status/:questionId", verifyJWT, getStatus);
router.post("/join", verifyJWT, join);
router.post("/leave", verifyJWT, leave);
router.post("/quick-match", verifyJWT, match);

export default router;
