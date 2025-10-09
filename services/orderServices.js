const stripe = require("stripe")(process.env.STRIPE_SECRET);
const asyncHandler = require("express-async-handler");
const factory = require("./handlersFactory");
const ApiError = require("../utils/endpointError");
const axios = require("axios");

const User = require("../models/userModel");
const Product = require("../models/productModel");
const Cart = require("../models/cartModel");
const Order = require("../models/orderModel");
const DeliveryService = require("./deliveryService");

// @desc    create cash order
// @route   POST /api/v1/orders/cartId
// @access  Protected/User
exports.createCashOrder = asyncHandler(async (req, res, next) => {
  // app settings
  const shippingPrice = 500;

  // 1) Get cart depend on cartId
  const cart = await Cart.findById(req.params.cartId);
  if (!cart) {
    return next(
      new ApiError(`There is no such cart with id ${req.params.cartId}`, 404)
    );
  }

  // 2) Get order price depend on cart price "Check if coupon apply"
  const cartPrice = cart.totalPriceAfterDiscount
    ? cart.totalPriceAfterDiscount
    : cart.totalCartPrice;

  const totalOrderPrice = cartPrice + shippingPrice;

  // 3) Create order with COD tracking
  const order = await Order.create({
    user: req.user._id,
    cartItems: cart.cartItems,
    shippingAddress: req.body.shippingAddress,
    totalOrderPrice,
    codAmount: totalOrderPrice, // COD amount equals total
    deliveryStatus: "pending", // Initial status
    paymentMethodType: "cash",
    paymentStatus: "pending", // COD waits for delivery
    statusHistory: [
      {
        status: "pending",
        note: "Order created, waiting for seller confirmation",
        updatedBy: "customer",
      },
    ],
  });

  // 4) After creating order, decrement product quantity, increment product sold
  if (order) {
    const bulkOption = cart.cartItems.map((item) => ({
      updateOne: {
        filter: { _id: item.product },
        update: { $inc: { quantity: -item.quantity, sold: +item.quantity } },
      },
    }));
    await Product.bulkWrite(bulkOption, {});

    // 5) Clear cart depend on cartId
    await Cart.findByIdAndDelete(req.params.cartId);
  }

  res.status(201).json({
    status: "success",
    message: "Order created successfully. Waiting for seller confirmation.",
    data: order,
  });
});

// Handle successful payment capture
const handlePaymentCaptured = async (charge) => {
  try {
    // Find order by customer email or metadata
    const order = await Order.findOne({
      totalOrderPrice: charge.amount / 100,
      paymentMethodType: "card",
      paymentStatus: "authorized",
    }).sort({ createdAt: -1 });

    if (!order) {
      console.log("Order not found for charge:", charge.id);
      return;
    }

    order.paymentStatus = "confirmed";
    order.isPaid = true;
    order.paidAt = new Date();
    order.statusHistory.push({
      status: "payment_captured",
      note: `Payment captured by Stripe. Charge ID: ${charge.id}`,
      updatedBy: "system",
    });

    await order.save();
    console.log(`✅ Payment captured for order: ${order._id}`);
  } catch (error) {
    console.error("Error handling payment capture:", error.message);
  }
};

// Handle payment refund
const handlePaymentRefunded = async (charge) => {
  try {
    const order = await Order.findOne({
      totalOrderPrice: charge.amount / 100,
      paymentMethodType: "card",
    }).sort({ createdAt: -1 });

    if (!order) {
      console.log("Order not found for refund:", charge.id);
      return;
    }

    order.paymentStatus = "refunded";
    order.isPaid = false;
    order.statusHistory.push({
      status: "payment_refunded",
      note: `Payment refunded. Charge ID: ${charge.id}`,
      updatedBy: "system",
    });

    await order.save();
    console.log(`↩️ Payment refunded for order: ${order._id}`);
  } catch (error) {
    console.error("Error handling payment refund:", error.message);
  }
};

exports.filterOrderForLoggedUser = asyncHandler(async (req, res, next) => {
  if (req.user.role === "user") req.filterObj = { user: req.user._id };
  next();
});
// @desc    Get all orders
// @route   POST /api/v1/orders
// @access  Protected/User-Admin-Manager
exports.findAllOrders = factory.getAll(Order);

