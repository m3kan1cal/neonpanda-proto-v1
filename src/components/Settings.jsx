import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { containerPatterns, layoutPatterns, typographyPatterns, buttonPatterns } from '../utils/uiPatterns';
import { useAuthorizeUser } from '../auth/hooks/useAuthorizeUser';
import { getUserDisplayName } from '../auth/utils/authHelpers';
import { useAuth } from '../auth/contexts/AuthContext';
import { AccessDenied, LoadingScreen } from './shared/AccessDenied';
import UserAvatar from './shared/UserAvatar';
import AuthInput from '../auth/components/AuthInput';
import AuthButton from '../auth/components/AuthButton';
import { useToast } from '../contexts/ToastContext';
import Footer from './shared/Footer';
import {
  ProfileIcon,
  SecurityIcon,
  PreferencesIcon,
  DangerIcon,
  ChevronDownIcon
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

  // Redirect if no userId
  useEffect(() => {
    if (!userId) {
      navigate('/coaches', { replace: true });
    }
  }, [userId, navigate]);

  // Load user profile data
  useEffect(() => {
    if (userAttributes) {
      // TODO: Load from DynamoDB user profile
      // For now, populate from Cognito attributes
      const newProfileData = {
        email: userAttributes.email || '',
        firstName: userAttributes.given_name || '',
        lastName: userAttributes.family_name || '',
        displayName: getUserDisplayName({ attributes: userAttributes }),
        nickname: userAttributes.nickname || userAttributes.given_name || '',
        username: userAttributes.preferred_username || ''
      };
      setProfileData(newProfileData);

      // Set original timezone (from DB in the future)
      setOriginalTimezone('America/Los_Angeles');
      setTimezone('America/Los_Angeles');
    }
  }, [userAttributes]);

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
      // TODO: Call update-user-profile API
      showSuccess('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      showError('Failed to update profile');
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
      // TODO: Call Amplify updatePassword
      showSuccess('Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error changing password:', error);
      showError('Failed to change password');
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
      // TODO: Call update-user-profile API with preferences
      setOriginalTimezone(timezone);
      showSuccess('Timezone updated successfully');
    } catch (error) {
      console.error('Error updating timezone:', error);
      showError('Failed to update timezone');
    } finally {
      setIsSavingPreferences(false);
    }
  };

  // Handle timezone cancel
  const handleCancelTimezone = () => {
    setTimezone(originalTimezone);
  };

  // Handle delete account request
  const handleDeleteAccount = () => {
    const subject = encodeURIComponent('Account Deletion Request');
    const body = encodeURIComponent(`User ID: ${userId}\n\nI would like to request the deletion of my account.`);
    window.location.href = `mailto:support@neonpanda.ai?subject=${subject}&body=${body}`;
  };

  // Show loading state
  if (isValidatingUserId) {
    return <LoadingScreen />;
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
            Settings
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
                      <p className="font-rajdhani font-semibold text-white mb-1">Profile Picture</p>
                      <p className="font-rajdhani text-sm text-synthwave-text-secondary mb-2">
                        Powered by <a href="https://gravatar.com" target="_blank" rel="noopener noreferrer" className="text-synthwave-neon-cyan hover:text-synthwave-neon-pink transition-colors">Gravatar</a>
                      </p>
                      <p className="font-rajdhani text-xs text-synthwave-text-muted">
                        To change your avatar, create a free Gravatar account using your email address.
                      </p>
                    </div>
                  </div>

                  {/* Profile Form - Always visible */}
                  <form onSubmit={(e) => { e.preventDefault(); handleSaveProfile(); }} className="space-y-0">
                    <div className="mb-6">
                      <label className="block font-rajdhani text-lg text-synthwave-text-secondary mb-2 font-medium uppercase tracking-wide">
                        Email
                      </label>
                      <input
                        name="email"
                        type="email"
                        value={profileData.email}
                        disabled
                        className="w-full px-4 py-3 bg-synthwave-bg-card/30 backdrop-blur-sm border border-synthwave-neon-pink/20 rounded-xl text-synthwave-text-primary font-rajdhani transition-all duration-300 outline-none min-h-[48px] opacity-50 cursor-not-allowed"
                      />
                      <p className="font-rajdhani text-xs text-synthwave-text-muted mt-2">
                        Email cannot be changed
                      </p>
                    </div>

                    <AuthInput
                      label="First Name"
                      name="firstName"
                      type="text"
                      value={profileData.firstName}
                      onChange={handleProfileChange}
                      disabled={isSavingProfile}
                    />
                    <AuthInput
                      label="Last Name"
                      name="lastName"
                      type="text"
                      value={profileData.lastName}
                      onChange={handleProfileChange}
                      disabled={isSavingProfile}
                    />
                    <AuthInput
                      label="Display Name"
                      name="displayName"
                      type="text"
                      value={profileData.displayName}
                      onChange={handleProfileChange}
                      disabled={isSavingProfile}
                    />
                    <AuthInput
                      label="Nickname"
                      name="nickname"
                      type="text"
                      value={profileData.nickname}
                      onChange={handleProfileChange}
                      disabled={isSavingProfile}
                    />
                    <AuthInput
                      label="Username"
                      name="username"
                      type="text"
                      value={profileData.username}
                      onChange={handleProfileChange}
                      disabled={isSavingProfile}
                    />

                    <div className="flex space-x-4 pt-4">
                      <AuthButton
                        type="submit"
                        variant="primary"
                        loading={isSavingProfile}
                        disabled={isSavingProfile}
                      >
                        Save Changes
                      </AuthButton>
                      <AuthButton
                        type="button"
                        variant="secondary"
                        onClick={handleCancelProfile}
                        disabled={isSavingProfile}
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
                <form onSubmit={handleSavePassword} className="space-y-0">
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
                  <div className="text-xs font-rajdhani text-synthwave-neon-cyan space-y-1 mb-4 mt-2">
                    <p className="font-medium text-synthwave-neon-cyan">Password must contain:</p>
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
                    >
                      Update Password
                    </AuthButton>
                    <AuthButton
                      type="button"
                      variant="secondary"
                      onClick={handleCancelPassword}
                      disabled={isSavingPassword}
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
                <div className="space-y-0">
                  <div className="mb-6">
                    <label className="block font-rajdhani text-lg text-synthwave-text-secondary mb-2 font-medium uppercase tracking-wide">
                      Timezone
                    </label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full px-4 py-3 bg-synthwave-bg-card/30 backdrop-blur-sm border border-synthwave-neon-pink/20 rounded-xl text-synthwave-text-primary font-rajdhani transition-all duration-300 outline-none focus:outline-none focus:border-synthwave-neon-pink focus:bg-synthwave-bg-card/50 focus:ring-2 focus:ring-synthwave-neon-pink/20 focus:ring-offset-0 focus:ring-offset-transparent focus:shadow-none min-h-[48px] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                      <p className="font-rajdhani text-sm text-synthwave-text-secondary mt-2">
                        This affects how dates and times are displayed throughout the application.
                      </p>
                  </div>

                  <div className="flex space-x-4 pt-4">
                    <AuthButton
                      variant="primary"
                      onClick={handleSaveTimezone}
                      loading={isSavingPreferences}
                      disabled={isSavingPreferences}
                    >
                      Save Preferences
                    </AuthButton>
                    <AuthButton
                      variant="secondary"
                      onClick={handleCancelTimezone}
                      disabled={isSavingPreferences}
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
                    <p className="font-rajdhani text-xs text-synthwave-text-muted mt-3">
                      This will open your email client to contact our support team.
                    </p>
                  </div>
                </div>
              </CollapsibleSection>

            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default Settings;