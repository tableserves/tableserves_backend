import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import AOS from 'aos';
import 'aos/dist/aos.css';

import image1 from '../../../assets/scanner.png';

const Hero = () => {
  useEffect(() => {
    AOS.init({
      duration: 800,
      once: true,
      offset: 100
    });
  }, []);

  return (
    <section className="relative py-12 px-4 sm:px-6 md:py-20 md:px-8 lg:px-16">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-10 md:gap-12">
        {/* Text Content */}
        <div className="w-full md:w-1/2 text-center md:text-left" data-aos="fade-right" data-aos-delay="100">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold font-fredoka leading-tight text-white mb-5">
            Transforming Dine-In Experiences with Self-Service Technology
          </h1>
          <p className="text-base sm:text-lg md:text-xl mb-8 max-w-xl mx-auto md:mx-0 text-orange-300 font-raleway leading-relaxed">
            At Tableserves, we’re redefining dining by empowering restaurants with smart, seamless self-service solutions that delight guests and simplify operations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start" data-aos="zoom-in-up" data-aos-delay="300">
            <Link
              to="/pricing"
              className="relative group bg-white text-black px-7 py-3.5 rounded-lg font-semibold shadow-lg transition-all duration-300 ease-out hover:shadow-xl hover:-translate-y-1 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/50 focus:ring-offset-2 focus:ring-offset-gray-900 inline-flex items-center justify-center"
            >
              <span className="relative z-10">Explore Plans</span>
              <span className="absolute inset-0 bg-gradient-to-r from-white/30 via-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-lg"></span>
            </Link>

            <Link
              to="/signup"
              className="relative bg-gradient-to-r from-orange-500 to-orange-600 text-white px-7 py-3.5 rounded-lg font-semibold shadow-lg transition-all duration-300 ease-out hover:shadow-xl hover:-translate-y-1 active:scale-95 focus:outline-none focus:ring-2 focus:ring-orange-400/50 focus:ring-offset-2 focus:ring-offset-gray-900 inline-flex items-center justify-center"
            >
              <span className="relative z-10">Get Started Free</span>
              <span className="absolute inset-0 rounded-lg bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
            </Link>
          </div>
        </div>

        {/* Image */}
        <div className="w-full md:w-1/2 flex justify-center" data-aos="fade-left" data-aos-delay="200">
          <img
            src={image1}
            alt="Self-service kiosk enhancing restaurant dining experience"
            className="rounded-2xl w-full max-w-md object-contain"
            loading="lazy"
            style={{
              boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.4), 0 8px 24px rgba(255, 255, 255, 0.15)',
              filter: 'drop-shadow(0 10px 20px rgba(0, 0, 0, 0.25))'
            }}
          />
        </div>
      </div>
    </section>
  );
};

export default Hero;
