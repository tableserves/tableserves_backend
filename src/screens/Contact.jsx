import React from 'react';
import { FaEnvelope, FaPhone, FaMapMarkerAlt } from 'react-icons/fa';

const Contact = () => (
    <div className="bg-primary-bg text-white min-h-screen">
        <div className="container mx-auto px-4 py-20">
            <div className="text-center mb-16" data-aos="fade-down">
                <h1 className="text-5xl md:text-6xl font-fredoka text-accent mb-4">Get in Touch</h1>
                <p className="text-lg font-raleway max-w-3xl mx-auto">
                    Have a question or a proposal? We're here to help. Send us a message, and we'll get back to you as soon as possible.
                </p>
            </div>
            <div className="flex flex-col md:flex-row gap-12">
                <div className="md:w-1/2" data-aos="fade-right">
                    <h2 className="text-3xl font-fredoka text-accent mb-6">Contact Information</h2>
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <FaMapMarkerAlt className="text-2xl text-accent" />
                            <p className="font-raleway">123 Innovation Drive, Tech City, 12345</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <FaPhone className="text-2xl text-accent" />
                            <p className="font-raleway">(123) 456-7890</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <FaEnvelope className="text-2xl text-accent" />
                            <p className="font-raleway">hello@tableserve.com</p>
                        </div>
                    </div>
                </div>
                <div className="md:w-1/2" data-aos="fade-left">
                    <div className="bg-white/5 p-8 rounded-xl shadow-lg">
                        <form className="space-y-6">
                            <div>
                                <label htmlFor="name" className="block text-sm font-medium mb-2 text-accent">Full Name</label>
                                <input type="text" id="name" className="w-full p-3 rounded-lg bg-white/10 border-2 border-transparent focus:border-accent focus:outline-none transition-all" />
                            </div>
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium mb-2 text-accent">Email Address</label>
                                <input type="email" id="email" className="w-full p-3 rounded-lg bg-white/10 border-2 border-transparent focus:border-accent focus:outline-none transition-all" />
                            </div>
                            <div>
                                <label htmlFor="message" className="block text-sm font-medium mb-2 text-accent">Message</label>
                                <textarea id="message" rows="5" className="w-full p-3 rounded-lg bg-white/10 border-2 border-transparent focus:border-accent focus:outline-none transition-all"></textarea>
                            </div>
                            <div className="text-center">
                                <button type="submit" className="bg-accent text-white px-8 py-3 rounded-full font-semibold hover:shadow-lg hover:shadow-accent/50 transform hover:-translate-y-1 transition-all duration-300">
                                    Send Your Message
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

export default Contact;
