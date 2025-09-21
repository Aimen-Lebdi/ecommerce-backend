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
    subCategory:{
        type: mongoose.Schema.Types.ObjectId,
        validate: {
          validator: (v) => v === null || v === undefined || mongoose.Types.ObjectId.isValid(v),
          message: "Subcategory must be a valid ObjectId",
        },
        ref: "Subcategory",
        default: null,
      },
    
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      validate: {
        validator: (v) => v === null || v === undefined || mongoose.Types.ObjectId.isValid(v),
        message: "Brand must be a valid ObjectId",
      },
      ref: "Brand",
      default: null,
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
    path: "subCategory",
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
  if (doc.category) {
    const Category = mongoose.model("Category");
    await Category.updateProductCount(doc.category);
  }

  // Update subcategory product count
  if (doc.subCategory) {
    const Subcategory = mongoose.model("Subcategory");
    await Subcategory.updateProductCount(doc.subCategory);
  }

  // Update brand product count
  if (doc.brand) {
    const Brand = mongoose.model("Brand");
    await Brand.updateProductCount(doc.brand);
  }
});

// Middleware to update category product count when a product is removed
productSchema.post("findOneAndDelete", async function (doc) {
  if (doc) {
    if (doc.category) {
      const Category = mongoose.model("Category");
      await Category.updateProductCount(doc.category);
    }
    if (doc.subCategory) {
      const Subcategory = mongoose.model("Subcategory");
      await Subcategory.updateProductCount(doc.subCategory);
    }
    if (doc.brand) {
      const Brand = mongoose.model("Brand");
      await Brand.updateProductCount(doc.brand);
    }
  }
});

productSchema.post("deleteOne", async function () {
  const doc = this.getQuery();
  if (doc && doc._id) {
    const product = await this.model.findById(doc._id);
    if (product) {
      if (product.category) {
        const Category = mongoose.model("Category");
        await Category.updateProductCount(product.category);
      }
      if (product.subCategory) {
        const Subcategory = mongoose.model("Subcategory");
        await Subcategory.updateProductCount(product.subCategory);
      }
      if (product.brand) {
        const Brand = mongoose.model("Brand");
        await Brand.updateProductCount(product.brand);
      }
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
    const Subcategory = mongoose.model("Subcategory");
    const Brand = mongoose.model("Brand");
    const originalProduct = this._originalProduct;

    if (originalProduct) {
      // Update category counts if category changed
      if (originalProduct.category && originalProduct.category.toString() !== (doc.category ? doc.category.toString() : '')) {
        await Category.updateProductCount(originalProduct.category);
      }
      if (doc.category) {
        await Category.updateProductCount(doc.category);
      }

      // Update subcategory counts if subcategory changed
      if (originalProduct.subCategory && originalProduct.subCategory.toString() !== (doc.subCategory ? doc.subCategory.toString() : '')) {
        await Subcategory.updateProductCount(originalProduct.subCategory);
      }
      if (doc.subCategory) {
        await Subcategory.updateProductCount(doc.subCategory);
      }

      // Update brand counts if brand changed
      if (originalProduct.brand && originalProduct.brand.toString() !== (doc.brand ? doc.brand.toString() : '')) {
        await Brand.updateProductCount(originalProduct.brand);
      }
      if (doc.brand) {
        await Brand.updateProductCount(doc.brand);
      }
    } else {
      // If no original product, just update current counts
      if (doc.category) await Category.updateProductCount(doc.category);
      if (doc.subCategory) await Subcategory.updateProductCount(doc.subCategory);
      if (doc.brand) await Brand.updateProductCount(doc.brand);
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