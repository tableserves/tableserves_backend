import React from 'react';
import team from '../assets/roboticcharacter.png'; // Using roboticcharacter as a placeholder for a team image

const About = () => (
    <div className="bg-white text-primary min-h-screen">
        <div className="container mx-auto px-4 py-20">
            <div className="text-center mb-16" data-aos="fade-down">
                <h1 className="text-5xl md:text-6xl font-fredoka text-accent mb-4">About TableServe</h1>
                <p className="text-lg font-raleway max-w-4xl mx-auto">
                    Founded on the principle of innovation, TableServe is dedicated to transforming the restaurant industry. We believe that technology can bridge the gap between restaurants and their customers, creating a more connected and efficient dining ecosystem.
                </p>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-12">
                <div className="md:w-1/2" data-aos="fade-right">
                    <img src={team} alt="Our Team" className="rounded-full shadow-2xl w-full max-w-md mx-auto" style={{ filter: 'drop-shadow(0 10px 8px rgba(0, 0, 0, 0.5))' }} />
                </div>
                <div className="md:w-1/2" data-aos="fade-left">
                    <div>
                        <h2 className="text-4xl font-fredoka text-accent mb-4">Our Mission</h2>
                        <p className="font-raleway text-lg mb-8">
                            To empower restaurants of all sizes with elegant, affordable, and powerful technology that streamlines their operations, enhances the customer experience, and provides the insights they need to thrive in a competitive landscape.
                        </p>
                    </div>
                    <div>
                        <h2 className="text-4xl font-fredoka text-accent mb-4">Our Vision</h2>
                        <p className="font-raleway text-lg">
                            We envision a future where every dining experience is personalized, seamless, and memorable. We are committed to building the tools that will make this vision a reality, one restaurant at a time.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

export default About;
