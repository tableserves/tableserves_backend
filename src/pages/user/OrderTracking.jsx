import React from 'react';
import { motion } from 'framer-motion';
import { useParams } from 'react-router-dom';
import { FaCheck, FaClock, FaUtensils, FaCheckCircle } from 'react-icons/fa';

const OrderTracking = () => {
  const { orderId } = useParams();
  
  // Mock order status - in real app this would come from API
  const orderStatus = 'preparing'; // pending, confirmed, preparing, ready, completed
  
  const statusSteps = [
    { key: 'pending', label: 'Order Placed', icon: FaClock, completed: true },
    { key: 'confirmed', label: 'Order Confirmed', icon: FaCheck, completed: true },
    { key: 'preparing', label: 'Preparing', icon: FaUtensils, completed: orderStatus === 'preparing' || orderStatus === 'ready' || orderStatus === 'completed' },
    { key: 'ready', label: 'Ready for Pickup', icon: FaCheckCircle, completed: orderStatus === 'ready' || orderStatus === 'completed' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 max-w-2xl mx-auto"
    >
      <div className="mb-6">
        <h1 className="text-3xl font-fredoka text-white mb-2">Order Tracking</h1>
        <p className="text-white/80 font-raleway">Order #{orderId}</p>
      </div>

      {/* Order Status */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6">
        <h3 className="text-xl font-raleway text-white mb-6">Order Status</h3>
        
        <div className="space-y-6">
          {statusSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div key={step.key} className="flex items-center">
                <div className={`flex items-center justify-center w-12 h-12 rounded-full ${
                  step.completed ? 'bg-accent' : 'bg-white/20'
                } transition-colors`}>
                  <Icon className={`text-lg ${step.completed ? 'text-white' : 'text-white/60'}`} />
                </div>
                <div className="ml-4 flex-1">
                  <h4 className={`font-raleway font-semibold ${
                    step.completed ? 'text-white' : 'text-white/60'
                  }`}>
                    {step.label}
                  </h4>
                  {step.key === orderStatus && (
                    <p className="text-accent text-sm font-raleway">Current Status</p>
                  )}
                </div>
                {index < statusSteps.length - 1 && (
                  <div className={`absolute left-6 mt-12 w-0.5 h-6 ${
                    statusSteps[index + 1].completed ? 'bg-accent' : 'bg-white/20'
                  }`} style={{ marginLeft: '1.5rem' }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Estimated Time */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-6">
        <h3 className="text-xl font-raleway text-white mb-4">Estimated Time</h3>
        <div className="text-center">
          <p className="text-3xl font-fredoka text-accent mb-2">15-20 mins</p>
          <p className="text-white/80 font-raleway">Your order will be ready soon!</p>
        </div>
      </div>

      {/* Order Details */}
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6">
        <h3 className="text-xl font-raleway text-white mb-4">Order Details</h3>
        <div className="space-y-2 text-white/80 font-raleway">
          <div className="flex justify-between">
            <span>Table Number:</span>
            <span>5</span>
          </div>
          <div className="flex justify-between">
            <span>Order Time:</span>
            <span>2:30 PM</span>
          </div>
          <div className="flex justify-between">
            <span>Payment Method:</span>
            <span>Credit Card</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default OrderTracking;
