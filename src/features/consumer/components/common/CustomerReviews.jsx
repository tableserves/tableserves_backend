import React, { useState, useEffect, useRef } from 'react';
import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';

const CustomerReviews = () => {
  const [reviews, setReviews] = useState([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slidesPerView, setSlidesPerView] = useState(2);
  const carouselRef = useRef(null);

  useEffect(() => {
    const fetchReviewsData = async () => {
      try {
        setLoading(true);
        setError(null);
        const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api/v1';

        // Fetch recent reviews
        const reviewsResponse = await fetch(`${apiBaseUrl}/tableserve-ratings/public-recent?limit=12`);
        
        if (!reviewsResponse.ok) {
          throw new Error(`Failed to fetch reviews: ${reviewsResponse.status}`);
        }
        
        const reviewsData = await reviewsResponse.json();

        if (reviewsData.success && reviewsData.data) {
          setReviews(reviewsData.data);
        } else {
          setReviews([]);
        }

        // Fetch average rating and stats
        const statsResponse = await fetch(`${apiBaseUrl}/tableserve-ratings/public-statistics`);
        
        if (!statsResponse.ok) {
          throw new Error(`Failed to fetch statistics: ${statsResponse.status}`);
        }
        
        const statsData = await statsResponse.json();

        if (statsData.success && statsData.data) {
          setAverageRating(statsData.data.averageServiceRating || 0);
          setTotalReviews(statsData.data.totalReviews || reviewsData.data?.length || 0);
        } else {
          setAverageRating(0);
          setTotalReviews(0);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching reviews:', err);
        setError(null); // Don't show error, just show empty state
        setReviews([]);
        setAverageRating(0);
        setTotalReviews(0);
        setLoading(false);
      }
    };

    fetchReviewsData();
  }, []);

  // Responsive slides per view
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSlidesPerView(2); // 2 cards on tablets and desktop
      } else {
        setSlidesPerView(1); // 1 card on mobile
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-slide functionality
  useEffect(() => {
    if (reviews.length === 0) return;

    const totalSlides = Math.max(1, Math.ceil(reviews.length / slidesPerView));
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % totalSlides);
    }, 4000); // Auto-slide every 4 seconds

    return () => clearInterval(interval);
  }, [reviews, slidesPerView]);

  // Function to render star ratings
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 1; i <= 5; i++) {
      if (i <= fullStars) {
        stars.push(<FaStar key={i} className="text-yellow-400" />);
      } else if (i === fullStars + 1 && hasHalfStar) {
        stars.push(<FaStarHalfAlt key={i} className="text-yellow-400" />);
      } else {
        stars.push(<FaRegStar key={i} className="text-yellow-400" />);
      }
    }

    return stars;
  };

  // Calculate transform value
  const getTransformValue = () => {
    if (!carouselRef.current || slidesPerView === 0) return 0;

    const slideWidth = carouselRef.current.offsetWidth / slidesPerView;
    return -currentSlide * slideWidth;
  };

  if (loading) {
    return (
      <div className="bg-white py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-6xl font-fredoka text-accent text-center mb-12">What Our Customers Say</h2>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
          </div>
        </div>
      </div>
    );
  }

  // Show empty state if no reviews (don't show error)
  if (reviews.length === 0) {
    return (
      <div className="bg-white py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-6xl font-fredoka text-accent text-center mb-12">What Our Customers Say</h2>
          <div className="text-center max-w-2xl mx-auto">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-accent/10 rounded-full mb-4">
                <FaStar className="text-4xl text-accent" />
              </div>
            </div>
            <h3 className="text-2xl font-fredoka text-primary mb-4">Be the First to Review!</h3>
            <p className="text-gray-600 font-raleway text-lg">
              We're excited to hear about your Tableserves experience. Your feedback helps us improve and serve you better.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const totalSlides = Math.max(1, Math.ceil(reviews.length / slidesPerView));

  return (
    <div className="bg-white py-16">
      <div className="container mx-auto px-4">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h2 className="text-6xl font-fredoka text-accent mb-4">What Our Customers Say</h2>
          <p className="text-gray-600 mb-8">Hear from diners who have experienced Tableserves</p>

          {/* Average Rating Display */}
          <div className="flex flex-col items-center gap-3 mb-6">
            <div className="text-5xl font-fredoka text-accent">{averageRating.toFixed(1)}</div>
            <div className="flex gap-1">
              {renderStars(averageRating)}
              <div className="text-sm" ><div className="text-gray-600">Reviews</div></div>
              
            </div>
          </div>

          
        </div>

        {/* Reviews Carousel */}
        <div className="relative max-w-4xl mx-auto">
          {/* Carousel Container */}
          <div className="overflow-hidden rounded-xl relative">
            <div
              className="flex transition-transform duration-700 ease-in-out"
              style={{ transform: `translateX(${getTransformValue()}px)` }}
              ref={carouselRef}
            >
              {reviews.map((review, index) => (
                <div
                  key={review.id}
                  className="flex-shrink-0 px-3"
                  style={{
                    width: `calc(100% / ${slidesPerView})`,
                  }}
                >
                  <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 h-full">
                    {/* Customer Name First */}
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-accent to-accent/40 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {review.customerName.split(' ')[0][0]}{review.customerName.split(' ')[1]?.[0]}
                      </div>
                      <div>
                        <p className="font-fredoka text-primary font-semibold text-lg">{review.customerName}</p>
                        <p className="text-sm text-gray-500">Customer</p>
                      </div>
                    </div>

                    {/* Feedback Text */}
                    <div className="mb-4">
                      <p className="font-raleway text-gray-700 leading-relaxed italic text-base">
                        "{review.serviceFeedback || 'Great experience with Tableserves!'}"
                      </p>
                    </div>

                    {/* Rating Stars at Bottom */}
                    <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                      <div className="flex gap-1">
                        {renderStars(review.serviceRating)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {review.serviceRating}/5
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Dots */}
          <div className="flex justify-center mt-8 gap-3">
            {Array.from({ length: totalSlides }, (_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  currentSlide === index 
                    ? 'bg-accent scale-125' 
                    : 'bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>

          {/* Mobile Slide Indicator */}
          <div className="md:hidden text-center mt-4 text-gray-500 text-sm">
            {currentSlide + 1} of {totalSlides}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerReviews;