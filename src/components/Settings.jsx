import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { updatePassword } from 'aws-amplify/auth';
import { containerPatterns, layoutPatterns, typographyPatterns, buttonPatterns, inputPatterns, formPatterns, scrollbarPatterns } from '../utils/ui/uiPatterns';
import { useAuthorizeUser } from '../auth/hooks/useAuthorizeUser';
import { getUserDisplayName } from '../auth/utils/authHelpers';
import { useAuth } from '../auth/contexts/AuthContext';
import { AccessDenied, LoadingScreen } from './shared/AccessDenied';
import UserAvatar from './shared/UserAvatar';
import FormInput from './shared/FormInput';
import AuthInput from '../auth/components/AuthInput';
import AuthButton from '../auth/components/AuthButton';
import { useToast } from '../contexts/ToastContext';
import { getUserProfile, updateUserProfile } from '../utils/apis/userProfileApi';
import {
  ProfileIcon,
  SecurityIcon,
  PreferencesIcon,
  DangerIcon,
  ChevronDownIcon,
  InfoIcon
} from './themes/SynthwaveComponents';

// Collapsible section component
const CollapsibleSection = ({ title, icon, children, defaultOpen = false, className = "" }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`${containerPatterns.collapsibleSection} ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={containerPatterns.collapsibleHeader}
      >
        <div className="flex items-center space-x-3">
          <div className="text-synthwave-neon-pink">
            {icon}
          </div>
          <h3 className="font-russo font-bold text-white text-base uppercase">
            {title}
          </h3>
        </div>
        <div className={`text-synthwave-neon-pink transition-transform duration-200 ${isOpen ? 'rotate-0' : '-rotate-90'}`}>
          <ChevronDownIcon />
        </div>
      </button>
      {isOpen && (
        <div className={containerPatterns.collapsibleContent}>
          {children}
        </div>
      )}
    </div>
  );
};

function Settings() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const userId = searchParams.get("userId");
  const { success: showSuccess, error: showError } = useToast();
  const { user } = useAuth();

  // Authorize user
  const {
    isValidating: isValidatingUserId,
    isValid: isValidUserId,
    userAttributes,
    error: userIdError,
  } = useAuthorizeUser(userId);

  // State for profile editing
  const [profileData, setProfileData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    displayName: '',
    nickname: '',
    username: ''
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // State for password change
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // State for preferences
  const [timezone, setTimezone] = useState('America/Los_Angeles');
  const [originalTimezone, setOriginalTimezone] = useState('America/Los_Angeles');
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);

  // State for Critical Training Directive
  const [directiveData, setDirectiveData] = useState({
    content: '',
    enabled: false
  });
  const [originalDirective, setOriginalDirective] = useState({
    content: '',
    enabled: false
  });
  const [isSavingDirective, setIsSavingDirective] = useState(false);
  const [directiveCharCount, setDirectiveCharCount] = useState(0);

  // Auto-scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Redirect if no userId
  useEffect(() => {
    if (!userId) {
      navigate('/coaches', { replace: true });
    }
  }, [userId, navigate]);

  // Load user profile data from DynamoDB
  useEffect(() => {
    const loadProfile = async () => {
      if (userId && userAttributes) {
        try {
          const response = await getUserProfile(userId);
          const profile = response.profile;

          // Populate form with DynamoDB data
          const newProfileData = {
            email: profile.email || userAttributes.email || '',
            firstName: profile.firstName || userAttributes.given_name || '',
            lastName: profile.lastName || userAttributes.family_name || '',
            displayName: profile.displayName || getUserDisplayName({ attributes: userAttributes }),
            nickname: profile.nickname || userAttributes.nickname || userAttributes.given_name || '',
            username: profile.username || userAttributes.preferred_username || ''
          };
          setProfileData(newProfileData);

          // Set timezone from profile preferences
          const userTimezone = profile.preferences?.timezone || 'America/Los_Angeles';
          setOriginalTimezone(userTimezone);
          setTimezone(userTimezone);

          // Set Critical Training Directive from profile
          const directive = profile.criticalTrainingDirective || { content: '', enabled: false };
          setDirectiveData(directive);
          setOriginalDirective(directive);
          setDirectiveCharCount(directive.content?.length || 0);
        } catch (error) {
          console.error('Error loading user profile:', error);
          // Fallback to Cognito attributes if DynamoDB fetch fails
          const newProfileData = {
            email: userAttributes.email || '',
            firstName: userAttributes.given_name || '',
            lastName: userAttributes.family_name || '',
            displayName: getUserDisplayName({ attributes: userAttributes }),
            nickname: userAttributes.nickname || userAttributes.given_name || '',
            username: userAttributes.preferred_username || ''
          };
          setProfileData(newProfileData);
          setOriginalTimezone('America/Los_Angeles');
          setTimezone('America/Los_Angeles');
        }
      }
    };

    loadProfile();
  }, [userId, userAttributes]);

  // Handle profile field changes
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle profile save
  const handleSaveProfile = async () => {
    setIsSavingProfile(true);
    try {
      // Prepare updates (exclude email and userId as they're immutable)
      const updates = {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        displayName: profileData.displayName,
        nickname: profileData.nickname,
        // username is immutable (GSI key), so we don't send it
      };

      await updateUserProfile(userId, updates);
      showSuccess('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      showError(error.message || 'Failed to update profile');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle profile cancel
  const handleCancelProfile = () => {
    // Reset to original values from userAttributes
    if (userAttributes) {
      setProfileData({
        email: userAttributes.email || '',
        firstName: userAttributes.given_name || '',
        lastName: userAttributes.family_name || '',
        displayName: getUserDisplayName({ attributes: userAttributes }),
        nickname: userAttributes.nickname || userAttributes.given_name || '',
        username: userAttributes.preferred_username || ''
      });
    }
  };

  // Handle password change
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    setPasswordErrors(prev => ({
      ...prev,
      [name]: ''
    }));
  };

  // Handle password save
  const handleSavePassword = async (e) => {
    e.preventDefault();
    setPasswordErrors({});

    // Validate passwords
    if (!passwordData.currentPassword) {
      setPasswordErrors(prev => ({ ...prev, currentPassword: 'Current password is required' }));
      return;
    }
    if (!passwordData.newPassword) {
      setPasswordErrors(prev => ({ ...prev, newPassword: 'New password is required' }));
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordErrors(prev => ({ ...prev, confirmPassword: 'Passwords do not match' }));
      return;
    }
    if (passwordData.newPassword.length < 8) {
      setPasswordErrors(prev => ({ ...prev, newPassword: 'Password must be at least 8 characters' }));
      return;
    }

    setIsSavingPassword(true);
    try {
      // Call Amplify updatePassword
      await updatePassword({
        oldPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });

      showSuccess('Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error changing password:', error);

      // Handle specific Amplify error messages
      let errorMessage = 'Failed to change password';
      if (error.name === 'NotAuthorizedException') {
        errorMessage = 'Current password is incorrect';
        setPasswordErrors(prev => ({ ...prev, currentPassword: errorMessage }));
      } else if (error.name === 'InvalidPasswordException') {
        errorMessage = 'New password does not meet requirements';
        setPasswordErrors(prev => ({ ...prev, newPassword: errorMessage }));
      } else if (error.name === 'LimitExceededException') {
        errorMessage = 'Too many attempts. Please try again later.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      showError(errorMessage);
    } finally {
      setIsSavingPassword(false);
    }
  };

  // Handle password cancel
  const handleCancelPassword = () => {
    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordErrors({});
  };

  // Handle timezone save
  const handleSaveTimezone = async () => {
    setIsSavingPreferences(true);
    try {
      // Update preferences in DynamoDB
      await updateUserProfile(userId, {
        preferences: {
          timezone: timezone
        }
      });

      setOriginalTimezone(timezone);
      showSuccess('Timezone updated successfully');
    } catch (error) {
      console.error('Error updating timezone:', error);
      showError(error.message || 'Failed to update timezone');
    } finally {
      setIsSavingPreferences(false);
    }
  };

  // Handle timezone cancel
  const handleCancelTimezone = () => {
    setTimezone(originalTimezone);
  };

  // Handle Critical Training Directive change
  const handleDirectiveChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setDirectiveData(prev => ({ ...prev, [name]: checked }));
    } else {
      setDirectiveData(prev => ({ ...prev, [name]: value }));
      setDirectiveCharCount(value.length);
    }
  };

  // Handle Critical Training Directive save
  const handleSaveDirective = async () => {
    setIsSavingDirective(true);
    try {
      // Update directive in DynamoDB
      await updateUserProfile(userId, {
        criticalTrainingDirective: {
          content: directiveData.content,
          enabled: directiveData.enabled,
          createdAt: originalDirective.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      });

      setOriginalDirective(directiveData);
      showSuccess('Critical Training Directive updated successfully');
    } catch (error) {
      console.error('Error updating Critical Training Directive:', error);
      showError(error.message || 'Failed to update directive');
    } finally {
      setIsSavingDirective(false);
    }
  };

  // Handle Critical Training Directive cancel
  const handleCancelDirective = () => {
    setDirectiveData(originalDirective);
    setDirectiveCharCount(originalDirective.content?.length || 0);
  };

  // Handle Clear Directive
  const handleClearDirective = () => {
    setDirectiveData({ content: '', enabled: false });
    setDirectiveCharCount(0);
  };

  // Handle delete account request
  const handleDeleteAccount = () => {
    const subject = encodeURIComponent('Account Deletion Request');
    const body = encodeURIComponent(`User ID: ${userId}\n\nI would like to request the deletion of my account.`);
    window.location.href = `mailto:support@neonpanda.ai?subject=${subject}&body=${body}`;
  };

  // Show skeleton loading state
  if (isValidatingUserId) {
    return (
      <div className={`${layoutPatterns.pageContainer} min-h-screen`}>
        <div className={`${layoutPatterns.contentWrapper} min-h-[calc(100vh-5rem)] flex flex-col pb-8`}>
          {/* Header Skeleton */}
          <div className="mb-12 text-center">
            <div className="h-12 w-64 bg-synthwave-text-muted/10 rounded animate-pulse mx-auto mb-4"></div>
            <div className="h-4 w-96 bg-synthwave-text-muted/10 rounded animate-pulse mx-auto mb-2"></div>
            <div className="h-4 w-80 bg-synthwave-text-muted/10 rounded animate-pulse mx-auto"></div>
          </div>

          {/* Main Content Skeleton */}
          <div className="flex-1">
            <div className={`${containerPatterns.mainContent} h-full overflow-hidden`}>
              <div className="p-6 h-full overflow-y-auto custom-scrollbar space-y-6">

                {/* Profile Section Skeleton */}
                <div className={containerPatterns.collapsibleSection}>
                  <div className={containerPatterns.collapsibleHeader}>
                    <div className="flex items-center space-x-3">
                      <div className="w-5 h-5 bg-synthwave-text-muted/10 rounded animate-pulse"></div>
                      <div className="h-4 w-40 bg-synthwave-text-muted/10 rounded animate-pulse"></div>
                    </div>
                  </div>
                  <div className={containerPatterns.collapsibleContent}>
                    {/* Avatar Skeleton */}
                    <div className="flex items-center space-x-4 mb-6">
                      <div className="w-16 h-16 bg-synthwave-text-muted/10 rounded-full animate-pulse"></div>
                      <div className="flex-1">
                        <div className="h-4 w-32 bg-synthwave-text-muted/10 rounded animate-pulse mb-2"></div>
                        <div className="h-3 w-64 bg-synthwave-text-muted/10 rounded animate-pulse"></div>
                      </div>
                    </div>
                    {/* Form Fields Skeleton */}
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div key={i} className="mb-6">
                        <div className="h-4 w-24 bg-synthwave-text-muted/10 rounded animate-pulse mb-2"></div>
                        <div className="h-12 w-full bg-synthwave-text-muted/10 rounded-xl animate-pulse"></div>
                        {/* Helper text skeleton for first two fields (Email and Username) */}
                        {(i === 1 || i === 2) && (
                          <div className="flex items-start space-x-2 mt-2">
                            <div className="w-4 h-4 bg-synthwave-text-muted/10 rounded-full animate-pulse mt-0.5 flex-shrink-0"></div>
                            <div className="h-3 w-48 bg-synthwave-text-muted/10 rounded animate-pulse"></div>
                          </div>
                        )}
                      </div>
                    ))}
                    {/* Buttons Skeleton */}
                    <div className="flex space-x-4 pt-4">
                      <div className="h-12 flex-1 bg-synthwave-text-muted/10 rounded-lg animate-pulse"></div>
                      <div className="h-12 flex-1 bg-synthwave-text-muted/10 rounded-lg animate-pulse"></div>
                    </div>
                  </div>
                </div>

                {/* Other Sections Skeleton */}
                {[1, 2, 3].map((i) => (
                  <div key={i} className={containerPatterns.collapsibleSection}>
                    <div className={containerPatterns.collapsibleHeader}>
                      <div className="flex items-center space-x-3">
                        <div className="w-5 h-5 bg-synthwave-text-muted/10 rounded animate-pulse"></div>
                        <div className="h-4 w-32 bg-synthwave-text-muted/10 rounded animate-pulse"></div>
                      </div>
                      <div className="w-5 h-5 bg-synthwave-text-muted/10 rounded animate-pulse"></div>
                    </div>
                  </div>
                ))}

              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle authorization errors
  if (userIdError || !isValidUserId) {
    return (
      <AccessDenied
        message={userIdError || "You can only access your own settings."}
      />
    );
  }

  const userEmail = userAttributes?.email;
  const customUserId = userAttributes?.['custom:user_id'];

  return (
    <div className={`${layoutPatterns.pageContainer} min-h-screen`}>
      <div className={`${layoutPatterns.contentWrapper} min-h-[calc(100vh-5rem)] flex flex-col pb-8`}>
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className={typographyPatterns.pageTitle}>
            Your Settings
          </h1>
          <p className={`${typographyPatterns.description} max-w-3xl mx-auto`}>
            Manage your account settings, profile information, security preferences, and timezone settings.
            Keep your account secure and personalized to your training needs.
          </p>
        </div>

        {/* Main Content Area */}
        <div className="flex-1">
          <div className={`${containerPatterns.mainContent} h-full overflow-hidden`}>
            <div className="p-6 h-full overflow-y-auto custom-scrollbar space-y-6">

              {/* Profile Information Section */}
              <CollapsibleSection
                title="Profile Information"
                icon={<ProfileIcon />}
                defaultOpen={true}
              >
                <div className="space-y-6">
                  {/* Avatar */}
                  <div className="flex items-center space-x-4 mb-6">
                    <UserAvatar
                      email={userEmail}
                      username={profileData.displayName}
                      size={64}
                    />
                    <div>
                      <p className={formPatterns.label}>Profile Picture</p>
                      <p className={formPatterns.helperText}>
                        Powered by <a href="https://gravatar.com" target="_blank" rel="noopener noreferrer" className="text-synthwave-neon-cyan hover:text-synthwave-neon-pink transition-colors">Gravatar</a>. To change your avatar, create a free Gravatar account using your email address.
                      </p>
                    </div>
                  </div>

                  {/* Profile Form - Always visible */}
                  <form onSubmit={(e) => { e.preventDefault(); handleSaveProfile(); }}>
                    <FormInput
                      label="Email"
                      name="email"
                      type="email"
                      value={profileData.email}
                      disabled
                    />
                    <div className="flex items-start space-x-2 -mt-4 mb-6">
                      <div className="text-synthwave-neon-cyan mt-0.5 flex-shrink-0">
                        <InfoIcon />
                      </div>
                      <p className={`${formPatterns.helperText} text-synthwave-neon-cyan`}>
                        Email cannot be changed.
                      </p>
                    </div>

                    <FormInput
                      label="Username"
                      name="username"
                      type="text"
                      value={profileData.username}
                      disabled
                    />
                    <div className="flex items-start space-x-2 -mt-4 mb-6">
                      <div className="text-synthwave-neon-cyan mt-0.5 flex-shrink-0">
                        <InfoIcon />
                      </div>
                      <p className={`${formPatterns.helperText} text-synthwave-neon-cyan`}>
                        Username cannot be changed. Update your Display Name below to change how you appear to others on the platform.
                      </p>
                    </div>
                    <FormInput
                      label="First Name"
                      name="firstName"
                      type="text"
                      value={profileData.firstName}
                      onChange={handleProfileChange}
                      disabled={isSavingProfile}
                    />
                    <FormInput
                      label="Last Name"
                      name="lastName"
                      type="text"
                      value={profileData.lastName}
                      onChange={handleProfileChange}
                      disabled={isSavingProfile}
                    />
                    <FormInput
                      label="Display Name"
                      name="displayName"
                      type="text"
                      value={profileData.displayName}
                      onChange={handleProfileChange}
                      disabled={isSavingProfile}
                    />
                    <FormInput
                      label="Nickname"
                      name="nickname"
                      type="text"
                      value={profileData.nickname}
                      onChange={handleProfileChange}
                      disabled={isSavingProfile}
                    />

                    <div className="flex space-x-4 pt-4">
                      <AuthButton
                        type="submit"
                        variant="primary"
                        loading={isSavingProfile}
                        disabled={isSavingProfile}
                        className="flex-1"
                      >
                        Save Changes
                      </AuthButton>
                      <AuthButton
                        type="button"
                        variant="secondary"
                        onClick={handleCancelProfile}
                        disabled={isSavingProfile}
                        className="flex-1"
                      >
                        Cancel
                      </AuthButton>
                    </div>
                  </form>
                </div>
              </CollapsibleSection>

              {/* Account Security Section */}
              <CollapsibleSection
                title="Account Security"
                icon={<SecurityIcon />}
                defaultOpen={false}
              >
                <form onSubmit={handleSavePassword}>
                  <AuthInput
                    label="Current Password"
                    name="currentPassword"
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={handlePasswordChange}
                    error={passwordErrors.currentPassword}
                    required
                    disabled={isSavingPassword}
                  />
                  <AuthInput
                    label="New Password"
                    name="newPassword"
                    type="password"
                    value={passwordData.newPassword}
                    onChange={handlePasswordChange}
                    error={passwordErrors.newPassword}
                    required
                    disabled={isSavingPassword}
                  />
                  <AuthInput
                    label="Confirm New Password"
                    name="confirmPassword"
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={handlePasswordChange}
                    error={passwordErrors.confirmPassword}
                    required
                    disabled={isSavingPassword}
                  />

                  {/* Password Requirements */}
                  <div className="text-sm font-rajdhani text-synthwave-neon-cyan space-y-1 mb-4 mt-6">
                    <p className="font-medium">Password must contain:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>At least 8 characters</li>
                      <li>One uppercase letter</li>
                      <li>One lowercase letter</li>
                      <li>One number</li>
                      <li>One special character</li>
                    </ul>
                  </div>

                  <div className="flex space-x-4 pt-4">
                    <AuthButton
                      type="submit"
                      variant="primary"
                      loading={isSavingPassword}
                      disabled={isSavingPassword}
                      className="flex-1"
                    >
                      Update Password
                    </AuthButton>
                    <AuthButton
                      type="button"
                      variant="secondary"
                      onClick={handleCancelPassword}
                      disabled={isSavingPassword}
                      className="flex-1"
                    >
                      Cancel
                    </AuthButton>
                  </div>
                </form>
              </CollapsibleSection>

              {/* Preferences Section */}
              <CollapsibleSection
                title="Preferences"
                icon={<PreferencesIcon />}
                defaultOpen={false}
              >
                <div>
                  <div className="mb-6">
                    <label htmlFor="timezone" className={formPatterns.label}>
                      Timezone
                    </label>
                    <select
                      id="timezone"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className={inputPatterns.select}
                      disabled={isSavingPreferences}
                    >
                      <optgroup label="US Time Zones">
                        <option value="America/Los_Angeles">Pacific Time (Los Angeles)</option>
                        <option value="America/Denver">Mountain Time (Denver)</option>
                        <option value="America/Chicago">Central Time (Chicago)</option>
                        <option value="America/New_York">Eastern Time (New York)</option>
                        <option value="America/Anchorage">Alaska Time (Anchorage)</option>
                        <option value="Pacific/Honolulu">Hawaii Time (Honolulu)</option>
                      </optgroup>
                      <optgroup label="Other Time Zones">
                        <option value="Europe/London">London (GMT)</option>
                        <option value="Europe/Paris">Paris (CET)</option>
                        <option value="Asia/Tokyo">Tokyo (JST)</option>
                        <option value="Australia/Sydney">Sydney (AEST)</option>
                        <option value="America/Sao_Paulo">São Paulo (BRT)</option>
                      </optgroup>
                    </select>
                    <div className="flex items-start space-x-2 mt-2">
                      <div className="text-synthwave-neon-cyan mt-0.5 flex-shrink-0">
                        <InfoIcon />
                      </div>
                      <p className={`${formPatterns.helperText} text-synthwave-neon-cyan`}>
                        This affects how dates and times are displayed throughout the application.
                      </p>
                    </div>
                  </div>

                  <div className="flex space-x-4 pt-4">
                    <AuthButton
                      variant="primary"
                      onClick={handleSaveTimezone}
                      loading={isSavingPreferences}
                      disabled={isSavingPreferences}
                      className="flex-1"
                    >
                      Save Preferences
                    </AuthButton>
                    <AuthButton
                      variant="secondary"
                      onClick={handleCancelTimezone}
                      disabled={isSavingPreferences}
                      className="flex-1"
                    >
                      Cancel
                    </AuthButton>
                  </div>
                </div>
              </CollapsibleSection>

              {/* Critical Training Directive Section */}
              <CollapsibleSection
                title="Critical Training Directive"
                icon={<PreferencesIcon />}
                defaultOpen={false}
              >
                <div>
                  <div className="mb-6">
                    <label htmlFor="directive-content" className={formPatterns.label}>
                      Directive Content ({directiveCharCount}/500 characters)
                    </label>
                    <textarea
                      id="directive-content"
                      name="content"
                      value={directiveData.content}
                      onChange={handleDirectiveChange}
                      disabled={isSavingDirective}
                      maxLength={500}
                      rows={4}
                      placeholder="e.g., Always provide concise, technically precise coaching with minimal fluff. Focus on systematic progression and data-driven decisions."
                      className={`${inputPatterns.textarea} ${scrollbarPatterns.pink} resize-none`}
                    />

                    <div className="mt-3 mb-4 space-y-2">
                      <div className="flex items-start space-x-2">
                        <div className="text-synthwave-neon-cyan mt-0.5 flex-shrink-0">
                          <InfoIcon />
                        </div>
                        <p className={`${formPatterns.helperText} text-synthwave-neon-cyan`}>
                          This directive will be followed across ALL training interactions - coach conversations,
                          workout logging, analytics reports, and coach creation. Note that safety constraints always take precedence.
                        </p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="flex items-center space-x-3 cursor-pointer group">
                        <div className="relative">
                          <input
                            type="checkbox"
                            name="enabled"
                            checked={directiveData.enabled}
                            onChange={handleDirectiveChange}
                            disabled={isSavingDirective}
                            className={`${inputPatterns.checkbox} peer relative`}
                          />
                          {directiveData.enabled && (
                            <svg
                              className="absolute inset-0 w-5 h-5 text-white pointer-events-none"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="font-rajdhani text-white font-medium group-hover:text-synthwave-neon-pink transition-colors duration-300">
                          Enforce for all training interactions
                        </span>
                      </label>
                    </div>
                  </div>

                  <div className="flex space-x-4 pt-4">
                    <AuthButton
                      variant="primary"
                      onClick={handleSaveDirective}
                      loading={isSavingDirective}
                      disabled={isSavingDirective}
                      className="flex-1"
                    >
                      Save Directive
                    </AuthButton>
                    <AuthButton
                      variant="secondary"
                      onClick={handleCancelDirective}
                      disabled={isSavingDirective}
                      className="flex-1"
                    >
                      Cancel
                    </AuthButton>
                  </div>
                </div>
              </CollapsibleSection>

              {/* Danger Zone Section */}
              <CollapsibleSection
                title="Danger Zone"
                icon={<DangerIcon />}
                defaultOpen={false}
              >
                <div className="space-y-6 border-2 border-red-500/30 rounded-xl p-6 bg-red-500/5">
                  <div>
                    <h4 className="font-rajdhani font-bold text-red-400 text-lg mb-2">
                      Delete Account
                    </h4>
                    <p className="font-rajdhani text-synthwave-text-secondary mb-4">
                      Once you delete your account, there is no going back. Please be certain.
                      This will permanently delete all your data including workouts, conversations,
                      memories, and coach configurations.
                    </p>
                    <button
                      onClick={handleDeleteAccount}
                      className="bg-red-500 text-white px-6 py-3 rounded-lg font-rajdhani font-semibold text-base uppercase tracking-wide cursor-pointer transition-all duration-200 hover:bg-red-600 hover:shadow-lg hover:shadow-red-500/30 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:ring-offset-2 focus:ring-offset-synthwave-bg-primary min-h-[40px] flex items-center justify-center"
                    >
                      Delete Account
                    </button>
                    <div className="flex items-start space-x-2 mt-3">
                      <div className="text-synthwave-neon-cyan mt-0.5 flex-shrink-0">
                        <InfoIcon />
                      </div>
                      <p className="font-rajdhani text-sm text-synthwave-text-secondary">
                        This will open your email client to contact our support team.
                      </p>
                    </div>
                  </div>
                </div>
              </CollapsibleSection>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;