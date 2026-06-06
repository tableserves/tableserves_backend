import React from 'react';
import { FaFacebook, FaInstagram, FaPhone, FaEnvelope } from 'react-icons/fa';
import { FaWhatsapp, FaXTwitter } from 'react-icons/fa6';

import logo from '../../../assets/logo.svg';

const Footer = () => (
  <>
    {/* Separator/Divider Section */}
    <div className="bg-gradient-to-r from-primary-bg via-accent/20 to-primary-bg">
      <div className="h-1"></div>
    </div>

    <footer className="bg-primary-bg text-white pt-20 pb-8 relative">
      {/* Decorative top border */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-accent to-transparent"></div>

      <div className="container mx-auto px-4">
        {/* Main Footer Content */}
        <div className="grid md:grid-cols-4 gap-4 mb-12">
          {/* Company Info */}
          <div className="md:col-span-2">
            <div className="flex items-center mb-4">
              <img src={logo} alt="Logo" className="w-14 h-14" />
              <h3 className="text-2xl font-cinzel text-accent font-semibold">TableServes</h3>
            </div>
            <p className="font-raleway text-gray-300 mb-6 max-w-md leading-relaxed">
              Revolutionizing the dining experience with innovative QR-powered ordering solutions. Seamless, intuitive, and powerful technology for restaurants and food zones across India.
            </p>

            {/* Social Media */}
            <div>
              <h5 className="text-sm font-fredoka text-accent mb-3">Follow Us</h5>
              <div className="flex space-x-4">
                <a href="#" className="bg-white/5 p-3 rounded-full text-gray-400">
                  <FaFacebook className="text-lg" />
                </a>
                <a href="#" className="bg-white/5 p-3 rounded-full text-gray-400">
                  <FaInstagram className="text-lg" />
                </a>
                <a href="#" className="bg-white/5 p-3 rounded-full text-gray-400">
                  <FaXTwitter className="text-lg" />
                </a>
                <a href="#" className="bg-white/5 p-3 rounded-full text-gray-400">
                  <FaWhatsapp className="text-lg" />
                </a>
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-xl font-fredoka text-accent mb-6 border-b border-gray-700 pb-2">Contact Us</h4>
            <div className="font-raleway space-y-4">
              <div className="flex items-center text-gray-300 mb-2">
                <FaEnvelope className="text-accent mr-3 text-lg" />
                <span className="text-sm font-semibold">Email</span>
                <p className="text-sm text-gray-400 ml-6">admin@tableserves.com</p>
              </div>

              <div className="flex items-center text-gray-300 mb-2">
                <FaPhone className="text-accent mr-3 text-lg" />
                <span className="text-sm font-semibold">Phone</span>
                <p className="text-sm text-gray-400 ml-6">+91 79040 21564</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-700 pt-8">
          <p className="font-raleway text-sm text-gray-400 mb-2 text-center">&copy; 2025 TableServes. All rights reserved.</p>
          <span className="text-xs text-gray-500 block text-center">Made with ❤️ in India</span>
        </div>
      </div>
    </footer>
  </>
);

export default Footer;
