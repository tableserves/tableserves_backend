import React from 'react';
import cat from '../assets/cat.png';

const Quote = () => (
    <section className="py-20 px-8 text-center bg-accent relative overflow-hidden">
        {/* Floating white balls */}
        <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-10 left-10 w-4 h-4 bg-white rounded-full opacity-100 animate-bounce" style={{ animationDelay: '0s', animationDuration: '3s' }}></div>
            <div className="absolute top-20 right-20 w-6 h-6 bg-white rounded-full opacity-100 animate-pulse" style={{ animationDelay: '1s', animationDuration: '4s' }}></div>
            <div className="absolute bottom-32 left-16 w-3 h-3 bg-white rounded-full opacity-100 animate-ping" style={{ animationDelay: '2s', animationDuration: '2s' }}></div>
            <div className="absolute top-1/3 right-10 w-5 h-5 bg-white rounded-full opacity-100 animate-bounce" style={{ animationDelay: '0.5s', animationDuration: '3.5s' }}></div>
            <div className="absolute bottom-20 right-1/4 w-4 h-4 bg-white rounded-full opacity-100 animate-pulse" style={{ animationDelay: '1.5s', animationDuration: '3s' }}></div>
            <div className="absolute top-16 left-1/3 w-2 h-2 bg-white rounded-full opacity-100 animate-ping" style={{ animationDelay: '2.5s', animationDuration: '2.5s' }}></div>
            <div className="absolute bottom-40 left-1/4 w-5 h-5 bg-white rounded-full opacity-40 animate-bounce" style={{ animationDelay: '3s', animationDuration: '4s' }}></div>
            <div className="absolute top-1/2 left-8 w-3 h-3 bg-white rounded-full opacity-100 animate-pulse" style={{ animationDelay: '0.8s', animationDuration: '3.2s' }}></div>
        </div>

        <img
            src={cat}
            alt='cat'
            className='h-40 sm:h-42 md:h-44 lg:h-46 xl:h-48 p-4 mx-auto block relative z-10 animate-pulse hover:scale-105 transition-all '
            data-aos="fade-up"
        ></img>
        <h2 className="text-3xl text-white md:text-4xl font-fredoka mb-4 relative z-10" data-aos="fade-up" data-aos-duration="600">"Welcome to Flavor Paradise"</h2>
        <p className="text-base text-white text-raleway md:text-lg max-w-3xl mx-auto relative z-10" data-aos="fade-up" data-aos-duration="600">Experience seamless order management in real-time. Our system ensures that every order is tracked from placement to delivery, providing a smooth and efficient process for both customers and staff.</p>
    </section >
);

export default Quote;
