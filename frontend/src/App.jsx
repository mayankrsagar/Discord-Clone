import {
  lazy,
  Suspense,
} from "react";

import { Toaster } from "react-hot-toast";
import {
  Route,
  Routes,
} from "react-router-dom";

import Loader from "./components/Loader";
import ProtectedRoute from "./ProtectedRoutes";

// Lazy load components
const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Channel = lazy(() => import("./pages/Channel"));

const App = () => {
  return (
    <>
      <Suspense fallback={<Loader />}>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
          <Route
            path="/channel/:id"
            element={
              <ProtectedRoute>
                <Channel />
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </Suspense>
      <Toaster reverseOrder={false} position="top-center" />
    </>
  );
};

export default App;
