const { default: mongoose } = require("mongoose");
const productModel = require("./productModel");

const reviewSchema = mongoose.Schema(
  {
    comment: {
      type: String,
      validate: {
        validator: (v) => typeof v === "string",
        message: "Comment must be a string",
      },
      required: [true, "Comment is required"],
      trim: true,
    },
    rating: {
      type: Number,
      validate: {
        validator: (v) => typeof v === "number",
        message: "Rating must be a number",
      },
      required: [true, "Rating is required"],
      min: 1,
      max: 5,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
  },
  { timestamps: true }
);

reviewSchema.pre(/^find/, function (next) {
  this.populate({ path: "user", select: "name" });
  next();
});

reviewSchema.statics.calcAverageRatingsAndQuantity = async function (
  productId
) {
  const result = await this.aggregate([
    // Stage 1 : get all reviews in specific product
    {
      $match: { product: productId },
    },
    // Stage 2: Grouping reviews based on productID and calc avgRatings, ratingsQuantity
    {
      $group: {
        _id: "product",
        avgRatings: { $avg: "$rating" },
        ratingsQuantity: { $sum: 1 },
      },
    },
  ]);

  if (result.length > 0) {
    await productModel.findByIdAndUpdate(productId, {
      rating: Math.round(result[0].avgRatings * 10) / 10,
      ratingsQuantity: result[0].ratingsQuantity,
    });
  } else {
    await productModel.findByIdAndUpdate(productId, {
      rating: 0,
      ratingsQuantity: 0,
    });
  }
};

reviewSchema.post("save", async function () {
  await this.constructor.calcAverageRatingsAndQuantity(this.product);
});

reviewSchema.post("remove", async function () {
  await this.constructor.calcAverageRatingsAndQuantity(this.product);
});

const reviewModel = mongoose.model("Review", reviewSchema);

module.exports = reviewModel;
