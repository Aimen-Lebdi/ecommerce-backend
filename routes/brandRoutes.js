const express = require("express");
const router = express.Router();
const {
  createBrand,
  getAllBrands,
  getOneBrand,
  updateBrand,
  deleteBrand,
  deleteManyBrands,
  uploadBrandImage,
  resizeBrandImage,
} = require("../services/brandServices");
const {
  createBrandValidator,
  getOneBrandValidator,
  updateBrandValidator,
  deleteBrandValidator,
  deleteManyBrandsValidator,
} = require("../utils/validators/brandValidators");
const {protectRoute, allowTo, optionalAuth} = require("../services/authServices");
const handleNullValues = (req, res, next) => {
  // Convert '__NULL__' markers back to null for optional fields
  if (req.body.image === "__NULL__") {
    req.body.image = null;
  }
  next();
};

router
  .route("/")
  .get(
    optionalAuth,
        allowTo("user", "admin", "visitor"),
    getAllBrands
  )
  .post(
    protectRoute,
    allowTo("admin"),
    uploadBrandImage,
    resizeBrandImage,
    createBrandValidator,
    createBrand
  )

  router
  .route("/bulk-delete")
  .post(
    protectRoute,
    allowTo("admin"),
    deleteManyBrandsValidator,
    deleteManyBrands
  ); 

router
  .route("/:id")
  .get(
    protectRoute,
    allowTo("admin"),
    getOneBrandValidator,
    getOneBrand
  )
  .put(
    protectRoute,
    allowTo("admin"),
    uploadBrandImage,
    resizeBrandImage,
    handleNullValues,
    updateBrandValidator,
    updateBrand
  )
  .delete(
    protectRoute,
    allowTo("admin"),
    deleteBrandValidator,
    deleteBrand
  );

module.exports = router;
