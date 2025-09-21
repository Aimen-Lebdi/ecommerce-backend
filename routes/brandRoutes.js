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
const {protectRoute, allowTo} = require("../services/authServices");


router
  .route("/")
  .get(
    // protectRoute,
    // allowTo("user", "admin"),
    getAllBrands
  )
  .post(
    // protectRoute,
    // allowTo("user", "admin"),
    uploadBrandImage,
    resizeBrandImage,
    createBrandValidator,
    createBrand
  )

  router
  .route("/bulk-delete")
  .post(
    // protectRoute,
    // allowTo("user", "admin"),
    deleteManyBrandsValidator,
    deleteManyBrands
  ); 

router
  .route("/:id")
  .get(
    // protectRoute,
    // allowTo("user", "admin"),
    getOneBrandValidator,
    getOneBrand
  )
  .put(
    // protectRoute,
    // allowTo("user", "admin"),
    uploadBrandImage,
    resizeBrandImage,
    updateBrandValidator,
    updateBrand
  )
  .delete(
    // protectRoute,
    // allowTo("user", "admin"),
    deleteBrandValidator,
    deleteBrand
  );

module.exports = router;
