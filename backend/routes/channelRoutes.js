// backend/routes/channelRoutes.js
import { Router } from 'express';

import {
  createChannel,
  deleteChannel,
  editChannel,
  fetchChannel,
  fetchChannels,
  leaveChannel,
} from '../controllers/channelController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();

router.post("/channel", authMiddleware, createChannel);
router.get("/channels/:serverId", authMiddleware, fetchChannels);
router.get("/channel/:id", authMiddleware, fetchChannel);
router.delete("/channel/:id", authMiddleware, deleteChannel);
router.put("/channel/:id", authMiddleware, editChannel);
// NEW: leave channel
router.post("/channel/:id/leave", authMiddleware, leaveChannel);

export default router;
