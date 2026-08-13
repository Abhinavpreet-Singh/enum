import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getStatus,
  getById,
  join,
  leave,
  create,
  match,
} from "../controllers/competition.controller.js";

const router = express.Router();

router.get("/status/:questionId", verifyJWT, getStatus);
router.get("/:competitionId", verifyJWT, getById);
router.post("/join", verifyJWT, join);
router.post("/leave", verifyJWT, leave);
router.post("/create", verifyJWT, create);
router.post("/quick-match", verifyJWT, match);

export default router;
