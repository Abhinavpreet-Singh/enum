import { Router } from "express";
import { getEnabledMaintenancePages } from "../controllers/maintenance.controller.js";

const router = Router();

router.get("/pages", getEnabledMaintenancePages);

export default router;
