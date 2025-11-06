const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env.development") });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Import models
const Category = require("../models/categoryModel");
const Subcategory = require("../models/subCategoryModel");
const Brand = require("../models/brandModel");
const Product = require("../models/productModel");
const User = require("../models/userModel");

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_DB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// Helper function to upload image to Cloudinary
const uploadToCloudinary = async (localPath, folder) => {
  try {
    if (!fs.existsSync(localPath)) {
      console.log(`⚠️  File not found: ${localPath}`);
      return null;
    }

    const result = await cloudinary.uploader.upload(localPath, {
      folder: folder,
      transformation: [{ width: 600, height: 600, crop: "limit", quality: "auto" }],
    });

    console.log(`✅ Uploaded: ${path.basename(localPath)} -> ${result.secure_url}`);
    return result.secure_url;
  } catch (error) {
    console.error(`❌ Error uploading ${localPath}:`, error.message);
    return null;
  }
};

// Migrate Categories
const migrateCategories = async () => {
  console.log("\n📂 Migrating Categories...");
  const categories = await Category.find({});

  for (const category of categories) {
    if (category.image && !category.image.startsWith("http")) {
      // Extract filename from URL like: http://localhost:5000/categories/category-abc-123.jpeg
      const filename = category.image.split("/categories/")[1] || category.image;
      const localPath = path.join(__dirname, "../uploads/categories", filename);

      const cloudinaryUrl = await uploadToCloudinary(localPath, "categories");

      if (cloudinaryUrl) {
        category.image = cloudinaryUrl;
        await category.save();
        console.log(`✅ Updated category: ${category.name}`);
      }
    }
  }
};

// Migrate Subcategories
const migrateSubcategories = async () => {
  console.log("\n📂 Migrating Subcategories...");
  const subcategories = await Subcategory.find({});

  for (const subcategory of subcategories) {
    if (subcategory.image && !subcategory.image.startsWith("http")) {
      const filename = subcategory.image.split("/subCategories/")[1] || subcategory.image;
      const localPath = path.join(__dirname, "../uploads/subcategories", filename);

      const cloudinaryUrl = await uploadToCloudinary(localPath, "subcategories");

      if (cloudinaryUrl) {
        subcategory.image = cloudinaryUrl;
        await subcategory.save();
        console.log(`✅ Updated subcategory: ${subcategory.name}`);
      }
    }
  }
};

// Migrate Brands
const migrateBrands = async () => {
  console.log("\n📂 Migrating Brands...");
  const brands = await Brand.find({});

  for (const brand of brands) {
    if (brand.image && !brand.image.startsWith("http")) {
      const filename = brand.image.split("/brands/")[1] || brand.image;
      const localPath = path.join(__dirname, "../uploads/brands", filename);

      const cloudinaryUrl = await uploadToCloudinary(localPath, "brands");

      if (cloudinaryUrl) {
        brand.image = cloudinaryUrl;
        await brand.save();
        console.log(`✅ Updated brand: ${brand.name}`);
      }
    }
  }
};

// Migrate Products
const migrateProducts = async () => {
  console.log("\n📂 Migrating Products...");
  const products = await Product.find({});

  for (const product of products) {
    let updated = false;

    // Migrate mainImage
    if (product.mainImage && !product.mainImage.startsWith("http")) {
      const filename = product.mainImage.split("/products/")[1] || product.mainImage;
      const localPath = path.join(__dirname, "../uploads/products", filename);

      const cloudinaryUrl = await uploadToCloudinary(localPath, "products");

      if (cloudinaryUrl) {
        product.mainImage = cloudinaryUrl;
        updated = true;
      }
    }

    // Migrate images array
    if (product.images && product.images.length > 0) {
      const newImages = [];

      for (const image of product.images) {
        if (!image.startsWith("http")) {
          const filename = image.split("/products/")[1] || image;
          const localPath = path.join(__dirname, "../uploads/products", filename);

          const cloudinaryUrl = await uploadToCloudinary(localPath, "products");

          if (cloudinaryUrl) {
            newImages.push(cloudinaryUrl);
            updated = true;
          } else {
            newImages.push(image); // Keep original if upload fails
          }
        } else {
          newImages.push(image); // Already a Cloudinary URL
        }
      }

      product.images = newImages;
    }

    if (updated) {
      await product.save();
      console.log(`✅ Updated product: ${product.name}`);
    }
  }
};

// Migrate Users
const migrateUsers = async () => {
  console.log("\n📂 Migrating Users...");
  const users = await User.find({});

  for (const user of users) {
    if (user.image && !user.image.startsWith("http")) {
      const filename = user.image.split("/users/")[1] || user.image;
      const localPath = path.join(__dirname, "../uploads/users", filename);

      const cloudinaryUrl = await uploadToCloudinary(localPath, "users");

      if (cloudinaryUrl) {
        user.image = cloudinaryUrl;
        await user.save();
        console.log(`✅ Updated user: ${user.name}`);
      }
    }
  }
};

// Run all migrations
const runMigration = async () => {
  try {
    console.log("🚀 Starting image migration to Cloudinary...\n");

    await migrateCategories();
    await migrateSubcategories();
    await migrateBrands();
    await migrateProducts();
    await migrateUsers();

    console.log("\n✅ Migration completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  }
};

runMigration();