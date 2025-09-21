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
    image: String,
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



const setImageURL = (doc) => {
  if (doc.image) {
    const imageUrl = `${process.env.BASE_URL}/subCategories/${doc.image}`;
    doc.image = imageUrl;
  }
};
// findOne, findAll and update
subCategorySchema.post("init", (doc) => {
  setImageURL(doc);
});

// create
subCategorySchema.post("save", (doc) => {
  setImageURL(doc);
});

// Static method to update product count for a subcategory
subCategorySchema.statics.updateProductCount = async function (subCategoryId) {
  const Product = mongoose.model("Product");
  const count = await Product.countDocuments({ subCategory: subCategoryId });
  await this.findByIdAndUpdate(subCategoryId, { productCount: count });
  return count;
};

const subCategoryModel = mongoose.model("Subcategory", subCategorySchema);

module.exports = subCategoryModel;
