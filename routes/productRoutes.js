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
const { protectRoute, allowTo } = require("../services/authServices");
const reviewRoutes = require("./reviewRoutes");

const handleNullValues = (req, res, next) => {
  if (req.body.subCategory === 'null' || req.body.subCategory === '') {
    req.body.subCategory = null;
  }
  if (req.body.brand === 'null' || req.body.brand === '') {
    req.body.brand = null;
  }
  next();
};

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

  router
  .route("/bulk-delete")
  .post(
    // protectRoute,
    // allowTo("user", "admin"),
    deleteManyProductsValidator,
    deleteManyProducts
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
    handleNullValues,
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
