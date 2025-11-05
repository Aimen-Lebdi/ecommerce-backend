const stripe = require("stripe")(process.env.STRIPE_SECRET);
const asyncHandler = require("express-async-handler");
const { getAll, getOne } = require("./handlersFactory");
const ApiError = require("../utils/endpointError");
const { post } = require("axios");
const { logOrderActivity } = require("../socket/activityLogger");

const { findOne } = require("../models/userModel");
const { bulkWrite } = require("../models/productModel");
const { findById, findByIdAndDelete } = require("../models/cartModel");
const Order = require("../models/orderModel");
const { createShipment, getTrackingInfo, updateOrderStatus } = require("./deliveryService");
const { generateInvoice } = require("./invoiceService");

const createCashOrder = asyncHandler(async (req, res, next) => {
  const shippingPrice = 500;

  const cart = await findById(req.params.cartId);
  if (!cart) {
    return next(
      new ApiError(`There is no such cart with id ${req.params.cartId}`, 404)
    );
  }

  const cartPrice = cart.totalPriceAfterDiscount
    ? cart.totalPriceAfterDiscount
    : cart.totalCartPrice;

  const totalOrderPrice = cartPrice + shippingPrice;

  const order = await create({
    user: req.user._id,
    cartItems: cart.cartItems,
    shippingAddress: req.body.shippingAddress,
    totalOrderPrice,
    codAmount: totalOrderPrice,
    deliveryStatus: "pending",
    paymentMethodType: "cash",
    paymentStatus: "pending",
    statusHistory: [
      {
        status: "pending",
        note: "Order created, waiting for seller confirmation",
        updatedBy: "customer",
      },
    ],
  });

  // Log activity
  if (order && req.user) {
    await logOrderActivity("create", order, req.user, {
      paymentMethod: "cash",
      itemsCount: cart.cartItems.length,
    });
  }

  if (order) {
    const bulkOption = cart.cartItems.map((item) => ({
      updateOne: {
        filter: { _id: item.product },
        update: { $inc: { quantity: -item.quantity, sold: +item.quantity } },
      },
    }));
    await bulkWrite(bulkOption, {});
    await findByIdAndDelete(req.params.cartId);
  }

  res.status(201).json({
    status: "success",
    message: "Order created successfully. Waiting for seller confirmation.",
    data: order,
  });
});

const handlePaymentCaptured = async (charge) => {
  try {
    const order = await _findOne({
      totalOrderPrice: charge.amount / 100,
      paymentMethodType: "card",
      paymentStatus: "authorized",
    }).sort({ createdAt: -1 });

    if (!order) return;

    order.paymentStatus = "confirmed";
    order.isPaid = true;
    order.paidAt = new Date();
    order.statusHistory.push({
      status: "payment_captured",
      note: `Payment captured by Stripe. Charge ID: ${charge.id}`,
      updatedBy: "system",
    });

    await order.save();
    console.log(`✔️ Payment captured for order: ${order._id}`);
  } catch (error) {
    console.error("Error handling payment capture:", error.message);
  }
};

