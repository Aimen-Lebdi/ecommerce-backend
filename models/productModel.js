const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      validate: {
        validator: (v) => typeof v === "string",
        message: "Name must be a string",
      },
      required: [true, "Product must have a name"],
      trim: true,
    },
    slug: {
      type: String,
      validate: {
        validator: (v) => typeof v === "string",
        message: "Slug must be a string",
      },
      required: [true, "Product must have a slug"],
      lowercase: true,
    },
    description: {
      type: String,
      validate: {
        validator: (v) => typeof v === "string",
        message: "Description must be a string",
      },
      required: [true, "Product must have a description"],
    },
    price: {
      type: Number,
      validate: {
        validator: (v) => typeof v === "number" && !isNaN(v),
        message: "Price must be a number",
      },
      required: [true, "Product must have a price"],
      trim: true,
    },
    priceAfterDiscount: {
      type: Number,
      validate: {
        validator: (v) => typeof v === "number" && !isNaN(v),
        message: "Price after discount must be a number",
      },
    },
    mainImage: {
      type: String,
      validate: {
        validator: (v) => typeof v === "string",
        message: "Main image must be a string",
      },
      required: [true, "Product must have a main image"],
    },
    images: [String],
    colors: [String],
    quantity: {
      type: Number,
      validate: {
        validator: (v) => typeof v === "number" && !isNaN(v),
        message: "Quantity must be a number",
      },
      required: [true, "Product must have a quantity"],
    },
    sold: {
      type: Number,
      validate: {
        validator: (v) => typeof v === "number" && !isNaN(v),
        message: "Sold must be a number",
      },
      default: 0,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      validate: {
        validator: (v) => mongoose.Types.ObjectId.isValid(v),
        message: "Category must be a valid ObjectId",
      },
      ref: "Category",
      required: [true, "Product must belong to a category"],
    },
    subCategories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        validate: {
          validator: (v) => mongoose.Types.ObjectId.isValid(v),
          message: "Subcategory must be a valid ObjectId",
        },
        ref: "Subcategory",
      },
    ],
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      validate: {
        validator: (v) => mongoose.Types.ObjectId.isValid(v),
        message: "Brand must be a valid ObjectId",
      },
      ref: "Brand",
    },
    rating: {
      type: Number,
      validate: {
        validator: (v) => typeof v === "number" && !isNaN(v),
        message: "Rating must be a number",
      },
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating must be at most 5"],
    },
    ratingsQuantity: {
      type: Number,
      validate: {
        validator: (v) => typeof v === "number" && !isNaN(v),
        message: "Ratings Quantity must be a number",
      },
      default: 0,
    },
  },
  {
    timestamps: true,
    // to enable virtual populate
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

productSchema.virtual("reviews", {
  ref: "Review",
  foreignField: "product",
  localField: "_id",
});

productSchema.pre(/^find/, function (next) {
  this.populate({
    path: "category",
    select: "name _id",
  });
  this.populate({
    path: "subCategories",
    select: "name _id",
  });
  this.populate({
    path: "brand",
    select: "name _id",
  });
  next();
});

const setImageURL = (doc) => {
  if (doc.mainImage) {
    const imageUrl = `${process.env.BASE_URL}/products/${doc.mainImage}`;
    doc.mainImage = imageUrl;
  }
  if (doc.images) {
    const imagesList = [];
    doc.images.forEach((image) => {
      const imageUrl = `${process.env.BASE_URL}/products/${image}`;
      imagesList.push(imageUrl);
    });
    doc.images = imagesList;
  }
};
// findOne, findAll and update
productSchema.post("init", (doc) => {
  setImageURL(doc);
});

// create
productSchema.post("save", (doc) => {
  setImageURL(doc);
});

const productModel = mongoose.model("Product", productSchema);

module.exports = productModel;
