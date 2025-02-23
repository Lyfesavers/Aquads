import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';

const Terms = () => {
  return (
    <div className="h-screen overflow-y-auto text-white">
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
            <div className="flex items-center">
              <Link to="/" className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500 glow-text">
                AQUADS
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        <div className="prose prose-invert">
          <h1 className="text-4xl font-bold mb-4">Terms and Conditions</h1>
          <p className="text-gray-400 mb-8">Effective Date: 02/22/2025</p>

          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">1. Acceptance of Terms</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">Agreement:</span> By accessing and using the Site and Services, you agree to be bound by these Terms and any future amendments.</p>
                <p><span className="text-blue-400 font-semibold">Additional Policies:</span> Your use of our Services is also governed by our Privacy Policy, Cookie Policy, and any additional guidelines posted on the Site.</p>
              </div>
            </section>

            {/* Continue with other sections following the same pattern */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">2. Description of Services</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">Overview</h3>
                  <p>Aquads.xyz is a digital marketplace connecting freelancers and employers within the Web3 and crypto space. Our Services include:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-2">
                    <li>A dynamic advertising system tailored for crypto projects</li>
                    <li>A specialized freelancer marketplace</li>
                    <li>A real-time token information hub</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">3. User Categories</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <div className="space-y-3">
                  <p><span className="text-blue-400 font-semibold">Freelancers:</span> Independent contractors who offer their services on the platform.</p>
                  <p><span className="text-blue-400 font-semibold">Employers:</span> Individuals or organizations seeking to hire Freelancers.</p>
                  <p><span className="text-blue-400 font-semibold">General Users:</span> Visitors or registered users who use the Site for information or community engagement.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">4. Registration and Account Responsibility</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">Account Creation:</span> To access certain features, you must register for an account. During registration, you agree to provide accurate and complete information.</p>
                <p><span className="text-blue-400 font-semibold">Security:</span> You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>
                <p><span className="text-blue-400 font-semibold">Eligibility:</span> You must be at least 18 years old and have the legal capacity to enter into these Terms.</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">5. User Conduct and Obligations</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">General Conduct</h3>
                  <p>You agree to use the Services only for lawful purposes and in compliance with these Terms. You must not:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-2">
                    <li>Engage in fraudulent, abusive, or harmful activities</li>
                    <li>Post or transmit content that is defamatory, obscene, or infringes upon the rights of others</li>
                    <li>Attempt to gain unauthorized access to any part of the Site</li>
                  </ul>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">6. Fees, Payments, and Commission</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Affiliate Commissions</h3>
                    <ul className="list-disc pl-6 space-y-2">
                      <li>Tier 1: $2,500 in referred sales earns a 10% commission</li>
                      <li>Tier 2: $5,000 in referred sales earns a 15% commission</li>
                      <li>Tier 3: $25,000 in referred sales earns a 20% commission</li>
                    </ul>
                  </div>
                  <p><span className="text-blue-400 font-semibold">Taxes:</span> All affiliates are responsible for their own tax filings.</p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">7. Intellectual Property</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">Aquads' IP:</span> All content, design elements, logos, and software on Aquads.xyz are owned by Aquads or its licensors.</p>
                <p><span className="text-blue-400 font-semibold">User Content:</span> You retain ownership of any content you post but grant Aquads a nonexclusive license to use and display your content.</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">8. Disclaimers and Limitation of Liability</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">No Warranty:</span> The Services are provided "as is" and "as available," without any warranties of any kind.</p>
                <p><span className="text-blue-400 font-semibold">Limitation of Liability:</span> Aquads shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Services.</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">9. Dispute Resolution</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">Governing Law:</span> These Terms shall be governed by and construed in accordance with the laws of Ontario Canada.</p>
                <p><span className="text-blue-400 font-semibold">Resolution Process:</span> Any disputes shall be resolved through binding arbitration in Ontario Canada.</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">10. Termination</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">Termination by Aquads:</span> We reserve the right to suspend or terminate your access to the Services at any time.</p>
                <p><span className="text-blue-400 font-semibold">Termination by You:</span> You may terminate your account at any time by ceasing use of the Services.</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">11. Amendments</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
                <p>Aquads reserves the right to modify these Terms at any time. We will notify you of material changes by posting an updated version on the Site.</p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">Contact Information</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
                <p className="mb-4">For questions about these Terms, please contact us at:</p>
                <ul className="space-y-2">
                  <li>
                    <span className="text-blue-400">Email:</span>{' '}
                    <a href="mailto:aquads.info@gmail.com" className="text-blue-400 hover:text-blue-300">
                      aquads.info@gmail.com
                    </a>
                  </li>
                  <li>
                    <span className="text-blue-400">Telegram:</span>{' '}
                    <a href="https://t.co/TE6WbzWh9K" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                      Join our Telegram
                    </a>
                  </li>
                  <li>
                    <span className="text-blue-400">Website:</span>{' '}
                    <a href="https://aquads.xyz" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                      aquads.xyz
                    </a>
                  </li>
                </ul>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms; 