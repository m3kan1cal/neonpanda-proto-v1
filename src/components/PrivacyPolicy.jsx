import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  containerPatterns,
  layoutPatterns,
  typographyPatterns,
  buttonPatterns
} from '../utils/uiPatterns';
import Footer from './shared/Footer';

function PrivacyPolicy() {
  const navigate = useNavigate();

  // Auto-scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const handleContactUs = () => {
    navigate('/contact?type=general');
  };

  return (
    <div className={layoutPatterns.pageContainer}>
      <div className={layoutPatterns.contentWrapper}>
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className={typographyPatterns.pageTitle}>
            Privacy <span className="text-synthwave-neon-pink">Policy</span>
          </h1>
          <p className={`${typographyPatterns.description} max-w-3xl mx-auto`}>
            How we collect, use, and protect your personal information when you use NeonPanda's transparent AI coaching platform and related services, with complete visibility into our responsible AI practices.
          </p>
        </div>

        {/* Main Content */}
        <div className={`${containerPatterns.mainContent} p-8 md:p-12 space-y-16`}>

          {/* Last Updated */}
          <section className="space-y-4">
            <p className={`${typographyPatterns.description} text-synthwave-neon-cyan font-semibold`}>
              Last Updated: September 19, 2025
            </p>
            <p className={typographyPatterns.description}>
              This Privacy Policy describes how NeonPanda, LLC ("we," "us," or "our") collects, uses, and shares your personal information when you use our AI fitness coaching platform and related services. We are committed to transparent, explainable AI practices and give you complete control over how your data is used to personalize your coaching experience.
            </p>
          </section>

          {/* Information We Collect */}
          <section className="space-y-8">
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan`}>
              Information We Collect
            </h2>

            <div className="space-y-6">
              <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-pink text-xl mb-3`}>
                Information You Provide
              </h3>
              <ul className="space-y-3 text-synthwave-text-primary font-rajdhani text-lg ml-6">
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                  <span><strong className="text-synthwave-neon-pink">Account Information:</strong> Name, email address, password, and profile details</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                  <span><strong className="text-synthwave-neon-pink">Fitness Information:</strong> Goals, preferences, equipment, injury history, and training experience</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                  <span><strong className="text-synthwave-neon-pink">Workout Data:</strong> Exercise logs, performance metrics, and progress tracking</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                  <span><strong className="text-synthwave-neon-pink">Communications:</strong> Messages with your AI coach, feedback, and support requests</span>
                </li>
              </ul>
            </div>

            <div className="space-y-6">
              <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-cyan text-xl mb-3`}>
                Information We Collect Automatically
              </h3>
              <ul className="space-y-3 text-synthwave-text-primary font-rajdhani text-lg ml-6">
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">•</span>
                  <span><strong className="text-synthwave-neon-cyan">Usage Data:</strong> How you interact with our platform, features used, and session duration</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">•</span>
                  <span><strong className="text-synthwave-neon-cyan">Device Information:</strong> IP address, browser type, operating system, and device identifiers</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">•</span>
                  <span><strong className="text-synthwave-neon-cyan">Performance Data:</strong> App performance, error reports, and system diagnostics</span>
                </li>
              </ul>
            </div>
          </section>

          {/* How We Use Information */}
          <section className="space-y-8">
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink`}>
              How We Use Your Information
            </h2>

            <div className="space-y-6">
              <p className={typographyPatterns.description}>
                We use your information to provide and improve our AI coaching services:
              </p>
              <ul className="space-y-3 text-synthwave-text-primary font-rajdhani text-lg ml-6">
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                  <span>Personalize your AI coach's behavior and recommendations</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                  <span>Generate custom workout programs and track your progress</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                  <span>Provide analytics and insights about your fitness journey</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                  <span>Improve our AI models and platform functionality using explainable, responsible methods</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                  <span>Communicate with you about your account and our services</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                  <span>Ensure platform security and prevent unauthorized access</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Information Sharing */}
          <section className="space-y-8">
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-purple`}>
              Information Sharing and Disclosure
            </h2>

            <div className="space-y-6">
              <p className={typographyPatterns.description}>
                <strong className="text-synthwave-neon-purple">We do not sell your personal information.</strong> We may share your information only in the following circumstances:
              </p>
              <ul className="space-y-3 text-synthwave-text-primary font-rajdhani text-lg ml-6">
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-purple mt-1 flex-shrink-0">•</span>
                  <span><strong className="text-synthwave-neon-purple">Service Providers:</strong> Trusted third parties who help us operate our platform (cloud hosting, analytics, customer support)</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-purple mt-1 flex-shrink-0">•</span>
                  <span><strong className="text-synthwave-neon-purple">Legal Requirements:</strong> When required by law, court order, or to protect our rights and safety</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-purple mt-1 flex-shrink-0">•</span>
                  <span><strong className="text-synthwave-neon-purple">Business Transfers:</strong> In connection with a merger, acquisition, or sale of assets (with user notification)</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-purple mt-1 flex-shrink-0">•</span>
                  <span><strong className="text-synthwave-neon-purple">Aggregated Data:</strong> De-identified, aggregated data for research and platform improvement</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Data Security */}
          <section className="space-y-8">
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan`}>
              Data Security and Storage
            </h2>

            <div className="space-y-6">
              <p className={typographyPatterns.description}>
                We implement industry-standard security measures to protect your personal information:
              </p>
              <ul className="space-y-3 text-synthwave-text-primary font-rajdhani text-lg ml-6">
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">•</span>
                  <span>Encryption in transit and at rest using AES-256 standards</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">•</span>
                  <span>Regular security audits and penetration testing</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">•</span>
                  <span>Access controls and authentication requirements for our team</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-cyan mt-1 flex-shrink-0">•</span>
                  <span>Data stored in secure, compliant cloud infrastructure</span>
                </li>
              </ul>
            </div>
          </section>

          {/* AI Transparency */}
          <section className="space-y-8">
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-purple`}>
              AI Transparency and Explainability
            </h2>

            <div className="space-y-6">
              <p className={typographyPatterns.description}>
                <strong className="text-synthwave-neon-purple">We believe you should understand how AI affects your coaching experience.</strong> Here's how we ensure transparency:
              </p>
              <ul className="space-y-3 text-synthwave-text-primary font-rajdhani text-lg ml-6">
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-purple mt-1 flex-shrink-0">•</span>
                  <span><strong className="text-synthwave-neon-purple">Decision Explanations:</strong> Every AI recommendation comes with clear reasoning you can understand</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-purple mt-1 flex-shrink-0">•</span>
                  <span><strong className="text-synthwave-neon-purple">Data Usage Visibility:</strong> You can see exactly how your data influences your coach's behavior</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-purple mt-1 flex-shrink-0">•</span>
                  <span><strong className="text-synthwave-neon-purple">Learning Transparency:</strong> Track how your AI coach adapts and learns from your interactions</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-purple mt-1 flex-shrink-0">•</span>
                  <span><strong className="text-synthwave-neon-purple">Bias Prevention:</strong> Regular audits ensure our AI systems treat all users fairly and without discrimination</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-purple mt-1 flex-shrink-0">•</span>
                  <span><strong className="text-synthwave-neon-purple">Control Mechanisms:</strong> Adjust or override any AI decision that doesn't feel right for your situation</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Your Rights */}
          <section className="space-y-8">
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink`}>
              Your Privacy Rights
            </h2>

            <div className="space-y-6">
              <p className={typographyPatterns.description}>
                You have the following rights regarding your personal information:
              </p>
              <ul className="space-y-3 text-synthwave-text-primary font-rajdhani text-lg ml-6">
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                  <span><strong className="text-synthwave-neon-pink">Access:</strong> Request a copy of the personal information we hold about you</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                  <span><strong className="text-synthwave-neon-pink">Correction:</strong> Request correction of inaccurate or incomplete information</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                  <span><strong className="text-synthwave-neon-pink">Deletion:</strong> Request deletion of your personal information (subject to certain limitations)</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                  <span><strong className="text-synthwave-neon-pink">Portability:</strong> Request a portable copy of your data in a structured format</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                  <span><strong className="text-synthwave-neon-pink">Opt-out:</strong> Unsubscribe from marketing communications at any time</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                  <span><strong className="text-synthwave-neon-pink">AI Transparency:</strong> Request detailed explanations of any AI decision affecting your experience</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-pink mt-1 flex-shrink-0">•</span>
                  <span><strong className="text-synthwave-neon-pink">Algorithm Control:</strong> Adjust how AI systems learn from your data and make recommendations</span>
                </li>
              </ul>
              <p className={`${typographyPatterns.description} mt-6`}>
                To exercise these rights, contact us at <a href="mailto:legal@neonpanda.ai" className="text-synthwave-neon-pink hover:text-synthwave-neon-cyan transition-colors">legal@neonpanda.ai</a>.
              </p>
            </div>
          </section>

          {/* Cookies and Tracking */}
          <section className="space-y-8">
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-purple`}>
              Cookies and Tracking Technologies
            </h2>

            <div className="space-y-6">
              <p className={typographyPatterns.description}>
                We use cookies and similar technologies to enhance your experience and analyze platform usage. You can control cookie preferences through your browser settings.
              </p>
              <ul className="space-y-3 text-synthwave-text-primary font-rajdhani text-lg ml-6">
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-purple mt-1 flex-shrink-0">•</span>
                  <span><strong className="text-synthwave-neon-purple">Essential Cookies:</strong> Required for platform functionality and security</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-purple mt-1 flex-shrink-0">•</span>
                  <span><strong className="text-synthwave-neon-purple">Analytics Cookies:</strong> Help us understand how users interact with our platform</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-purple mt-1 flex-shrink-0">•</span>
                  <span><strong className="text-synthwave-neon-purple">Preference Cookies:</strong> Remember your settings and personalization choices</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Children's Privacy */}
          <section className="space-y-8">
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan`}>
              Children's Privacy
            </h2>

            <div className="space-y-6">
              <p className={typographyPatterns.description}>
                NeonPanda is not intended for children under 13 years of age. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately.
              </p>
            </div>
          </section>

          {/* Changes to Policy */}
          <section className="space-y-8">
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink`}>
              Changes to This Privacy Policy
            </h2>

            <div className="space-y-6">
              <p className={typographyPatterns.description}>
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on our website and updating the "Last Updated" date. Your continued use of our services after changes become effective constitutes acceptance of the updated policy.
              </p>
            </div>
          </section>

          {/* Contact Section */}
          <section className="space-y-8">
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-purple`}>
              Contact Us
            </h2>
            <div className="text-center space-y-6">
              <p className={`${typographyPatterns.description} text-lg max-w-4xl mx-auto`}>
                If you have questions about this Privacy Policy or our privacy practices, contact us at <a href="mailto:legal@neonpanda.ai" className="text-synthwave-neon-pink hover:text-synthwave-neon-cyan transition-colors">legal@neonpanda.ai</a> or through our general contact form.
              </p>

              <div className="flex flex-col sm:flex-row gap-6 justify-center mt-12">
                <button
                  onClick={handleContactUs}
                  className={`${buttonPatterns.heroCTA} min-w-48`}
                >
                  Contact Us
                </button>
              </div>

              <div className="mt-8">
                <p className={`${typographyPatterns.caption} text-synthwave-neon-purple uppercase tracking-wider`}>
                  Your privacy is our priority
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default PrivacyPolicy;
