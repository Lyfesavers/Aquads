import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';

const PrivacyPolicy = () => {
  return (
    <div className="h-screen overflow-y-auto text-white">
      <Helmet>
        <title>Privacy Policy - Aquads</title>
        <meta name="description" content="Privacy Policy for Aquads - World's First BEX - Bicentralized Exchange Hub" />
      </Helmet>

      {/* Fixed Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-black to-black"></div>
        <div className="tech-lines"></div>
        <div className="tech-dots"></div>
      </div>

      {/* Fixed Navigation */}
      <nav className="sticky top-0 bg-gray-800/80 backdrop-blur-sm shadow-lg shadow-blue-500/20 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center" style={{padding: '0', margin: '0'}}>
              <Link to="/" className="flex items-center" style={{padding: '0', margin: '0'}}>
                <img 
                  src="/Aquadsnewlogo.svg" 
                  alt="AQUADS" 
                  className="w-auto filter drop-shadow-lg"
                  style={{height: '2rem', filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.6))', padding: '0', margin: '0'}}
                />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        <div className="prose prose-invert">
          <h1 className="text-4xl font-bold mb-4">Aquads.xyz Privacy Policy</h1>
          <p className="text-gray-400 mb-8">Effective Date: June 25, 2025</p>

          <div className="space-y-8">
            {/* Welcome Section */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
              <p className="mb-4">
                Aquads.xyz ("Aquads", "we", "us", "our") operates Aquads.xyz and related services ("Services"). This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you access or use our Services. By using our Services, you consent to the practices described in this policy.
              </p>
            </div>

            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">1. Information We Collect</h2>
              
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-blue-300">1.1 Information You Provide</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><span className="text-blue-400 font-semibold">Account Information:</span> Name, email address, username.</li>
                    <li><span className="text-blue-400 font-semibold">Profile Details:</span> Bio, skills, portfolio links if you participate in the Freelancer Hub.</li>
                    <li><span className="text-blue-400 font-semibold">Communications:</span> Messages you send through our support channels.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3 text-blue-300">1.2 Automatically Collected Information</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><span className="text-blue-400 font-semibold">Usage Analytics:</span> Pages visited, features used, session duration, clickstreams.</li>
                    <li><span className="text-blue-400 font-semibold">Device & Log Data:</span> IP address, browser type, operating system, device identifiers.</li>
                    <li><span className="text-blue-400 font-semibold">Cookies & Tracking:</span> Data from cookies, web beacons, and similar technologies (see Section 5).</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3 text-blue-300">1.3 Third-Party Data</h3>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><span className="text-blue-400 font-semibold">Service Partners:</span> We receive identity verification and transaction data from Transak, LiFi, and Reown, and marketing performance data from Coinbound.io.</li>
                    <li><span className="text-blue-400 font-semibold">Public Sources:</span> Information you make publicly available (e.g., social profiles) if you link them to your account.</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">2. How We Use Your Information</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
                <ul className="list-disc pl-6 space-y-2">
                  <li><span className="text-blue-400 font-semibold">Provide & Improve Services:</span> To deliver features, maintain security, and optimize user experience.</li>
                  <li><span className="text-blue-400 font-semibold">Freelancer Hub Referrals:</span> Match Employers with Freelancers and track referral metrics.</li>
                  <li><span className="text-blue-400 font-semibold">Marketing & PR:</span> Share provided content with Coinbound.io and PR outlets to execute campaigns.</li>
                  <li><span className="text-blue-400 font-semibold">Analytics & Research:</span> Aggregate usage data to analyze trends and performance.</li>
                  <li><span className="text-blue-400 font-semibold">Communications:</span> Send transactional emails, updates, and promotional messages (opt-out available).</li>
                </ul>
              </div>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">3. Data Sharing & Disclosure</h2>
              
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-blue-300">3.1 Third-Party Partners</h3>
                  <p className="mb-3">We share necessary data with:</p>
                  <ul className="list-disc pl-6 space-y-2">
                    <li><span className="text-blue-400 font-semibold">Transak & LiFi:</span> For on-ramp/off-ramp transactions and cross-chain swaps.</li>
                    <li><span className="text-blue-400 font-semibold">Reown:</span> For wallet linking and identity confirmation.</li>
                    <li><span className="text-blue-400 font-semibold">Coinbound.io & PR Outlets:</span> For marketing campaigns and publications.</li>
                    <li><span className="text-blue-400 font-semibold">Analytics Providers:</span> For performance tracking (e.g., Google Analytics).</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3 text-blue-300">3.2 Legal Requirements</h3>
                  <p>We may disclose information to comply with legal obligations, enforce Terms, or protect rights.</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-3 text-blue-300">3.3 Business Transfers</h3>
                  <p>In the event of a merger, acquisition, or asset sale, personal data may be transferred.</p>
                </div>
              </div>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">4. Data Retention</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
                <p>We retain your personal data only as long as necessary to fulfill the purposes outlined in this Privacy Policy and comply with legal obligations. Removal requests: contact <a href="mailto:info@aquads.xyz" className="text-blue-400 hover:text-blue-300">info@aquads.xyz</a>.</p>
              </div>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">5. Cookies & Tracking Technologies</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p>We use cookies and similar technologies to:</p>
                <ul className="list-disc pl-6 space-y-2">
                  <li>Enable core functionality (authentication, security).</li>
                  <li>Analyze site performance and user behavior.</li>
                  <li>Personalize content and features.</li>
                </ul>
                <p>You can manage cookie preferences via your browser settings or our Cookie Policy page.</p>
              </div>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">6. Your Privacy Rights</h2>
              
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2 text-blue-300">6.1 Access & Correction</h3>
                  <p>You may request access to or correction of your personal data by contacting us.</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2 text-blue-300">6.2 Deletion & Portability</h3>
                  <p>You can request deletion of your data or a copy of your data in a machine-readable format.</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2 text-blue-300">6.3 Objection & Restriction</h3>
                  <p>You may object to processing or request restriction of processing under applicable law.</p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2 text-blue-300">6.4 Opt-Out</h3>
                  <p>You can opt out of marketing communications by following unsubscribe links or contacting us.</p>
                </div>
              </div>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">7. Security</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
                <p>We implement reasonable security measures (encryption, access controls) to protect personal data. However, no system is completely secure.</p>
              </div>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">8. Children's Privacy</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
                <p>Our Services are not directed to individuals under 18. We do not knowingly collect personal data from minors. Contact us to delete any information if provided inadvertently.</p>
              </div>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">9. International Transfers</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
                <p>Your data may be processed in venues outside your jurisdiction (e.g., Canada, EU). We ensure adequate safeguards under applicable law.</p>
              </div>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">10. Changes to This Policy</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
                <p>We may update this policy when necessary. Material changes will be communicated via email or site notice. Continued use after changes indicates acceptance.</p>
              </div>
            </section>

            {/* Section 11 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">11. Contact Us</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-2">
                <p>If you have questions or requests regarding this Privacy Policy, please contact:</p>
                <p>Email: <a href="mailto:info@aquads.xyz" className="text-blue-400 hover:text-blue-300">info@aquads.xyz</a></p>
                <p>Telegram: <a href="https://t.me/aquads_support" className="text-blue-400 hover:text-blue-300" target="_blank" rel="noopener noreferrer">https://t.me/aquads_support</a></p>
              </div>
            </section>

            {/* Closing Message */}
            <div className="bg-gradient-to-r from-blue-800/50 to-purple-800/50 backdrop-blur-sm rounded-lg p-6 text-center">
              <p className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                Aquads.xyz — Building a better Web3 experience, responsibly.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy; 