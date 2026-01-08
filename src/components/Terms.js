import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';

const Terms = () => {
  return (
    <div className="h-screen overflow-y-auto text-white">
      <Helmet>
        <title>Terms & Conditions - Aquads</title>
        <meta name="description" content="Terms & Conditions for using Aquads - World's First BEX - Bicentralized Exchange Hub" />
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
              <Link to="/home" className="flex items-center">
                <img 
                  src="/Aquadsnewlogo.png" 
                  alt="AQUADS" 
                  className="w-auto filter drop-shadow-lg"
                  style={{height: '2rem', filter: 'drop-shadow(0 0 10px rgba(59, 130, 246, 0.6))'}}
                />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 py-8">
        <div className="prose prose-invert">
          <h1 className="text-4xl font-bold mb-4">Aquads.xyz Terms & Conditions</h1>
          <p className="text-gray-400 mb-8">Effective Date: June 25, 2025</p>

          <div className="space-y-8">
            {/* Welcome Section */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
              <p className="mb-4">
                Welcome to Aquads.xyz ("Aquads", "we", "us"). These Terms & Conditions ("Terms") govern your access to and use of our website, applications, and related services (collectively, the "Services"). Please read them carefully. By accessing or using our Services, you agree to be bound by these Terms and our Privacy Policy. If you do not agree, please do not use the Services.
              </p>
            </div>

            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">1. Acceptance of Terms</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">1.1 Agreement.</span> Your access to and use of the Services constitutes an agreement to these Terms. We may update these Terms from time to time; material changes will be notified by posting a revised version on the Site. Continued use after notification constitutes acceptance.</p>
                <p><span className="text-blue-400 font-semibold">1.2 Other Policies.</span> You also agree to our Privacy Policy, Cookie Policy, and any other policies or guidelines posted on the Site. All such policies are incorporated by reference.</p>
              </div>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">2. Description of Services</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p className="mb-2">Aquads.xyz is a Web3 platform offering:</p>
                <ul className="list-disc pl-6 mb-4 space-y-2">
                  <li><span className="text-blue-400 font-semibold">Freelancer Hub (Lead Generator):</span> A directory and referral service connecting Freelancers to Employers; Aquads does not process payments or contract work.</li>
                  <li><span className="text-blue-400 font-semibold">AquaSwap (Third-Party Swaps):</span> Cross-chain swap and bridging via licensed providers LiFi, available on the website and as a Chrome browser extension for swapping tokens from any webpage.</li>
                  <li><span className="text-blue-400 font-semibold">On-Ramp/Off-Ramp:</span> Fiat-to-crypto and crypto-to-fiat services through MoonPay, Ramp Network, Mercuryo and LiFi.</li>
                  <li><span className="text-blue-400 font-semibold">Project Hub & Bubble Ads:</span> Interactive bubble-based project listings with paid advertising placements and optional visibility bump packages.</li>
                  <li><span className="text-blue-400 font-semibold">Marketing & PR:</span> Campaigns managed by Coinbound.io and other PR partners (Forbes, Yahoo Finance, Benzinga).</li>
                  <li><span className="text-blue-400 font-semibold">Game Hub:</span> Play‑to‑earn events, mini‑games, and token rewards operated by Aquads.</li>
                  <li><span className="text-blue-400 font-semibold">Savings & Staking Hub (AquaFi):</span> Third-party integrations for yield and staking services.</li>
                  <li><span className="text-blue-400 font-semibold">Affiliate & Referral Program:</span> Users can earn points and commissions by referring new users and project listings to the platform through unique referral codes.</li>
                  <li><span className="text-blue-400 font-semibold">Points & Rewards System:</span> A platform-wide points system where users earn points through various activities including referrals, social media raids, and platform engagement; points may be redeemed for platform benefits.</li>
                  <li><span className="text-blue-400 font-semibold">Social Media Raids:</span> Organized Twitter/X and Facebook engagement campaigns where users earn points by completing social media interactions.</li>
                  <li><span className="text-blue-400 font-semibold">Partner Marketplace:</span> A marketplace where users with active membership can access exclusive discounts and rewards from partner businesses using their accumulated points.</li>
                  <li><span className="text-blue-400 font-semibold">Telegram Mini‑App:</span> Access to core Services within Telegram's interface.</li>
                  <li><span className="text-blue-400 font-semibold">Chrome Browser Extension:</span> The AquaSwap Chrome extension enabling cross-chain token swaps directly from any webpage without leaving your current browser tab.</li>
                </ul>
              </div>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">3. User Accounts & Registration</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">3.1 Eligibility.</span> You must be qualified in the services you are offering and have legal capacity to enter into contracts.</p>
                <p><span className="text-blue-400 font-semibold">3.2 Account Creation.</span> You agree to provide accurate information; you are responsible for activity under your account. Notify us immediately of any unauthorized use.</p>
                <p><span className="text-blue-400 font-semibold">3.3 Account Suspension.</span> We may suspend or terminate accounts at our sole discretion, without liability.</p>
              </div>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">4. Third‑Party Service Partners</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">4.1 List of Partners.</span> Services rely on third parties: MoonPay, Ramp Network, Mercuryo, LiFi (swap/on‑ramp/off‑ramp), Coinbound.io (marketing/PR), PR outlets (Forbes, Benzinga, Yahoo Finance), and others.</p>
                <p><span className="text-blue-400 font-semibold">4.2 Disclaimers.</span> Aquads is not responsible for partner performance, fees, KYC/AML processes, or availability. You agree that use of third-party services is subject to their own terms and policies.</p>
                <p><span className="text-blue-400 font-semibold">4.3 Referrals & Affiliates.</span> Aquads may receive referral fees. We will disclose affiliate relationships where required by law.</p>
              </div>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">5. Freelancer Hub (Lead Generator)</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">5.1 Lead‑Only Service.</span> Aquads provides referrals; we do not mediate contracts or payments. You engage with Freelancers/Employers at your own risk.</p>
                <p><span className="text-blue-400 font-semibold">5.2 User Responsibilities.</span> You must resolve any disputes directly; Aquads bears no liability for work quality, performance, or payment.</p>
                <p><span className="text-blue-400 font-semibold">5.3 Platform Circumvention Prohibited.</span> Users are strictly prohibited from attempting to circumvent the platform by taking leads, bookings, or business communications outside of Aquads. This includes but is not limited to: soliciting direct contact information, encouraging communication through external channels (email, phone, social media, messaging apps), sharing personal contact details to bypass the platform, or attempting to conduct business transactions outside of the designated platform channels. Violation of this policy will result in immediate account suspension, with repeated violations leading to permanent account termination. Aquads reserves the right to monitor communications and enforce these rules to maintain platform integrity and user safety.</p>
              </div>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">6. Project Hub & Bubble Ads</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">6.1 Free Listing & Bump Options.</span> Projects may list for free. Paid bump placements are subject to published rates and availability.</p>
                <p><span className="text-blue-400 font-semibold">6.2 Content Guidelines.</span> You represent that all ad content is accurate, lawful, and non‑infringing. Aquads may reject or remove any listing at its discretion.</p>
                <p><span className="text-blue-400 font-semibold">6.3 Billing & Refunds.</span> Paid features are non‑refundable except as required by law. Disputes must be submitted in writing within 30 days.</p>
              </div>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">7. Marketing & PR Services</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">7.1 Coinbound & PR Partners.</span> Aquads connects you to Coinbound.io for campaign execution. All campaign terms, fees, and refunds are governed by Coinbound's agreement.</p>
                <p><span className="text-blue-400 font-semibold">7.2 User Content & Accuracy.</span> You are responsible for providing lawful, accurate materials. PR partners may revise or reject submissions that fail editorial or legal standards.</p>
              </div>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">8. Game Hub, Rewards & Platform Integrity</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">8.1 Service Rules.</span> Participation in Game Hub events is subject to rules posted with each event. Aquads may modify or cancel events at any time.</p>
                <p><span className="text-blue-400 font-semibold">8.2 Reward Distribution.</span> Token rewards are governed by separate distribution policies; you are solely responsible for tax and reporting requirements.</p>
                <p><span className="text-blue-400 font-semibold">8.3 Anti‑Fraud & Platform Integrity Policy.</span> Users are strictly prohibited from engaging in any form of cheating, gaming, manipulation, or fraudulent activity across the entire Aquads platform. This includes but is not limited to: artificially inflating affiliate points, referrals, or commissions; creating fake or duplicate accounts; using bots, scripts, or automated systems; self-referrals or coordinated fraud schemes; manipulating Game Hub events, rewards, or leaderboards; exploiting system vulnerabilities; or any activity that circumvents the intended use of any platform feature.</p>
                <p><span className="text-blue-400 font-semibold">8.4 Consequences of Violation.</span> Aquads reserves the sole and absolute right to suspend or permanently terminate any account suspected of fraudulent or abusive activity. Upon suspension or termination for fraud, all accumulated points, pending commissions, rewards, and any other platform benefits shall be immediately and permanently forfeited without compensation or notice. Aquads is not required to provide evidence, detailed justification, or prior warning for such decisions. Users found in violation may also be permanently banned from creating future accounts on the platform.</p>
                <p><span className="text-blue-400 font-semibold">8.5 Right to Investigate & Act.</span> Aquads reserves the right to monitor user activity, investigate suspicious behavior, and take any action deemed necessary to protect platform integrity. This includes but is not limited to: reviewing account activity patterns, analyzing referral networks, auditing point accumulation, and coordinating with fraud detection systems. By using the platform, you consent to such monitoring and agree that Aquads may act upon its findings at its sole discretion.</p>
              </div>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">9. KYC, AML & Sanctions Screening</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">9.1 Performed by Partners.</span> Identity verification and AML checks are conducted by MoonPay, Ramp Network, Mercuryo, LiFi, and other providers.</p>
                <p><span className="text-blue-400 font-semibold">9.2 Right to Block.</span> Aquads may restrict or terminate user access based on partner findings or sanction lists (e.g., OFAC).</p>
              </div>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">10. Data, Privacy & Cookies</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">10.1 Privacy Policy.</span> We maintain a separate Privacy Policy detailing what personal data we collect and how we use it. We do not collect or store wallet addresses—onboarding, identity verification, and wallet linking are managed entirely by our third-party providers (e.g., MoonPay, Ramp Network, Mercuryo, LiFi, Reown).</p>
                
                <div>
                  <p><span className="text-blue-400 font-semibold">10.2 Data Collected.</span> We may collect:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Registration details (name, email, username)</li>
                    <li>Usage analytics (feature interactions, page views)</li>
                    <li>Cookies and tracking data for site performance and personalization</li>
                  </ul>
                </div>

                <div>
                  <p><span className="text-blue-400 font-semibold">10.3 Use of Data.</span> Collected data is used to:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Provide and improve the Services</li>
                    <li>Generate leads in the Freelancer Hub</li>
                    <li>Analyze platform usage</li>
                    <li>Send transactional and service-related communications</li>
                  </ul>
                </div>

                <div>
                  <p><span className="text-blue-400 font-semibold">10.4 Data Sharing.</span> We share data only with:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Third-party service partners (MoonPay, Ramp Network, Mercuryo, LiFi, Coinbound.io, Reown) as required to deliver Services</li>
                    <li>Analytics and performance providers under strict confidentiality</li>
                  </ul>
                </div>

                <p><span className="text-blue-400 font-semibold">10.5 Cookies & Tracking.</span> We use cookies and similar technologies. Refer to our Cookie Policy for details and opt-out mechanisms.</p>
                
                <p><span className="text-blue-400 font-semibold">10.6 User Rights.</span> You have rights to access, correct, or delete your personal data held by Aquads. Contact us at <a href="mailto:info@aquads.xyz" className="text-blue-400 hover:text-blue-300">info@aquads.xyz</a> to exercise these rights.</p>
              </div>
            </section>

            {/* Section 11 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">11. Intellectual Property & User Content</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">11.1 Aquads IP.</span> All Site content, logos, and software are owned by Aquads or licensors. You may not copy, modify, or distribute without permission.</p>
                <p><span className="text-blue-400 font-semibold">11.2 User Content License.</span> By posting, you grant Aquads a worldwide, royalty-free license to use and display your content in the Services.</p>
                <p><span className="text-blue-400 font-semibold">11.3 Infringement.</span> To report IP violations, contact us at <a href="mailto:info@aquads.xyz" className="text-blue-400 hover:text-blue-300">info@aquads.xyz</a>; we will respond in accordance with applicable law.</p>
              </div>
            </section>

            {/* Section 12 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">12. Fees, Payments & Commissions</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">12.1 Affiliate Program.</span> Commission tiers and payout thresholds are as published. Affiliates are independent contractors responsible for taxes.</p>
                <p><span className="text-blue-400 font-semibold">12.2 Paid Services.</span> Fees for bubble bumping, PR, or premium features will be disclosed before purchase; all payments are in USDC or crypto equivalent.</p>
                <p><span className="text-blue-400 font-semibold">12.3 Refund Policy.</span> Except where required by law, paid services are non‑refundable.</p>
              </div>
            </section>

            {/* Section 13 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">13. Indemnification</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
                <p>You agree to indemnify, defend, and hold harmless Aquads and its affiliates from any claims arising out of your breach of these Terms, misuse of the Services, or violations of law.</p>
              </div>
            </section>

            {/* Section 14 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">14. Disclaimers & Limitation of Liability</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">14.1 No Warranty.</span> Services are provided "as is" and "as available". Aquads disclaims all warranties, express or implied.</p>
                <p><span className="text-blue-400 font-semibold">14.2 Limitation of Liability.</span> To the maximum extent permitted, Aquads's total liability shall not exceed the amount paid by you in the 12 months preceding the claim.</p>
                <p><span className="text-blue-400 font-semibold">14.3 Risk Acknowledgment.</span> You assume all risks associated with digital assets, online communications, and third‑party services.</p>
              </div>
            </section>

            {/* Section 15 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">15. Arbitration & Governing Law</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">15.1 Informal Resolution.</span> Before arbitration, parties must attempt to resolve disputes informally by written notice.</p>
                <p><span className="text-blue-400 font-semibold">15.2 Arbitration.</span> Disputes not resolved informally shall be settled by binding arbitration in Ontario, Canada, under Canadian Arbitration Association rules.</p>
                <p><span className="text-blue-400 font-semibold">15.3 Jurisdiction.</span> These Terms are governed by Ontario law. Users outside Ontario consent to Ontario jurisdiction, unless local law requires otherwise.</p>
              </div>
            </section>

            {/* Section 16 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">16. Force Majeure</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
                <p>Neither party shall be liable for delays due to causes beyond reasonable control (e.g., acts of God, cyber attacks, regulatory changes).</p>
              </div>
            </section>

            {/* Section 17 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">17. Amendments</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
                <p>Aquads reserves the right to modify or discontinue features, fees, or these Terms at any time. Material changes will be notified on the Site; continued use implies acceptance.</p>
              </div>
            </section>

            {/* Section 18 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">18. Miscellaneous</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">18.1 Severability.</span> Invalid provisions will be replaced with valid ones reflecting original intent. Other provisions remain in force.</p>
                <p><span className="text-blue-400 font-semibold">18.2 Entire Agreement.</span> These Terms, together with referenced policies, constitute the entire agreement between you and Aquads.</p>
                <div>
                  <p><span className="text-blue-400 font-semibold">18.3 Contact.</span> For questions, please reach us at:</p>
                  <div className="ml-4 space-y-2">
                    <p>Email: <a href="mailto:info@aquads.xyz" className="text-blue-400 hover:text-blue-300">info@aquads.xyz</a></p>
                    <p>Telegram: <a href="https://t.me/aquads_support" className="text-blue-400 hover:text-blue-300" target="_blank" rel="noopener noreferrer">https://t.me/aquads_support</a></p>
                    <p>Website: <a href="https://aquads.xyz" className="text-blue-400 hover:text-blue-300" target="_blank" rel="noopener noreferrer">https://aquads.xyz</a></p>
                  </div>
                </div>
              </div>
            </section>

            {/* Closing Message */}
            <div className="bg-gradient-to-r from-blue-800/50 to-purple-800/50 backdrop-blur-sm rounded-lg p-6 text-center">
              <p className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                Thank you for using Aquads.xyz. Let's build the future of Web3 together!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Terms; 