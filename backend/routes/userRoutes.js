import { Router } from 'express';

import {
  fetchInviteUsers,
  login,
  register,
  userProfile,
} from '../controllers/userController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/profile", authMiddleware, userProfile);
router.get("/invite/users/:serverId", fetchInviteUsers);

export default router;
