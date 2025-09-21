const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      validate: {
        validator: (v) => typeof v === "string",
        message: "Name must be a string",
      },
      required: [true, "Brand name is required"],
      unique: [true, "Brand name must be unique"],
      trim: true,
    },
    slug: {
      type: String,
      validate: {
        validator: (v) => typeof v === "string",
        message: "Slug must be a string",
      },
      required: [true, "Brand must have a slug"],
      lowercase: true,
    },
    image: String,
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
    const imageUrl = `${process.env.BASE_URL}/brands/${doc.image}`;
    doc.image = imageUrl;
  }
};
// findOne, findAll and update
brandSchema.post("init", (doc) => {
  setImageURL(doc);
});

// create
brandSchema.post("save", (doc) => {
  setImageURL(doc);
});

// Static method to update product count for a brand
brandSchema.statics.updateProductCount = async function (brandId) {
  const Product = mongoose.model("Product");
  const count = await Product.countDocuments({ brand: brandId });
  await this.findByIdAndUpdate(brandId, { productCount: count });
  return count;
};

const brandModel = mongoose.model("Brand", brandSchema);

module.exports = brandModel;
