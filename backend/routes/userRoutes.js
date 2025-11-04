import { Router } from 'express';

import {
  fetchInviteUsers,
  login,
  register,
  updateProfile,
  userProfile,
} from '../controllers/userController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import upload from '../middlewares/multer.js';

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/profile", authMiddleware, userProfile);
router.get("/invite/users/:serverId", fetchInviteUsers);
router.put("/profile", authMiddleware, upload.single("image"), updateProfile);

export default router;
