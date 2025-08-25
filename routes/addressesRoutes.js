const express = require("express");

const authService = require("../services/authServices");

const {
  addAddress,
  removeAddress,
  getLoggedUserAddresses,
} = require("../services/addressesServices");

const router = express.Router();

router.use(authService.protectRoute, authService.allowTo("user"));

router.route("/").post(addAddress).get(getLoggedUserAddresses);

router.delete("/:addressId", removeAddress);

module.exports = router;
