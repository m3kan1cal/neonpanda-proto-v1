import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  buttonPatterns,
  containerPatterns,
  layoutPatterns,
  typographyPatterns
} from '../utils/uiPatterns';
import { useToast } from '../contexts/ToastContext';
import ContactFormAgent from '../utils/agents/ContactFormAgent';
import FormInput from './shared/FormInput';
import Footer from './shared/Footer';

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

  // Form UI state
  const [formUIState, setFormUIState] = useState('form'); // 'form' | 'success'

  // Auto-scroll to top on page load
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Initialize agent
  useEffect(() => {
    if (!agentRef.current) {
      agentRef.current = new ContactFormAgent({
        onStateChange: (newState) => {
          setAgentState(newState);
        },
        onSuccess: (message) => {
          // Show success state instead of toast + redirect
          setFormUIState('success');
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

  const handleReturnHome = () => {
    navigate('/');
  };

  const handleSubmitAnother = () => {
    setFormUIState('form');
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      subject: '',
      message: '',
      contactType: contactType
    });
    setErrors({});
  };

  const getPageTitle = () => {
    switch (contactType) {
      case 'waitlist':
        return 'Get Early Access';
      case 'collaborate':
        return 'Let\'s Collaborate';
      default:
        return 'Contact Us';
    }
  };

  const getPageDescription = () => {
    switch (contactType) {
      case 'waitlist':
        return 'Ready to build your perfect AI coach? Get exclusive early access and be among the first to experience the future of personalized coaching.';
      case 'collaborate':
        return 'Interested in helping shape the future of AI fitness coaching? We\'d love to hear from you and explore collaboration opportunities.';
      default:
        return 'Have questions about NeonPanda or curious about AI-powered fitness coaching? Whether you want to share feedback, explore our technology, or just connect, we\'d love to hear from you.';
    }
  };

  const getSuccessMessage = () => {
    switch (contactType) {
      case 'waitlist':
        return {
          title: 'Early Access Granted!',
          message: 'You\'re in! We\'ll notify you as soon as NeonPanda is ready to transform your fitness journey. Get ready for exclusive early access to the future of AI-powered coaching.',
          icon: '🎉'
        };
      case 'collaborate':
        return {
          title: 'Let\'s Build the Future Together!',
          message: 'Thank you for your interest in collaborating with NeonPanda. Our team will review your message and get back to you within 24-48 hours to discuss potential opportunities.',
          icon: '🤝'
        };
      default:
        return {
          title: 'Message Sent Successfully!',
          message: 'We\'ve received your message and our team will get back to you soon. Thank you for reaching out to NeonPanda!',
          icon: '✅'
        };
    }
  };

  return (
    <div className={`${layoutPatterns.pageContainer} flex flex-col`}>
      <div className={`${layoutPatterns.contentWrapper} flex-grow`}>
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className={typographyPatterns.pageTitle}>
            {formUIState === 'success' ? getSuccessMessage().title : getPageTitle()}
          </h1>
          <p className={`${typographyPatterns.description} max-w-3xl mx-auto`}>
            {formUIState === 'success' ? getSuccessMessage().message : getPageDescription()}
          </p>
        </div>

        {/* Success State */}
        {formUIState === 'success' && (
          <div className={`${containerPatterns.mainContent} p-8 md:p-12 text-center`}>
            <div className="text-6xl mb-6">
              {getSuccessMessage().icon}
            </div>

            <h2 className={`${typographyPatterns.sectionTitle} mb-6`}>
              What's Next?
            </h2>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleReturnHome}
                className={`${buttonPatterns.primary} min-w-48`}
              >
                Return Home
              </button>

              <button
                onClick={handleSubmitAnother}
                className={`${buttonPatterns.secondary} min-w-48`}
              >
                Submit Another
              </button>
            </div>
          </div>
        )}

        {/* Form */}
        {formUIState === 'form' && (
          <div className={`${containerPatterns.mainContent} p-8 md:p-12`}>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormInput
                label="First Name"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleInputChange}
                placeholder="Enter your first name"
                error={errors.firstName}
                required
              />

              <FormInput
                label="Last Name"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleInputChange}
                placeholder="Enter your last name"
                error={errors.lastName}
                required
              />
            </div>

            {/* Email Field */}
            <FormInput
              label="Email Address"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="your.email@example.com"
              error={errors.email}
              required
            />

            {/* Subject Field */}
            <FormInput
              label="Subject"
              name="subject"
              type="text"
              value={formData.subject}
              onChange={handleInputChange}
              placeholder="Enter subject"
              error={errors.subject}
              required
            />

            {/* Message Field */}
            <FormInput
              label="Message"
              name="message"
              type="textarea"
              value={formData.message}
              onChange={handleInputChange}
              placeholder="Tell us more about your interest..."
              error={errors.message}
              rows={8}
              required
            />

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-3">
              <button
                type="submit"
                disabled={agentState.isSubmitting}
                className={`${buttonPatterns.primary} disabled:opacity-50 disabled:cursor-not-allowed min-w-48`}
              >
                {agentState.isSubmitting ? 'Sending...' : 'Send Message'}
              </button>

              <button
                type="button"
                onClick={handleCancel}
                className={`${buttonPatterns.secondary} min-w-48`}
              >
                Cancel
              </button>
            </div>
          </form>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}

export default ContactForm;