const { checkSchema } = require("express-validator");
const Slugify = require("slugify");
const bcrypt = require("bcryptjs");
// Assuming you have a validatorMiddleware to handle the validation results
const validatorMiddleware = require("../../middlewares/validatorMiddleware");
const userModel = require("../../models/userModel");

// --------------------------------------------------
// 1. Create User Validator (POST /)
// --------------------------------------------------
const createUserValidator = [
  checkSchema({
    name: {
      isString: { errorMessage: "Name must be a string" },
      notEmpty: { errorMessage: "Name is required" },
      trim: true,
      custom: {
        options: (val, { req }) => {
          // Add slug to request body for the service handler to use
          req.body.slug = Slugify(val);
          return true;
        },
      },
    },
    email: {
      isEmail: { errorMessage: "Please enter a valid email" },
      notEmpty: { errorMessage: "Email is required" },
      trim: true,
      toLowerCase: true,
      custom: {
        options: async (val) => {
          // Check for uniqueness based on model validation/service logic
          const existingUser = await userModel.findOne({ email: val });
          if (existingUser) {
            throw new Error("Email must be unique");
          }
          return true;
        },
      },
    },
    password: {
      isString: { errorMessage: "Password must be a string" },
      notEmpty: { errorMessage: "Password is required" },
      isLength: {
        options: { min: 6 },
        errorMessage: "Password must be at least 6 characters",
      },
      trim: true,
    },
    phone: {
      optional: true,
      isMobilePhone: {
        options: ["ar-DZ"],
        errorMessage: "Invalid phone number format",
      },
    },
    profileImg: {
      optional: true,
      isString: { errorMessage: "Profile image must be a string" },
      trim: true,
    },
    role: {
      optional: true,
      isString: { errorMessage: "Role must be a string" },
      isIn: {
        options: [["user", "admin"]],
        errorMessage: "Role must be 'user' or 'admin'",
      },
    },
    // Note: wishlist, addresses, and other technical fields are usually not validated here,
    // as they are populated by the backend or updated in separate endpoints.
  }),
  validatorMiddleware,
];

// --------------------------------------------------
// 2. Get One/Delete User Validator (GET /:id, DELETE /:id)
// --------------------------------------------------
const getUserValidator = [
  checkSchema({
    id: {
      notEmpty: { errorMessage: "User ID is required" },
      isMongoId: { errorMessage: "Invalid User ID format" },
      custom: {
        options: async (val) => {
          const user = await userModel.findById(val);
          if (!user) {
            throw new Error("User does not exist");
          }
          return true;
        },
      },
    },
  }),
  validatorMiddleware,
];

const deleteUserValidator = getUserValidator; // Same validation logic as getting one user

// --------------------------------------------------
// 3. Update User Validator (PUT /:id)
// --------------------------------------------------
const updateUserValidator = [
  checkSchema({
    id: {
      // Re-use logic from getUserValidator
      notEmpty: { errorMessage: "User ID is required" },
      isMongoId: { errorMessage: "Invalid User ID format" },
      custom: {
        options: async (val) => {
          const user = await userModel.findById(val);
          if (!user) {
            throw new Error("User does not exist");
          }
          return true;
        },
      },
    },
    name: {
      optional: true,
      isString: { errorMessage: "Name must be a string" },
      trim: true,
      custom: {
        options: (val, { req }) => {
          // Update slug if name is provided
          req.body.slug = Slugify(val);
          return true;
        },
      },
    },
    email: {
      optional: true,
      isEmail: { errorMessage: "Please enter a valid email" },
      trim: true,
      toLowerCase: true,
      custom: {
        options: async (val, { req }) => {
          // Check for uniqueness but allow current user's email
          const existingUser = await userModel.findOne({ email: val });
          if (existingUser && existingUser._id.toString() !== req.params.id) {
            throw new Error("Email must be unique");
          }
          return true;
        },
      },
    },
    role: {
      optional: true,
      isString: { errorMessage: "Role must be a string" },
      isIn: {
        options: [["user", "admin"]],
        errorMessage: "Role must be 'user' or 'admin'",
      },
    },
    phone: {
      optional: true,
      isMobilePhone: {
        options: ["ar-DZ"],
        errorMessage: "Invalid phone number format",
      },
    },
    profileImg: {
      optional: true,
      isString: { errorMessage: "Profile image must be a string" },
      trim: true,
    },
  }),
  validatorMiddleware,
];

