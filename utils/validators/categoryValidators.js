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
    image: {
      isString: {
        errorMessage: "image must be a string",
      },
      optional: true,
      trim: true,
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
    image: {
      isString: {
        errorMessage: "image must be a string",
      },
      isURL: {
        errorMessage: "Image must be a valid URL",
      },
      optional: {options: { nullable: true }},
      trim: true,
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
const deleteManyCategoriesValidator = [
  checkSchema({
    ids: {
      isArray: {
        errorMessage: "IDs must be an array",
      },
      notEmpty: {
        errorMessage: "IDs array cannot be empty",
      },
      custom: {
        options: async (ids) => {
          if (!Array.isArray(ids)) {
            throw new Error("IDs must be an array");
          }
          
          // Validate each ID is a valid MongoDB ObjectId
          for (const id of ids) {
            if (!id.match(/^[0-9a-fA-F]{24}$/)) {
              throw new Error(`Invalid category ID: ${id}`);
            }
          }
          
          return true;
        },
      },
    },
  }),
  validatorMiddleware,
]

module.exports = {
  getOneCategoryValidator,
  createCategoryValidator,
  updateCategoryValidator,
  deleteCategoryValidator,
  deleteManyCategoriesValidator,
};
