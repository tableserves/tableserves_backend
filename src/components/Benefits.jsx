import React from 'react';
import secure from "../assets/securepayment.png"
import blackscrap from "../assets/blackscrap.png"
import digitalmenu from "../assets/digitalmenu.png"
import reducedwaiter from "../assets/reducedwaiter.png"

const Benefits = () => (
    <section className="py-20 px-8 pb-10  relative bg-primary-bg">

        <div className="relative z-10 grid md:grid-cols-3 gap-8 text-center">
            <div className="p-8 rounded-lg bg-card-bg text-text-main" data-aos="fade-up">
                <div className='flex justify-center h-60 mb-10 '>
                    <img src={secure} alt='secure' className='rounded-xl '></img>
                </div>
                <h3 className="text-xl md:text-2xl font-fredoka mb-4 text-accent" >Secure and Convenient Payment</h3>
                <p className="text-sm  font-ralewaymd:text-base text-text-main">Pay your bills with ease using our secure, integrated payment system.</p>
            </div>
            <div className="p-8 rounded-lg bg-card-bg text-text-main" data-aos="fade-up">
                <div className='flex justify-center h-60 mb-10 '>
                    <img src={digitalmenu} alt='secure' className='rounded-xl '></img>
                </div>
                <h3 className="text-xl md:text-2xl font-fredoka mb-4 text-accent">Explore Digital Menu</h3>
                <p className="text-sm md:text-base text-text-main">Browse the full menu, view item details, and discover your new favorite dish.</p>
            </div>
            <div className="p-8 rounded-lg bg-card-bg text-text-main" data-aos="fade-up">
                <div className='flex justify-center h-60 mb-10 '>
                    <img src={reducedwaiter} alt='secure' className='rounded-xl '></img>
                </div>
                <h3 className="text-xl md:text-2xl font-fredoka mb-4 text-accent">Reduced Waiting Time</h3>
                <p className="text-sm md:text-base text-text-main">Place your order instantly from your table, no more waiting for a server.</p>
            </div>
        </div>
    </section>
);

export default Benefits;
