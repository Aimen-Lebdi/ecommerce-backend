const express = require("express");
const router = express.Router();
const {
  createBrand,
  getAllBrands,
  getOneBrand,
  updateBrand,
  deleteBrand,
  deleteAllBrands,
  uploadBrandImage,
  resizeBrandImage,
} = require("../services/brandServices");
const {
  createBrandValidator,
  getOneBrandValidator,
  updateBrandValidator,
  deleteBrandValidator,
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
  .delete(
    // protectRoute,
    // allowTo("user", "admin"),
    deleteAllBrands
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
