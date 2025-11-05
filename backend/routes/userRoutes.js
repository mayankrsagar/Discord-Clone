// backend/routes/userRoutes.js
import { Router } from 'express';

import {
  fetchInviteUsers,
  getUserById,
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
router.put("/profile", authMiddleware, upload.single("image"), updateProfile);
router.get("/profile", authMiddleware, userProfile);
router.get("/invite/users/:serverId", authMiddleware, fetchInviteUsers);

// NEW: public user lookup by id
router.get("/user/:id", authMiddleware, getUserById);

export default router;
