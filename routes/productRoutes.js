const express = require("express");
const router = express.Router();
const {
  createProduct,
  getAllProducts,
  getOneProduct,
  updateProduct,
  deleteProduct,
  deleteAllProducts,
  uploadProductImages,
  resizeProductImages,
} = require("../services/productServices");
const {
  createProductValidator,
  getOneProductValidator,
  updateProductValidator,
  deleteProductValidator,
} = require("../utils/validators/productValidators");
const { protectRoute, allowTo } = require("../services/authServices");
const reviewRoutes = require("./reviewRoutes");

router.use("/:productId/reviews", reviewRoutes);

router
  .route("/")
  .get(
    // protectRoute,
    // allowTo("user", "admin"),
    getAllProducts
  )
  .post(
    // protectRoute,
    // allowTo("user", "admin"),
    uploadProductImages,
    resizeProductImages,
    createProductValidator,
    createProduct
  )
  .delete(
    // protectRoute,
    // allowTo("user", "admin"),
    deleteAllProducts
  );

router
  .route("/:id")
  .get(
    // protectRoute,
    // allowTo("user", "admin"),
    getOneProductValidator,
    getOneProduct
  )
  .put(
    // protectRoute,
    // allowTo("user", "admin"),
    uploadProductImages,
    resizeProductImages,
    updateProductValidator,
    updateProduct
  )
  .delete(
    // protectRoute,
    // allowTo("user", "admin"),
    deleteProductValidator,
    deleteProduct
  );

module.exports = router;