// @desc    Get all orders
// @route   POST /api/v1/orders
// @access  Protected/User-Admin-Manager
exports.findSpecificOrder = factory.getOne(Order);

// @desc    Update order paid status to paid
// @route   PUT /api/v1/orders/:id/pay
// @access  Protected/Admin-Manager
exports.updateOrderToPaid = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return next(
      new ApiError(
        `There is no such a order with this id:${req.params.id}`,
        404
      )
    );
  }

  // update order to paid
  order.isPaid = true;
  order.paidAt = Date.now();

  const updatedOrder = await order.save();

  res.status(200).json({ status: "success", data: updatedOrder });
});

// @desc    Update order delivered status
// @route   PUT /api/v1/orders/:id/deliver
// @access  Protected/Admin-Manager
exports.updateOrderToDelivered = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);
  if (!order) {
    return next(
      new ApiError(
        `There is no such a order with this id:${req.params.id}`,
        404
      )
    );
  }

  // update order to paid
  order.isDelivered = true;
  order.deliveredAt = Date.now();

  const updatedOrder = await order.save();

  res.status(200).json({ status: "success", data: updatedOrder });
});

exports.checkoutSession = asyncHandler(async (req, res, next) => {
  const shippingPrice = 500;

  const cart = await Cart.findById(req.params.cartId);
  if (!cart) {
    return next(
      new ApiError(`There is no such cart with id ${req.params.cartId}`, 404)
    );
  }

  const cartPrice = cart.totalPriceAfterDiscount
    ? cart.totalPriceAfterDiscount
    : cart.totalCartPrice;
  const totalOrderPrice = cartPrice + shippingPrice;

  // CREATE ORDER IMMEDIATELY (for development only)
  const shippingAddress = {
    details: req.body.shippingAddress?.details || "",
    phone: req.body.shippingAddress?.phone || "",
    wilaya: req.body.shippingAddress?.wilaya || "",
    dayra: req.body.shippingAddress?.dayra || "",
  };

  const order = await Order.create({
    user: req.user._id,
    cartItems: cart.cartItems,
    shippingAddress,
    totalOrderPrice,
    paymentMethodType: "card",
    paymentStatus: "authorized",
    deliveryStatus: "pending",
    isPaid: false,
    statusHistory: [
      {
        status: "pending",
        note: "Order created. Payment authorized by Stripe.",
        updatedBy: "system",
      },
    ],
  });

  // Decrement inventory
  const bulkOption = cart.cartItems.map((item) => ({
    updateOne: {
      filter: { _id: item.product },
      update: { $inc: { quantity: -item.quantity, sold: +item.quantity } },
    },
  }));
  await Product.bulkWrite(bulkOption, {});
  await Cart.findByIdAndDelete(req.params.cartId);

  // Create Stripe session
  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: "dzd",
          product_data: {
            name: `Order for ${req.user.name}`,
          },
          unit_amount: totalOrderPrice * 100,
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: `http://localhost:5173/order-confirmation/${order._id}`, // Use order ID directly
    cancel_url: `http://localhost:5173/checkout`,
    customer_email: req.user.email,
    client_reference_id: order._id.toString(), // Store order ID for webhook
  });

  // Update order with session ID
  order.stripeSessionId = session.id;
  await order.save();

  res.status(200).json({ status: "success", session });
});

// ============================================
// 3. UPDATE createCardOrder function
// ============================================

