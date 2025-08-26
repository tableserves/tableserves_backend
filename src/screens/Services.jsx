import React from 'react';
import { FaQrcode, FaChartLine, FaShieldAlt, FaCheck, FaTimes, FaUsers, FaTable, FaCrown } from 'react-icons/fa';
import { RESTAURANT_PLANS, ZONE_PLANS } from '../constants/plans';

const Services = () => (
    <div className="bg-primary-bg text-white min-h-screen">
        <div className="container mx-auto px-4 py-20">
            <div className="text-center mb-16" data-aos="fade-down">
                <h1 className="text-5xl md:text-6xl font-fredoka text-accent mb-4">Our Services</h1>
                <p className="text-lg font-raleway max-w-3xl mx-auto">
                    We provide a suite of innovative services designed to elevate the dining experience for both customers and restaurant owners. Our technology is crafted to be seamless, intuitive, and powerful.
                </p>
            </div>
            <div className="grid md:grid-cols-3 gap-12">
                <div className="bg-white/5 p-8 rounded-xl shadow-lg hover:shadow-accent/20 transform hover:-translate-y-2 transition-all duration-300" data-aos="fade-up" data-aos-delay="100">
                    <div className="flex justify-center mb-6">
                        <FaQrcode className="text-5xl text-accent" />
                    </div>
                    <h2 className="text-2xl font-fredoka mb-4 text-center">QR-Powered Ordering</h2>
                    <p className="font-raleway text-center">
                        Empower your customers with the ability to browse your menu, place orders, and pay their bills directly from their smartphones. This contactless solution reduces wait times and increases table turnover.
                    </p>
                </div>
                <div className="bg-white/5 p-8 rounded-xl shadow-lg hover:shadow-accent/20 transform hover:-translate-y-2 transition-all duration-300" data-aos="fade-up" data-aos-delay="200">
                    <div className="flex justify-center mb-6">
                        <FaChartLine className="text-5xl text-accent" />
                    </div>
                    <h2 className="text-2xl font-fredoka mb-4 text-center">Advanced Analytics</h2>
                    <p className="font-raleway text-center">
                        Make data-driven decisions with our comprehensive analytics dashboard. Track sales, monitor popular items, and understand customer preferences to optimize your menu and marketing strategies.
                    </p>
                </div>
                <div className="bg-white/5 p-8 rounded-xl shadow-lg hover:shadow-accent/20 transform hover:-translate-y-2 transition-all duration-300" data-aos="fade-up" data-aos-delay="300">
                    <div className="flex justify-center mb-6">
                        <FaShieldAlt className="text-5xl text-accent" />
                    </div>
                    <h2 className="text-2xl font-fredoka mb-4 text-center">Secure & Integrated Payments</h2>
                    <p className="font-raleway text-center">
                        Offer a variety of payment options with our secure, PCI-compliant payment gateway. From credit cards to digital wallets, we ensure every transaction is smooth and protected.
                    </p>
                </div>
            </div>

            {/* Subscription Plans */}
            <div className="mt-24" data-aos="fade-up">
                <div className="text-center mb-10">
                    <h2 className="text-4xl font-fredoka text-accent mb-2">Subscription Plans</h2>
                    <p className="text-white/80 font-raleway">Choose the plan that fits your hotel or restaurant. Upgrade anytime.</p>
                </div>

                {/* Restaurant Plans */}
                <div className="mb-12">
                    <h3 className="text-2xl font-fredoka mb-4 flex items-center gap-2"><FaTable className="text-accent" /> Restaurant Plans</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {Object.values(RESTAURANT_PLANS).map((p) => (
                            <div key={p.key} className={`bg-white/5 border ${p.key === 'advanced' ? 'border-accent' : 'border-white/10'} rounded-2xl p-6 hover:shadow-accent/30 hover:-translate-y-1 transition-all`}>
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-xl font-raleway font-semibold">{p.label}</h4>
                                    {p.key === 'advanced' && <span className="inline-flex items-center gap-1 text-xs bg-accent text-white px-2 py-1 rounded-full"><FaCrown /> Best Value</span>}
                                </div>
                                <ul className="space-y-2 text-sm font-raleway">
                                    <li className="flex items-center gap-2"><FaTable className="text-accent" /> Max Tables: <strong>{p.maxTables}</strong></li>
                                    <li className="flex items-center gap-2"><FaCheck className="text-green-500" /> CRUD Menu</li>
                                    <li className="flex items-center gap-2">{p.features.branding ? <FaCheck className="text-green-500" /> : <FaTimes className="text-red-500" />} Branding</li>
                                    <li className="flex items-center gap-2">{p.features.analytics ? <FaCheck className="text-green-500" /> : <FaTimes className="text-red-500" />} Analytics</li>
                                </ul>
                                <a href="/tableserve/signup" className="inline-block mt-5 px-4 py-2 rounded-lg bg-accent text-white font-raleway">Get started</a>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Zone Plans */}
                <div>
                    <h3 className="text-2xl font-fredoka mb-4 flex items-center gap-2"><FaUsers className="text-accent" /> Zone Plans</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {Object.values(ZONE_PLANS).map((p) => (
                            <div key={p.key} className={`bg-white/5 border ${p.key === 'advanced' ? 'border-accent' : 'border-white/10'} rounded-2xl p-6 hover:shadow-accent/30 hover:-translate-y-1 transition-all`}>
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-xl font-raleway font-semibold">{p.label}</h4>
                                    {p.key === 'advanced' && <span className="inline-flex items-center gap-1 text-xs bg-accent text-white px-2 py-1 rounded-full"><FaCrown /> Full Access</span>}
                                </div>
                                <ul className="space-y-2 text-sm font-raleway">
                                    <li className="flex items-center gap-2"><FaTable className="text-accent" /> Max Tables: <strong>{p.maxTables ?? 'Custom'}</strong></li>
                                    <li className="flex items-center gap-2"><FaUsers className="text-accent" /> Max Vendors: <strong>{p.maxVendors ?? 'Custom'}</strong></li>
                                    <li className="flex items-center gap-2">{p.features.superAdminCRUD ? <FaCheck className="text-green-500" /> : <FaTimes className="text-red-500" />} Super Admin CRUD</li>
                                    <li className="flex items-center gap-2">{p.features.splitCart ? <FaCheck className="text-green-500" /> : <FaTimes className="text-red-500" />} Split Cart</li>
                                    <li className="flex items-center gap-2">{p.features.analytics ? <FaCheck className="text-green-500" /> : <FaTimes className="text-red-500" />} Analytics</li>
                                </ul>
                                <a href="/tableserve/signup" className="inline-block mt-5 px-4 py-2 rounded-lg bg-accent text-white font-raleway">Get started</a>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    </div>
);

export default Services;
