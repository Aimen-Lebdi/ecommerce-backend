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
  getOrderBySession,
  downloadInvoice,
} = require("../services/orderServices");

const authService = require("../services/authServices");

const router = express.Router();

// Webhook endpoint (must be BEFORE auth middleware)
router.post("/delivery/webhook", deliveryWebhook);

// NEW: Get order by Stripe session ID (must be BEFORE /:id route)
router.get(
  "/session/:sessionId",
  authService.protectRoute,
  authService.allowTo("user"," admin"),
  getOrderBySession
);

// Stripe checkout - CHANGE TO POST
router.post(
  "/checkout-session/:cartId",
  authService.protectRoute,
  authService.allowTo("user", "admin"),
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
router.get("/", authService.protectRoute,
  authService.allowTo("user", "admin"),
  findAllOrders);

// Get all orders for specific user
router.get("/myOrders", authService.protectRoute,
  authService.allowTo("user", "admin"),
  filterOrderForLoggedUser,
  findAllOrders);

// Get specific order
router.get(
  "/:id",
  authService.protectRoute,
  authService.allowTo("user", "admin"),
  findSpecificOrder
);

// COD Workflow endpoints
router.put("/:id/confirm", confirmOrder); // Seller confirms order
router.post("/:id/ship", shipOrder); // Create shipment with delivery agency
router.get("/:id/tracking", authService.protectRoute, getOrderTracking); // Get tracking info

// ADD THESE THREE ROUTES:
router.put("/:id/cancel", authService.protectRoute, cancelOrder);

// Testing endpoint
router.post("/:id/simulate-delivery", simulateDelivery);

router.put(
  "/:id/confirm-card",
  authService.protectRoute,
  authService.allowTo("admin"),
  confirmCardOrder
); // Confirm card payment order

// Payment & delivery status updates (admin)
// router.put("/:id/pay", updateOrderToPaid);
// router.put("/:id/deliver", updateOrderToDelivered);

// Add this route
router.get(
  "/:id/invoice",
  authService.protectRoute,
  authService.allowTo("user", "admin"),
  downloadInvoice
);

module.exports = router;
