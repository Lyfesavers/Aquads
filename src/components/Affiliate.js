import React from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';

const Affiliate = () => {
  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      <Helmet>
        <title>Affiliate Program - Aquads</title>
        <meta name="description" content="Join the Aquads Affiliate Program and earn commissions by promoting our platform" />
      </Helmet>

      {/* Fixed Header */}
      <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700/50 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="text-2xl font-bold text-blue-400">
                Aquads
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/marketplace"
                className="bg-indigo-500/80 hover:bg-indigo-600/80 px-4 py-2 rounded shadow-lg hover:shadow-indigo-500/50 transition-all duration-300 backdrop-blur-sm"
              >
                Aquaduct
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl font-bold mb-8 text-center text-blue-400">Aquads Affiliate Program</h1>
            
            <div className="bg-gray-800 rounded-lg p-8 mb-8 shadow-lg">
              <p className="text-gray-300 mb-6">
                Welcome to the Aquads Affiliate Program! We believe in keeping things simple and letting you get straight to promoting and growing your freelance business. When you sign up on our website, the username you choose becomes your unique referral code. Use it, share it, and earn commissions—no extra contracts to sign.
              </p>

              <div className="bg-gray-700/50 rounded-lg p-6 mb-6">
                <p className="text-sm text-gray-300">
                  All affiliates are independent contractors—not employees—you are responsible for handling your own tax filings in your own local jurisdiction. All money earned in the affiliate program and paid to you by Aquads is considered gross income to the receiving independent contractor. Aquads does not withhold any taxes from your commission payments, and it is solely your responsibility to comply with any tax reporting or withholding requirements under the laws of your country.
                </p>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-8 mb-8 shadow-lg">
              <h2 className="text-2xl font-bold mb-6 text-blue-400">How It Works</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-3 text-indigo-400">Easy Sign-Up:</h3>
                  <ul className="list-disc list-inside text-gray-300 space-y-2">
                    <li>Simply create an account on our website. Your username is automatically your referral code.</li>
                    <li>No legal paperwork. Just sign up and start promoting.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3 text-indigo-400">Share Your Code:</h3>
                  <ul className="list-disc list-inside text-gray-300 space-y-2">
                    <li>Promote your referral code everywhere you can—your website, social media, emails, podcasts, Live Spaces/Streams or even in your freelancer portfolio.</li>
                    <li>The more you share, the more potential you have to earn commissions.</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3 text-indigo-400">Commission Structure:</h3>
                  <div className="bg-gray-700/50 rounded-lg p-6">
                    <ul className="space-y-4">
                      <li className="flex items-center text-gray-300">
                        <span className="text-green-400 font-bold mr-2">Tier 1:</span>
                        $2,500, you earn a 10% commission
                      </li>
                      <li className="flex items-center text-gray-300">
                        <span className="text-green-400 font-bold mr-2">Tier 2:</span>
                        Reach $5,000 you earn a 15% commission
                      </li>
                      <li className="flex items-center text-gray-300">
                        <span className="text-green-400 font-bold mr-2">Tier 3:</span>
                        Reach $25,000 and enjoy a 20% commission rate
                      </li>
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3 text-indigo-400">Payouts:</h3>
                  <ul className="list-disc list-inside text-gray-300 space-y-2">
                    <li>You can request a payout once you've earned a minimum of $100.</li>
                    <li>We pay in crypto or through other methods that work best for you.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-8 mb-8 shadow-lg">
              <h2 className="text-2xl font-bold mb-6 text-blue-400">What We Expect from You</h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold mb-3 text-indigo-400">Promote, Promote, Promote:</h3>
                  <p className="text-gray-300">
                    We want you to share Aquads far and wide. The more you promote our platform and your services, the more you help build a vibrant community of crypto projects and Web3 freelancers—the more you earn.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3 text-indigo-400">Stay On-Brand:</h3>
                  <p className="text-gray-300">
                    Use the marketing materials and guidelines provided by Aquads. This helps ensure all promotions are aligned with our company's vision and scope. All content created must be approved by our team before posting.
                  </p>
                </div>

                <div>
                  <h3 className="text-xl font-semibold mb-3 text-indigo-400">Follow the Guidelines:</h3>
                  <p className="text-gray-300">
                    While you're free to be creative, please keep your promotions within the Aquads brand scope. No misleading claims or activities that fall outside what we support. No editing of the logo unless approved to do so.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-8 mb-8 shadow-lg">
              <h2 className="text-2xl font-bold mb-6 text-blue-400">Why Join the Aquads Affiliate Program?</h2>
              
              <ul className="list-disc list-inside text-gray-300 space-y-3">
                <li>No Hassle: Sign up instantly and start earning without any contracts.</li>
                <li>Build Your Business: Use your referral code as a tool to not only earn money but also boost your own freelancer business.</li>
                <li>Generous Commission Structure: Our tiered commission system rewards your hard work as you grow.</li>
                <li>Flexible Payout Options: Choose from crypto or other payout methods once you hit the $100 minimum.</li>
                <li>Community and Support: You're part of a growing Web3 community. We provide you with marketing assets, ongoing support, and tips to maximize your impact.</li>
              </ul>
            </div>

            <div className="bg-gray-800 rounded-lg p-8 shadow-lg">
              <h2 className="text-2xl font-bold mb-6 text-blue-400">Ready to Get Started?</h2>
              
              <div className="space-y-4 text-gray-300">
                <p>By Sharing and using your referral code, you are enrolling in this affiliate program and agreeing to the terms laid out here.</p>
                <p>For any questions or support, simply reach out to us at <a href="mailto:aquads.info@gmail.com" className="text-blue-400 hover:text-blue-300">aquads.info@gmail.com</a> or join our <a href="https://t.co/TE6WbzWh9K" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">Telegram community</a>.</p>
                <p className="mt-8 text-center">We're excited to have you on board and can't wait to see how you help grow the Aquads community while building your own business success stories!</p>
                <p className="text-center font-semibold text-blue-400">Happy promoting!</p>
                <p className="text-right text-gray-400">— The Aquads Team</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Affiliate; 