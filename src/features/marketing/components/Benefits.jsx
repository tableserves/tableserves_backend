import React from 'react';
import secure from '../../../assets/securepayment.png';
import digitalmenu from '../../../assets/digitalmenu.png';
import reducedwaiter from '../../../assets/reducedwaiter.png';

const Benefits = () => {
  const benefits = [
    {
      title: 'Secure and Convenient Payment',
      description: 'Pay your bills with ease using our secure, integrated payment system.',
      icon: secure
    },
    {
      title: 'Explore Digital Menu',
      description: 'Browse the full menu, view item details, and discover your new favorite dish.',
      icon: digitalmenu
    },
    {
      title: 'Reduced Waiting Time',
      description: 'Place your order instantly from your table—no more waiting for a server.',
      icon: reducedwaiter
    }
  ];

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="group relative p-8 rounded-2xl border border-gray-800/50 bg-gray-900/30 backdrop-blur-sm transition-all duration-300 hover:border-gray-700 hover:bg-gray-900/50 hover:shadow-xl"
              data-aos="fade-up"
              data-aos-delay={index * 100}
            >
              {/* Icon/Image */}
              <div className="flex justify-center mb-8">
                <div className="w-full max-w-[220px] h-48 flex items-center justify-center">
                  <img
                    src={benefit.icon}
                    alt={benefit.title}
                    className="w-full h-full object-contain rounded-xl"
                    loading="lazy"
                  />
                </div>
              </div>

              {/* Content */}
              <h3 className="text-xl md:text-2xl font-fredoka font-semibold text-white mb-4 leading-tight">{benefit.title}</h3>
              <p className="text-gray-300 font-raleway text-base leading-relaxed opacity-90">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Benefits;
