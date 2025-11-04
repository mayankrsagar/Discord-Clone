// backend/routes/messageRoutes.js
import { Router } from 'express';

import {
  AddMessage,
  deleteMessage,
  editMessage,
  fetchMessages,
} from '../controllers/messageController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import upload from '../middlewares/multer.js';

const router = Router();

router.post("/message", authMiddleware, upload.single("file"), AddMessage);
router.get(
  "/messages/:channelId",
  authMiddleware /* optional? */,
  fetchMessages
);
router.delete("/message/:id", authMiddleware, deleteMessage);
router.put("/message/:id", authMiddleware, editMessage);

export default router;
