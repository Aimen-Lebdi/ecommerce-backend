const ActivityLog = require("../models/activityLogModel");
const socketInstance = require("../utils/socketEmitter");

class ActivityLogger {
  static async logActivity({
    type,
    activity,
    user,
    description,
    status = "success",
    amount = null,
    relatedId,
    relatedModel,
    metadata = {},
  }) {
    try {
      // Create activity log in database
      const activityLog = await ActivityLog.create({
        type,
        activity,
        user: {
          name: user.name,
          id: user._id,
          role: user.role,
        },
        description,
        status,
        amount,
        relatedId,
        relatedModel,
        metadata,
      });

      // Format data for real-time emission
      const activityData = {
        _id: activityLog._id,
        type: activityLog.type,
        activity: activityLog.activity,
        user: activityLog.user,
        description: activityLog.description,
        status: activityLog.status,
        amount: activityLog.amount,
        createdAt: activityLog.createdAt,
        metadata: activityLog.metadata,
      };

      // Emit to dashboard (admins only)
      if (socketInstance.getSocket()) {
        socketInstance
          .getSocket()
          .emitToDashboard("new_activity", activityData);

        // Also emit to all admins
        socketInstance
          .getSocket()
          .emitToAdmins("activity_update", activityData);
      }

      return activityLog;
    } catch (error) {
      console.error("Error logging activity:", error);
      return null;
    }
  }

  // Specific methods for different activity types
  static async logCategoryActivity(
    action,
    category,
    user,
    additionalData = {}
  ) {
    const activities = {
      create: "Category Created",
      update: "Category Updated",
      delete: "Category Deleted",
    };

    const descriptions = {
      create: `New category "${category.name}" created`,
      update: `Category "${category.name}" updated${
        additionalData.changes ? ` - ${additionalData.changes}` : ""
      }`,
      delete: `Category "${category.name}" deleted`,
    };

    return await ActivityLogger.logActivity({
      type: "category",
      activity: activities[action],
      user,
      description: descriptions[action],
      relatedId: category._id,
      relatedModel: "Category",
      metadata: {
        categoryName: category.name,
        categorySlug: category.slug,
        ...additionalData,
      },
    });
  }

  static async logProductActivity(action, product, user, additionalData = {}) {
    const activities = {
      create: "Product Created",
      update: "Product Updated",
      delete: "Product Deleted",
    };

    const descriptions = {
      create: `New product "${product.title}" created`,
      update: `Product "${product.title}" updated${
        additionalData.changes ? ` - ${additionalData.changes}` : ""
      }`,
      delete: `Product "${product.title}" deleted`,
    };

    return await ActivityLogger.logActivity({
      type: "product",
      activity: activities[action],
      user,
      description: descriptions[action],
      amount: product.price || null,
      relatedId: product._id,
      relatedModel: "Product",
      metadata: {
        productTitle: product.title,
        productPrice: product.price,
        productQuantity: product.quantity,
        ...additionalData,
      },
    });
  }

  static async logOrderActivity(action, order, user, additionalData = {}) {
    const activities = {
      create: "New Order Placed",
      update: "Order Updated",
      cancel: "Order Cancelled",
    };

    const descriptions = {
      create: `New order #${order._id.toString().slice(-8)} placed`,
      update: `Order #${order._id.toString().slice(-8)} updated${
        additionalData.changes ? ` - ${additionalData.changes}` : ""
      }`,
      cancel: `Order #${order._id.toString().slice(-8)} cancelled`,
    };

    return await ActivityLogger.logActivity({
      type: "order",
      activity: activities[action],
      user,
      description: descriptions[action],
      amount: order.totalOrderPrice || order.totalPrice,
      relatedId: order._id,
      relatedModel: "Order",
      metadata: {
        orderId: order._id,
        totalAmount: order.totalOrderPrice || order.totalPrice,
        status: order.status,
        ...additionalData,
      },
    });
  }

  static async logUserActivity(
    action,
    targetUser,
    adminUser,
    additionalData = {}
  ) {
    const activities = {
      register: "User Registered",
      update: "User Updated",
      delete: "User Deleted",
    };

    const descriptions = {
      register: `User "${targetUser.name}" registered`,
      update: `User "${targetUser.name}" updated${
        additionalData.changes ? ` - ${additionalData.changes}` : ""
      }`,
      delete: `User "${targetUser.name}" deleted`,
    };

    return await ActivityLogger.logActivity({
      type: "user",
      activity: activities[action],
      user: adminUser,
      description: descriptions[action],
      relatedId: targetUser._id,
      relatedModel: "User",
      metadata: {
        targetUserName: targetUser.name,
        targetUserEmail: targetUser.email,
        targetUserRole: targetUser.role,
        ...additionalData,
      },
    });
  }
}

module.exports = ActivityLogger;