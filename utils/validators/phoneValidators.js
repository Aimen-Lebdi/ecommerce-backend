const { checkSchema } = require("express-validator");
const validatorMiddleware = require("../../middlewares/validatorMiddleware");

// Shared schema for the :phoneId route param (ObjectId).
const phoneIdSchema = {
  phoneId: {
    notEmpty: { errorMessage: "Phone ID is required" },
    isMongoId: { errorMessage: "Invalid Phone ID format" },
  },
};

// --------------------------------------------------
// 1. Add Phone Validator (POST /)
// --------------------------------------------------
const addPhoneValidator = [
  checkSchema({
    phone: {
      notEmpty: { errorMessage: "Phone number is required" },
      isMobilePhone: {
        options: ["ar-DZ"],
        errorMessage: "Invalid phone number format",
      },
      trim: true,
    },
    isDefault: {
      optional: true,
      isBoolean: { errorMessage: "isDefault must be a boolean" },
    },
  }),
  validatorMiddleware,
];

// --------------------------------------------------
// 2. Update Phone Validator (PUT /:phoneId)
// --------------------------------------------------
const updatePhoneValidator = [
  checkSchema({
    ...phoneIdSchema,
    phone: {
      optional: true,
      isMobilePhone: {
        options: ["ar-DZ"],
        errorMessage: "Invalid phone number format",
      },
      trim: true,
    },
    isDefault: {
      optional: true,
      isBoolean: { errorMessage: "isDefault must be a boolean" },
    },
  }),
  validatorMiddleware,
];

// --------------------------------------------------
// 3. Remove Phone Validator (DELETE /:phoneId)
// --------------------------------------------------
const removePhoneValidator = [checkSchema(phoneIdSchema), validatorMiddleware];

// --------------------------------------------------
// 4. Set Default Phone Validator (PATCH /:phoneId/default)
// --------------------------------------------------
const setDefaultPhoneValidator = [
  checkSchema(phoneIdSchema),
  validatorMiddleware,
];

module.exports = {
  addPhoneValidator,
  updatePhoneValidator,
  removePhoneValidator,
  setDefaultPhoneValidator,
};
