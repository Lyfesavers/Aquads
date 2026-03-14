import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';

const CookiePolicy = () => {
  return (
    <div className="h-screen overflow-y-auto text-white">
      <Helmet>
        <title>Cookie Policy - Aquads</title>
        <meta name="description" content="Cookie Policy for Aquads.xyz - We do not use first-party cookies for tracking; we use local storage for essential operation. Third parties may set cookies when you use their services." />
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
                Aquads.xyz ("Aquads", "we", "us") is transparent about how we use cookies and similar technologies on our website and related services (the "Services"). This Cookie Policy explains our current practices. We may add analytics (e.g. Google Analytics) in the future; if we do, we will update this policy and, where required by law (e.g. EU/EEA), seek your consent before using non-essential cookies.
              </p>
            </div>

            {/* Section 1 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">1. Our Current Use of Cookies</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p><span className="text-blue-400 font-semibold">We do not currently set first-party cookies</span> for tracking, analytics, or advertising. We do not use tools like Google Analytics on our site at this time.</p>
                <p>We use <span className="text-blue-400 font-semibold">local storage and session storage</span> (browser storage technologies similar to cookies) only for essential operation of the site—for example, to keep you signed in, to remember temporary preferences (e.g. which tab you had open), and to cache certain data to improve performance. This data stays on your device and is not used for tracking or advertising.</p>
              </div>
            </section>

            {/* Section 2 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">2. Third-Party Cookies</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p>When you use features that involve third-party services—such as LiFi (swaps/bridge), MoonPay, Ramp Network, or Mercuryo (on-ramp/off-ramp), or Reown (wallet linking)—those providers may set their own cookies on their domains or when their content is embedded. We do not control those cookies. Their use is governed by their privacy and cookie policies, and we encourage you to review them when you use those services.</p>
              </div>
            </section>

            {/* Section 3 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">3. If We Add Analytics (e.g. Google Analytics)</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p>If we add first-party analytics (such as Google Analytics) to understand how visitors use our site, we will use first-party cookies for that purpose. We will update this Cookie Policy to describe what we use and how. In regions that require consent before non-essential cookies (e.g. EU/EEA under the ePrivacy Directive), we will ask for your consent before enabling analytics cookies. We will also provide information on how you can opt out (e.g. browser settings or opt-out tools).</p>
              </div>
            </section>

            {/* Section 4 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">4. Your Choices</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p>You can control or delete cookies via your browser settings (usually under "Options," "Preferences," or "Settings"). Blocking all cookies may affect how our site works. Local storage and session storage can also be cleared via your browser. For more on your privacy rights (e.g. access, deletion, opt-out), see our <Link to="/privacy-policy" className="text-blue-400 hover:text-blue-300">Privacy Policy</Link>.</p>
              </div>
            </section>

            {/* Section 5 */}
            <section>
              <h2 className="text-2xl font-semibold mb-4 text-blue-400">5. Updates and Contact</h2>
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 space-y-4">
                <p>We may update this Cookie Policy when we change our practices (for example, when we add analytics). The "Last Updated" date at the top will change when we do. Continued use of our Services after an update means you accept the revised policy, except where the law requires us to get your consent again for new uses of cookies.</p>
                <p>For questions or to exercise your rights: Email <a href="mailto:info@aquads.xyz" className="text-blue-400 hover:text-blue-300">info@aquads.xyz</a>, Telegram <a href="https://t.me/+6rJbDLqdMxA3ZTUx" className="text-blue-400 hover:text-blue-300" target="_blank" rel="noopener noreferrer">https://t.me/+6rJbDLqdMxA3ZTUx</a>, or see our <Link to="/privacy-policy" className="text-blue-400 hover:text-blue-300">Privacy Policy</Link> and <Link to="/terms" className="text-blue-400 hover:text-blue-300">Terms & Conditions</Link>.</p>
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