const createCardOrder = async (session) => {
  const cartId = session.client_reference_id;
  const orderPrice = session.amount_total / 100;

  // Reconstruct shipping address from metadata
  const shippingAddress = {
    details: session.metadata.shippingDetails,
    phone: session.metadata.shippingPhone,
    wilaya: session.metadata.shippingWilaya,
    dayra: session.metadata.shippingDayra,
  };

  const cart = await Cart.findById(cartId);
  const user = await User.findOne({ email: session.customer_email });

  if (!cart || !user) {
    console.error("Cart or user not found for session:", session.id);
    return;
  }

  // Create order with stripeSessionId
  const order = await Order.create({
    user: user._id,
    cartItems: cart.cartItems,
    shippingAddress,
    totalOrderPrice: orderPrice,
    paymentMethodType: "card",
    paymentStatus: "authorized",
    deliveryStatus: "pending",
    isPaid: false,
    stripeSessionId: session.id, // Store session ID for lookup
    statusHistory: [
      {
        status: "pending",
        note: "Order created. Payment authorized by Stripe. Waiting for seller confirmation.",
        updatedBy: "system",
      },
    ],
  });

  // Decrement product quantity
  if (order) {
    const bulkOption = cart.cartItems.map((item) => ({
      updateOne: {
        filter: { _id: item.product },
        update: { $inc: { quantity: -item.quantity, sold: +item.quantity } },
      },
    }));
    await Product.bulkWrite(bulkOption, {});
    await Cart.findByIdAndDelete(cartId);
  }

  console.log(`✅ Order created: ${order._id} for session: ${session.id}`);
  return order;
};

// ============================================
// 4. ADD getOrderBySession function
// ============================================

exports.getOrderBySession = asyncHandler(async (req, res, next) => {
  const order = await Order.findOne({
    stripeSessionId: req.params.sessionId,
    user: req.user._id,
  });

  if (!order) {
    return next(new ApiError(`No order found for this session`, 404));
  }

  res.status(200).json({
    status: "success",
    data: order,
  });
});

// @desc    This webhook will run when stripe payment events occur
// @route   POST /webhook-checkout
// @access  Protected/User
exports.webhookCheckout = asyncHandler(async (req, res, next) => {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle different event types
  switch (event.type) {
    case "checkout.session.completed":
      // Payment authorized - create order
      await createCardOrder(event.data.object);
      break;

    case "charge.succeeded":
      // Payment captured successfully
      await handlePaymentCaptured(event.data.object);
      break;

    case "charge.refunded":
      // Payment was refunded
      await handlePaymentRefunded(event.data.object);
      break;

    case "payout.paid":
      // Funds transferred to seller's bank (optional tracking)
      console.log("💰 Payout completed:", event.data.object.id);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.status(200).json({ received: true });
});

// @desc    Confirm order (Seller action)
// @route   PUT /api/v1/orders/:id/confirm
// @access  Protected/Admin
exports.confirmOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(
      new ApiError(`There is no such order with id: ${req.params.id}`, 404)
    );
  }

  if (order.deliveryStatus !== "pending") {
    return next(
      new ApiError(`Order already confirmed or in different state`, 400)
    );
  }

  // Update to confirmed
  order.deliveryStatus = "confirmed";
  order.statusHistory.push({
    status: "confirmed",
    note: "Order confirmed by seller",
    updatedBy: "seller",
  });

  await order.save();

  res.status(200).json({
    status: "success",
    message: "Order confirmed. Ready to ship.",
    data: order,
  });
});

// @desc    Ship order (Create shipment with delivery agency)
// @route   POST /api/v1/orders/:id/ship
// @access  Protected/Admin
exports.shipOrder = asyncHandler(async (req, res, next) => {
  try {
    const result = await DeliveryService.createShipment(req.params.id);
    res.status(200).json({
      status: "success",
      ...result,
    });
  } catch (error) {
    return next(new ApiError(error.message, 400));
  }
});

// @desc    Get order tracking info
// @route   GET /api/v1/orders/:id/tracking
// @access  Protected/User-Admin
exports.getOrderTracking = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id).populate(
    "user",
    "name email"
  );

  if (!order) {
    return next(
      new ApiError(`There is no such order with id: ${req.params.id}`, 404)
    );
  }

  let trackingInfo = null;
  if (order.trackingNumber) {
    try {
      trackingInfo = await DeliveryService.getTrackingInfo(
        order.trackingNumber
      );
    } catch (error) {
      console.error("Failed to fetch tracking info:", error.message);
    }
  }

  res.status(200).json({
    status: "success",
    data: {
      order: {
        _id: order._id,
        orderNumber: order._id,
        deliveryStatus: order.deliveryStatus,
        trackingNumber: order.trackingNumber,
        isPaid: order.isPaid,
        isDelivered: order.isDelivered,
        totalOrderPrice: order.totalOrderPrice,
        statusHistory: order.statusHistory,
      },
      tracking: trackingInfo,
    },
  });
});

