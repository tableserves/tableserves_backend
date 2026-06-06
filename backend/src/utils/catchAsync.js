/**
 * Wraps an async function to catch any errors and pass them to Express's next function
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Wrapped async function with error handling
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => next(err));
  };
};

module.exports = catchAsync;
