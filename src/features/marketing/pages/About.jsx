import React from 'react';
import { FaRocket, FaUsers, FaHeart, FaLightbulb, FaAward, FaGlobe } from 'react-icons/fa';

import CustomerReviews from '../../consumer/components/common/CustomerReviews';
import team from '../../../assets/roboticcharacter.png'; // Using roboticcharacter as a placeholder for a team image

const About = () => (
  <div className="bg-white text-primary min-h-screen">
    <div className="container mx-auto px-4 py-4">
      {/* Customer Reviews Section */}
      <CustomerReviews />
      <div className="text-center mb-16" data-aos="fade-down">
        <h1 className="text-5xl md:text-5xl font-fredoka text-accent mb-4">About Tableserves</h1>
        <p className="text-lg font-raleway max-w-4xl mx-auto">
          Founded on the principle of innovation, Tableserves is dedicated to transforming the restaurant industry. We believe that technology can bridge the gap between restaurants and their customers, creating a more connected, efficient, and enjoyable dining ecosystem for everyone.
        </p>
      </div>

      <div className="flex flex-col md:flex-row items-center gap-12 mb-20">
        <div className="md:w-1/2" data-aos="fade-right">
          <img
            src={team}
            alt="Our Team"
            className="rounded-full shadow-2xl w-full max-w-md mx-auto"
            style={{ filter: 'drop-shadow(0 10px 8px rgba(0, 0, 0, 0.5))' }}
          />
        </div>
        <div className="md:w-1/2" data-aos="fade-left">
          <div className="mb-8">
            <h2 className="text-4xl font-fredoka text-accent mb-4">Our Mission</h2>
            <p className="font-raleway text-lg mb-6">
              To empower restaurants of all sizes with elegant, affordable, and powerful technology that streamlines their operations, enhances the customer experience, and provides the insights they need to thrive in today's competitive landscape.
            </p>
          </div>
          <div>
            <h2 className="text-4xl font-fredoka text-accent mb-4">Our Vision</h2>
            <p className="font-raleway text-lg">
              We envision a future where every dining experience is personalized, seamless, and memorable. We are committed to building the tools that will make this vision a reality, one restaurant at a time, transforming how people discover, order, and enjoy food.
            </p>
          </div>
        </div>
      </div>

      {/* Our Values */}
      <div className="mb-20">
        <h2 className="text-4xl font-fredoka text-accent text-center mb-12" data-aos="fade-up">
          Our Core Values
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center bg-gray-50 p-8 rounded-xl" data-aos="fade-up" data-aos-delay="100">
            <FaLightbulb className="text-4xl text-accent mx-auto mb-4" />
            <h3 className="text-2xl font-fredoka text-primary mb-4">Innovation</h3>
            <p className="font-raleway">
              We constantly push boundaries to create cutting-edge solutions that address real-world challenges in the restaurant industry.
            </p>
          </div>
          <div className="text-center bg-gray-50 p-8 rounded-xl" data-aos="fade-up" data-aos-delay="200">
            <FaHeart className="text-4xl text-accent mx-auto mb-4" />
            <h3 className="text-2xl font-fredoka text-primary mb-4">Customer Focus</h3>
            <p className="font-raleway">
              Every feature we build is designed with our customers in mind, ensuring that both restaurant owners and diners have exceptional experiences.
            </p>
          </div>
          <div className="text-center bg-gray-50 p-8 rounded-xl" data-aos="fade-up" data-aos-delay="300">
            <FaAward className="text-4xl text-accent mx-auto mb-4" />
            <h3 className="text-2xl font-fredoka text-primary mb-4">Excellence</h3>
            <p className="font-raleway">
              We strive for excellence in everything we do, from code quality to customer support, ensuring reliable and top-tier service.
            </p>
          </div>
        </div>
      </div>

      {/* Our Story */}
      <div className="mb-20 bg-gray-50 p-12 rounded-2xl" data-aos="fade-up">
        <h2 className="text-4xl font-fredoka text-accent text-center mb-8">Our Story</h2>
        <div className="max-w-4xl mx-auto">
          <p className="font-raleway text-lg mb-6">
            Tableserves was born from a simple observation: the restaurant industry needed a digital transformation that was both powerful and accessible. Our founders, passionate about technology and hospitality, recognized that most solutions were either too complex for small businesses or too limited for growing enterprises.
          </p>
          <p className="font-raleway text-lg mb-6">
            Starting in 2023, we set out to create a platform that would democratize restaurant technology. We wanted to give every restaurant owner, from a single location to multi-chain operations, access to the same level of sophisticated tools that were previously only available to large corporations.
          </p>
        </div>
      </div>

      {/* Team Values */}
      <div className="text-center mb-20">
        <h2 className="text-4xl font-fredoka text-accent mb-8" data-aos="fade-up">
          Why Choose Tableserves?
        </h2>
        <div className="flex flex-col md:flex-row items-center gap-12 max-w-4xl mx-auto">
          <div className="text-left flex flex-col gap-4" data-aos="fade-right">
            <div className="flex items-start mb-6">
              <FaRocket className="text-2xl text-accent mr-4 mt-1" />
              <div>
                <h3 className="text-xl font-fredoka text-primary mb-2">Rapid Innovation</h3>
                <p className="font-raleway">
                  We continuously evolve our platform based on industry trends and customer feedback, ensuring you always have access to the latest features.
                </p>
              </div>
            </div>
            <div className="flex items-start mb-6">
              <FaUsers className="text-2xl text-accent mr-4 mt-1" />
              <div>
                <h3 className="text-xl font-fredoka text-primary mb-2">Dedicated Support</h3>
                <p className="font-raleway">
                  Our expert support team is available 24/7 to help you succeed, providing personalized assistance whenever you need it.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

export default About;