// @desc    Webhook endpoint for delivery agency updates
// @route   POST /api/v1/delivery/webhook
// @access  Public (but should validate with secret in production)
exports.deliveryWebhook = asyncHandler(async (req, res, next) => {
  console.log("📦 Delivery webhook received:", req.body);

  const { event, data } = req.body;

  if (event === "parcel.status.updated") {
    try {
      await DeliveryService.updateOrderStatus(data.order_id, {
        status: data.status,
        note: `Delivery update: ${data.status}`,
      });

      console.log(`✅ Order ${data.order_id} updated to: ${data.status}`);
    } catch (error) {
      console.error("❌ Webhook processing error:", error.message);
    }
  }

  // Always respond 200 to acknowledge webhook
  res.status(200).json({
    success: true,
    message: "Webhook received",
  });
});

// @desc    Simulate delivery flow (TESTING ONLY)
// @route   POST /api/v1/orders/:id/simulate-delivery
// @access  Protected/Admin
exports.simulateDelivery = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order || !order.trackingNumber) {
    return next(
      new ApiError("Order not shipped yet or tracking number missing", 404)
    );
  }

  console.log(req.body)
  const { speed , scenario  } = req.body; // ADD scenario parameter
  try {
    const response = await axios.post(
      `${process.env.DELIVERY_API_URL || "http://localhost:3001/api/v1"}/parcels/${order.trackingNumber}/simulate`,
      { speed, scenario } // PASS scenario to mock API
    );

    res.status(200).json({
      status: "success",
      message: "Delivery simulation started",
      data: response.data.data,
    });
  } catch (error) {
    return next(new ApiError(`Simulation failed: ${error}`, 400));
  }
});

// @desc    Cancel order (Customer/Seller action)
// @route   PUT /api/v1/orders/:id/cancel
// @access  Protected/User-Admin
exports.cancelOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(
      new ApiError(`There is no such order with id: ${req.params.id}`, 404)
    );
  }

  // Can only cancel if pending or confirmed (not yet shipped)
  if (!["pending", "confirmed"].includes(order.deliveryStatus)) {
    return next(
      new ApiError(
        `Cannot cancel order. Current status: ${order.deliveryStatus}. Orders can only be cancelled before shipping.`,
        400
      )
    );
  }

  // Handle refund for card payments
  if (
    order.paymentMethodType === "card" &&
    order.paymentStatus === "authorized"
  ) {
    order.paymentStatus = "refunded";
    order.statusHistory.push({
      status: "payment_refunded",
      note: "Payment authorization released due to cancellation",
      updatedBy: req.user?.role === "admin" ? "seller" : "customer",
    });
  }

  order.deliveryStatus = "cancelled";
  order.statusHistory.push({
    status: "cancelled",
    note: req.body.reason || "Order cancelled by user",
    updatedBy: req.user?.role === "admin" ? "seller" : "customer",
  });

  await order.save();

  res.status(200).json({
    status: "success",
    message: "Order cancelled successfully",
    data: order,
  });
});

// @desc    Confirm card payment order (Seller action)
// @route   PUT /api/v1/orders/:id/confirm-card
// @access  Protected/Admin
exports.confirmCardOrder = asyncHandler(async (req, res, next) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    return next(
      new ApiError(`There is no such order with id: ${req.params.id}`, 404)
    );
  }

  if (order.paymentMethodType !== "card") {
    return next(
      new ApiError("This endpoint is only for card payment orders", 400)
    );
  }

  if (order.paymentStatus !== "authorized") {
    return next(
      new ApiError(
        `Cannot confirm. Payment status is: ${order.paymentStatus}`,
        400
      )
    );
  }

  // Update payment status to confirmed
  order.paymentStatus = "confirmed";
  order.deliveryStatus = "confirmed";
  order.statusHistory.push({
    status: "confirmed",
    note: "Payment confirmed. Order ready to ship.",
    updatedBy: "seller",
  });

  await order.save();

  res.status(200).json({
    status: "success",
    message: "Card payment order confirmed. Ready to ship.",
    data: order,
  });
});
