const { checkSchema } = require("express-validator");
const validatorMiddleware = require("../../middlewares/validatorMiddleware");
const subCategoryModel = require("../../models/subCategoryModel");
const categoryModel = require("../../models/categoryModel");
const Slugify = require("slugify");

const createSubCategoryValidator = [
  checkSchema({
    name: {
      isString: {
        errorMessage: "SubCategory name must be a word",
      },
      notEmpty: {
        errorMessage: "SubCategory name is required",
      },
      trim: true,
      escape: true,
      custom: {
        options: async (val, { req }) => {
          const existingCategory = await subCategoryModel
            .find()
            .where("name")
            .equals(val);
          if (existingCategory && existingCategory.length > 0) {
            throw new Error("Subcategory name already exists");
          }
          req.body.slug = Slugify(val);
          return true;
        },
      },
    },
    category: {
      notEmpty: {
        errorMessage: "Subcategory must belong to a category",
      },
      isMongoId: {
        errorMessage: "Invalid category ID",
      },
      custom: {
        options: async (val) => {
          const existingCategory = await categoryModel.findById(val);
          if (!existingCategory) {
            throw new Error("Category does not exist");
          }
        },
      },
    },
  }),
  validatorMiddleware,
];
const getAllSubCategoriesValidator = [
  checkSchema({
    categoryId: {
      optional: true,
      isMongoId: {
        errorMessage: "Invalid category ID",
      },
      custom: {
        options: async (val) => {
          const existingCategory = await categoryModel.findById(val);
          if (!existingCategory) {
            throw new Error("Category does not exist");
          }
        },
      },
    },
  }),
  validatorMiddleware,
];
const getOneSubCategoryValidator = [
  checkSchema({
    id: {
      notEmpty: {
        errorMessage: "SubCategory ID is required",
      },
      isMongoId: {
        errorMessage: "Invalid SubCategory ID",
      },
      custom: {
        options: async (val) => {
          const existingSubCategory = await subCategoryModel.findById(val);
          if (!existingSubCategory) {
            throw new Error("SubCategory does not exist");
          }
        },
      },
    },
  }),
  validatorMiddleware,
];
const updateSubCategoryValidator = [
  checkSchema({
    id: {
      notEmpty: {
        errorMessage: "SubCategory ID is required",
      },
      isMongoId: {
        errorMessage: "Invalid SubCategory ID",
      },
      custom: {
        options: async (val) => {
          const existingSubCategory = await subCategoryModel.findById(val);
          if (!existingSubCategory) {
            throw new Error("SubCategory does not exist");
          }
        },
      },
    },
    name: {
      optional: true,
      isString: {
        errorMessage: "SubCategory name must be a word",
      },
      trim: true,
      escape: true,
      custom: {
        options: async (val, { req }) => {
          const existingCategory = await subCategoryModel
            .find()
            .where("name")
            .equals(val);
          if (existingCategory && existingCategory.length > 0) {
            throw new Error("Subcategory name already exists");
          }
          req.body.slug = Slugify(val);
          return true;
        },
      },
    },
  }),
  validatorMiddleware,
];
const deleteSubCategoryValidator = [
  checkSchema({
    id: {
      notEmpty: {
        errorMessage: "SubCategory ID is required",
      },
      isMongoId: {
        errorMessage: "Invalid SubCategory ID",
      },
      custom: {
        options: async (val) => {
          const existingSubCategory = await subCategoryModel.findById(val);
          if (!existingSubCategory) {
            throw new Error("SubCategory does not exist");
          }
        },
      },
    },
  }),
  validatorMiddleware,
];
const deleteAllSubCategoriesValidator = [
  checkSchema({
    categoryId: {
      optional: true,
      isMongoId: {
        errorMessage: "Invalid Category ID",
      },
      custom: {
        options: async (val) => {
          const existingCategory = await categoryModel.findById(val);
          if (!existingCategory) {
            throw new Error("Category does not exist");
          }
        },
      },
    },
  }),
  validatorMiddleware,
];

module.exports = {
  getAllSubCategoriesValidator,
  getOneSubCategoryValidator,
  createSubCategoryValidator,
  updateSubCategoryValidator,
  deleteSubCategoryValidator,
  deleteAllSubCategoriesValidator,
};
