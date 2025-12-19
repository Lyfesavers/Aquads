import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaClock, FaUsers, FaRocket, FaCheckCircle, FaSparkles } from 'react-icons/fa';

const OnboardingSection = ({ calendlyUrl }) => {
  const [isVisible, setIsVisible] = useState(false);

  // Animate on scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    const element = document.getElementById('onboarding-section');
    if (element) {
      observer.observe(element);
    }

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, []);

  // Default Calendly URL if not provided
  const defaultCalendlyUrl = calendlyUrl || 'https://calendly.com/your-username/15min';

  const handleBookSession = () => {
    window.open(defaultCalendlyUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div 
      id="onboarding-section"
      className="relative w-full py-16 sm:py-20 md:py-24 overflow-hidden"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-black"></div>
      
      {/* Animated background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-yellow-400/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>

      {/* Content container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          
          {/* Main card */}
          <div className="relative bg-gradient-to-br from-gray-800/80 via-gray-800/60 to-gray-900/80 backdrop-blur-xl rounded-3xl p-8 sm:p-12 md:p-16 border border-gray-700/50 shadow-2xl overflow-hidden">
            
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-purple-500/20 to-pink-500/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
            
            <div className="relative z-10">
              {/* Header */}
              <div className="text-center mb-10 sm:mb-12">
                <div className="inline-flex items-center justify-center mb-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
                    <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 rounded-full p-3 sm:p-4">
                      <FaRocket className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                    </div>
                  </div>
                </div>
                
                <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black mb-4 sm:mb-6">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 via-purple-300 to-blue-300">
                    Ready to Get Started?
                  </span>
                </h2>
                
                <p className="text-lg sm:text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                  Book a <span className="font-semibold text-blue-400">15-minute onboarding session</span> and discover how to maximize your success on Aquads
                </p>
              </div>

              {/* Features grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-10 sm:mb-12">
                <div className="group relative bg-gradient-to-br from-gray-700/50 to-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-600/30 hover:border-blue-400/50 transition-all duration-300 hover:transform hover:scale-105">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-blue-500/20 rounded-lg p-2 group-hover:bg-blue-500/30 transition-colors">
                      <FaClock className="w-5 h-5 text-blue-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Quick & Efficient</h3>
                  </div>
                  <p className="text-gray-400 text-sm">Just 15 minutes to get you up and running with everything you need to know</p>
                </div>

                <div className="group relative bg-gradient-to-br from-gray-700/50 to-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-600/30 hover:border-purple-400/50 transition-all duration-300 hover:transform hover:scale-105">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-purple-500/20 rounded-lg p-2 group-hover:bg-purple-500/30 transition-colors">
                      <FaUsers className="w-5 h-5 text-purple-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Personalized</h3>
                  </div>
                  <p className="text-gray-400 text-sm">One-on-one session tailored to your specific goals and needs</p>
                </div>

                <div className="group relative bg-gradient-to-br from-gray-700/50 to-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-600/30 hover:border-yellow-400/50 transition-all duration-300 hover:transform hover:scale-105">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-yellow-500/20 rounded-lg p-2 group-hover:bg-yellow-500/30 transition-colors">
                      <FaCheckCircle className="w-5 h-5 text-yellow-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Action-Oriented</h3>
                  </div>
                  <p className="text-gray-400 text-sm">Walk away with a clear action plan and next steps</p>
                </div>
              </div>

              {/* CTA Button */}
              <div className="flex flex-col items-center">
                <button
                  onClick={handleBookSession}
                  className="group relative px-8 py-4 sm:px-12 sm:py-5 bg-gradient-to-r from-blue-500 via-purple-600 to-blue-500 rounded-2xl font-bold text-white text-lg sm:text-xl shadow-2xl hover:shadow-blue-500/50 transition-all duration-300 transform hover:scale-105 overflow-hidden"
                  style={{
                    backgroundSize: '200% 100%',
                    animation: 'gradientShift 3s ease infinite'
                  }}
                >
                  {/* Button glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl"></div>
                  
                  {/* Button content */}
                  <div className="relative z-10 flex items-center gap-3">
                    <FaCalendarAlt className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span>Book Your 15-Minute Session</span>
                    <FaSparkles className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-180 transition-transform duration-500" />
                  </div>

                  {/* Animated gradient overlay */}
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"
                  ></div>
                </button>

                {/* Additional info */}
                <p className="mt-4 sm:mt-6 text-sm sm:text-base text-gray-400 text-center">
                  <span className="inline-flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                    Free session • No commitment required
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS for gradient animation */}
      <style>{`
        @keyframes gradientShift {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
      `}</style>
    </div>
  );
};

export default OnboardingSection;

