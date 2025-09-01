import { submitContactForm } from '../apis/contactApi';

/**
 * ContactFormAgent - Handles business logic for Contact Form component
 * This agent manages form submission and validation while keeping
 * the React component focused on UI concerns.
 */
export class ContactFormAgent {
  constructor(options = {}) {
    // Configuration
    this.onStateChange = options.onStateChange || (() => {});
    this.onSuccess = options.onSuccess || (() => {});
    this.onError = options.onError || (() => {});

    // State
    this.state = {
      isSubmitting: false,
      error: null,
      success: false,
    };
  }

  /**
   * Update internal state and notify component
   */
  _updateState(newState) {
    this.state = { ...this.state, ...newState };
    if (typeof this.onStateChange === 'function') {
      this.onStateChange(this.state);
    }
  }

  /**
   * Submit contact form data
   */
  async submitForm(formData) {
    this._updateState({
      isSubmitting: true,
      error: null,
      success: false
    });

    try {
      console.info('Submitting contact form:', formData);

      // Make API call to the contact form endpoint
      const result = await submitContactForm(formData);

      console.info('Form submitted successfully:', result);

      this._updateState({
        isSubmitting: false,
        success: true
      });

      // Notify success
      if (typeof this.onSuccess === 'function') {
        this.onSuccess('Thank you for your message! We\'ll get back to you soon.');
      }

      return result;
    } catch (err) {
      console.error('Submission error:', err);

      let errorMessage = 'There was an error submitting your message. Please try again.';

      // Handle validation errors specifically
      if (err.message.includes('Validation failed')) {
        errorMessage = `Please check your form: ${err.message}`;
      }

      this._updateState({
        isSubmitting: false,
        error: errorMessage
      });

      // Notify error
      if (typeof this.onError === 'function') {
        this.onError(errorMessage);
      }

      throw err;
    }
  }

  /**
   * Validate form data
   */
  validateForm(formData) {
    const errors = {};

    if (!formData.firstName.trim()) {
      errors.firstName = 'First name is required';
    }

    if (!formData.lastName.trim()) {
      errors.lastName = 'Last name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.subject.trim()) {
      errors.subject = 'Subject is required';
    }

    if (!formData.message.trim()) {
      errors.message = 'Message is required';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  /**
   * Get default form data based on contact type
   */
  getDefaultFormData(contactType) {
    let defaultSubject = '';
    let defaultMessage = '';

    switch (contactType) {
      case 'waitlist':
        defaultSubject = 'Interest in Joining the Waitlist';
        defaultMessage = "Hi there!\n\nI'm interested in joining the waitlist for CoachForge. I'd love to be notified when the platform launches and learn more about creating my personalized AI fitness coach.\n\nLooking forward to hearing from you!";
        break;
      case 'collaborate':
        defaultSubject = 'Interest in Collaboration';
        defaultMessage = "Hi!\n\nI'm interested in collaborating with CoachForge and helping build the future of AI fitness coaching. I'd love to discuss how I can contribute to the project.\n\nPlease let me know more about collaboration opportunities!";
        break;
      default:
        defaultSubject = 'General Inquiry';
        defaultMessage = "Hi there!\n\nI have a question about CoachForge and would love to learn more.\n\nThanks!";
    }

    return {
      firstName: '',
      lastName: '',
      email: '',
      subject: defaultSubject,
      message: defaultMessage,
      contactType: contactType
    };
  }

  /**
   * Get current state
   */
  getState() {
    return { ...this.state };
  }

  /**
   * Reset state
   */
  reset() {
    this._updateState({
      isSubmitting: false,
      error: null,
      success: false,
    });
  }

  /**
   * Cleanup
   */
  destroy() {
    this.state = {
      isSubmitting: false,
      error: null,
      success: false,
    };
  }
}

export default ContactFormAgent;