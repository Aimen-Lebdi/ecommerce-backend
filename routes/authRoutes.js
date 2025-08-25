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
} = require("../services/authServices");

const router = express.Router();

router.post("/signup", signupValidator, signUp);
router.post("/login", loginValidator, signIn);
router.post("/forgotPassword", forgotPasswordValidator, forgotPassword);
router.post("/verifyResetCode", verifyPassResetCodeValidator, verifyPassResetCode);
router.put("/resetPassword", resetPasswordValidator, resetPassword);

module.exports = router;
