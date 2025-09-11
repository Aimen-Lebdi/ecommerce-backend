const express = require("express");
const router = express.Router();
const subCategoryRoutes = require("./subCategoryRoutes");
const {
  createCategory,
  getAllCategories,
  getOneCategory,
  updateCategory,
  deleteCategory,
  deleteAllCategories,
  uploadCategoryImage,
  resizeCategoryImage,
  deleteManyCategories,
} = require("../services/categoryServices");
const {
  createCategoryValidator,
  getOneCategoryValidator,
  updateCategoryValidator,
  deleteCategoryValidator,
  deleteManyCategoryValidator,
} = require("../utils/validators/categoryValidators");
const { protectRoute, allowTo } = require("../services/authServices");

router.use("/:categoryId/subcategories", subCategoryRoutes);

router
  .route("/")
  .get(
    // protectRoute,
    // allowTo("user", "admin"),
    getAllCategories
  )

  .post(
    // protectRoute,
    // allowTo("user", "admin"),
    uploadCategoryImage,
    resizeCategoryImage,
    createCategoryValidator,
    createCategory
  )
  .delete(
    // protectRoute,
    // allowTo("user", "admin"),
    deleteAllCategories
  );

// ✅ ADD THIS: New route for bulk delete
router
  .route("/bulk-delete")
  .post(
    // protectRoute,
    // allowTo("user", "admin"),
    deleteManyCategoryValidator,
    deleteManyCategories
  );  

router
  .route("/:id")
  .get(
    // protectRoute,
    // allowTo("user", "admin"),
    getOneCategoryValidator,
    getOneCategory
  )
  .put(
    // protectRoute,
    // allowTo("user", "admin"),
    uploadCategoryImage,
    resizeCategoryImage,
    updateCategoryValidator,
    updateCategory
  )
  .delete(
    // protectRoute,
    // allowTo("user", "admin"),
    deleteCategoryValidator,
    deleteCategory
  );

module.exports = router;
