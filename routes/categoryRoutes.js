const express = require("express");
const router = express.Router();
const subCategoryRoutes = require("./subCategoryRoutes");
const {
  createCategory,
  getAllCategories,
  getOneCategory,
  updateCategory,
  deleteCategory,
  deleteManyCategories,
  uploadCategoryImage,
  resizeCategoryImage,
} = require("../services/categoryServices");
const {
  createCategoryValidator,
  getOneCategoryValidator,
  updateCategoryValidator,
  deleteCategoryValidator,
  deleteManyCategoriesValidator,
} = require("../utils/validators/categoryValidators");
const { protectRoute, allowTo, optionalAuth } = require("../services/authServices");

const handleNullValues = (req, res, next) => {
  // Convert '__NULL__' markers back to null for optional fields
  if (req.body.image === "__NULL__") {
    req.body.image = null;
  }
  next();
};

router.use("/:categoryId/subcategories", subCategoryRoutes);

router
  .route("/")
  .get(
    optionalAuth,
    allowTo("user", "admin", "visitor"),
    getAllCategories
  )

  .post(
    protectRoute,
    allowTo("admin"),
    uploadCategoryImage,
    resizeCategoryImage,
    createCategoryValidator,
    createCategory
  );

// ✅ ADD THIS: New route for bulk delete
router.route("/bulk-delete").post(
  protectRoute,
  allowTo("admin"),
  deleteManyCategoriesValidator,
  deleteManyCategories
);

router
  .route("/:id")
  .get(
    protectRoute,
    allowTo("admin"),
    getOneCategoryValidator,
    getOneCategory
  )
  .put(
    protectRoute,
    allowTo("admin"),
    uploadCategoryImage,
    resizeCategoryImage,
    handleNullValues,
    updateCategoryValidator,
    updateCategory
  )
  .delete(
    protectRoute,
    allowTo("admin"),
    deleteCategoryValidator,
    deleteCategory
  );

module.exports = router;
