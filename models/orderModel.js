const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: "User",
      required: [true, "Order must be belong to user"],
    },
    cartItems: [
      {
        product: {
          type: mongoose.Schema.ObjectId,
          ref: "Product",
        },
        quantity: Number,
        color: String,
        price: Number,
      },
    ],

    taxPrice: {
      type: Number,
      default: 0,
    },
    shippingAddress: {
      details: String,
      phone: String,
      city: String,
      postalCode: String,
    },
    shippingPrice: {
      type: Number,
      default: 0,
    },
    totalOrderPrice: {
      type: Number,
    },
    paymentMethodType: {
      type: String,
      enum: ["card", "cash"],
      default: "cash",
    },
    deliveryStatus: {
      type: String,
      enum: [
        "pending", // Order created, waiting confirmation
        "confirmed", // Seller confirmed
        "shipped", // Handed to delivery agency
        "in_transit", // Being transported
        "out_for_delivery", // Delivery agent on the way
        "delivered", // Customer received & paid
        "completed", // Payment settled with seller
        "failed", // Delivery failed
        "returned", // Returned to seller
        "cancelled", // Order cancelled
      ],
      default: "pending",
    },

    trackingNumber: {
      type: String,
      trim: true,
    },

    // COD specific fields
    codAmount: {
      type: Number,
      default: 0,
    },

    // Status history for tracking
    statusHistory: [
      {
        status: String,
        timestamp: { type: Date, default: Date.now },
        note: String,
        updatedBy: String, // 'seller', 'delivery_agency', 'system'
      },
    ],

    // Delivery agency info
    deliveryAgency: {
      name: String,
      apiResponse: Object, // Store raw API response for debugging
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    paidAt: Date,
    isDelivered: {
      type: Boolean,
      default: false,
    },
    deliveredAt: Date,
  },
  { timestamps: true }
);

orderSchema.pre(/^find/, function (next) {
  this.populate({
    path: "user",
    select: "name profileImg email phone",
  }).populate({
    path: "cartItems.product",
    select: "title imageCover ",
  });

  next();
});

const orderModel = mongoose.model("Order", orderSchema);

module.exports = orderModel;
