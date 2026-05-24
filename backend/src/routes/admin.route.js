import Router from "express"
import {adminPostQuestion, adminEditQuestion, adminDeleteQuestion, getAdminPrivilege } from "../controllers/admin.controllers.js";

const router = Router();

router.route("/getAdminPrev").get(getAdminPrivilege)
router.route("/adminPostQuestion").post(adminPostQuestion)
router.route("/editQuestion/:id").put(adminEditQuestion);
router.route("/deleteQuestion/:id").delete(adminDeleteQuestion);

export default router;
