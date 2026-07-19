const express = require("express");
const router = express.Router();
const {
  createProduct,
  getAllProducts,
  getOneProduct,
  updateProduct,
  deleteProduct,
  deleteManyProducts,
  uploadProductImages,
  processProductImages,
} = require("../services/productServices");
const {
  createProductValidator,
  getOneProductValidator,
  updateProductValidator,
  deleteProductValidator,
  deleteManyProductsValidator,
} = require("../utils/validators/productValidators");
const { protectRoute, allowTo, optionalAuth } = require("../services/authServices");
const reviewRoutes = require("./reviewRoutes");
const handleNullValues = require("../middlewares/handleNullValues");

router.use("/:productId/reviews", reviewRoutes);

router
  .route("/")
  .get(
    optionalAuth,
        allowTo("user", "admin", "visitor"),
    getAllProducts
  )
  .post(
    protectRoute,
    allowTo("admin"),
    uploadProductImages,
    processProductImages,
    createProductValidator,
    createProduct
  );

router.route("/bulk-delete").post(
  protectRoute,
  allowTo("admin"),
  deleteManyProductsValidator,
  deleteManyProducts
);

router
  .route("/:id")
  .get(
    optionalAuth,
    allowTo("user", "admin", "visitor"),
    getOneProductValidator,
    getOneProduct
  )
  .put(
    protectRoute,
    allowTo("admin"),
    uploadProductImages,
    processProductImages,
    handleNullValues("subCategory", "brand", "images"),
    updateProductValidator,
    updateProduct
  )
  .delete(
    protectRoute,
    allowTo("admin"),
    deleteProductValidator,
    deleteProduct
  );

module.exports = router;
