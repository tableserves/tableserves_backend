import React from 'react';
import { FaFacebook, FaInstagram, FaTwitter } from 'react-icons/fa';
import { FaWhatsapp, FaXTwitter } from 'react-icons/fa6';

const Footer = () => (
    <footer className="bg-zinc-900 text-white py-12 px-8">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
                <h3 className="text-lg md:text-xl font-bold mb-4">Quick Links</h3>
                <ul>
                    <li className="mb-2"><a href="#" className="text-sm md:text-base hover:text-accent">About Us</a></li>
                    <li className="mb-2"><a href="#" className="text-sm md:text-base hover:text-accent">Support</a></li>
                    <li className="mb-2"><a href="#" className="text-sm md:text-base hover:text-accent">Blog</a></li>
                </ul>
            </div>
            <div>
                <h3 className="text-lg md:text-xl font-bold mb-4">Connect With Us</h3>
                <div className="flex space-x-4">
                    <FaFacebook />
                    <FaInstagram />
                    <FaXTwitter />
                    <FaWhatsapp />
                </div>
            </div>
        </div>
        <div className="border-t border-gray-700 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2025 Tableserve. All rights reserved.</p>
            <div className="space-x-4 mt-2">
                <a href="#" className="hover:text-white">Privacy Policy</a>
                <a href="#" className="hover:text-white">Terms of Use</a>
            </div>
        </div>
    </footer>
);

export default Footer;
