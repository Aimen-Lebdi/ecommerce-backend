const mongoose = require("mongoose");

const subCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      validate: {
        validator: (v) => typeof v === "string",
        message: "Name must be a string",
      },
      required: [true, "Subcategory name is required"],
      unique: [true, "Subcategory name must be unique"],
      trim: true,
    },
    slug: {
      type: String,
      validate: {
        validator: (v) => typeof v === "string",
        message: "Slug must be a string",
      },
      required: [true, "Subcategory must have a slug"],
      lowercase: true,
    },
    image: String, // Will store full Cloudinary URL
    category: {
      type: mongoose.Schema.ObjectId,
      ref: "Category",
      required: [true, "Subcategory must belong to a category"],
    },
    productCount: {
      type: Number,
      default: 0,
      min: [0, "Product count cannot be negative"],
    },
  },
  { timestamps: true }
);

// Remove all the setImageURL logic - not needed with Cloudinary!
// Cloudinary returns full URLs, so we just store them directly

// Static method to update product count for a subcategory
subCategorySchema.statics.updateProductCount = async function (subCategoryId) {
  const Product = mongoose.model("Product");
  const count = await Product.countDocuments({ subCategory: subCategoryId });
  await this.findByIdAndUpdate(subCategoryId, { productCount: count });
  return count;
};

const subCategoryModel = mongoose.model("Subcategory", subCategorySchema);

module.exports = subCategoryModel;