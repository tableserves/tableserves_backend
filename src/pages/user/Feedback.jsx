import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { FaStar } from 'react-icons/fa';

const Feedback = () => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // In real app, this would send feedback to API
    console.log('Feedback submitted:', { rating, feedback });
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 max-w-2xl mx-auto"
      >
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-fredoka text-white mb-4">Thank You!</h2>
          <p className="text-white/80 font-raleway mb-6">
            Your feedback has been submitted successfully. We appreciate your input!
          </p>
          <motion.button
            onClick={() => setSubmitted(false)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-accent hover:bg-accent/90 text-white font-raleway font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Submit Another Review
          </motion.button>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 max-w-2xl mx-auto"
    >
      <div className="mb-6">
        <h1 className="text-3xl font-fredoka text-white mb-2">Feedback</h1>
        <p className="text-white/80 font-raleway">How was your dining experience?</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Rating */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6">
          <h3 className="text-xl font-raleway text-white mb-4">Rate your experience</h3>
          <div className="flex justify-center space-x-2 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="text-3xl transition-colors"
              >
                <FaStar
                  className={star <= rating ? 'text-accent' : 'text-white/30'}
                />
              </button>
            ))}
          </div>
          <div className="text-center">
            <p className="text-white/80 font-raleway">
              {rating === 0 && 'Click to rate'}
              {rating === 1 && 'Poor'}
              {rating === 2 && 'Fair'}
              {rating === 3 && 'Good'}
              {rating === 4 && 'Very Good'}
              {rating === 5 && 'Excellent'}
            </p>
          </div>
        </div>

        {/* Written Feedback */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6">
          <h3 className="text-xl font-raleway text-white mb-4">Tell us more</h3>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Share your thoughts about the food, service, or overall experience..."
            rows={6}
            className="w-full p-4 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 resize-none focus:outline-none focus:border-accent transition-colors"
          />
        </div>

        {/* Submit Button */}
        <motion.button
          type="submit"
          disabled={rating === 0}
          whileHover={{ scale: rating > 0 ? 1.02 : 1 }}
          whileTap={{ scale: rating > 0 ? 0.98 : 1 }}
          className={`w-full font-raleway font-semibold py-4 rounded-lg transition-colors ${
            rating > 0
              ? 'bg-accent hover:bg-accent/90 text-white'
              : 'bg-white/20 text-white/50 cursor-not-allowed'
          }`}
        >
          Submit Feedback
        </motion.button>
      </form>
    </motion.div>
  );
};

export default Feedback;
