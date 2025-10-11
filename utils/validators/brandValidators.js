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
const deleteManyBrandsValidator = [
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
  getOneBrandValidator,
  createBrandValidator,
  updateBrandValidator,
  deleteBrandValidator,
  deleteManyBrandsValidator,
};
