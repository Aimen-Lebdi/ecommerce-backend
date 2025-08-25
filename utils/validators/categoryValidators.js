const { checkSchema } = require("express-validator");
const validatorMiddleware = require("../../middlewares/validatorMiddleware");
const categoryModel = require("../../models/categoryModel");
const Slugify = require("slugify");

const createCategoryValidator = [
  checkSchema({
    name: {
      isString: {
        errorMessage: "Category name must be a word",
      },
      notEmpty: {
        errorMessage: "Category name is required",
      },
      trim: true,
      escape: true,
      custom: {
        options: async (val, { req }) => {
          const existingCategory = await categoryModel
            .find()
            .where("name")
            .equals(val);
          if (existingCategory && existingCategory.length > 0) {
            throw new Error("Category name already exists");
          }
          req.body.slug = Slugify(val);
          return true;
        },
      },
    },
  }),
  validatorMiddleware,
];
const getOneCategoryValidator = [
  checkSchema({
    id: {
      notEmpty: {
        errorMessage: "Category ID is required",
      },
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
const updateCategoryValidator = [
  checkSchema({
    id: {
      notEmpty: {
        errorMessage: "Category ID is required",
      },
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
    name: {
      optional: true,
      isString: {
        errorMessage: "Category name must be a word",
      },
      trim: true,
      escape: true,
      custom: {
        options: async (val, { req }) => {
          const existingCategory = await categoryModel
            .find()
            .where("name")
            .equals(val);
          if (existingCategory && existingCategory.length > 0) {
            throw new Error("Category name already exists");
          }
          req.body.slug = Slugify(val);
          return true;
        },
      },
    },
  }),
  validatorMiddleware,
];
const deleteCategoryValidator = [
  checkSchema({
    id: {
      notEmpty: {
        errorMessage: "Category ID is required",
      },
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
  getOneCategoryValidator,
  createCategoryValidator,
  updateCategoryValidator,
  deleteCategoryValidator,
};
