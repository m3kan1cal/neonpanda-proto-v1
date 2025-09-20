import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";
import VerifyEmailForm from "./VerifyEmailForm";
import ForgotPasswordForm from "./ForgotPasswordForm";
import ResetPasswordForm from "./ResetPasswordForm";

const AUTH_VIEWS = {
  LOGIN: "login",
  REGISTER: "register",
  VERIFY_EMAIL: "verify-email",
  FORGOT_PASSWORD: "forgot-password",
  RESET_PASSWORD: "reset-password",
};

const AuthRouter = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [searchParams] = useSearchParams();

  // Determine initial view from URL parameters
  const getInitialView = () => {
    const viewParam = searchParams.get('view');
    if (viewParam && Object.values(AUTH_VIEWS).includes(viewParam)) {
      return viewParam;
    }
    return AUTH_VIEWS.LOGIN;
  };

  const [currentView, setCurrentView] = useState(getInitialView);
  const [pendingEmail, setPendingEmail] = useState("");
  const [showVerificationSuccess, setShowVerificationSuccess] = useState(false);
  const [showPasswordResetSuccess, setShowPasswordResetSuccess] = useState(false);

  // Redirect authenticated users to coaches page
  useEffect(() => {
    console.info('🔍 AuthRouter redirect check:', {
      isAuthenticated,
      hasUser: !!user,
      currentView,
      userAttributes: user?.attributes ? Object.keys(user.attributes) : 'no user'
    });

    if (isAuthenticated && user) {
      const customUserId = user.attributes?.["custom:user_id"];

      if (customUserId) {
        console.info("🚀 Redirecting authenticated user to coaches page with userId:", customUserId);
        navigate(`/coaches?userId=${customUserId}`);
      } else {
        console.warn("⚠️ Redirecting authenticated user without custom userId - will show error in app");
        // Still redirect authenticated users even if custom ID is missing
        // The main app can handle the missing ID scenario with appropriate error messaging
        navigate('/coaches');
      }
    } else if (isAuthenticated && !user) {
      console.warn('⚠️ isAuthenticated=true but no user object - possible timing issue');
    } else if (!isAuthenticated && user) {
      console.warn('⚠️ isAuthenticated=false but user object exists - possible timing issue');
    }
  }, [isAuthenticated, user, navigate, currentView]);

  const handleSwitchToLogin = () => {
    setCurrentView(AUTH_VIEWS.LOGIN);
    setPendingEmail("");
    setShowVerificationSuccess(false);
    setShowPasswordResetSuccess(false);
  };

  const handleSwitchToRegister = () => {
    setCurrentView(AUTH_VIEWS.REGISTER);
    setPendingEmail("");
  };

  const handleSwitchToForgotPassword = () => {
    setCurrentView(AUTH_VIEWS.FORGOT_PASSWORD);
    setPendingEmail("");
  };

  const handleSwitchToVerification = (email) => {
    setPendingEmail(email);
    setCurrentView(AUTH_VIEWS.VERIFY_EMAIL);
  };

  const handleRegistrationSuccess = (email) => {
    setPendingEmail(email);
    setCurrentView(AUTH_VIEWS.VERIFY_EMAIL);
  };

  const handleVerificationSuccess = () => {
    // After successful verification, go back to login with success message
    setShowVerificationSuccess(true);
    setCurrentView(AUTH_VIEWS.LOGIN);
    setPendingEmail("");
  };

  const handleResetCodeSent = (email) => {
    setPendingEmail(email);
    setCurrentView(AUTH_VIEWS.RESET_PASSWORD);
  };

  const handleResetSuccess = () => {
    // After successful password reset, go back to login with success message
    setShowPasswordResetSuccess(true);
    setCurrentView(AUTH_VIEWS.LOGIN);
    setPendingEmail("");
  };

  switch (currentView) {
    case AUTH_VIEWS.REGISTER:
      return (
        <RegisterForm
          onSwitchToLogin={handleSwitchToLogin}
          onRegistrationSuccess={handleRegistrationSuccess}
        />
      );

    case AUTH_VIEWS.VERIFY_EMAIL:
      return (
        <VerifyEmailForm
          email={pendingEmail}
          onVerificationSuccess={handleVerificationSuccess}
          onSwitchToLogin={handleSwitchToLogin}
        />
      );

    case AUTH_VIEWS.FORGOT_PASSWORD:
      return (
        <ForgotPasswordForm
          onSwitchToLogin={handleSwitchToLogin}
          onResetCodeSent={handleResetCodeSent}
        />
      );

    case AUTH_VIEWS.RESET_PASSWORD:
      return (
        <ResetPasswordForm
          email={pendingEmail}
          onResetSuccess={handleResetSuccess}
          onSwitchToLogin={handleSwitchToLogin}
        />
      );

    case AUTH_VIEWS.LOGIN:
    default:
      return (
        <LoginForm
          onSwitchToRegister={handleSwitchToRegister}
          onSwitchToForgotPassword={handleSwitchToForgotPassword}
          onSwitchToVerification={handleSwitchToVerification}
          showVerificationSuccess={showVerificationSuccess}
          showPasswordResetSuccess={showPasswordResetSuccess}
        />
      );
  }
};

export default AuthRouter;
