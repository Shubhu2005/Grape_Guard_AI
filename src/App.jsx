import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import FarmerDashboard from "./pages/FarmerDashboard";
import ExpertDashboard from "./pages/ExpertDashboard";
import TeamBuyConfirmation from "./pages/TeamBuyConfirmation";
import NotFound from "./pages/NotFound.jsx";
import { useEffect, useState } from "react";
import { AUTH_CHANGE_EVENT } from "./hooks/useAuth";
import { usePushNotifications } from "./hooks/usePushNotifications";

const queryClient = new QueryClient();

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
};

const AppRoutes = () => {
  const [user, setUser] = useState(() => getStoredUser());
  usePushNotifications(user, () => localStorage.getItem("access_token"));

  useEffect(() => {
    const handleAuthChange = (event) => {
      setUser(event.detail || null);
    };
    const handleStorage = () => {
      setUser(getStoredUser());
    };

    window.addEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, handleAuthChange);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/farmer-dashboard" element={<FarmerDashboard />} />
        <Route path="/expert-dashboard" element={<ExpertDashboard />} />
        <Route path="/team-buy-confirmation" element={<TeamBuyConfirmation />} />
        <Route path="/dashboard" element={<FarmerDashboard />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner position="top-center" />
      <AppRoutes />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
