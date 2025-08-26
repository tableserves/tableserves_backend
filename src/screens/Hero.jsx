import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import AOS from 'aos';
import 'aos/dist/aos.css';
import image1 from '../assets/herosection.png';

const Hero = () => {


    return (
        <section className="text-center py-10 px-4 md:py-20 md:px-8 md:flex md:items-center md:justify-center pt-20">

            <div
                className="md:w-1/2 md:pr-10 ml-0 sm:ml-5 md:ml-10 lg:ml-20"
                data-aos="fade-right"
            >
                <h1 className="text-3xl md:text-5xl font-fredoka text-left mb-4 text-white">
                    Transforming Dine-In Experiences with Self-Service Technology
                </h1>
                <p className="text-base md:text-lg mb-8 max-w-2xl text-orange-400 text-left mx-auto font-raleway">
                    At Tableserve, we are dedicated to enhancing the dining experience by
                    providing innovative self-service solutions. Our technology empowers
                    customers and streamlines restaurant operations.
                </p>
                <div
                    className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4"
                    data-aos="zoom-in-up"
                >
                    <Link to="/services" className="relative group bg-white px-6 py-3 rounded-full font-semibold text-black shadow-lg transition-all duration-300 ease-in-out hover:shadow-[0_0_20px_4px_rgba(235,61,30,0.5)] hover:-translate-y-1 active:scale-95 overflow-hidden inline-block">
                        <span className="relative z-10">Learn More</span>
                        <span className="absolute inset-0 bg-gradient-to-r from-white/20 via-transparent to-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-full"></span>
                    </Link>

                    <Link
                        to="/tableserve/signup"
                        className="relative bg-accent text-white px-6 py-3 rounded-full font-semibold shadow-lg transition-all duration-300 ease-in-out hover:shadow-[0_0_20px_4px_rgba(235,61,30,0.5)] hover:-translate-y-1 active:scale-95 overflow-hidden inline-block"
                    >
                        <span className="relative z-10">Sign up</span>
                        <span className="absolute inset-0 rounded-full bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></span>
                    </Link>
                </div>

            </div>

            <div
                className="md:w-1/2 mt-10 md:mt-0 pt-10"
                data-aos="fade-left"
            >
                <img
                    src={image1}
                    alt="Hero section"
                    className="rounded-xl w-full max-w-md mx-auto"
                    style={{
                        boxShadow: '0 8px 24px rgba(255, 255, 255, 0.3)',
                        filter: 'drop-shadow(0 4px 12px rgba(255, 255, 255, 0.2))',
                        borderRadius: '12px',
                    }}
                />
            </div>
        </section>
    );
};

export default Hero;
