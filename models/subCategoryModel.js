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
  },
  { timestamps: true }
);

const setImageURL = (doc) => {
  if (doc.image) {
    const imageUrl = `${process.env.BASE_URL}/products/${doc.image}`;
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

const subCategoryModel = mongoose.model("Subcategory", subCategorySchema);

module.exports = subCategoryModel;
