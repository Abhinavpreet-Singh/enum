import express from "express";
import { createEditorial, getEditorialByQuestion } from "../controllers/editorial.controller.js";

const router = express.Router();

router.post("/create", createEditorial);
router.get("/:questionId", getEditorialByQuestion);

export default router;
