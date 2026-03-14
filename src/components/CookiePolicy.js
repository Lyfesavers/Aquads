import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';

const CookiePolicy = () => {
  return (
    <div className="h-screen overflow-y-auto text-white">
      <Helmet>
        <title>Cookie Policy - Aquads</title>
        <meta name="description" content="Cookie Policy for Aquads.xyz - We use Google Analytics (first-party cookies) for analytics and local storage for essential operation. Third parties may set cookies when you use their services." />
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
          <h1 className="text-4xl font-bold mb-4">Aquads.xyz Cookie Policy</h1>
          <p className="text-gray-400 mb-8">Effective Date: June 25, 2025. Last Updated: March 2025.</p>

          <div className="space-y-8">
            {/* Introduction */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6">
              <p className="mb-4">
                Aquads.xyz ("Aquads", "we", "us") uses cookies and similar technologies on our website and related services (the "Services"). This Cookie Policy explains what we use: first-party cookies for Google Analytics (to understand how visitors use our site), local storage for essential operation, and third-party cookies when you use partner services. Where required by law (e.g. EU/EEA), we seek your consent before using non-essential analytics cookies.
              </p>
            </div>

            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">1. Google Analytics (First-Party Analytics Cookies)</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p>We use <span className="text-blue-400 font-semibold">Google Analytics</span> (GA4) to understand how visitors use our site—for example, which pages are viewed, how long users stay, and how they navigate. This helps us improve the Services. Google Analytics sets <span className="text-blue-400 font-semibold">first-party cookies</span> on our domain (e.g. <code className="bg-gray-700 px-1 rounded">_ga</code>, <code className="bg-gray-700 px-1 rounded">_gid</code>, <code className="bg-gray-700 px-1 rounded">_ga_*</code>) to distinguish users and record usage. The data is processed by Google in accordance with their <a href="https://policies.google.com/privacy" className="text-blue-400 hover:text-blue-300" target="_blank" rel="noopener noreferrer">Privacy Policy</a> and <a href="https://policies.google.com/technologies/partner-sites" className="text-blue-400 hover:text-blue-300" target="_blank" rel="noopener noreferrer">How Google uses data when you use our partners' sites or apps</a>.</p>
                <p>In regions that require consent before non-essential cookies (e.g. EU/EEA, UK under the ePrivacy Directive), we will seek your consent before loading Google Analytics where we implement a consent mechanism. You can opt out of Google Analytics using the <a href="https://tools.google.com/dlpage/gaoptout" className="text-blue-400 hover:text-blue-300" target="_blank" rel="noopener noreferrer">Google Analytics Opt-out Browser Add-on</a> or via your browser cookie settings.</p>
              </div>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">2. Essential: Local Storage & Session Storage</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p>We use <span className="text-blue-400 font-semibold">local storage and session storage</span> (browser storage, not cookies) only for essential operation of the site—for example, to keep you signed in, to remember temporary preferences (e.g. which tab you had open), and to cache certain data to improve performance. This data stays on your device and is not used for tracking or advertising.</p>
              </div>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">3. Third-Party Cookies</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p>When you use features that involve third-party services—such as LiFi (swaps/bridge), MoonPay, Ramp Network, or Mercuryo (on-ramp/off-ramp), or Reown (wallet linking)—those providers may set their own cookies on their domains or when their content is embedded. We do not control those cookies. Their use is governed by their privacy and cookie policies, and we encourage you to review them when you use those services.</p>
              </div>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">4. Your Choices</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p>You can control or delete cookies via your browser settings (usually under "Options," "Preferences," or "Settings"). To opt out of Google Analytics, use the <a href="https://tools.google.com/dlpage/gaoptout" className="text-blue-400 hover:text-blue-300" target="_blank" rel="noopener noreferrer">Google Analytics Opt-out Browser Add-on</a> or block cookies for our domain. Blocking all cookies may affect how our site works (e.g. sign-in). Local storage and session storage can also be cleared via your browser. For more on your privacy rights (e.g. access, deletion, opt-out), see our <Link to="/privacy-policy" className="text-blue-400 hover:text-blue-300">Privacy Policy</Link>.</p>
              </div>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">5. Updates and Contact</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p>We may update this Cookie Policy when we change our practices (for example, if we add or change analytics tools). The "Last Updated" date at the top will change when we do. Continued use of our Services after an update means you accept the revised policy, except where the law requires us to get your consent again for new uses of cookies.</p>
                <p>For questions or to exercise your rights: Email <a href="mailto:info@aquads.xyz" className="text-blue-400 hover:text-blue-300">info@aquads.xyz</a> (or <a href="mailto:aquads.info@gmail.com" className="text-blue-400 hover:text-blue-300">aquads.info@gmail.com</a> for support), Telegram <a href="https://t.me/+6rJbDLqdMxA3ZTUx" className="text-blue-400 hover:text-blue-300" target="_blank" rel="noopener noreferrer">https://t.me/+6rJbDLqdMxA3ZTUx</a>, or see our <Link to="/privacy-policy" className="text-blue-400 hover:text-blue-300">Privacy Policy</Link> and <Link to="/terms" className="text-blue-400 hover:text-blue-300">Terms & Conditions</Link>.</p>
              </div>
            </section>

            {/* Closing */}
            <div className="bg-gradient-to-r from-blue-800/50 to-purple-800/50 backdrop-blur-sm rounded-lg p-6 text-center">
              <p className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                Aquads.xyz — Transparent about how we use technology to serve you.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookiePolicy;
