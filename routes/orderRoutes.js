const express = require("express");
const {
  createCashOrder,
  findAllOrders,
  findSpecificOrder,
  filterOrderForLoggedUser,
  updateOrderToPaid,
  updateOrderToDelivered,
  checkoutSession,
} = require("../services/orderServices");

const authService = require("../services/authServices");

const router = express.Router();

router.use(authService.protectRoute);

router.get(
  "/checkout-session/:cartId",
  authService.allowTo("user"),
  checkoutSession
);

router.route("/:cartId").post(authService.allowTo("user"), createCashOrder);
router.post("/:cartId", authService.allowTo("user"), createCashOrder);
router.get(
  "/",
  authService.allowTo("user", "admin", "manager"),
  filterOrderForLoggedUser,
  findAllOrders
);
router.get("/:id",
  authService.allowTo("user"),
  findSpecificOrder);
router.put(
  "/:id/pay",
  authService.allowTo("admin", "manager"),
  updateOrderToPaid
);
router.put(
  "/:id/deliver",
  authService.allowTo("admin", "manager"),
  updateOrderToDelivered
);

module.exports = router;
