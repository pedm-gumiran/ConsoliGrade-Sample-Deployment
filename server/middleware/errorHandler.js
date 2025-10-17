//Errorhandling tips
const { statusCode } = require('../middleware/statuscode');
const erroHandler = (err, req, res, next) => {
  const statusCode = res.statusCode ? res.statusCode : 500; // Set the status code to 500 if not already set
  switch (statusCode) {
    case statusCode.VALIDATION_ERROR:
      res.json({
        title: 'Validation Failed',
        message: err.message,
        stackTrace: err.stack,
      });

    case statusCode.UNATHORIZED:
      res.json({
        title: 'Unauthorize User',
        message: err.message,
        stackTrace: err.stack,
      });

    case statusCode.FORBIDDEN:
      res.json({
        title: 'Forbidden',
        message: err.message,
        stackTrace: err.stack,
      });

    case statusCode.NOT_FOUND:
      res.json({
        title: 'Not Found',
        message: err.message,
        stackTrace: err.stack,
      });

    case statusCode.SERVER_ERROR:
      res.json({
        title: 'Server Error',
        message: err.message,
        stackTrace: err.stack,
      });
    default:
      console.log('No error just good');
      break;
  }
};
module.exports = erroHandler; // Export the error handler for use in other files