const handlePaymentRefunded = async (charge) => {
  try {
    const order = await _findOne({
      totalOrderPrice: charge.amount / 100,
      paymentMethodType: "card",
    }).sort({ createdAt: -1 });

    if (!order) return;

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

const filterOrderForLoggedUser = asyncHandler(async (req, res, next) => {
  // Everyone (admin or user) sees only their own orders
  req.filterObj = { user: req.user._id };
  next();
});

const findAllOrders = getAll(Order);
const findSpecificOrder = getOne(Order);

const updateOrderToPaid = asyncHandler(async (req, res, next) => {
  const order = await _findById(req.params.id);
  if (!order) {
    return next(
      new ApiError(
        `There is no such a order with this id:${req.params.id}`,
        404
      )
    );
  }

  order.isPaid = true;
  order.paidAt = Date.now();
  const updatedOrder = await order.save();

  // Log activity
  if (req.user) {
    await logOrderActivity("update", updatedOrder, req.user, {
      changes: "payment status marked as paid",
    });
  }

  res.status(200).json({ status: "success", data: updatedOrder });
});

const updateOrderToDelivered = asyncHandler(async (req, res, next) => {
  const order = await _findById(req.params.id);
  if (!order) {
    return next(
      new ApiError(
        `There is no such a order with this id:${req.params.id}`,
        404
      )
    );
  }

  order.isDelivered = true;
  order.deliveredAt = Date.now();
  order.deliveryStatus = "delivered";
  const updatedOrder = await order.save();

  // Log activity
  if (req.user) {
    await logOrderActivity("deliver", updatedOrder, req.user);
  }

  res.status(200).json({ status: "success", data: updatedOrder });
});

const checkoutSession = asyncHandler(async (req, res, next) => {
  const shippingPrice = 500;

  const cart = await findById(req.params.cartId);
  if (!cart) {
    return next(
      new ApiError(`There is no such cart with id ${req.params.cartId}`, 404)
    );
  }

  const cartPrice = cart.totalPriceAfterDiscount
    ? cart.totalPriceAfterDiscount
    : cart.totalCartPrice;
  const totalOrderPrice = cartPrice + shippingPrice;

  const shippingAddress = {
    details: req.body.shippingAddress?.details || "",
    phone: req.body.shippingAddress?.phone || "",
    wilaya: req.body.shippingAddress?.wilaya || "",
    dayra: req.body.shippingAddress?.dayra || "",
  };

  const order = await create({
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

  // Log activity
  if (order && req.user) {
    await logOrderActivity("create", order, req.user, {
      paymentMethod: "card",
      itemsCount: cart.cartItems.length,
    });
  }

  const bulkOption = cart.cartItems.map((item) => ({
    updateOne: {
      filter: { _id: item.product },
      update: { $inc: { quantity: -item.quantity, sold: +item.quantity } },
    },
  }));
  await bulkWrite(bulkOption, {});
  await findByIdAndDelete(req.params.cartId);

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
    success_url: `http://localhost:5173/order-confirmation/${order._id}`,
    cancel_url: `http://localhost:5173/checkout`,
    customer_email: req.user.email,
    client_reference_id: order._id.toString(),
  });

  order.stripeSessionId = session.id;
  await order.save();

  res.status(200).json({ status: "success", session });
});

const createCardOrder = async (session) => {
  const cartId = session.client_reference_id;
  const orderPrice = session.amount_total / 100;

  const shippingAddress = {
    details: session.metadata.shippingDetails,
    phone: session.metadata.shippingPhone,
    wilaya: session.metadata.shippingWilaya,
    dayra: session.metadata.shippingDayra,
  };

  const cart = await findById(cartId);
  const user = await findOne({ email: session.customer_email });

  if (!cart || !user) {
    console.error("Cart or user not found for session:", session.id);
    return;
  }

  const order = await create({
    user: user._id,
    cartItems: cart.cartItems,
    shippingAddress,
    totalOrderPrice: orderPrice,
    paymentMethodType: "card",
    paymentStatus: "authorized",
    deliveryStatus: "pending",
    isPaid: false,
    stripeSessionId: session.id,
    statusHistory: [
      {
        status: "pending",
        note: "Order created. Payment authorized by Stripe. Waiting for seller confirmation.",
        updatedBy: "system",
      },
    ],
  });

  if (order) {
    const bulkOption = cart.cartItems.map((item) => ({
      updateOne: {
        filter: { _id: item.product },
        update: { $inc: { quantity: -item.quantity, sold: +item.quantity } },
      },
    }));
    await bulkWrite(bulkOption, {});
    await findByIdAndDelete(cartId);
  }

  console.log(`✔️ Order created: ${order._id} for session: ${session.id}`);
  return order;
};

const getOrderBySession = asyncHandler(async (req, res, next) => {
  const order = await _findOne({
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

const webhookCheckout = asyncHandler(async (req, res, next) => {
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

  switch (event.type) {
    case "checkout.session.completed":
      await createCardOrder(event.data.object);
      break;

    case "charge.succeeded":
      await handlePaymentCaptured(event.data.object);
      break;

    case "charge.refunded":
      await handlePaymentRefunded(event.data.object);
      break;

    case "payout.paid":
      console.log("💰 Payout completed:", event.data.object.id);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.status(200).json({ received: true });
});

const confirmOrder = asyncHandler(async (req, res, next) => {
  const order = await _findById(req.params.id);

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

  order.deliveryStatus = "confirmed";
  order.statusHistory.push({
    status: "confirmed",
    note: "Order confirmed by seller",
    updatedBy: "seller",
  });

  await order.save();

  // Log activity
  if (req.user) {
    await logOrderActivity("confirm", order, req.user);
  }

  res.status(200).json({
    status: "success",
    message: "Order confirmed. Ready to ship.",
    data: order,
  });
});

const shipOrder = asyncHandler(async (req, res, next) => {
  try {
    const order = await _findById(req.params.id);
    const result = await createShipment(req.params.id);

    // Log activity
    if (req.user && order) {
      await logOrderActivity("ship", order, req.user, {
        trackingNumber: result.trackingNumber || "pending",
      });
    }

    res.status(200).json({
      status: "success",
      ...result,
    });
  } catch (error) {
    return next(new ApiError(error.message, 400));
  }
});

const getOrderTracking = asyncHandler(async (req, res, next) => {
  const order = await _findById(req.params.id).populate(
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
      trackingInfo = await getTrackingInfo(
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

const deliveryWebhook = asyncHandler(async (req, res, next) => {
  console.log("📦 Delivery webhook received:", req.body);

  const { event, data } = req.body;

  if (event === "parcel.status.updated") {
    try {
      await updateOrderStatus(data.order_id, {
        status: data.status,
        note: `Delivery update: ${data.status}`,
      });

      console.log(`✔️ Order ${data.order_id} updated to: ${data.status}`);
    } catch (error) {
      console.error("❌ Webhook processing error:", error.message);
    }
  }

  res.status(200).json({
    success: true,
    message: "Webhook received",
  });
});

const simulateDelivery = asyncHandler(async (req, res, next) => {
  const order = await _findById(req.params.id);

  if (!order || !order.trackingNumber) {
    return next(
      new ApiError("Order not shipped yet or tracking number missing", 404)
    );
  }

  const { speed, scenario } = req.body;
  try {
    const response = await post(
      `${process.env.DELIVERY_API_URL || "http://localhost:3001/api/v1"}/parcels/${order.trackingNumber}/simulate`,
      { speed, scenario }
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

const cancelOrder = asyncHandler(async (req, res, next) => {
  const order = await _findById(req.params.id);

  if (!order) {
    return next(
      new ApiError(`There is no such order with id: ${req.params.id}`, 404)
    );
  }

  if (!["pending", "confirmed"].includes(order.deliveryStatus)) {
    return next(
      new ApiError(
        `Cannot cancel order. Current status: ${order.deliveryStatus}. Orders can only be cancelled before shipping.`,
        400
      )
    );
  }

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

  // Log activity
  if (req.user) {
    await logOrderActivity("cancel", order, req.user, {
      reason: req.body.reason || "No reason provided",
    });
  }

  res.status(200).json({
    status: "success",
    message: "Order cancelled successfully",
    data: order,
  });
});

const confirmCardOrder = asyncHandler(async (req, res, next) => {
  const order = await _findById(req.params.id);

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

  order.paymentStatus = "confirmed";
  order.deliveryStatus = "confirmed";
  order.statusHistory.push({
    status: "confirmed",
    note: "Payment confirmed. Order ready to ship.",
    updatedBy: "seller",
  });

  await order.save();

  // Log activity
  if (req.user) {
    await logOrderActivity("confirm", order, req.user);
  }

  res.status(200).json({
    status: "success",
    message: "Card payment order confirmed. Ready to ship.",
    data: order,
  });
});

const downloadInvoice = asyncHandler(async (req, res, next) => {
  const order = await _findById(req.params.id)
    .populate("user", "name email phone")
    .populate("cartItems.product", "title imageCover");

  if (!order) {
    return next(
      new ApiError(`There is no such order with id: ${req.params.id}`, 404)
    );
  }

  if (
    req.user.role !== "admin" &&
    order.user._id.toString() !== req.user._id.toString()
  ) {
    return next(
      new ApiError("You are not authorized to download this invoice", 403)
    );
  }

  const pdfBuffer = await generateInvoice(order);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename=invoice-${order._id}.pdf`
  );

  res.send(pdfBuffer);
});


module.exports = {
  createCashOrder,
  filterOrderForLoggedUser,
  findAllOrders,
  findSpecificOrder,
  updateOrderToPaid,
  updateOrderToDelivered,
  checkoutSession,
  getOrderBySession,
  webhookCheckout,
  confirmOrder,
  shipOrder,
  getOrderTracking,
  deliveryWebhook,
  simulateDelivery,
  cancelOrder,
  confirmCardOrder,
  downloadInvoice
};
