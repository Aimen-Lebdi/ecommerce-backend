const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      validate: {
        validator: (v) => typeof v === "string",
        message: "Name must be a string",
      },
      required: [true, "Category name is required"],
      unique: [true, "Category name must be unique"],
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
    image: String, // Will store full Cloudinary URL
    productCount: {
      type: Number,
      default: 0,
      min: [0, "Product count cannot be negative"],
    },
  },
  {
    timestamps: true,
  }
);

// Remove all the setImageURL logic - not needed with Cloudinary!
// Cloudinary returns full URLs, so we just store them directly

// Static method to update product count for a category
categorySchema.statics.updateProductCount = async function (categoryId) {
  const Product = mongoose.model("Product");
  const count = await Product.countDocuments({ category: categoryId });
  await this.findByIdAndUpdate(categoryId, { productCount: count });
  return count;
};

// Static method to recalculate all product counts
categorySchema.statics.recalculateAllProductCounts = async function () {
  const Product = mongoose.model("Product");
  const categories = await this.find({});

  for (const category of categories) {
    const count = await Product.countDocuments({ category: category._id });
    category.productCount = count;
    await category.save();
  }
};

const categoryModel = mongoose.model("Category", categorySchema);

module.exports = categoryModel;