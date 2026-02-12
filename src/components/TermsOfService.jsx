import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  containerPatterns,
  layoutPatterns,
  typographyPatterns,
  buttonPatterns
} from '../utils/ui/uiPatterns';
import Footer from './shared/Footer';

function TermsOfService() {
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
            Terms of <span className="text-synthwave-neon-pink">Service</span>
          </h1>
          <p className={`${typographyPatterns.description} max-w-3xl mx-auto`}>
            The legal terms and conditions governing your use of NeonPanda's AI coaching platform and services, including your rights and responsibilities with our responsible and explainable AI systems.
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-5xl mx-auto space-y-16">

          {/* Last Updated */}
          <section className="space-y-4">
            <p className={`${typographyPatterns.description} text-synthwave-neon-cyan font-semibold`}>
              Last Updated: September 19, 2025
            </p>
            <p className={typographyPatterns.description}>
              These Terms of Service ("Terms") govern your use of the NeonPanda AI fitness coaching platform and related services provided by NeonPanda, LLC ("we," "us," or "our"). By using our services, you agree to these Terms and our commitment to transparent, explainable, and responsible AI practices.
            </p>
          </section>

          {/* Acceptance of Terms */}
          <section className="space-y-8">
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan`}>
              Acceptance of Terms
            </h2>

            <div className="space-y-6">
              <p className={typographyPatterns.description}>
                By accessing or using NeonPanda, you agree to be bound by these Terms and our Privacy Policy. If you do not agree to these Terms, you may not use our services.
              </p>
              <p className={typographyPatterns.description}>
                These Terms apply to all users of our platform, including free trial users, paid subscribers, and visitors to our website.
              </p>
            </div>
          </section>

          {/* Description of Service */}
          <section className="space-y-8">
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink`}>
              Description of Service
            </h2>

            <div className="space-y-6">
              <p className={typographyPatterns.description}>
                NeonPanda provides AI-powered fitness coaching services, including:
              </p>
              <ul className="space-y-3 text-synthwave-text-primary font-rajdhani text-lg ml-6">
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-pink mt-1 shrink-0">•</span>
                  <span>Personalized AI fitness coaches with customizable personalities and expertise</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-pink mt-1 shrink-0">•</span>
                  <span>Custom workout programming and exercise recommendations</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-pink mt-1 shrink-0">•</span>
                  <span>Progress tracking, analytics, and performance insights</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-pink mt-1 shrink-0">•</span>
                  <span>Conversational coaching interactions and support</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-pink mt-1 shrink-0">•</span>
                  <span>Memory and preference storage for personalized experiences</span>
                </li>
              </ul>
            </div>
          </section>

          {/* User Accounts and Registration */}
          <section className="space-y-8">
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-purple`}>
              User Accounts and Registration
            </h2>

            <div className="space-y-6">
              <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-cyan text-xl mb-3`}>
                Account Creation
              </h3>
              <ul className="space-y-3 text-synthwave-text-primary font-rajdhani text-lg ml-6">
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-cyan mt-1 shrink-0">•</span>
                  <span>You must be at least 13 years old to create an account</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-cyan mt-1 shrink-0">•</span>
                  <span>You must provide accurate and complete registration information</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-cyan mt-1 shrink-0">•</span>
                  <span>You are responsible for maintaining the security of your account credentials</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-cyan mt-1 shrink-0">•</span>
                  <span>One person may not maintain multiple accounts</span>
                </li>
              </ul>

              <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-pink text-xl mb-3 mt-8`}>
                Account Responsibility
              </h3>
              <p className={typographyPatterns.description}>
                You are responsible for all activities that occur under your account. You must immediately notify us of any unauthorized use of your account or any security breach.
              </p>
            </div>
          </section>

          {/* Acceptable Use */}
          <section className="space-y-8">
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan`}>
              Acceptable Use Policy
            </h2>

            <div className="space-y-6">
              <p className={typographyPatterns.description}>
                You agree to use NeonPanda only for lawful purposes and in accordance with these Terms. You agree NOT to:
              </p>
              <ul className="space-y-3 text-synthwave-text-primary font-rajdhani text-lg ml-6">
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-cyan mt-1 shrink-0">•</span>
                  <span>Use the service for any illegal or unauthorized purpose</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-cyan mt-1 shrink-0">•</span>
                  <span>Attempt to gain unauthorized access to our systems or other users' accounts</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-cyan mt-1 shrink-0">•</span>
                  <span>Interfere with or disrupt our services or servers</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-cyan mt-1 shrink-0">•</span>
                  <span>Upload malicious code, viruses, or harmful content</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-cyan mt-1 shrink-0">•</span>
                  <span>Share your account credentials with others</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-cyan mt-1 shrink-0">•</span>
                  <span>Reverse engineer, decompile, or attempt to extract our source code</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Medical Disclaimer */}
          <section className="space-y-8">
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink`}>
              Medical Disclaimer and Health Information
            </h2>

            <div className="space-y-6">
              <div className={containerPatterns.mediumGlassPink}>
                <p className={`${typographyPatterns.description} text-synthwave-neon-pink font-semibold mb-4`}>
                  IMPORTANT: NeonPanda is not a medical service and does not provide medical advice.
                </p>
                <ul className="space-y-3 text-synthwave-text-primary font-rajdhani text-lg ml-6">
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 shrink-0">•</span>
                    <span>Our AI coaches provide fitness guidance, not medical advice</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 shrink-0">•</span>
                    <span>Consult healthcare professionals before starting any fitness program</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 shrink-0">•</span>
                    <span>Stop exercising and seek medical attention if you experience pain or discomfort</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <span className="text-synthwave-neon-pink mt-1 shrink-0">•</span>
                    <span>You exercise at your own risk and assume full responsibility for your safety</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Payment and Subscription Terms */}
          <section className="space-y-8">
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-purple`}>
              Payment and Subscription Terms
            </h2>

            <div className="space-y-6">
              <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-cyan text-xl mb-3`}>
                Subscription Plans
              </h3>
              <ul className="space-y-3 text-synthwave-text-primary font-rajdhani text-lg ml-6">
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-cyan mt-1 shrink-0">•</span>
                  <span>Subscription fees are charged in advance on a recurring basis</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-cyan mt-1 shrink-0">•</span>
                  <span>You can cancel your subscription at any time through your account settings</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-cyan mt-1 shrink-0">•</span>
                  <span>Cancellations take effect at the end of your current billing period</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-cyan mt-1 shrink-0">•</span>
                  <span>No refunds for partial months or unused portions of your subscription</span>
                </li>
              </ul>

              <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-pink text-xl mb-3 mt-8`}>
                Free Trial
              </h3>
              <p className={typographyPatterns.description}>
                We may offer free trial periods for new users. Free trials automatically convert to paid subscriptions unless canceled before the trial period ends. You will be charged the applicable subscription fee when your trial expires.
              </p>
            </div>
          </section>

          {/* AI Transparency and Ethics */}
          <section className="space-y-8">
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-purple`}>
              AI Transparency and Responsible Use
            </h2>

            <div className="space-y-6">
              <p className={typographyPatterns.description}>
                <strong className="text-synthwave-neon-purple">NeonPanda is committed to transparent, explainable, and ethical AI.</strong> Here are your rights and our commitments:
              </p>

              <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-pink text-xl mb-3`}>
                Your AI Rights
              </h3>
              <ul className="space-y-3 text-synthwave-text-primary font-rajdhani text-lg ml-6">
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-pink mt-1 shrink-0">•</span>
                  <span><strong className="text-synthwave-neon-pink">Right to Explanation:</strong> Understand why any AI recommendation was made for your specific situation</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-pink mt-1 shrink-0">•</span>
                  <span><strong className="text-synthwave-neon-pink">Right to Control:</strong> Adjust or override any AI decision that doesn't align with your preferences</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-pink mt-1 shrink-0">•</span>
                  <span><strong className="text-synthwave-neon-pink">Right to Transparency:</strong> See how your data influences your AI coach's behavior and learning</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-pink mt-1 shrink-0">•</span>
                  <span><strong className="text-synthwave-neon-pink">Right to Fair Treatment:</strong> Our AI systems are regularly audited for bias and discrimination</span>
                </li>
              </ul>

              <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-cyan text-xl mb-3 mt-8`}>
                Our AI Commitments
              </h3>
              <ul className="space-y-3 text-synthwave-text-primary font-rajdhani text-lg ml-6">
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-cyan mt-1 shrink-0">•</span>
                  <span>All AI decisions include clear, understandable explanations</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-cyan mt-1 shrink-0">•</span>
                  <span>Regular bias audits and fairness assessments of our AI systems</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-cyan mt-1 shrink-0">•</span>
                  <span>Transparent data usage with clear visibility into how your information shapes your experience</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-cyan mt-1 shrink-0">•</span>
                  <span>Human oversight and the ability to escalate AI decisions to human review</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Intellectual Property */}
          <section className="space-y-8">
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan`}>
              Intellectual Property Rights
            </h2>

            <div className="space-y-6">
              <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-pink text-xl mb-3`}>
                Our Content
              </h3>
              <p className={typographyPatterns.description}>
                NeonPanda and all related content, including but not limited to software, digital code, APIs, services, workout programs, and user interfaces, are owned by NeonPanda, LLC and protected by intellectual property laws. We utilize third-party AI models and services under appropriate licensing agreements.
              </p>

              <h3 className={`${typographyPatterns.cardTitle} text-synthwave-neon-cyan text-xl mb-3 mt-8`}>
                Your Content
              </h3>
              <p className={typographyPatterns.description}>
                You retain ownership of any content you provide to NeonPanda. By using our services, you grant us a license to use your content to provide and improve our services, including training third-party AI models that power our platform. You maintain the right to understand how your data is used in AI training and can request explanations of how your information influences your coaching experience.
              </p>
            </div>
          </section>

          {/* Privacy and Data */}
          <section className="space-y-8">
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-purple`}>
              Privacy and Data Protection
            </h2>

            <div className="space-y-6">
              <p className={typographyPatterns.description}>
                Your privacy is important to us. Our collection and use of your personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference.
              </p>
              <p className={typographyPatterns.description}>
                By using NeonPanda, you consent to the collection and use of your information as described in our Privacy Policy.
              </p>
            </div>
          </section>

          {/* Service Availability */}
          <section className="space-y-8">
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink`}>
              Service Availability and Modifications
            </h2>

            <div className="space-y-6">
              <p className={typographyPatterns.description}>
                We strive to provide reliable service, but we cannot guarantee uninterrupted availability. We may:
              </p>
              <ul className="space-y-3 text-synthwave-text-primary font-rajdhani text-lg ml-6">
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-pink mt-1 shrink-0">•</span>
                  <span>Modify, suspend, or discontinue any part of our service at any time</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-pink mt-1 shrink-0">•</span>
                  <span>Perform maintenance that may temporarily interrupt service</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-pink mt-1 shrink-0">•</span>
                  <span>Update our Terms of Service with reasonable notice to users</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Disclaimers and Limitations */}
          <section className="space-y-8">
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan`}>
              Disclaimers and Limitation of Liability
            </h2>

            <div className="space-y-6">
              <div className={containerPatterns.mediumGlassPink}>
                <p className={`${typographyPatterns.description} text-synthwave-neon-pink font-semibold mb-4`}>
                  NEONPANDA IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND.
                </p>
                <p className={typographyPatterns.description}>
                  We disclaim all warranties, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, and non-infringement. We do not warrant that our service will be uninterrupted, error-free, or completely secure.
                </p>
                <p className={`${typographyPatterns.description} mt-4`}>
                  IN NO EVENT SHALL NEONPANDA BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES ARISING OUT OF YOUR USE OF OUR SERVICE.
                </p>
              </div>
            </div>
          </section>

          {/* Termination */}
          <section className="space-y-8">
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-purple`}>
              Termination
            </h2>

            <div className="space-y-6">
              <p className={typographyPatterns.description}>
                Either party may terminate these Terms at any time. We may terminate or suspend your account immediately if you violate these Terms. Upon termination:
              </p>
              <ul className="space-y-3 text-synthwave-text-primary font-rajdhani text-lg ml-6">
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-purple mt-1 shrink-0">•</span>
                  <span>Your access to NeonPanda will be immediately revoked</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-purple mt-1 shrink-0">•</span>
                  <span>You may request a copy of your data within 30 days</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="text-synthwave-neon-purple mt-1 shrink-0">•</span>
                  <span>We may delete your account and data after a reasonable period</span>
                </li>
              </ul>
            </div>
          </section>

          {/* Governing Law */}
          <section className="space-y-8">
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-pink`}>
              Governing Law and Dispute Resolution
            </h2>

            <div className="space-y-6">
              <p className={typographyPatterns.description}>
                These Terms are governed by the laws of the State of Delaware, United States, without regard to conflict of law principles. Any disputes arising from these Terms or your use of NeonPanda will be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.
              </p>
            </div>
          </section>

          {/* Changes to Terms */}
          <section className="space-y-8">
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-cyan`}>
              Changes to These Terms
            </h2>

            <div className="space-y-6">
              <p className={typographyPatterns.description}>
                We may update these Terms from time to time. We will notify you of any material changes by posting the updated Terms on our website and updating the "Last Updated" date. Your continued use of our services after changes become effective constitutes acceptance of the updated Terms.
              </p>
            </div>
          </section>

          {/* Contact Section */}
          <section className="space-y-8">
            <h2 className={`${typographyPatterns.sectionTitle} text-synthwave-neon-purple`}>
              Contact Information
            </h2>
            <div className="text-center space-y-6">
              <p className={`${typographyPatterns.description} text-lg max-w-4xl mx-auto`}>
                If you have questions about these Terms of Service, contact us at <a href="mailto:legal@neonpanda.ai" className="text-synthwave-neon-pink hover:text-synthwave-neon-cyan transition-colors">legal@neonpanda.ai</a> or through our general contact form.
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
                  Building the future responsibly
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

export default TermsOfService;
