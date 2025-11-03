import { Router } from 'express';

import {
  createChannel,
  deleteChannel,
  editChannel,
  fetchChannel,
  fetchChannels,
} from '../controllers/channelController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();

router.post("/channel", authMiddleware, createChannel);
router.get("/channels/:serverId", fetchChannels);
router.get("/channel/:id", fetchChannel);
router.delete("/channel/:id", deleteChannel);
router.put("/channel/:id", editChannel);

export default router;
