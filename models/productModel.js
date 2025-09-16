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

// Middleware to update category product count when a product is saved
productSchema.post("save", async function (doc) {
  setImageURL(doc);

  // Update category product count
  const Category = mongoose.model("Category");
  await Category.updateProductCount(doc.category);
});

// Middleware to update category product count when a product is removed
productSchema.post("findOneAndDelete", async function (doc) {
  if (doc && doc.category) {
    const Category = mongoose.model("Category");
    await Category.updateProductCount(doc.category);
  }
});

productSchema.post("deleteOne", async function () {
  const doc = this.getQuery();
  if (doc && doc._id) {
    const product = await this.model.findById(doc._id);
    if (product && product.category) {
      const Category = mongoose.model("Category");
      await Category.updateProductCount(product.category);
    }
  }
});

// Middleware to handle category change during update
productSchema.pre("findOneAndUpdate", async function () {
  // Store the original document to compare categories later
  this._originalProduct = await this.model.findOne(this.getQuery());
});

productSchema.post("findOneAndUpdate", async function (doc) {
  if (doc) {
    setImageURL(doc);

    const Category = mongoose.model("Category");
    const originalProduct = this._originalProduct;

    // If category was changed, update both old and new categories
    if (
      originalProduct &&
      originalProduct.category.toString() !== doc.category.toString()
    ) {
      await Category.updateProductCount(originalProduct.category);
      await Category.updateProductCount(doc.category);
    } else {
      // If category wasn't changed, just update the current category
      await Category.updateProductCount(doc.category);
    }
  }
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

const productModel = mongoose.model("Product", productSchema);

module.exports = productModel;
