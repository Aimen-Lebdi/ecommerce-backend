const mongoose = require("mongoose");

const activityLogSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: [true, "Activity type is required"],
      enum: [
        "order",
        "product",
        "category",
        "brand",
        "user",
        "subcategory",
        "review",
        "coupon",
        "cart",
      ],
    },
    activity: {
      type: String,
      required: [true, "Activity name is required"],
      enum: [
        "New Order Placed",
        "Order Updated",
        "Order Cancelled",
        "Product Created",
        "Product Updated",
        "Product Deleted",
        "Category Created",
        "Category Updated",
        "Category Deleted",
        "Brand Created",
        "Brand Updated",
        "Brand Deleted",
        "User Registered",
        "User Updated",
        "User Deleted",
        "SubCategory Created",
        "SubCategory Updated",
        "SubCategory Deleted",
        "Review Added",
        "Review Updated",
        "Review Deleted",
        "Coupon Created",
        "Coupon Updated",
        "Coupon Deleted",
        "Cart Updated",
        "Wishlist Updated",
      ],
    },
    user: {
      name: {
        type: String,
        required: [true, "User name is required"],
      },
      id: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
        required: [true, "User ID is required"],
      },
      role: {
        type: String,
        enum: ["admin", "user"],
        required: [true, "User role is required"],
      },
    },
    description: {
      type: String,
      required: [true, "Activity description is required"],
    },
    status: {
      type: String,
      enum: ["success", "failed", "pending"],
      default: "success",
    },
    amount: {
      type: Number,
      default: null, // Only for order-related activities
    },
    relatedId: {
      type: mongoose.Schema.ObjectId,
      required: [true, "Related document ID is required"],
    },
    relatedModel: {
      type: String,
      required: [true, "Related model name is required"],
      enum: [
        "Order",
        "Product",
        "Category",
        "Brand",
        "User",
        "SubCategory",
        "Review",
        "Coupon",
        "Cart",
      ],
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed, // For storing additional data
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Index for better query performance
activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ type: 1, createdAt: -1 });
activityLogSchema.index({ "user.id": 1, createdAt: -1 });

const ActivityLogModel = mongoose.model("ActivityLog", activityLogSchema);

module.exports = ActivityLogModel;
