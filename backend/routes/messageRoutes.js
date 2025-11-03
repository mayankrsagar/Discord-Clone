import { Router } from 'express';

import {
  AddMessage,
  deleteMessage,
  editMessage,
  fetchMessages,
} from '../controllers/messageController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();

router.post("/message", authMiddleware, AddMessage);
router.get("/messages/:channelId", fetchMessages);
router.delete("/message/:id", deleteMessage);
router.put("/message/:id", editMessage);

export default router;
