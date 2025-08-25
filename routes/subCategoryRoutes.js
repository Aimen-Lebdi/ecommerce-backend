const express = require("express");
const router = express.Router({ mergeParams: true });
const {
  createSubCategory,
  getAllSubCategories,
  getOneSubCategory,
  updateSubCategory,
  deleteSubCategory,
  deleteAllSubCategories,
  uploadSubCategoryImage,
  resizeSubCategoryImage,
  fromParamsToBody,
  createFilterObj,
} = require("../services/subCategoryServices");
const {
  getAllSubCategoriesValidator,
  createSubCategoryValidator,
  getOneSubCategoryValidator,
  updateSubCategoryValidator,
  deleteSubCategoryValidator,
  deleteAllSubCategoriesValidator,
} = require("../utils/validators/subCategoryValidators");
const { protectRoute, allowTo } = require("../services/authServices");

router
  .route("/")
  .get(
    // protectRoute,
    // allowTo("user", "admin"),
    createFilterObj,
    getAllSubCategoriesValidator,
    getAllSubCategories
  )
  .post(
    // protectRoute,
    // allowTo("user", "admin"),
    uploadSubCategoryImage,
  resizeSubCategoryImage,
    fromParamsToBody,
    createSubCategoryValidator,
    createSubCategory
  )
  .delete(
    // protectRoute,
    // allowTo("user", "admin"),
    createFilterObj,
    deleteAllSubCategoriesValidator,
    deleteAllSubCategories
  );

router
  .route("/:id")
  .get(
    // protectRoute,
    // allowTo("user", "admin"),
    getOneSubCategoryValidator,
    getOneSubCategory
  )
  .put(
    // protectRoute,
    // allowTo("user", "admin"),
    uploadSubCategoryImage,
  resizeSubCategoryImage,
    updateSubCategoryValidator,
    updateSubCategory
  )
  .delete(
    // protectRoute,
    // allowTo("user", "admin"),
    deleteSubCategoryValidator,
    deleteSubCategory
  );

module.exports = router;
