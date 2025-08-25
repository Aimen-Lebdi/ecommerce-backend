const { checkSchema } = require("express-validator");
const validatorMiddleware = require("../../middlewares/validatorMiddleware");
const reviewModel = require("../../models/reviewModel");
const productModel = require("../../models/productModel");

// --------------------------------------------------
// 1. Create Review Validator (POST /api/v1/reviews)
// --------------------------------------------------
const createReviewValidator = [
  checkSchema({
    comment: {
      isString: { errorMessage: "Comment must be a string" },
      notEmpty: { errorMessage: "Comment is required" },
      trim: true,
    },
    rating: {
      isNumeric: { errorMessage: "Rating must be a number" },
      notEmpty: { errorMessage: "Rating is required" },
      // Check if the rating is within the 1-5 range specified in the model
      isFloat: {
        options: { min: 1, max: 5 },
        errorMessage: "Rating must be between 1 and 5",
      },
    },
    user: {
      
      isMongoId: { errorMessage: "User ID must be a valid MongoDB ID" },
      notEmpty: { errorMessage: "User ID is required" },
      custom: {
        options: async (val, { req }) => {
          // Check if the user has already submitted a review for this product
          const review = await reviewModel.findOne({
            user: val,
            product: req.body.product,
          });
          if (review) {
            throw new Error(
              "You have already created a review for this product"
            );
          }
        },
      },
    },
    product: {
      isMongoId: { errorMessage: "Product ID must be a valid MongoDB ID" },
      notEmpty: { errorMessage: "Product ID is required" },
      custom: {
        options: async (val) => {
          const product = await productModel.findById(val);
          if (!product) {
            throw new Error("Product does not exist");
          }
        },
      },
    },
  }),
  validatorMiddleware,
];

const getAllReviewValidator = [
  checkSchema({
    product: {
      optional: true,
      isMongoId: { errorMessage: "Product ID must be a valid MongoDB ID" },
      notEmpty: { errorMessage: "Product ID is required" },
      custom: {
        options: async (val) => {
          const existingProduct = await productModel.findById(val);
          if (!existingProduct) {
            throw new Error("Product does not exist");
          }
        },
      },
    },
  }),
  validatorMiddleware,
];
// --------------------------------------------------
// 2. Get One Review Validator (GET /api/v1/reviews/:id)
// --------------------------------------------------
const getReviewValidator = [
  checkSchema({
    id: {
      isMongoId: { errorMessage: "Review ID must be a valid MongoDB ID" },
      notEmpty: { errorMessage: "Review ID is required" },
      custom: {
        options: async (val) => {
          const review = await reviewModel.findById(val);
          if (!review) {
            throw new Error("Review does not exist");
          }
        },
      },
    },
  }),
  validatorMiddleware,
];

// --------------------------------------------------
// 3. Update Review Validator (PUT /api/v1/reviews/:id)
// --------------------------------------------------
const updateReviewValidator = [
  checkSchema({
    id: {
      isMongoId: { errorMessage: "Review ID must be a valid MongoDB ID" },
      notEmpty: { errorMessage: "Review ID is required" },
      custom: {
        options: async (val, { req }) => {
          const review = await reviewModel.findById(val);
          if (!review) {
            throw new Error("Review does not exist");
          }
          // if (review.user._id.toString() !== req.user._id.toString()) {
          //   throw new Error("You are not authorized to update this review");
          // }
        },
      },
    },
    comment: {
      optional: true,
      isString: { errorMessage: "Comment must be a string" },
      notEmpty: { errorMessage: "Comment cannot be empty" },
      trim: true,
    },
    rating: {
      optional: true,
      isNumeric: { errorMessage: "Rating must be a number" },
      isFloat: {
        options: { min: 1, max: 5 },
        errorMessage: "Rating must be between 1 and 5",
      },
    },
  }),
  validatorMiddleware,
];

// --------------------------------------------------
// 4. Delete Review Validator (DELETE /api/v1/reviews/:id)
// --------------------------------------------------
const deleteReviewValidator = [
  checkSchema({
    id: {
      isMongoId: { errorMessage: "Review ID must be a valid MongoDB ID" },
      notEmpty: { errorMessage: "Review ID is required" },
      custom: {
        options: async (val, { req }) => {
          const review = await reviewModel.findById(val);
          if (!review) {
            throw new Error("Review does not exist");
          }
          // if (
          //   review.user._id.toString() !== req.user._id.toString() &&
          //   req.user.role !== "admin"
          // ) {
          //   throw new Error("You are not authorized to delete this review");
          // }
        },
      },
    },
  }),
  validatorMiddleware,
];

const deleteAllReviewValidator = [
  checkSchema({
    product: {
      optional: true,
      isMongoId: { errorMessage: "Product ID must be a valid MongoDB ID" },
      notEmpty: { errorMessage: "Product ID is required" },
      custom: {
        options: async (val) => {
          const existingProduct = await productModel.findById(val);
          if (!existingProduct) {
            throw new Error("Product does not exist");
          }
        },
      },
    },
  }),
  validatorMiddleware,
];

module.exports = {
  createReviewValidator,
  getAllReviewValidator,
  getReviewValidator,
  updateReviewValidator,
  deleteReviewValidator,
  deleteAllReviewValidator,
};
