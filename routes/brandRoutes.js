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
const handleNullValues = require("../middlewares/handleNullValues");

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
    handleNullValues("image"),
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
