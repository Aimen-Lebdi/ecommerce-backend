const { checkSchema } = require("express-validator");
const validatorMiddleware = require("../../middlewares/validatorMiddleware");

// Shared schema for the :addressId route param (ObjectId).
const addressIdSchema = {
  addressId: {
    notEmpty: { errorMessage: "Address ID is required" },
    isMongoId: { errorMessage: "Invalid Address ID format" },
  },
};

// --------------------------------------------------
// 1. Add Address Validator (POST /)
// --------------------------------------------------
const addAddressValidator = [
  checkSchema({
    label: {
      notEmpty: { errorMessage: "Label is required" },
      isString: { errorMessage: "Label must be a string" },
      isLength: {
        options: { max: 30 },
        errorMessage: "Label must be at most 30 characters",
      },
      trim: true,
    },
    wilaya: {
      notEmpty: { errorMessage: "Wilaya is required" },
      isString: { errorMessage: "Wilaya must be a string" },
      trim: true,
    },
    dayra: {
      notEmpty: { errorMessage: "Dayra is required" },
      isString: { errorMessage: "Dayra must be a string" },
      trim: true,
    },
    baladiya: {
      notEmpty: { errorMessage: "Baladiya is required" },
      isString: { errorMessage: "Baladiya must be a string" },
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
// 2. Update Address Validator (PUT /:addressId)
// --------------------------------------------------
const updateAddressValidator = [
  checkSchema({
    ...addressIdSchema,
    label: {
      optional: true,
      isString: { errorMessage: "Label must be a string" },
      notEmpty: { errorMessage: "Label must not be empty" },
      isLength: {
        options: { max: 30 },
        errorMessage: "Label must be at most 30 characters",
      },
      trim: true,
    },
    wilaya: {
      optional: true,
      isString: { errorMessage: "Wilaya must be a string" },
      trim: true,
    },
    dayra: {
      optional: true,
      isString: { errorMessage: "Dayra must be a string" },
      trim: true,
    },
    baladiya: {
      optional: true,
      isString: { errorMessage: "Baladiya must be a string" },
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
// 3. Remove Address Validator (DELETE /:addressId)
// --------------------------------------------------
const removeAddressValidator = [checkSchema(addressIdSchema), validatorMiddleware];

// --------------------------------------------------
// 4. Set Default Address Validator (PATCH /:addressId/default)
// --------------------------------------------------
const setDefaultAddressValidator = [
  checkSchema(addressIdSchema),
  validatorMiddleware,
];

module.exports = {
  addAddressValidator,
  updateAddressValidator,
  removeAddressValidator,
  setDefaultAddressValidator,
};
