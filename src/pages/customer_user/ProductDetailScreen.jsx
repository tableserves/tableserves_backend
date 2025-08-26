import React, { useState, useContext, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaPlus, FaMinus, FaShoppingCart, FaArrowLeft } from 'react-icons/fa';
import Footer from '../../components/Footer';
import { CartContext } from '../../context/CartContext.jsx';
import { useSelector, useDispatch } from 'react-redux';
import { fetchMenuItems } from '../../store/slices/menuSlice';

const ProductDetailScreen = () => {
  const { restaurantName, userId, dishId, shopId, restaurantId, zoneId, tableId } = useParams();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useContext(CartContext);

  const dispatch = useDispatch();
  const { items: dishes = [], itemsLoading: loading, itemsError: error } = useSelector((state) => state.menu);

  useEffect(() => {
    if (dishes.length === 0) {
      dispatch(fetchMenuItems());
    }
  }, [dishes.length, dispatch]);

  const dish = dishes.find(d => d.id === dishId);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-raleway">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-fredoka text-gray-800 mb-4">Error Loading Product</h1>
          <p className="text-gray-600 font-raleway">{error}</p>
        </div>
      </div>
    );
  }

  if (!dish) {
    return <div className="min-h-screen bg-primary-bg text-text-main flex items-center justify-center">Dish not found!</div>;
  }

  const handleAddToCart = () => {
    addToCart({
      id: dish.id,
      name: dish.name,
      price: dish.price,
      image: dish.image,
      quantity: quantity
    });

    console.log(`Added ${quantity} of ${dish.name} to cart.`);
    if (shopId) {
      navigate(`/tableserve/zone/${zoneId}/table/${tableId}/shop/${shopId}/cart`);
    } else if (restaurantId) {
      navigate(`/tableserve/restaurant/${restaurantId}/table/${tableId}/cart`);
    } else {
      // Navigate to cart with proper route parameters
      let cartRoute;
      if (zoneId && tableId && userId) {
        cartRoute = `/tableserve/zone/${zoneId}/table/${tableId}/user/${userId}/cart`;
      } else if (zoneId && tableId) {
        cartRoute = `/tableserve/zone/${zoneId}/table/${tableId}/cart`;
      } else if (restaurantId && tableId && userId) {
        cartRoute = `/tableserve/restaurant/${restaurantId}/table/${tableId}/user/${userId}/cart`;
      } else if (restaurantId && tableId) {
        cartRoute = `/tableserve/restaurant/${restaurantId}/table/${tableId}/cart`;
      } else {
        cartRoute = '/';
      }
      console.log('Navigating to cart:', cartRoute);
      navigate(cartRoute);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-white  text-primary-bg p-8">
        {/* Header */}
        <div className="flex items-center mb-6">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            className="p-3 bg-accent rounded-full shadow-lg border "
          >
            <FaArrowLeft className="text-xl text-text-main" />
          </motion.button>
          <h1 className="text-2xl text-accent font-raleway ml-4">{dish.name}</h1>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-accent rounded-2xl shadow-2xl  shadow-black/40"
        >
          <img src={dish.image} alt={dish.name} className="w-full h-48 object-cover bg-white rounded-t-xl mb-4" />
          <div className='pl-2 text-white'>
            <div className='flex justify-between pr-4'>
              <h2 className="text-xl font-raleway text-text-main ">{dish.name}</h2>
              <p className="text-primary-accent text-xl  "> ₹{dish.price.toFixed(2)}</p>
            </div>
            <p className=" text-base">{dish.description}</p>
          </div>
          {/* Customization (e.g., spice level) */}
          <div className="mb-6 flex justify-between">
            <h3 className="text-lg pt-4 pl-2 text-white">Customization</h3>

            <select className="  m-2 p-2 mt-4 rounded-xl bg-accent text-white border border-white focus:outline-none focus:ring-0 focus:ring-white">
              <div className=' text-white bg-white border  border-white'>
                <option className='bg-white text-accent '>No Spice</option>
                <option className='bg-white text-accent '>Mild</option>
                <option className='bg-white text-accent '>Medium</option>
                <option className='bg-white text-accent ' >Hot</option>
              </div>
            </select>

          </div>
          {/* Quantity Selector */}
          <div className="flex items-center bg-white w-24 ml-2 p-1 rounded-full justify-center -mt-6 ">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setQuantity(prev => Math.max(1, prev - 1))}
              className=" rounded-full"
            >
              <FaMinus className="text-accent text-xs" />
            </motion.button>
            <span className="text-xl font-raleway text-accent mx-6">{quantity}</span>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setQuantity(prev => prev + 1)}
              className="  rounded-full"
            >
              <FaPlus className="text-accent text-xs" />
            </motion.button>
          </div>
          <div className='pb-6'>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleAddToCart}
              className="flex text-white w-48 ml-32 hover:bg-white hover:text-accent border border-white  hover:border-accent  mt-6 h-12 font-bold rounded-xl p-2 items-center bg-accent"
            >
              <FaShoppingCart className="mr-3 flex  ml-6" /> Add to Cart
            </motion.button>
          </div>
        </motion.div>
      </div >
      <Footer />
    </>
  );
};

export default ProductDetailScreen;
