import React from 'react';
import { MdOutlineTableRestaurant } from 'react-icons/md';
import { ImSpoonKnife } from 'react-icons/im';
import { FaPerson } from 'react-icons/fa6';

import scanner from '../../../assets/herosection.png';

const Features = () => (
  <section className=" bg-white py-20 px-8 gap-16 items-center block md:flex lg:flex">
    <div className="w-full md:w-1/2 lg:w-1/2">
      <div>
        <h2 className="text-3xl md:text-4xl font-fredoka text-primary mb-4" data-aos="fade-up" data-aos-duration="600">
          Revolutionizing Dining with QR Technology
        </h2>
        <p className="text-base md:text-lg mb-8 text-primary font-raleway" data-aos="fade-up" data-aos-duration="600">
          Our QR-based ordering system allows customers to view the menu, place orders, and pay directly from their smartphones, creating a seamless and contactless dining experience.
        </p>
      </div>
      <div className="space-y-2 ">
        <div className="p-4 rounded-lg ml-4" data-aos="fade-right">
          <div className="text-2xl pt-2 pb-2 mb-4 text-accent border-2 w-11 p-2 border-accent">
            <ImSpoonKnife />
          </div>

          <h3 className="text-xl md:text-2xl font-raleway text-primary font-bold mb-4">For Restaurants</h3>
          <p className="text-sm md:text-base font-raleway text-primary">
            Increase table turnover, reduce wait times, and optimize staff efficiency. Our platform provides valuable insights to help you grow your hotel or restaurant.
          </p>
        </div>
        <div className="p-8 rounded-lg " data-aos="fade-right">
          <div className="text-2xl pt-2 pb-2 mb-4 text-accent border-2 w-11 p-2 border-accent">
            <MdOutlineTableRestaurant />
          </div>

          <h3 className="text-xl md:text-2xl font-raleway text-primary font-bold mb-4">For Multi shops</h3>
          <p className="text-sm md:text-base  font-raleway text-primary">
            Manage multiple shops under a single admin with ease through a single platform. Track sales, monitor inventory across locations, and ensure consistency in customer experience. Our system helps you centralize operations, save time, and scale your business effortlessly.
          </p>
        </div>
        <div className=" p-8 rounded-lg" data-aos="fade-right">
          <div className="text-2xl mb-4  pt-2 pb-2 text-accent border-2 w-11 p-2 border-accent">
            <FaPerson />
          </div>
          <h3 className="text-xl md:text-2xl font-raleway text-primary font-bold mb-4">For Customers</h3>
          <p className="text-sm md:text-base mb-4 font-raleway text-primary">
            Enjoy a personalized dining experience with full control over your orders. Skip the queue and pay your bill securely and conveniently.
          </p>
        </div>
      </div>
    </div>
    <div className=" w-full max-w-md mx-auto  items-center justify-center">
      <img
        src={scanner}
        alt="Features"
        className=" object-contain mt-10 rounded-tl-2xl rounded-br-2xl"
        style={{
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
          filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.2))'
        }}
        data-aos="fade-up"
        data-aos-duration="600"
      />
    </div>
  </section>
);

export default Features;
