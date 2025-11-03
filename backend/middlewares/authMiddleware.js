import jwt from 'jsonwebtoken';

const fetchUser = (req, res, next) => {
  const token = req.cookies.discordToken; // ✅ Read from cookie

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Please log in to access this resource.",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // ✅ Attach user info to request
    next();
  } catch (err) {
    return res.status(403).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

export default fetchUser;
