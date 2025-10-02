const express = require("express");
const {
  createCashOrder,
  findAllOrders,
  findSpecificOrder,
  filterOrderForLoggedUser,
  updateOrderToPaid,
  updateOrderToDelivered,
  checkoutSession,
  confirmOrder, // NEW
  shipOrder, // NEW
  cancelOrder, // ADD THIS
  getOrderTracking, // NEW
  simulateDelivery, // NEW (testing only)
  deliveryWebhook,
  confirmCardOrder,
} = require("../services/orderServices");

const authService = require("../services/authServices");

const router = express.Router();

// Webhook endpoint (must be BEFORE auth middleware)
router.post("/delivery/webhook", deliveryWebhook);

// Stripe checkout
router.get(
  "/checkout-session/:cartId",
  authService.protectRoute,
  authService.allowTo("user"),
  checkoutSession
);

// Create cash order
router.post(
  "/:cartId",
  authService.protectRoute,
  authService.allowTo("user"),
  createCashOrder
);

// Get all orders
router.get("/", findAllOrders);

// Get specific order
router.get(
  "/:orderId",
  authService.protectRoute,
  authService.allowTo("user", "admin"),
  findSpecificOrder
);

// COD Workflow endpoints
router.put("/:orderId/confirm", confirmOrder); // Seller confirms order
router.post("/:orderId/ship", shipOrder); // Create shipment with delivery agency
router.get("/:orderId/tracking", authService.protectRoute, getOrderTracking); // Get tracking info

// ADD THESE THREE ROUTES:
router.put("/:orderId/cancel", authService.protectRoute, cancelOrder);

// Testing endpoint
router.post("/:orderId/simulate-delivery", simulateDelivery);

router.put(
  "/:orderId/confirm-card",
  authService.protectRoute,
  authService.allowTo("admin"),
  confirmCardOrder
); // Confirm card payment order

// Payment & delivery status updates (admin)
// router.put("/:orderId/pay", updateOrderToPaid);
// router.put("/:orderId/deliver", updateOrderToDelivered);

module.exports = router;
