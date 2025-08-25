const globalErrorMiddleware = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || "error";
  err.message = err.message || "internal server error";

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
