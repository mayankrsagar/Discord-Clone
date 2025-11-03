import { Router } from "express";

import {
  createInviteCode,
  createServer,
  deleteServer,
  fetchServer,
  fetchServers,
  leaveServer,
  updateServer,
} from "../controllers/serverController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import upload from "../middlewares/multer.js";

const router = Router();

router.post("/server", authMiddleware, upload.single("image"), createServer);
router.get("/server", authMiddleware, fetchServers);
router.get("/server/:id", fetchServer);
router.put("/server/invite/:id", createInviteCode);
router.delete("/server/:id", deleteServer);
router.put("/server/:id", authMiddleware, upload.single("image"), updateServer);
router.post("/server/leave/:id", authMiddleware, leaveServer);
export default router;
