/**
 * Zod validation middleware factory.
 * Usage: router.post('/path', validate(myZodSchema), controller)
 */
function validate(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      // Let the global error handler format the ZodError
      next(err);
    }
  };
}

/**
 * Validate query parameters.
 */
function validateQuery(schema) {
  return (req, res, next) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { validate, validateQuery };
