const { checkSchema } = require('express-validator');
const validatorMiddleware = require('../../middlewares/validatorMiddleware');
const userModel = require('../../models/userModel');
const Slugify = require('slugify');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');


// --------------------------------------------------
// 1. Signup Validator (POST /signup)
// --------------------------------------------------
const signupValidator = [
  checkSchema({
    name: {
      isString: { errorMessage: 'Name must be a string' },
      notEmpty: { errorMessage: 'Name is required' },
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
      isEmail: { errorMessage: 'Please enter a valid email' },
      notEmpty: { errorMessage: 'Email is required' },
      trim: true,
      toLowerCase: true,
      custom: {
        options: async (val) => {
          const existingUser = await userModel.findOne({ email: val });
          if (existingUser) {
            throw new Error('Email must be unique');
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
// 2. Login Validator (POST /login)
// --------------------------------------------------
const loginValidator = [
  checkSchema({
    email: {
      isEmail: { errorMessage: 'Please enter a valid email' },
      notEmpty: { errorMessage: 'Email is required' },
      trim: true,
      toLowerCase: true,
      custom: {
        options: async (val) => {
          // Check for uniqueness based on model validation/service logic
          const existingUser = await userModel.findOne({ email: val });
          if (!existingUser) {
            throw new Error("Invalid email or password");
          }
          return true;
        },
      },
    },
    password: {
      isString: { errorMessage: 'Password must be a string' },
      notEmpty: { errorMessage: 'Password is required' },
      isLength: {
        options: { min: 6 },
        errorMessage: 'Password must be at least 6 characters',
      },
      trim: true,
      custom: {
        options: async (val, { req }) => {
          const user = await userModel.findOne({ email: req.body.email });
          if (!user) {
            throw new Error("Invalid email or password");
          }
          const isMatch = await bcrypt.compare(val, user.password);
          if (!isMatch) {
            throw new Error("Invalid email or password");
          }
          // Check if account is active
          if (!user.active) {
            throw new Error("Your account has been deactivated. Please contact support for assistance.");
          }
          return true;
        },
      },
    },
    
  }),
  validatorMiddleware,
];

// --------------------------------------------------
// 3. Forgot Password Validator (POST /forgotPassword)
// --------------------------------------------------
const forgotPasswordValidator = [
  checkSchema({
    email: {
      isEmail: { errorMessage: 'Please enter a valid email' },
      notEmpty: { errorMessage: 'Email is required' },
      custom: {
        options: async (val) => {
          const user = await userModel.findOne({ email: val });
          if (!user) {
            throw new Error('There is no user with that email');
          }
        },
      },
    },
  }),
  validatorMiddleware,
];

// --------------------------------------------------
// 4. Verify Password Reset Code Validator (POST /verifyResetCode)
// --------------------------------------------------
const verifyPassResetCodeValidator = [
  checkSchema({
    resetCode: {
      isString: { errorMessage: 'Reset code must be a string' },
      notEmpty: { errorMessage: 'Reset code is required' },
      custom: {
        options: async (val) => {
          const hashedResetCode = crypto
            .createHash("sha256")
            .update(val)
            .digest("hex");

          const user = await userModel.findOne({
            passwordResetCode: hashedResetCode,
            passwordResetExpires: { $gt: Date.now() },
          });
          if (!user) {
            throw new Error("Reset code invalid or expired");
          }
        },
      },
    },
  }),
  validatorMiddleware,
];

// --------------------------------------------------
// 5. Reset Password Validator (PUT /resetPassword)
// --------------------------------------------------
const resetPasswordValidator = [
  checkSchema({
    email: {
      isEmail: { errorMessage: 'Please enter a valid email' },
      notEmpty: { errorMessage: 'Email is required' },
      custom: {
        options: async (val) => {
          const user = await userModel.findOne({ email: val });
          if (!user) {
            throw new Error('There is no user with that email');
          }
          return true;
        },
      },
    },
    newPassword: {
      isString: { errorMessage: 'New password must be a string' },
      notEmpty: { errorMessage: 'New password is required' },
      isLength: {
        options: { min: 6 },
        errorMessage: 'Password must be at least 6 characters',
      },
      trim: true,
    },
  }),
  validatorMiddleware,
];

module.exports = {
  signupValidator,
  loginValidator,
  forgotPasswordValidator,
  verifyPassResetCodeValidator,
  resetPasswordValidator,
};