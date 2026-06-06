import React, { useState } from 'react';
import { FaEnvelope, FaPhone, FaMapMarkerAlt, FaHeadset, FaRocket, FaQuestionCircle, FaHandshake } from 'react-icons/fa';

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    inquiryType: 'general'
  });

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission here
    console.log('Form submitted:', formData);
    alert("Thank you for your message! We'll get back to you soon.");
  };

  return (
    <div className="bg-primary-bg text-white min-h-screen">
      <div className="container mx-auto px-4 py-12 md:py-20 max-w-7xl">
        <div className="text-center mb-12 md:mb-16" data-aos="fade-down">
          <h1 className="text-4xl md:text-5xl font-fredoka text-accent mb-4">Get in Touch</h1>
          <p className="text-base md:text-lg font-raleway max-w-3xl mx-auto">
            Have a question, need support, or want to discuss how Tableserves can transform your restaurant? We're here to help. Send us a message, and we'll get back to you as soon as possible.
          </p>
        </div>

        {/* Contact Methods */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-12 md:mb-16 max-w-6xl mx-auto">
          <div className="bg-white/5 p-6 rounded-xl text-center" data-aos="fade-up" data-aos-delay="100">
            <FaHeadset className="text-4xl text-accent mx-auto mb-4" />
            <h3 className="text-xl font-fredoka text-accent mb-2">24/7 Support</h3>
            <p className="font-raleway text-sm mb-3">Get immediate help with technical issues</p>
          </div>
          <div className="bg-white/5 p-6 rounded-xl text-center" data-aos="fade-up" data-aos-delay="200">
            <FaRocket className="text-4xl text-accent mx-auto mb-4" />
            <h3 className="text-xl font-fredoka text-accent mb-2">Sales Inquiry</h3>
            <p className="font-raleway text-sm mb-3">Learn about our plans and features</p>
          </div>
          <div
            className="bg-white/5 p-6 rounded-xl text-center sm:col-span-2 lg:col-span-1"
            data-aos="fade-up"
            data-aos-delay="300"
          >
            <FaHandshake className="text-4xl text-accent mx-auto mb-4" />
            <h3 className="text-xl font-fredoka text-accent mb-2">Partnership</h3>
            <p className="font-raleway text-sm mb-3">Explore partnership opportunities</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 md:gap-12 max-w-6xl mx-auto">
          {/* Contact Information */}
          <div data-aos="fade-right">
            <h2 className="text-3xl font-fredoka text-accent mb-6">Contact Information</h2>
            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-4 bg-white/5 p-4 rounded-xl">
                <FaMapMarkerAlt className="text-xl text-accent mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-fredoka text-lg text-accent mb-1">Head Office</h4>
                  <p className="font-raleway text-sm">Ranipet, Tamil Nadu, India</p>
                </div>
              </div>
              <div className="flex items-start gap-4 bg-white/5 p-4 rounded-xl">
                <FaPhone className="text-xl text-accent mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-fredoka text-lg text-accent mb-1">Phone Support</h4>
                  <p className="font-raleway">+91 79040 21564</p>
                  <p className="font-raleway text-xs text-gray-300">Available 24/7 for urgent issues</p>
                </div>
              </div>
              <div className="flex items-start gap-4 bg-white/5 p-4 rounded-xl">
                <FaEnvelope className="text-xl text-accent mt-1 flex-shrink-0" />
                <div>
                  <h4 className="font-fredoka text-lg text-accent mb-1">Email Support</h4>
                  <p className="font-raleway">admin@tableserves.com</p>
                  <p className="font-raleway text-xs text-gray-300">Response within 2 hours</p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div data-aos="fade-left">
            <div className="bg-white/5 p-6 md:p-8 rounded-xl shadow-lg">
              <h2 className="text-2xl font-fredoka text-accent mb-6">Send us a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="inquiryType" className="block text-sm font-medium mb-2 text-accent">
                    Inquiry Type
                  </label>
                  <select
                    id="inquiryType"
                    name="inquiryType"
                    value={formData.inquiryType}
                    onChange={handleChange}
                    className="w-full p-3 rounded-lg bg-white/10 border-2 border-transparent focus:border-accent focus:outline-none transition-all text-white"
                  >
                    <option value="general" className="bg-gray-800">
                      General Inquiry
                    </option>
                    <option value="support" className="bg-gray-800">
                      Technical Support
                    </option>
                    <option value="sales" className="bg-gray-800">
                      Sales & Pricing
                    </option>
                    <option value="partnership" className="bg-gray-800">
                      Partnership
                    </option>
                    <option value="demo" className="bg-gray-800">
                      Request Demo
                    </option>
                  </select>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-2 text-accent">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className="w-full p-3 rounded-lg bg-white/10 border-2 border-transparent focus:border-accent focus:outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium mb-2 text-accent">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full p-3 rounded-lg bg-white/10 border-2 border-transparent focus:border-accent focus:outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium mb-2 text-accent">
                    Subject *
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    className="w-full p-3 rounded-lg bg-white/10 border-2 border-transparent focus:border-accent focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label htmlFor="message" className="block text-sm font-medium mb-2 text-accent">
                    Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={formData.message}
                    onChange={handleChange}
                    rows="4"
                    required
                    className="w-full p-3 rounded-lg bg-white/10 border-2 border-transparent focus:border-accent focus:outline-none transition-all"
                    placeholder="Tell us about your restaurant and how we can help..."
                  ></textarea>
                </div>
                <div className="text-center pt-2">
                  <button
                    type="submit"
                    className="bg-accent text-white px-8 py-3 rounded-full font-semibold hover:shadow-lg hover:shadow-accent/50 transform hover:-translate-y-1 transition-all duration-300"
                  >
                    Send Your Message
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 md:mt-20 max-w-6xl mx-auto">
          <h2 className="text-3xl font-fredoka text-accent text-center mb-12" data-aos="fade-up">
            Frequently Asked Questions
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white/5 p-6 rounded-xl" data-aos="fade-up" data-aos-delay="100">
              <div className="flex items-start gap-3 mb-3">
                <FaQuestionCircle className="text-accent text-lg mt-1 flex-shrink-0" />
                <h3 className="font-fredoka text-lg text-accent">How quickly can I set up Tableserves?</h3>
              </div>
              <p className="font-raleway text-sm pl-6">
                Most restaurants can be up and running within 24 hours. Our team provides full setup assistance and training.
              </p>
            </div>
            <div className="bg-white/5 p-6 rounded-xl" data-aos="fade-up" data-aos-delay="200">
              <div className="flex items-start gap-3 mb-3">
                <FaQuestionCircle className="text-accent text-lg mt-1 flex-shrink-0" />
                <h3 className="font-fredoka text-lg text-accent">Do you offer free trials?</h3>
              </div>
              <p className="font-raleway text-sm pl-6">
                Yes! We offer a 14-day free trial with full access to all features. No credit card required to start.
              </p>
            </div>
            <div className="bg-white/5 p-6 rounded-xl" data-aos="fade-up" data-aos-delay="300">
              <div className="flex items-start gap-3 mb-3">
                <FaQuestionCircle className="text-accent text-lg mt-1 flex-shrink-0" />
                <h3 className="font-fredoka text-lg text-accent">What kind of support do you provide?</h3>
              </div>
              <p className="font-raleway text-sm pl-6">
                We provide 24/7 technical support, training materials, and dedicated account management for premium plans.
              </p>
            </div>
            <div className="bg-white/5 p-6 rounded-xl" data-aos="fade-up" data-aos-delay="400">
              <div className="flex items-start gap-3 mb-3">
                <FaQuestionCircle className="text-accent text-lg mt-1 flex-shrink-0" />
                <h3 className="font-fredoka text-lg text-accent">Can I customize the QR codes and interface?</h3>
              </div>
              <p className="font-raleway text-sm pl-6">
                Absolutely! You can customize QR codes with your branding, colors, and logos to match your restaurant's identity.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;
