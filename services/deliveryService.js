const axios = require("axios");
const Order = require("../models/orderModel");

// Configuration
const DELIVERY_API_URL =
  process.env.DELIVERY_API_URL || "http://localhost:3001/api/api/v1/";
const WEBHOOK_URL =
  process.env.DELIVERY_WEBHOOK_URL ||
  "http://localhost:5000/api/v1/orders/delivery/webhook";

class DeliveryService {
  // Create shipment with delivery agency (call after order is confirmed)
  static async createShipment(id) {
    try {
      const order = await Order.findById(id).populate(
        "user",
        "name email phone"
      );

      if (!order) {
        throw new Error("Order not found");
      }

      if (order.deliveryStatus !== "confirmed") {
        throw new Error("Order must be confirmed before shipping");
      }

      // Prepare product list
      const productList = order.cartItems.map((item) => ({
        name: item.product?.title || "Product",
        quantity: item.quantity,
        price: item.price,
      }));

      // Call delivery agency API
      const response = await axios.post(`${DELIVERY_API_URL}/parcels`, {
        order_id: order._id.toString(),
        customer_name: order.user.name,
        customer_phone: order.shippingAddress.phone || order.user.phone,
        customer_address: order.shippingAddress.details,
        wilaya: order.shippingAddress.wilaya,
        product_list: productList,
        price: order.totalOrderPrice,
        webhook_url: WEBHOOK_URL,
      });

      if (response.data.success) {
        // Update order with tracking info
        order.trackingNumber = response.data.data.tracking_number;
        order.deliveryStatus = "shipped";
        order.deliveryAgency = {
          name: "Yalidine Express",
          apiResponse: response.data,
        };
        order.statusHistory.push({
          status: "shipped",
          note: `Package handed to delivery agency. Tracking: ${response.data.data.tracking_number}`,
          updatedBy: "system",
        });

        await order.save();

        return {
          success: true,
          trackingNumber: response.data.data.tracking_number,
          message: "Shipment created successfully",
        };
      }
    } catch (error) {
      console.error("Error creating shipment:", error.message);
      throw new Error(`Failed to create shipment: ${error.message}`);
    }
  }

  // Update order status from delivery agency webhook
  static async updateOrderStatus(id, deliveryData) {
    try {
      const order = await Order.findById(id);

      if (!order) {
        throw new Error("Order not found");
      }

      // Map delivery agency statuses to your order statuses
      const statusMap = {
        pending_pickup: "confirmed",
        collected: "shipped",
        in_transit: "in_transit",
        out_for_delivery: "out_for_delivery",
        delivered: "delivered",
        completed: "completed",
        failed_delivery: "failed",
        returned: "returned",
        cancelled: "cancelled",
      };

      const newStatus = statusMap[deliveryData.status] || order.deliveryStatus;

      // Update order
      order.deliveryStatus = newStatus;
      order.statusHistory.push({
        status: newStatus,
        timestamp: new Date(),
        note: deliveryData.note || `Delivery status: ${deliveryData.status}`,
        updatedBy: "delivery_agency",
      });

      // If delivered, mark accordingly
      if (newStatus === "delivered") {
        order.isDelivered = true;
        order.deliveredAt = new Date();

        // For COD: mark as paid when delivered
        if (order.paymentMethodType === "cash") {
          order.isPaid = true;
          order.paidAt = new Date();
          order.paymentStatus = "completed";
        }

        // For Card: payment was already authorized, just update delivery
        if (order.paymentMethodType === "card") {
          // Payment status remains 'confirmed' until admin marks it 'completed'
        }
      }

      // If completed (COD collected or card payment settled)
      if (newStatus === "completed") {
        order.isPaid = true;
        order.isDelivered = true;
        order.paymentStatus = "completed";
      }

      await order.save();

      return order;
    } catch (error) {
      console.error("Error updating order status:", error.message);
      throw error;
    }
  }

  // Get tracking info from delivery agency
  static async getTrackingInfo(trackingNumber) {
    try {
      const response = await axios.get(
        `${DELIVERY_API_URL}/parcels/${trackingNumber}`
      );
      return response.data;
    } catch (error) {
      console.error("Error getting tracking info:", error.message);
      throw error;
    }
  }
}

module.exports = DeliveryService;
