import React, { useState, useEffect, useRef } from "react";
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
  const { isAuthenticated, user, loading } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Determine initial view from URL parameters
  const getInitialView = () => {
    const viewParam = searchParams.get("view");
    if (viewParam && Object.values(AUTH_VIEWS).includes(viewParam)) {
      return viewParam;
    }
    return AUTH_VIEWS.LOGIN;
  };

  const [currentView, setCurrentView] = useState(getInitialView);
  const [pendingEmail, setPendingEmail] = useState("");
  const [showVerificationSuccess, setShowVerificationSuccess] = useState(false);
  const [showPasswordResetSuccess, setShowPasswordResetSuccess] =
    useState(false);
  const [oauthErrorMessage, setOauthErrorMessage] = useState("");

  // Detect OAuth callback params (code+state = success redirect, error = failure)
  const isOAuthCallback = searchParams.has("code") && searchParams.has("state");
  const oauthErrorParam = searchParams.get("error");
  const oauthErrorDescriptionParam = searchParams.get("error_description");

  // Handle OAuth error redirect (cancelled or failed Google sign-in)
  const processedOAuthError = useRef(false);
  useEffect(() => {
    if (oauthErrorParam && !processedOAuthError.current) {
      processedOAuthError.current = true;
      const friendlyMessage =
        oauthErrorParam === "access_denied"
          ? "Google sign-in was cancelled. You can try again or sign in with email."
          : oauthErrorDescriptionParam ||
            "Google sign-in failed. Please try again.";
      setOauthErrorMessage(friendlyMessage);
      // Clean up OAuth error params from URL without losing other params
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("error");
      newParams.delete("error_description");
      setSearchParams(newParams, { replace: true });
    }
  }, [
    oauthErrorParam,
    oauthErrorDescriptionParam,
    searchParams,
    setSearchParams,
  ]);

  // Redirect authenticated users to coaches page
  useEffect(() => {
    if (isAuthenticated && user) {
      const customUserId = user.attributes?.["custom:user_id"];

      if (customUserId) {
        navigate(`/coaches?userId=${customUserId}`);
      } else {
        navigate("/coaches");
      }
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

  // Show loading screen while auth state is resolving on initial page load,
  // or while processing an OAuth callback redirect (code+state params in URL).
  if (loading || isOAuthCallback) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-synthwave-bg-primary">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-synthwave-neon-cyan border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="font-body text-synthwave-text-secondary text-sm">
            Powering up...
          </p>
        </div>
      </div>
    );
  }

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
          oauthErrorMessage={oauthErrorMessage}
        />
      );
  }
};

export default AuthRouter;
