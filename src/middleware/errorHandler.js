/**
 * Handles 404 Not Found for unmatched routes.
 */
const notFound = (req, res) => {
    res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
  };
  
  /**
   * Global error handler.
   */
  // eslint-disable-next-line no-unused-vars
  const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    const status = err.status || 500;
    res.status(status).json({ message: err.message || 'Internal server error.' });
  };
  
  module.exports = { notFound, errorHandler };