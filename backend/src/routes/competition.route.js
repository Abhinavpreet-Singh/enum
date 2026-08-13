import express from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import {
  getStatus,
  getById,
  join,
  leave,
  start,
  end,
  create,
  match,
} from "../controllers/competition.controller.js";

const router = express.Router();

router.get("/status/:questionId", verifyJWT, getStatus);
router.post("/join", verifyJWT, join);
router.post("/leave", verifyJWT, leave);
router.post("/start", verifyJWT, start);
router.post("/end", verifyJWT, end);
router.post("/create", verifyJWT, create);
router.post("/quick-match", verifyJWT, match);
router.get("/:competitionId", verifyJWT, getById);

export default router;
