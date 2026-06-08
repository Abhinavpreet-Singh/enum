import { Router } from "express";
import { verifyJWT, requireRole, requireApproved } from "../middlewares/auth.middleware.js";
import { sendInvites, getInvites, revokeInvite } from "../controllers/assessment-invite.controller.js";

const router = Router();

const guard = [verifyJWT, requireRole("organization"), requireApproved];

router.post("/:assessmentId/invites", ...guard, sendInvites);
router.get("/:assessmentId/invites", ...guard, getInvites);
router.delete("/:assessmentId/invites/:inviteId", ...guard, revokeInvite);

export default router;
