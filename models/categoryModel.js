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
    image: String,
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

const setImageURL = (doc) => {
  if (doc.image && !doc.image.startsWith("http")) {
    const imageUrl = `${process.env.BASE_URL}/categories/${doc.image}`;
    doc.image = imageUrl;
  }
};

// findOne, findAll and update
categorySchema.post("init", (doc) => {
  setImageURL(doc);
});

// create
categorySchema.post("save", (doc) => {
  setImageURL(doc);
});

// For update operations
categorySchema.post("findOneAndUpdate", async function (doc) {
  if (doc) {
    setImageURL(doc);
  }
});

// For updateOne operations
categorySchema.post("updateOne", async function () {
  const doc = await this.model.findOne(this.getQuery());
  if (doc) {
    setImageURL(doc);
  }
});

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
