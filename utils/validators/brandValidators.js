const { checkSchema } = require("express-validator");
const validatorMiddleware = require("../../middlewares/validatorMiddleware");
const brandModel = require("../../models/brandModel");
const Slugify = require("slugify");

const createBrandValidator = [
  checkSchema({
    name: {
      isString: {
        errorMessage: "Brand name must be a word",
      },
      notEmpty: {
        errorMessage: "Brand name is required",
      },
      trim: true,
      escape: true,
      custom: {
        options: async (val, { req }) => {
          const existingBrand = await brandModel
            .find()
            .where("name")
            .equals(val);
          if (existingBrand && existingBrand.length > 0) {
            throw new Error("Brand name already exists");
          }
          req.body.slug = Slugify(val);
          return true;
        },
      },
    },
  }),
  validatorMiddleware,
];
const getOneBrandValidator = [
  checkSchema({
    id: {
      notEmpty: {
        errorMessage: "Brand ID is required",
      },
      isMongoId: {
        errorMessage: "Invalid Brand ID",
      },
      custom: {
        options: async (val) => {
          const existingBrand = await brandModel.findById(val);
          if (!existingBrand) {
            throw new Error("Brand does not exist");
          }
        },
      },
    },
  }),
  validatorMiddleware,
];
const updateBrandValidator = [
  checkSchema({
    id: {
      notEmpty: {
        errorMessage: "Brand ID is required",
      },
      isMongoId: {
        errorMessage: "Invalid Brand ID",
      },
      custom: {
        options: async (val) => {
          const existingBrand = await brandModel.findById(val);
          if (!existingBrand) {
            throw new Error("Brand does not exist");
          }
        },
      },
    },
    name: {
      optional: true,
      isString: {
        errorMessage: "Brand name must be a word",
      },
      trim: true,
      escape: true,
      custom: {
        options: async (val, { req }) => {
          const existingBrand = await brandModel
            .find()
            .where("name")
            .equals(val);
          if (existingBrand && existingBrand.length > 0) {
            throw new Error("Brand name already exists");
          }
          req.body.slug = Slugify(val);
          return true;
        },
      },
    },
  }),
  validatorMiddleware,
];
const deleteBrandValidator = [
  checkSchema({
    id: {
      notEmpty: {
        errorMessage: "Brand ID is required",
      },
      isMongoId: {
        errorMessage: "Invalid Brand ID",
      },
      custom: {
        options: async (val) => {
          const existingBrand = await brandModel.findById(val);
          if (!existingBrand) {
            throw new Error("Brand does not exist");
          }
        },
      },
    },
  }),
  validatorMiddleware,
];

module.exports = {
  getOneBrandValidator,
  createBrandValidator,
  updateBrandValidator,
  deleteBrandValidator,
};
