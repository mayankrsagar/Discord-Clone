import { Router } from 'express';

import {
  acceptInvitation,
  addInvitation,
  cancelInvitation,
  fetchInvitations,
} from '../controllers/invitationController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();

router.post("/invite", addInvitation);
router.delete("/invite/:id", cancelInvitation);
router.put("/invite/:id", acceptInvitation);
router.get("/invite", authMiddleware, fetchInvitations);

export default router;
