/**
 * Create a middleware that converts '__NULL__' string markers back to actual null.
 * @param  {...string} fields - Field names to check for '__NULL__' values
 * @returns {Function} Express middleware
 */
const handleNullValues = (...fields) => (req, res, next) => {
  for (const field of fields) {
    if (req.body[field] === "__NULL__") {
      req.body[field] = null;
    }
  }
  next();
};

module.exports = handleNullValues;
