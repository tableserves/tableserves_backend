import React from 'react';
import {
  FaQrcode,
  FaChartLine,
  FaShieldAlt,
  FaUsers,
  FaTable,
  FaMobile,
  FaCog,
  FaHeadset,
  FaStore,
  FaMapMarkerAlt,
  FaUtensils,
  FaClock,
  FaWifi,
  FaCloudUploadAlt,
  FaFileInvoiceDollar
} from 'react-icons/fa';

const Services = () => (
  <div className="bg-primary-bg text-white min-h-screen">
    <div className="container mx-auto px-4 py-20">
      <div className="text-center mb-16" data-aos="fade-down">
        <h1 className="text-5xl md:text-6xl font-fredoka text-accent mb-4">Our Services</h1>
        <p className="text-lg font-raleway max-w-3xl mx-auto">
          We provide a comprehensive suite of innovative services designed to revolutionize the dining experience for both customers and restaurant owners. Our technology is crafted to be seamless, intuitive, and powerful.
        </p>
      </div>

      {/* Core Services */}
      <div className="grid md:grid-cols-3 gap-12 mb-20">
        <div
          className="bg-white/5 p-8 rounded-xl shadow-lg hover:shadow-accent/20 transform hover:-translate-y-2 transition-all duration-300"
          data-aos="fade-up"
          data-aos-delay="100"
        >
          <div className="flex justify-center mb-6">
            <FaQrcode className="text-5xl text-accent" />
          </div>
          <h2 className="text-2xl font-fredoka mb-4 text-center">QR-Powered Ordering</h2>
          <p className="font-raleway text-center mb-4">
            Empower your customers with the ability to browse your menu, place orders, and pay their bills directly from their smartphones. This contactless solution reduces wait times and increases table turnover.
          </p>
          <ul className="text-sm font-raleway space-y-2">
            <li>• Instant menu access via QR scan</li>
            <li>• Real-time order tracking</li>
            <li>• Multiple payment options</li>
            <li>• Contactless dining experience</li>
          </ul>
        </div>
        <div
          className="bg-white/5 p-8 rounded-xl shadow-lg hover:shadow-accent/20 transform hover:-translate-y-2 transition-all duration-300"
          data-aos="fade-up"
          data-aos-delay="200"
        >
          <div className="flex justify-center mb-6">
            <FaChartLine className="text-5xl text-accent" />
          </div>
          <h2 className="text-2xl font-fredoka mb-4 text-center">Advanced Analytics</h2>
          <p className="font-raleway text-center mb-4">
            Make data-driven decisions with our comprehensive analytics dashboard. Track sales, monitor popular items, and understand customer preferences to optimize your menu and marketing strategies.
          </p>
          <ul className="text-sm font-raleway space-y-2">
            <li>• Real-time sales tracking</li>
            <li>• Customer behavior insights</li>
            <li>• Menu performance analytics</li>
            <li>• Revenue optimization reports</li>
          </ul>
        </div>
        <div
          className="bg-white/5 p-8 rounded-xl shadow-lg hover:shadow-accent/20 transform hover:-translate-y-2 transition-all duration-300"
          data-aos="fade-up"
          data-aos-delay="300"
        >
          <div className="flex justify-center mb-6">
            <FaShieldAlt className="text-5xl text-accent" />
          </div>
          <h2 className="text-2xl font-fredoka mb-4 text-center">Secure & Integrated Payments</h2>
          <p className="font-raleway text-center mb-4">
            Offer a variety of payment options with our secure, PCI-compliant payment gateway. From credit cards to digital wallets, we ensure every transaction is smooth and protected.
          </p>
          <ul className="text-sm font-raleway space-y-2">
            <li>• Multiple payment gateways</li>
            <li>• Secured payment methods</li>
            <li>• Automated invoice generation</li>
            <li>• PCI-compliant transactions</li>
          </ul>
        </div>
      </div>

      {/* Additional Services */}
      <div className="mb-16">
        <h2 className="text-3xl font-fredoka text-accent text-center mb-12" data-aos="fade-up">
          Additional Features
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          <div className="bg-white/5 p-6 rounded-xl text-center" data-aos="fade-up" data-aos-delay="100">
            <FaStore className="text-3xl text-accent mx-auto mb-4" />
            <h3 className="font-fredoka text-lg mb-2">Multi-Restaurant Management</h3>
            <p className="text-sm font-raleway">Manage multiple locations from a single dashboard</p>
          </div>
          <div className="bg-white/5 p-6 rounded-xl text-center" data-aos="fade-up" data-aos-delay="200">
            <FaTable className="text-3xl text-accent mx-auto mb-4" />
            <h3 className="font-fredoka text-lg mb-2">Table Management</h3>
            <p className="text-sm font-raleway">Efficient table allocation and reservation system</p>
          </div>
          <div className="bg-white/5 p-6 rounded-xl text-center" data-aos="fade-up" data-aos-delay="300">
            <FaCloudUploadAlt className="text-3xl text-accent mx-auto mb-4" />
            <h3 className="font-fredoka text-lg mb-2">Cloud Storage</h3>
            <p className="text-sm font-raleway">Secure cloud-based data storage and backup</p>
          </div>
        </div>
      </div>

      {/* Business Solutions */}
      <div className="mb-16">
        <h2 className="text-3xl font-fredoka text-accent text-center mb-12" data-aos="fade-up">
          Business Solutions
        </h2>
        <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
          <div className="bg-white/5 p-8 rounded-xl" data-aos="fade-right">
            <div className="flex items-center mb-6">
              <FaUtensils className="text-3xl text-accent mr-4" />
              <h3 className="text-2xl font-fredoka">For Single Restaurants</h3>
            </div>
            <p className="font-raleway mb-4">
              Perfect for independent restaurants looking to modernize their operations and enhance customer experience.
            </p>
            <ul className="font-raleway space-y-2">
              <li>• Easy menu management</li>
              <li>• Customer feedback system</li>
              <li>• Basic analytics dashboard</li>
              <li>• QR code customization</li>
            </ul>
          </div>
          <div className="bg-white/5 p-8 rounded-xl" data-aos="fade-left">
            <div className="flex items-center mb-6">
              <FaMapMarkerAlt className="text-3xl text-accent mr-4" />
              <h3 className="text-2xl font-fredoka">For Food Zones</h3>
            </div>
            <p className="font-raleway mb-4">
              Comprehensive solution for food courts and multi-vendor dining areas with centralized management.
            </p>
            <ul className="font-raleway space-y-2">
              <li>• Multi-vendor management</li>
              <li>• Centralized order processing</li>
              <li>• Zone-wide analytics</li>
              <li>• Unified customer experience</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Support & Maintenance */}
      <div className="text-center bg-white/5 p-8 rounded-xl max-w-6xl mx-auto" data-aos="fade-up">
        <FaHeadset className="text-5xl text-accent mx-auto mb-6" />
        <h2 className="text-3xl font-fredoka text-accent mb-4">24/7 Support & Maintenance</h2>
        <p className="font-raleway text-lg mb-6 max-w-3xl mx-auto">
          Our dedicated support team is available round-the-clock to ensure your restaurant operations run smoothly. From technical assistance to business consultation, we're here to help you succeed.
        </p>
        <div className="grid md:grid-cols-3 gap-8 mt-8">
          <div>
            <FaCog className="text-2xl text-accent mx-auto mb-2" />
            <h4 className="font-fredoka text-lg mb-2">Technical Support</h4>
            <p className="text-sm font-raleway">Immediate assistance for any technical issues</p>
          </div>
          <div>
            <FaUsers className="text-2xl text-accent mx-auto mb-2" />
            <h4 className="font-fredoka text-lg mb-2">Training & Onboarding</h4>
            <p className="text-sm font-raleway">Comprehensive training for your staff</p>
          </div>
          <div>
            <FaFileInvoiceDollar className="text-2xl text-accent mx-auto mb-2" />
            <h4 className="font-fredoka text-lg mb-2">Business Consultation</h4>
            <p className="text-sm font-raleway">Strategic advice to grow your business</p>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default Services;
