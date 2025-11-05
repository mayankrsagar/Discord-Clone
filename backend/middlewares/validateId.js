// middleware/validateId.js
import { isValidObjectId } from '../utils/validateObjectId.js';

export const validateId = (req, res, next) => {
  if (!isValidObjectId(req.params.id))
    return res.status(400).json({ message: "Invalid ID format" });
  next();
};
