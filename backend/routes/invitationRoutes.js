// backend/routes/invitationRoutes.js
import { Router } from 'express';

import {
  acceptInvitation,
  addInvitation,
  cancelInvitation,
  fetchInvitations,
  fetchInviteUsers,
} from '../controllers/invitationController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();

// create invite (inviter determined from req.user via authMiddleware)
router.post("/invite", authMiddleware, addInvitation);

// search users to invite (serverId in params)
router.get("/invite/users/:serverId", authMiddleware, fetchInviteUsers);

// cancel invite (inviter or receiver)
router.delete("/invite/:id", authMiddleware, cancelInvitation);

// accept invite (receiver)
router.put("/invite/:id", authMiddleware, acceptInvitation);

// fetch invites for current user
router.get("/invite", authMiddleware, fetchInvitations);

export default router;
