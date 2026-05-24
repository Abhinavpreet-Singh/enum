import express from "express";
import { judgeCode } from "../controllers/judge.controller.js";

const router = express.Router();

router.post("/run", judgeCode);

export default router;
