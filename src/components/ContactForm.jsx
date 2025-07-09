import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { themeClasses } from '../utils/synthwaveThemeClasses';
import { NeonBorder } from './themes/SynthwaveComponents';
import { useToast } from '../contexts/ToastContext';
import ContactFormAgent from '../utils/agents/ContactFormAgent';

function ContactForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const contactType = searchParams.get('type') || 'general';
  const { success, error } = useToast();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    subject: '',
    message: '',
    contactType: contactType
  });

  const [errors, setErrors] = useState({});
  const agentRef = useRef(null);

  // Agent state (managed by ContactFormAgent)
  const [agentState, setAgentState] = useState({
    isSubmitting: false,
    error: null,
    success: false,
  });

  // Initialize agent
  useEffect(() => {
    if (!agentRef.current) {
      agentRef.current = new ContactFormAgent({
        onStateChange: (newState) => {
          setAgentState(newState);
        },
        onSuccess: (message) => {
          success(message);
          // Navigate after a short delay to let user see the success message
          setTimeout(() => {
            navigate('/');
          }, 1500);
        },
        onError: (message) => {
          error(message);
        }
      });
    }

    return () => {
      if (agentRef.current) {
        agentRef.current.destroy();
        agentRef.current = null;
      }
    };
  }, [navigate, success, error]);

  // Set subject based on contact type
  useEffect(() => {
    if (agentRef.current) {
      const defaultData = agentRef.current.getDefaultFormData(contactType);
      setFormData(defaultData);
    }
  }, [contactType]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    if (!agentRef.current) return false;

    const validation = agentRef.current.validateForm(formData);
    setErrors(validation.errors);
    return validation.isValid;
  };

    const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (!agentRef.current) return;

    try {
      await agentRef.current.submitForm(formData);
    } catch (err) {
      // Error handling is managed by the agent via onError callback
    }
  };

  const handleCancel = () => {
    navigate('/');
  };

  const getPageTitle = () => {
    switch (contactType) {
      case 'waitlist':
        return 'Join the Waitlist';
      case 'collaborate':
        return 'Let\'s Collaborate';
      default:
        return 'Contact Us';
    }
  };

  const getPageDescription = () => {
    switch (contactType) {
      case 'waitlist':
        return 'Ready to build your perfect AI coach? Join thousands of fitness enthusiasts waiting for the future of personalized coaching.';
      case 'collaborate':
        return 'Interested in helping shape the future of AI fitness coaching? We\'d love to hear from you and explore collaboration opportunities.';
      default:
        return 'Have questions about CoachForge? We\'d love to hear from you.';
    }
  };

  return (
          <div className={`${themeClasses.container} min-h-screen`}>
      <div className="max-w-4xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="font-russo font-black text-4xl md:text-5xl text-white mb-6 uppercase">
            {getPageTitle()}
          </h1>
          <p className="font-rajdhani text-xl text-synthwave-text-secondary max-w-3xl mx-auto leading-relaxed">
            {getPageDescription()}
          </p>
        </div>

        {/* Form */}
        <NeonBorder color={contactType === 'waitlist' ? 'pink' : contactType === 'collaborate' ? 'cyan' : 'purple'}
                   className="bg-synthwave-bg-card/50 p-8 md:p-12">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="firstName" className="block font-rajdhani text-lg text-synthwave-text-primary mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 bg-synthwave-bg-primary/50 border-2 ${
                    errors.firstName ? 'border-red-500' : 'border-synthwave-neon-cyan/30'
                  } rounded-lg text-synthwave-text-primary font-rajdhani focus:outline-none focus:border-synthwave-neon-cyan transition-colors duration-300`}
                  placeholder="Enter your first name"
                />
                {errors.firstName && (
                  <p className="mt-2 text-red-400 font-rajdhani text-sm">{errors.firstName}</p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="block font-rajdhani text-lg text-synthwave-text-primary mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  className={`w-full px-4 py-3 bg-synthwave-bg-primary/50 border-2 ${
                    errors.lastName ? 'border-red-500' : 'border-synthwave-neon-cyan/30'
                  } rounded-lg text-synthwave-text-primary font-rajdhani focus:outline-none focus:border-synthwave-neon-cyan transition-colors duration-300`}
                  placeholder="Enter your last name"
                />
                {errors.lastName && (
                  <p className="mt-2 text-red-400 font-rajdhani text-sm">{errors.lastName}</p>
                )}
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block font-rajdhani text-lg text-synthwave-text-primary mb-2">
                Email Address *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 bg-synthwave-bg-primary/50 border-2 ${
                  errors.email ? 'border-red-500' : 'border-synthwave-neon-cyan/30'
                } rounded-lg text-synthwave-text-primary font-rajdhani focus:outline-none focus:border-synthwave-neon-cyan transition-colors duration-300`}
                placeholder="your.email@example.com"
              />
              {errors.email && (
                <p className="mt-2 text-red-400 font-rajdhani text-sm">{errors.email}</p>
              )}
            </div>

            {/* Subject Field */}
            <div>
              <label htmlFor="subject" className="block font-rajdhani text-lg text-synthwave-text-primary mb-2">
                Subject *
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                className={`w-full px-4 py-3 bg-synthwave-bg-primary/50 border-2 ${
                  errors.subject ? 'border-red-500' : 'border-synthwave-neon-cyan/30'
                } rounded-lg text-synthwave-text-primary font-rajdhani focus:outline-none focus:border-synthwave-neon-cyan transition-colors duration-300`}
                placeholder="Enter subject"
              />
              {errors.subject && (
                <p className="mt-2 text-red-400 font-rajdhani text-sm">{errors.subject}</p>
              )}
            </div>

            {/* Message Field */}
            <div>
              <label htmlFor="message" className="block font-rajdhani text-lg text-synthwave-text-primary mb-2">
                Message *
              </label>
              <textarea
                id="message"
                name="message"
                value={formData.message}
                onChange={handleInputChange}
                rows={8}
                className={`w-full px-4 py-3 bg-synthwave-bg-primary/50 border-2 ${
                  errors.message ? 'border-red-500' : 'border-synthwave-neon-cyan/30'
                } rounded-lg text-synthwave-text-primary font-rajdhani focus:outline-none focus:border-synthwave-neon-cyan transition-colors duration-300 resize-vertical`}
                placeholder="Tell us more about your interest..."
              />
              {errors.message && (
                <p className="mt-2 text-red-400 font-rajdhani text-sm">{errors.message}</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
              <button
                type="submit"
                disabled={agentState.isSubmitting}
                className={`${
                  contactType === 'waitlist' ? themeClasses.neonButton :
                  contactType === 'collaborate' ? themeClasses.cyanButton : themeClasses.neonButton
                } disabled:opacity-50 disabled:cursor-not-allowed min-w-48`}
              >
                {agentState.isSubmitting ? 'Sending...' : 'Send Message'}
              </button>

              <button
                type="button"
                onClick={handleCancel}
                className="bg-transparent border-2 border-synthwave-text-secondary text-synthwave-text-secondary px-8 py-3 rounded-lg font-rajdhani font-semibold text-lg uppercase tracking-wide cursor-pointer transition-all duration-300 hover:border-synthwave-text-primary hover:text-synthwave-text-primary min-w-48"
              >
                Cancel
              </button>
            </div>
          </form>
        </NeonBorder>
      </div>
    </div>
  );
}

export default ContactForm;