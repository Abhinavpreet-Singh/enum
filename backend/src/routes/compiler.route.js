import express from "express";

import { runCompiler } from "../controllers/compiler.controller.js";

const router = express.Router();

router.post("/run", runCompiler);

export default router;

