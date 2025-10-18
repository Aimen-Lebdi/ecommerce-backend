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
  resizeProductImages,
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

const handleNullValues = (req, res, next) => {
  // Convert '__NULL__' markers back to null for optional fields
  if (req.body.subCategory === "__NULL__") {
    req.body.subCategory = null;
  }
  if (req.body.brand === "__NULL__") {
    req.body.brand = null;
  }
  if (req.body.images === "__NULL__") {
    req.body.images = null;
  }

  next();
};

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
    resizeProductImages,
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
    resizeProductImages,
    handleNullValues,
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
