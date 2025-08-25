const express = require("express");

const {
  createReviewValidator,
  getAllReviewValidator,
  getReviewValidator,
  updateReviewValidator,
  deleteReviewValidator,
  deleteAllReviewValidator
} = require('../utils/validators/reviewValidators');

const {
  getReview,
  getReviews,
  createReview,
  updateReview,
  deleteReview,
  deleteAllReviews,
  createFilterObj,
  setParamsToBody,
} = require("../services/reviewServices");

const { protectRoute, allowTo } = require("../services/authServices");

const router = express.Router({ mergeParams: true });

router
  .route("/")
  .get(
    // protectRoute,
    // allowTo("user"),
    createFilterObj,
    getAllReviewValidator,
    getReviews
  )
  .post(
    // protectRoute,
    // allowTo("user"),
    setParamsToBody,
    createReviewValidator,
    createReview
  )
  .delete(
    // protectRoute,
    // allowTo("user", "admin"),
    createFilterObj,
    deleteAllReviewValidator,
    deleteAllReviews
  );
router
  .route("/:id")
  .get(
    // protectRoute,
    // allowTo("user"),
    getReviewValidator,
    getReview
  )
  .put(
    // protectRoute,
    // allowTo("user"),
    updateReviewValidator,
    updateReview
  )
  .delete(
    // protectRoute,
    // allowTo("user"),
    deleteReviewValidator,
    deleteReview
  );

module.exports = router;
