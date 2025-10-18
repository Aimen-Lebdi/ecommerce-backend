const express = require("express");
const {
  signupValidator,
  loginValidator,
  forgotPasswordValidator,
  verifyPassResetCodeValidator,
  resetPasswordValidator
} = require('../utils/validators/authValidators');

const {
  signUp,
  signIn,
  verifyPassResetCode,
  forgotPassword,
  resetPassword,
  refreshAccessToken,
  logOut,
  protectRoute,
} = require("../services/authServices");

const router = express.Router();

// Authentication routes
router.post("/signup", signupValidator, signUp);
router.post("/login", loginValidator, signIn);
router.post("/refresh", refreshAccessToken); // New refresh token endpoint
router.post("/logout", protectRoute, logOut); // New logout endpoint

// Password reset routes
router.post("/forgotPassword", forgotPasswordValidator, forgotPassword);
router.post("/verifyResetCode", verifyPassResetCodeValidator, verifyPassResetCode);
router.put("/resetPassword", resetPasswordValidator, resetPassword);

module.exports = router;