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
                  <li><span className="text-blue-400 font-semibold">Freelancer Hub:</span> A directory and referral service connecting Freelancers and Employers. Aquads also offers a full Service Bookings system where buyers can request and confirm work with sellers; when sellers choose crypto escrow for payment, Aquads holds funds in escrow until work is approved or a dispute is resolved (see Section 5).</li>
                  <li><span className="text-blue-400 font-semibold">AquaPay (Non-Custodial Payments):</span> A payment-link system enabling direct wallet-to-wallet crypto payments across multiple chains. Aquads does not hold or custody user funds; payments go to the recipient's wallet. A 0.5% platform fee applies (see Section 6).</li>
                  <li><span className="text-blue-400 font-semibold">AquaSwap (Third-Party Swaps):</span> Cross-chain swap and bridging via licensed providers LiFi, available on the website and as a Chrome browser extension for swapping tokens from any webpage.</li>
                  <li><span className="text-blue-400 font-semibold">On-Ramp/Off-Ramp:</span> Fiat-to-crypto and crypto-to-fiat services through MoonPay, Ramp Network, Mercuryo and LiFi.</li>
                  <li><span className="text-blue-400 font-semibold">Project Hub & Bubble Ads:</span> Interactive bubble-based project listings with paid advertising placements and optional visibility bump packages.</li>
                  <li><span className="text-blue-400 font-semibold">Marketing & PR:</span> Campaigns managed by Coinbound.io and other PR partners (Forbes, Yahoo Finance, Benzinga).</li>
                  <li><span className="text-blue-400 font-semibold">Game Hub:</span> Play‑to‑earn events, mini‑games, and token rewards operated by Aquads.</li>
                  <li><span className="text-blue-400 font-semibold">Savings & Staking Hub (AquaFi):</span> Third-party integrations for yield and staking services.</li>
                  <li><span className="text-blue-400 font-semibold">Affiliate & Referral Program:</span> Users can earn points and commissions by referring new users and project listings to the platform through unique referral codes.</li>
                  <li><span className="text-blue-400 font-semibold">Points & Rewards System:</span> A platform-wide points system where users earn points through various activities including referrals, social media raids, and platform engagement; points may be redeemed for platform benefits.</li>
                  <li><span className="text-blue-400 font-semibold">Social Media Raids:</span> Organized Twitter/X and Facebook engagement campaigns where users earn points by completing social media interactions.</li>
                  <li><span className="text-blue-400 font-semibold">Job Board:</span> A board where employers can post jobs and freelancers can browse and apply. Listings and applications are your responsibility; Aquads may remove content that violates our guidelines.</li>
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
                <p><span className="text-blue-400 font-semibold">3.3 Account Suspension or Termination.</span> We may suspend or terminate accounts at our sole discretion, without liability.</p>
                <p><span className="text-blue-400 font-semibold">3.4 Effect on Escrow.</span> If an account is <span className="text-blue-400 font-semibold">terminated</span> or <span className="text-blue-400 font-semibold">suspended</span>, any funds in escrow for <span className="text-blue-400 font-semibold">uncompleted</span> bookings will be refunded to the buyer. The user whose account was terminated or suspended has no claim to those funds. If the account is suspended, we hold escrowed funds until the suspension is lifted and will not release them to the other party during the suspension; for uncompleted bookings we will refund the buyer. Once a suspension is lifted, normal escrow release or refund rules apply for any remaining bookings.</p>
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
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">5. Freelancer Hub, Service Bookings & Escrow</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">5.1 Scope.</span> The Freelancer Hub includes (a) directory and referral services connecting Freelancers and Employers, and (b) a full Service Bookings system where buyers can request work, sellers can accept and send invoices, and—when the seller selects crypto escrow—Aquads holds the buyer's payment in escrow until work is approved or a dispute is resolved. For engagements that do not use escrow (e.g. external payment links), Aquads does not hold or process funds; those transactions are between you and the other party.</p>
                <p><span className="text-blue-400 font-semibold">5.2 Non‑Escrow Engagements.</span> Where no escrow is used, you engage with Freelancers/Employers at your own risk. You must resolve any disputes directly; Aquads bears no liability for work quality, performance, or payment in such cases.</p>
                <p><span className="text-blue-400 font-semibold">5.3 Platform Circumvention Prohibited.</span> Users are strictly prohibited from attempting to circumvent the platform by taking leads, bookings, or business communications outside of Aquads. This includes but is not limited to: soliciting direct contact information, encouraging communication through external channels (email, phone, social media, messaging apps), sharing personal contact details to bypass the platform, or attempting to conduct business transactions outside of the designated platform channels. Violation of this policy will result in immediate account suspension, with repeated violations leading to permanent account termination. Aquads reserves the right to monitor communications and enforce these rules to maintain platform integrity and user safety.</p>

                <p><span className="text-blue-400 font-semibold">5.4 Service Bookings.</span> Bookings are created when a buyer submits a request for a service. The seller may accept or decline. Once both parties have accepted, the booking is confirmed. The seller may then send an invoice. Payment may be made via external link (e.g. Stripe, PayPal) or, where offered, via crypto escrow (see below). You are responsible for the accuracy of listing and booking details, including scope and price.</p>

                <p><span className="text-blue-400 font-semibold">5.5 Escrow—What It Is.</span> "Escrow" means Aquads holds the buyer's crypto payment in a custodial wallet controlled by Aquads until (i) the buyer approves the work and funds are released to the seller, or (ii) a dispute is resolved by Aquads (release to seller or refund to buyer). Once funds are received in our custodial wallet in accordance with our process, Aquads takes responsibility for safeguarding and releasing or refunding them as set out in these Terms. Escrow is safe to use when you follow our system (correct network, token, and payment flow). Escrow is only available for selected crypto payments (e.g. USDC on supported networks) and is optional; the seller chooses whether to offer it on an invoice.</p>

                <p><span className="text-blue-400 font-semibold">5.6 Escrow—Supported Networks & Tokens.</span> Escrow may be offered on supported blockchains and tokens as displayed in the product (e.g. Solana, Ethereum, Base, Polygon, Arbitrum, BNB, and USDC or other supported tokens). You are responsible for sending funds only on the correct network and in the correct token; funds sent to the wrong address, network, or token may be unrecoverable, and Aquads is not liable for such loss.</p>

                <p><span className="text-blue-400 font-semibold">5.7 Escrow Fee.</span> A platform fee of 1.25% of the escrowed amount applies when using crypto escrow. This fee is deducted at the time of release to the seller. The fee may be non‑refundable even if a dispute is resolved in the buyer's favor (e.g. refund); the current policy is disclosed in the product at the time of payment.</p>

                <p><span className="text-blue-400 font-semibold">5.8 Release of Funds.</span> Funds in escrow are released to the seller when (a) the buyer has approved the work in the platform and the seller has marked the booking as completed, or (b) Aquads has resolved a dispute in the seller's favor. Until then, funds remain in escrow. Release is made in crypto to the seller's designated wallet minus the platform fee. Aquads does not guarantee any particular release timeframe; blockchain or operational delays may apply.</p>

                <p><span className="text-blue-400 font-semibold">5.9 Disputes.</span> Either the buyer or the seller may open a dispute while funds are in escrow (status: funded). Once a dispute is opened, resolution is handled by Aquads (including by designated administrators). Aquads may (i) release the funds to the seller (minus the platform fee), or (ii) refund the buyer (amount and any fee retention as per current product policy). Dispute resolution decisions are final and binding for the purpose of releasing or refunding the escrowed funds. Aquads is not obligated to follow any particular standard of evidence or procedure beyond good faith; you agree to cooperate and provide information reasonably requested. Aquads does not guarantee any particular outcome and is not liable for the result of a dispute resolution.</p>

                <p><span className="text-blue-400 font-semibold">5.10 Responsibility vs. Matters Outside Our Control.</span> Aquads takes responsibility for funds once they are correctly received in our custodial escrow wallet and when you follow our designated process. We are not liable for anything outside our control or outside that custodial relationship, including: (a) funds sent to the wrong address, network, or token (such funds may be unrecoverable and are your responsibility); (b) blockchain or network congestion, downtime, forks, or unavailability; (c) third‑party wallets, RPC providers, or chain infrastructure; (d) delay or failure to release or refund caused by technical or operational issues beyond our reasonable control, including force majeure (see Section 17); or (e) the outcome of dispute resolution (we resolve in good faith but are not liable for the decision). Escrow is not insurance or a guarantee of work performance—it secures payment; disputes about work quality are resolved as described in 5.9.</p>

                <p><span className="text-blue-400 font-semibold">5.11 Invoices & Payment Methods.</span> Sellers may issue invoices with external payment links (e.g. Stripe, PayPal) or, where available, crypto escrow. Terms and fees for escrow are as set out in these Terms and as displayed in the product. Refunds for non‑escrow payments are between you and the other party; Aquads is not responsible for third‑party payment processors.</p>

                <p><span className="text-blue-400 font-semibold">5.12 User Responsibilities for Bookings.</span> You are solely responsible for the quality, timeliness, and legality of work performed and for the accuracy of listings and communications. Aquads does not guarantee any outcome, quality of work, or payment beyond its role in holding and releasing escrowed funds as described above. Disputes about work quality or scope that do not involve escrow are between you and the other party.</p>
              </div>
            </section>

            {/* Section 6 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">6. AquaPay (Non-Custodial Payments)</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">6.1 What AquaPay Is.</span> AquaPay is a non-custodial payment service. Users can create payment links (e.g. aquads.xyz/pay/username) so that others may send cryptocurrency directly to the recipient's own wallet. Payments go wallet-to-wallet; Aquads does not hold, control, or have access to user funds at any time. We only facilitate the payment flow (e.g. displaying recipient addresses, applying the platform fee). Supported networks and tokens are as shown in the product.</p>
                <p><span className="text-blue-400 font-semibold">6.2 Platform Fee & Gas.</span> A platform fee of 0.5% applies to AquaPay payments and is deducted from the payment amount as disclosed in the product. Network (gas) fees are your responsibility and are paid to the relevant blockchain.</p>
                <p><span className="text-blue-400 font-semibold">6.3 Your Responsibility.</span> You are solely responsible for: (a) the accuracy of wallet addresses you provide or use; (b) sending payments on the correct network and in the correct token; (c) securing your wallet and private keys; and (d) verifying the recipient and amount before confirming a transaction. Aquads has no access to your wallet or funds and cannot reverse, cancel, or modify a transaction once broadcast.</p>
                <p><span className="text-blue-400 font-semibold">6.4 No Custody; No Liability for Loss.</span> Because AquaPay is non-custodial, Aquads never takes possession of your funds. We are not liable for any loss, delay, or failure in connection with AquaPay, including: (a) funds sent to the wrong address, network, or token (such funds may be unrecoverable); (b) wallet compromise, lost or stolen keys, or unauthorized access; (c) failed, delayed, or reverted transactions due to network congestion, insufficient gas, or chain issues; (d) acts or omissions of your wallet provider, RPC providers, or blockchain networks; or (e) any other loss arising from your use of AquaPay or third-party infrastructure. AquaPay is provided "as is" as a facilitation tool only.</p>
              </div>
            </section>

            {/* Section 7 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">7. Project Hub & Bubble Ads</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">7.1 Free Listing & Bump Options.</span> Projects may list for free. Paid bump placements are subject to published rates and availability.</p>
                <p><span className="text-blue-400 font-semibold">7.2 Content Guidelines.</span> You represent that all ad content is accurate, lawful, and non‑infringing. Aquads may reject or remove any listing at its discretion.</p>
                <p><span className="text-blue-400 font-semibold">7.3 Billing & Refunds.</span> Paid features are non‑refundable except as required by law. Disputes must be submitted in writing within 30 days.</p>
              </div>
            </section>

            {/* Section 8 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">8. Marketing & PR Services</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">8.1 Coinbound & PR Partners.</span> Aquads connects you to Coinbound.io for campaign execution. All campaign terms, fees, and refunds are governed by Coinbound's agreement.</p>
                <p><span className="text-blue-400 font-semibold">8.2 User Content & Accuracy.</span> You are responsible for providing lawful, accurate materials. PR partners may revise or reject submissions that fail editorial or legal standards.</p>
              </div>
            </section>

            {/* Section 9 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">9. Game Hub, Rewards & Platform Integrity</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">9.1 Service Rules.</span> Participation in Game Hub events is subject to rules posted with each event. Aquads may modify or cancel events at any time.</p>
                <p><span className="text-blue-400 font-semibold">9.2 Reward Distribution.</span> Token rewards are governed by separate distribution policies; you are solely responsible for tax and reporting requirements.</p>
                <p><span className="text-blue-400 font-semibold">9.3 Points & Rewards Disclaimer.</span> Platform points and rewards (including points earned from referrals, raids, or other activities) have no guaranteed cash value except as stated in the applicable redemption offer at the time of redemption. Points are not a security, investment, or currency. Program rules, redemption values, and availability may change at any time with or without notice. Aquads may modify, pause, or discontinue the points or rewards program at its discretion.</p>
                <p><span className="text-blue-400 font-semibold">9.4 Anti‑Fraud & Platform Integrity Policy.</span> Users are strictly prohibited from engaging in any form of cheating, gaming, manipulation, or fraudulent activity across the entire Aquads platform. This includes but is not limited to: artificially inflating affiliate points, referrals, or commissions; creating fake or duplicate accounts; using bots, scripts, or automated systems; self-referrals or coordinated fraud schemes; manipulating Game Hub events, rewards, or leaderboards; exploiting system vulnerabilities; or any activity that circumvents the intended use of any platform feature.</p>
                <p><span className="text-blue-400 font-semibold">9.5 Consequences of Violation.</span> Aquads reserves the sole and absolute right to suspend or permanently terminate any account suspected of fraudulent or abusive activity. Upon suspension or termination for fraud, all accumulated points, pending commissions, rewards, and any other platform benefits shall be immediately and permanently forfeited without compensation or notice. Aquads is not required to provide evidence, detailed justification, or prior warning for such decisions. Users found in violation may also be permanently banned from creating future accounts on the platform.</p>
                <p><span className="text-blue-400 font-semibold">9.6 Right to Investigate & Act.</span> Aquads reserves the right to monitor user activity, investigate suspicious behavior, and take any action deemed necessary to protect platform integrity. This includes but is not limited to: reviewing account activity patterns, analyzing referral networks, auditing point accumulation, and coordinating with fraud detection systems. By using the platform, you consent to such monitoring and agree that Aquads may act upon its findings at its sole discretion.</p>
              </div>
            </section>

            {/* Section 10 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">10. KYC, AML & Sanctions Screening</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">10.1 Performed by Partners.</span> Identity verification and AML checks are conducted by MoonPay, Ramp Network, Mercuryo, LiFi, and other providers.</p>
                <p><span className="text-blue-400 font-semibold">10.2 Right to Block.</span> Aquads may restrict or terminate user access based on partner findings or sanction lists (e.g., OFAC).</p>
              </div>
            </section>

            {/* Section 11 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">11. Data, Privacy & Cookies</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">11.1 Privacy Policy.</span> We maintain a separate Privacy Policy detailing what personal data we collect and how we use it. We do not collect or store wallet addresses—onboarding, identity verification, and wallet linking are managed entirely by our third-party providers (e.g., MoonPay, Ramp Network, Mercuryo, LiFi, Reown).</p>
                
                <div>
                  <p><span className="text-blue-400 font-semibold">11.2 Data Collected.</span> We may collect:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Registration details (name, email, username)</li>
                    <li>Usage analytics (feature interactions, page views)</li>
                    <li>Cookies and tracking data for site performance and personalization</li>
                  </ul>
                </div>

                <div>
                  <p><span className="text-blue-400 font-semibold">11.3 Use of Data.</span> Collected data is used to:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Provide and improve the Services</li>
                    <li>Generate leads in the Freelancer Hub</li>
                    <li>Analyze platform usage</li>
                    <li>Send transactional and service-related communications</li>
                  </ul>
                </div>

                <div>
                  <p><span className="text-blue-400 font-semibold">11.4 Data Sharing.</span> We share data only with:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Third-party service partners (MoonPay, Ramp Network, Mercuryo, LiFi, Coinbound.io, Reown) as required to deliver Services</li>
                    <li>Analytics and performance providers under strict confidentiality</li>
                  </ul>
                </div>

                <p><span className="text-blue-400 font-semibold">11.5 Cookies & Tracking.</span> We use cookies and similar technologies. Refer to our Cookie Policy for details and opt-out mechanisms.</p>
                
                <p><span className="text-blue-400 font-semibold">11.6 User Rights.</span> You have rights to access, correct, or delete your personal data held by Aquads. Contact us at <a href="mailto:info@aquads.xyz" className="text-blue-400 hover:text-blue-300">info@aquads.xyz</a> to exercise these rights.</p>
              </div>
            </section>

            {/* Section 12 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">12. Intellectual Property & User Content</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">12.1 Aquads IP.</span> All Site content, logos, and software are owned by Aquads or licensors. You may not copy, modify, or distribute without permission.</p>
                <p><span className="text-blue-400 font-semibold">12.2 User Content License.</span> By posting, you grant Aquads a worldwide, royalty-free license to use and display your content in the Services.</p>
                <p><span className="text-blue-400 font-semibold">12.3 Infringement.</span> To report IP violations, contact us at <a href="mailto:info@aquads.xyz" className="text-blue-400 hover:text-blue-300">info@aquads.xyz</a>; we will respond in accordance with applicable law.</p>
              </div>
            </section>

            {/* Section 13 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">13. Fees, Payments & Commissions</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">13.1 Affiliate Program.</span> Commission tiers and payout thresholds are as published. Affiliates are independent contractors responsible for taxes.</p>
                <p><span className="text-blue-400 font-semibold">13.2 Paid Services.</span> Fees for bubble bumping, PR, or premium features will be disclosed before purchase; all payments are in USDC or crypto equivalent.</p>
                <p><span className="text-blue-400 font-semibold">13.3 Refund Policy.</span> Except where required by law, paid services are non‑refundable.</p>
                <p><span className="text-blue-400 font-semibold">13.4 Escrow Fee.</span> Use of crypto escrow for Service Bookings is subject to a platform fee of 1.25% of the escrowed amount, as disclosed in the product. This fee is generally deducted on release to the seller. In the event of a dispute resolved by refund to the buyer, the platform may retain the fee (or a portion thereof) as disclosed at the time of use; escrow fees are non‑refundable except where required by applicable law.</p>
              </div>
            </section>

            {/* Section 14 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">14. Indemnification</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
                <p>You agree to indemnify, defend, and hold harmless Aquads and its affiliates from any claims arising out of your breach of these Terms, misuse of the Services, or violations of law.</p>
              </div>
            </section>

            {/* Section 15 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">15. Disclaimers & Limitation of Liability</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">15.1 No Warranty.</span> Services are provided "as is" and "as available". Aquads disclaims all warranties, express or implied.</p>
                <p><span className="text-blue-400 font-semibold">15.2 Limitation of Liability.</span> To the maximum extent permitted, Aquads's total liability shall not exceed the amount paid by you in the 12 months preceding the claim.</p>
                <p><span className="text-blue-400 font-semibold">15.3 Risk Acknowledgment.</span> You assume all risks associated with digital assets, online communications, and third‑party services.</p>
                <p><span className="text-blue-400 font-semibold">15.4 Escrow & Blockchain—Matters Outside Our Control.</span> Aquads takes responsibility for funds held in its custodial escrow wallet as set out in Section 5. Aquads is not liable for loss in connection with non-custodial services (e.g. AquaPay, Section 6), where we do not hold funds. To the maximum extent permitted by law, Aquads is not liable for loss, delay, or failure that arises from circumstances outside its control or outside that custodial relationship, including: (a) funds sent to the wrong address, network, or token; (b) blockchain or network congestion, downtime, forks, or unavailability; (c) delay or failure to release or refund due to technical or operational issues beyond Aquads's reasonable control; (d) dispute resolution outcomes or the amount or timing of any release or refund; or (e) acts or omissions of third‑party wallets, chains, or infrastructure. This limitation does not reduce Aquads's responsibility for funds correctly held in its custody when the escrow process is followed.</p>
              </div>
            </section>

            {/* Section 16 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">16. Arbitration & Governing Law</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">16.1 Informal Resolution.</span> Before arbitration, parties must attempt to resolve disputes informally by written notice.</p>
                <p><span className="text-blue-400 font-semibold">16.2 Arbitration.</span> Disputes not resolved informally shall be settled by binding arbitration in Ontario, Canada, under Canadian Arbitration Association rules.</p>
                <p><span className="text-blue-400 font-semibold">16.3 Jurisdiction.</span> These Terms are governed by Ontario law. Users outside Ontario consent to Ontario jurisdiction, unless local law requires otherwise.</p>
              </div>
            </section>

            {/* Section 17 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">17. Force Majeure</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
                <p>Neither party shall be liable for delays or failures due to causes beyond reasonable control, including without limitation: acts of God, natural disasters, war, terrorism, pandemics, government action or regulation, cyber attacks, critical failures of third‑party infrastructure (including blockchain networks, RPC providers, or payment processors), prolonged network congestion or unavailability, and regulatory or legal changes affecting the Services or escrow. Such events may delay or prevent release or refund of escrowed funds; Aquads will use reasonable efforts to resume operations but does not guarantee any timeframe.</p>
              </div>
            </section>

            {/* Section 18 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">18. Amendments</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
                <p>Aquads reserves the right to modify or discontinue features, fees, or these Terms at any time. Material changes will be notified on the Site; continued use implies acceptance.</p>
              </div>
            </section>

            {/* Section 19 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">19. Miscellaneous</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">19.1 Severability.</span> Invalid provisions will be replaced with valid ones reflecting original intent. Other provisions remain in force.</p>
                <p><span className="text-blue-400 font-semibold">19.2 Entire Agreement.</span> These Terms, together with referenced policies, constitute the entire agreement between you and Aquads.</p>
                <div>
                  <p><span className="text-blue-400 font-semibold">19.3 Contact.</span> For questions, please reach us at:</p>
                  <div className="ml-4 space-y-2">
                    <p>Email: <a href="mailto:info@aquads.xyz" className="text-blue-400 hover:text-blue-300">info@aquads.xyz</a> (you may also use <a href="mailto:aquads.info@gmail.com" className="text-blue-400 hover:text-blue-300">aquads.info@gmail.com</a> for support)</p>
                    <p>Telegram: <a href="https://t.me/+6rJbDLqdMxA3ZTUx" className="text-blue-400 hover:text-blue-300" target="_blank" rel="noopener noreferrer">https://t.me/+6rJbDLqdMxA3ZTUx</a></p>
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