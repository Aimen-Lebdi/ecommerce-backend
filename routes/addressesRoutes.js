const express = require("express");

const authService = require("../services/authServices");

const {
  addAddress,
  updateAddress,
  setDefaultAddress,
  removeAddress,
  getLoggedUserAddresses,
} = require("../services/addressesServices");

const {
  addAddressValidator,
  updateAddressValidator,
  removeAddressValidator,
  setDefaultAddressValidator,
} = require("../utils/validators/addressValidators");

const router = express.Router();

router.use(authService.protectRoute, authService.allowTo("user"));

router
  .route("/")
  .post(addAddressValidator, addAddress)
  .get(getLoggedUserAddresses);

router
  .route("/:addressId")
  .put(updateAddressValidator, updateAddress)
  .delete(removeAddressValidator, removeAddress);

router.patch("/:addressId/default", setDefaultAddressValidator, setDefaultAddress);

module.exports = router;
