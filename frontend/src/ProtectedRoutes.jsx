import {
  useEffect,
  useState,
} from "react";

import axios from "axios";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

import host from "./host";

// eslint-disable-next-line react/prop-types
const ProtectedRoute = ({ children }) => {
  const navigate = useNavigate();
  const [isAuthChecked, setIsAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        await axios.get(`${host}/profile`, {
          withCredentials: true, // ✅ sends cookie to backend
        });
        setIsAuthenticated(true); // ✅ user is logged in
      } catch (err) {
        toast.error(err.response.data.message, { duration: 3000 });
        navigate("/login", { replace: true }); // 🚪 redirect guest
      } finally {
        setIsAuthChecked(true); // ✅ auth check complete
      }
    };

    verifyAuth();
  }, [navigate]);

  if (!isAuthChecked) return null; // ⏳ optionally show a loader

  return isAuthenticated ? <>{children}</> : null;
};

export default ProtectedRoute;
