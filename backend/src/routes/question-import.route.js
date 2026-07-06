import { Router } from "express";
import { verifyJWT, requireRole, requireApproved } from "../middlewares/auth.middleware.js";
import {
  getPlatformCatalog,
  importPlatformQuestions,
  seedSampleBanks,
} from "../controllers/question-import.controller.js";

const router = Router();

const guard = [verifyJWT, requireRole("organization"), requireApproved];

router.get("/catalog/platform", ...guard, getPlatformCatalog);
router.post("/seed-samples", ...guard, seedSampleBanks);
router.post("/:bankId/import", ...guard, importPlatformQuestions);

export default router;
