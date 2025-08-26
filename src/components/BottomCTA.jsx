import React from 'react';
import roboticcharacter from '../assets/roboticcharacter.png';

const BottomCTA = () => (
    <section className="py-20 px-8 text-center flex flex-col md:flex-row items-center bg-white text-primary">
        <div className='w-full md:w-1/2' style={{ filter: 'drop-shadow(0 10px 8px rgba(155, 60, 20, 0.5))' }}>
            <img src={roboticcharacter} alt='' className='block mx-auto rounded-full h-60 sm:h-66 md:h-72 lg:h-76 xl:h-80 mb-10' data-aos="zoom-in" ></img>
        </div>
        <div className='w-full md:w-1/2'>
            <h2 className="text-3xl md:text-4xl font-fredoka mb-4" data-aos="fade-up">Skip the Wait. Scan & Dine.</h2>
            <p className="text-base md:text-lg mb-8" data-aos="fade-up">The future of dine-in is here. Join us in revolutionizing the restaurant industry.</p>
            <button className="bg-accent text-white px-6 py-3 rounded-full font-semibold hover:shadow-lg hover:shadow-primary/50 transform hover:-translate-y-1 transition-all" data-aos="slide-up">Explore Now</button>
        </div>

    </section>
);

export default BottomCTA;
