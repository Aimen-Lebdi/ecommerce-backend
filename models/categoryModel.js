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
  },
  { timestamps: true ,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
  
);

categorySchema.virtual('productCount', {
  ref: 'Product', // Reference to Product model
  localField: '_id',
  foreignField: 'category',
  count: true // This makes it return the count instead of documents
});

const setImageURL = (doc) => {
  if (doc.image) {
    const imageUrl = `${process.env.BASE_URL}/products/${doc.image}`;
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

const categoryModel = mongoose.model("Category", categorySchema);

module.exports = categoryModel;
