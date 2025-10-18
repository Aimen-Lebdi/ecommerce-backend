const express = require("express");

const authService = require("../services/authServices");

const {
  addProductToWishlist,
  removeProductFromWishlist,
  getLoggedUserWishlist,
} = require("../services/wishlistServices");

const router = express.Router();

router.use(authService.protectRoute, authService.allowTo("user", "admin"));

router.route("/")
.post(addProductToWishlist)
.get(getLoggedUserWishlist);

router.delete("/:productId", removeProductFromWishlist);

module.exports = router;
