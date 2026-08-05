const express = require("express");

const authService = require("../services/authServices");

const {
  addPhone,
  updatePhone,
  setDefaultPhone,
  removePhone,
  getLoggedUserPhones,
} = require("../services/phonesServices");

const {
  addPhoneValidator,
  updatePhoneValidator,
  removePhoneValidator,
  setDefaultPhoneValidator,
} = require("../utils/validators/phoneValidators");

const router = express.Router();

router.use(authService.protectRoute, authService.allowTo("user", "admin"));

router
  .route("/")
  .post(addPhoneValidator, addPhone)
  .get(getLoggedUserPhones);

router
  .route("/:phoneId")
  .put(updatePhoneValidator, updatePhone)
  .delete(removePhoneValidator, removePhone);

router.patch("/:phoneId/default", setDefaultPhoneValidator, setDefaultPhone);

module.exports = router;