// --------------------------------------------------
// 4. Update User Password Validator (PUT /changePassword/:id)
// --------------------------------------------------
const updateUserPasswordValidator = [
  checkSchema({
    id: {
      // Re-use logic from getUserValidator
      notEmpty: { errorMessage: "User ID is required" },
      isMongoId: { errorMessage: "Invalid User ID format" },
      custom: {
        options: async (val) => {
          const user = await userModel.findById(val);
          if (!user) {
            throw new Error("User does not exist");
          }
          return true;
        },
      },
    },
    currentPassword: {
      notEmpty: { errorMessage: "Current password is required" },
      isString: { errorMessage: "Current password must be a string" },
      trim: true,
      custom: {
        options: async (val, { req }) => {
          const user = await userModel.findById(req.params.id);
          if (!user) {
            throw new Error("There is no user for this id");
          }
          const isCorrectPassword = await bcrypt.compare(
            val,
            user.password
          );
          if (!isCorrectPassword) {
            throw new Error("Incorrect current password");
          }

          return true;
        },
      },
    },
    password: {
      isString: { errorMessage: "Password must be a string" },
      notEmpty: { errorMessage: "New password is required" },
      isLength: {
        options: { min: 6 },
        errorMessage: "Password must be at least 6 characters",
      },
      trim: true,
    },
    passwordConfirm: {
      notEmpty: { errorMessage: "Password confirmation is required" },
      custom: {
        options: (val, { req }) => {
          if (val !== req.body.password) {
            throw new Error("Passwords do not match");
          }
          return true;
        },
      },
    },
  }),
  validatorMiddleware,
];

// --------------------------------------------------
// 5. Update Logged User Password Validator (PUT /changeMyPassword)
// --------------------------------------------------
const updateLoggedUserPasswordValidator = [
  checkSchema({
    currentPassword: {
      notEmpty: { errorMessage: "Current password is required" },
      isString: { errorMessage: "Current password must be a string" },
      trim: true,
      custom: {
        options: async (val, { req }) => {
          const user = await userModel.findById(req.user._id);
          if (!user) {
            throw new Error("There is no user for this id");
          }
          const isCorrectPassword = await bcrypt.compare(
            val,
            user.password
          );
          if (!isCorrectPassword) {
            throw new Error("Incorrect current password");
          }

          return true;
        },
      },
    },
    password: {
      isString: { errorMessage: "Password must be a string" },
      notEmpty: { errorMessage: "New password is required" },
      isLength: {
        options: { min: 6 },
        errorMessage: "Password must be at least 6 characters",
      },
      trim: true,
    },
    passwordConfirm: {
      notEmpty: { errorMessage: "Password confirmation is required" },
      custom: {
        options: (val, { req }) => {
          if (val !== req.body.password) {
            throw new Error("Passwords do not match");
          }
          return true;
        },
      },
    },
  }),
  validatorMiddleware,
];

// --------------------------------------------------
// 6. Update Logged User Data Validator (PUT /updateMe)
// --------------------------------------------------
const updateLoggedUserDataValidator = [
  checkSchema({
    name: {
      optional: true,
      isString: { errorMessage: "Name must be a string" },
      trim: true,
      custom: {
        options: (val, { req }) => {
          // If name is provided, update the slug for the service
          req.body.slug = Slugify(val);
          return true;
        },
      },
    },
    email: {
      optional: true,
      isEmail: { errorMessage: "Please enter a valid email" },
      trim: true,
      toLowerCase: true,
      custom: {
        options: async (val, { req }) => {
          // Check for uniqueness but allow current user's email
          // NOTE: This assumes 'req.user' is populated by 'protectRoute' middleware
          const existingUser = await userModel.findOne({ email: val });
          if (
            existingUser &&
            existingUser._id.toString() !== req.user._id.toString()
          ) {
            throw new Error("Email must be unique");
          }
          return true;
        },
      },
    },
    phone: {
      optional: true,
      isMobilePhone: {
        options: ["ar-DZ"],
        errorMessage: "Invalid phone number format",
      },
    },
    profileImg: {
      optional: true,
      isString: { errorMessage: "Profile image must be a string" },
      trim: true,
    },
    // phone and other fields can be added here if needed
  }),
  validatorMiddleware,
];

module.exports = {
  createUserValidator,
  getUserValidator,
  updateUserValidator,
  deleteUserValidator,
  updateUserPasswordValidator,
  updateLoggedUserPasswordValidator,
  updateLoggedUserDataValidator,
};
