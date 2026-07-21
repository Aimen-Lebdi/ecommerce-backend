const globalErrorMiddleware = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";
  err.message = err.message || "internal server error";

  // Handle multer errors
  if (err.code === "LIMIT_FILE_SIZE") {
    err.statusCode = 400;
    err.message = "File too large. Maximum size is 5MB.";
  }

  // Handle MongoDB duplicate key errors (E11000)
  if (err.code === 11000) {
    err.statusCode = 400;
    const match = err.message.match(/index: (\w+)/);
    const indexName = match ? match[1] : "unknown";

    if (indexName === "name_1_category_1") {
      err.message = "A subcategory with this name already exists in this category.";
    } else if (indexName === "name_1") {
      err.message = "A subcategory with this name already exists.";
    } else if (indexName === "email_1") {
      err.message = "A user with this email already exists.";
    } else if (indexName === "slug_1") {
      err.message = "An item with this slug already exists.";
    } else {
      err.message = `Duplicate value for field: ${indexName}. Please use a different value.`;
    }
  }

  if (process.env.NODE_ENV === "development") {
    errorHandlerForDev(err, res);
  } else {
    errorHandlerForProd(err, res);
  }
};

const errorHandlerForDev = (err, res) => {
  return res
    .status(err.statusCode)
    .json({
      status: err.status,
      err: err,
      message: err.message,
      stack: err.stack,
    });
};

const errorHandlerForProd = (err, res) => {
  return res
    .status(err.statusCode)
    .json({ status: err.status, message: err.message });
};

module.exports = globalErrorMiddleware;
