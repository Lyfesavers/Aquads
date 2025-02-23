import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';

const Terms = () => {
  return (
    <div className="h-screen overflow-y-auto text-white">
      <Helmet>
        <title>Terms and Conditions - Aquads</title>
        <meta name="description" content="Terms and Conditions for using Aquads - The AllinOne Web3 Crypto Hub and Freelancer Marketplace" />
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
          <h1 className="text-4xl font-bold mb-4">Aquads.xyz Terms and Conditions</h1>
          <p className="text-gray-400 mb-8">Effective Date: 02/22/2025</p>

          <div className="space-y-8">
            {/* Welcome Section */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
              <p className="mb-4">
                Welcome to Aquads.xyz (the "Site"), the AllinOne Web3 Crypto Hub and Freelancer Marketplace. These Terms and Conditions ("Terms") govern your use of our website, mobile applications, and all related services (collectively, the "Services") provided by Aquads ("we," "us," or "our"). By accessing or using our Services, you agree to be bound by these Terms and our Privacy Policy. If you do not agree with these Terms, please do not use our Services.
              </p>
            </div>

            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">1. Acceptance of Terms</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">Agreement:</span> By accessing and using the Site and Services, you agree to be bound by these Terms and any future amendments.</p>
                <p><span className="text-blue-400 font-semibold">Additional Policies:</span> Your use of our Services is also governed by our Privacy Policy, Cookie Policy, and any additional guidelines posted on the Site. These documents are incorporated by reference.</p>
              </div>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">2. Description of Services</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <div>
                  <p className="mb-2"><span className="text-blue-400 font-semibold">Overview:</span></p>
                  <p className="mb-2">Aquads.xyz is a digital marketplace connecting freelancers ("Freelancers") and employers ("Employers") within the Web3 and crypto space. Our Services include:</p>
                  <ul className="list-disc pl-6 mb-4">
                    <li>A dynamic advertising system tailored for crypto projects.</li>
                    <li>A specialized freelancer marketplace.</li>
                    <li>A real-time token information hub.</li>
                  </ul>
                </div>
                <div>
                  <p><span className="text-blue-400 font-semibold">Purpose:</span> Our aim is to provide a secure, efficient, and supportive environment where Freelancers and Employers can connect, collaborate, and grow their businesses.</p>
                </div>
              </div>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">3. User Categories</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">Freelancers:</span> Independent contractors who offer their services on the platform.</p>
                <p><span className="text-blue-400 font-semibold">Employers:</span> Individuals or organizations seeking to hire Freelancers.</p>
                <p><span className="text-blue-400 font-semibold">General Users:</span> Visitors or registered users who use the Site for information or community engagement.</p>
              </div>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">4. Registration and Account Responsibility</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">Account Creation:</span> To access certain features, you must register for an account. During registration, you agree to provide accurate and complete information. Your chosen username may serve as your referral code if you opt into our affiliate program.</p>
                <p><span className="text-blue-400 font-semibold">Security:</span> You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. Notify us immediately of any unauthorized use.</p>
                <p><span className="text-blue-400 font-semibold">Eligibility:</span> You must be at least 18 years old and have the legal capacity to enter into these Terms. By registering, you represent that you meet these requirements.</p>
              </div>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">5. User Conduct and Obligations</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <div>
                  <p><span className="text-blue-400 font-semibold">General Conduct:</span></p>
                  <p className="mb-2">You agree to use the Services only for lawful purposes and in compliance with these Terms. You must not:</p>
                  <ul className="list-disc pl-6 mb-4">
                    <li>Engage in fraudulent, abusive, or harmful activities.</li>
                    <li>Post or transmit content that is defamatory, obscene, or infringes upon the rights of others.</li>
                    <li>Attempt to gain unauthorized access to any part of the Site.</li>
                  </ul>
                </div>
                <p><span className="text-blue-400 font-semibold">Freelancers and Employers:</span> Both parties are responsible for their communications and engagements. Aquads.xyz is a neutral intermediary; disputes should be resolved directly between users in accordance with the dispute resolution procedures outlined below.</p>
              </div>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">6. Fees, Payments, and Commission (If Applicable)</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">Service Fees:</span> Certain premium features or job postings may incur fees. These fees will be clearly displayed prior to purchase.</p>
                
                <div>
                  <p><span className="text-blue-400 font-semibold">Affiliate Commissions:</span></p>
                  <p className="mb-2">For users participating in the affiliate program:</p>
                  <ul className="list-disc pl-6 mb-4">
                    <li>Tier 1: $2,500 in referred sales earns a 10% commission.</li>
                    <li>Tier 2: $5,000 in referred sales earns a 15% commission.</li>
                    <li>Tier 3: $25,000 in referred sales earns a 20% commission.</li>
                  </ul>
                  <p className="mb-4">Commissions are calculated based on Aquads profits generated from referred users. Payouts are issued when your commission balance reaches a minimum of $100, via crypto or other approved methods.</p>
                </div>
                
                <p><span className="text-blue-400 font-semibold">Taxes:</span> All affiliates are independent contractors and are solely responsible for their own tax filings. Aquads does not withhold any taxes from commission payments, and all earnings are considered gross income for the recipient.</p>
              </div>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">7. Intellectual Property</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">Aquads' IP:</span> All content, design elements, logos, and software on Aquads.xyz are owned by Aquads or its licensors. You may not reproduce, modify, or distribute any of this intellectual property without prior written consent.</p>
                <p><span className="text-blue-400 font-semibold">User Content:</span> You retain ownership of any content you post. However, by posting content on the Site, you grant Aquads a nonexclusive, worldwide, royalty-free license to use, display, and distribute your content solely to operate and promote the Services.</p>
              </div>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">8. Disclaimers and Limitation of Liability</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">No Warranty:</span> The Services are provided "as is" and "as available," without any warranties of any kind, either express or implied. Aquads does not guarantee uninterrupted or error-free service.</p>
                <p><span className="text-blue-400 font-semibold">Limitation of Liability:</span> To the fullest extent permitted by law, Aquads shall not be liable for any indirect, incidental, or consequential damages arising from your use of the Services. In no event shall our total liability exceed the fees paid by you to Aquads in the 12 months preceding the claim.</p>
                <p><span className="text-blue-400 font-semibold">Risk Acknowledgment:</span> You acknowledge that using a digital platform and engaging in online transactions involves inherent risks, and you agree to use the Services at your own risk.</p>
              </div>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">9. Dispute Resolution</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">Governing Law:</span> These Terms shall be governed by and construed in accordance with the laws of Ontario Canada, without regard to its conflict of law provisions.</p>
                <p><span className="text-blue-400 font-semibold">Resolution Process:</span> Any disputes arising from these Terms or your use of the Services shall be resolved through binding arbitration in Ontario Canada or, if arbitration is not applicable, in the courts of Ontario Canada. You hereby waive your right to a jury trial.</p>
              </div>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">10. Termination</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">Termination by Aquads:</span> We reserve the right to suspend or terminate your access to the Services at any time for any reason, without liability.</p>
                <p><span className="text-blue-400 font-semibold">Termination by You:</span> You may terminate your account at any time by ceasing use of the Services. Any outstanding fees or commissions will remain payable.</p>
                <p><span className="text-blue-400 font-semibold">Survival:</span> The provisions regarding intellectual property, disclaimers, and limitations of liability will survive termination.</p>
              </div>
            </section>

            {/* Section 11 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">11. Amendments</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
                <p>Aquads reserves the right to modify these Terms at any time. We will notify you of material changes by posting an updated version on the Site. Your continued use of the Services constitutes acceptance of the updated Terms.</p>
              </div>
            </section>

            {/* Section 12 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">12. Miscellaneous</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">Entire Agreement:</span> These Terms, together with our Privacy Policy and any other policies referenced herein, constitute the entire agreement between you and Aquads regarding the use of the Services.</p>
                <p><span className="text-blue-400 font-semibold">Severability:</span> If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall remain in full force and effect.</p>
              </div>
            </section>

            {/* Contact Information */}
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
                      https://t.co/TE6WbzWh9K
                    </a>
                  </li>
                  <li>
                    <span className="text-blue-400">Website:</span>{' '}
                    <a href="https://aquads.xyz" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                      https://aquads.xyz
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