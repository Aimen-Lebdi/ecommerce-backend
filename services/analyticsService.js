const mongoose = require("mongoose");
const orderModel = require("../models/orderModel");
const userModel = require("../models/userModel");
const productModel = require("../models/productModel");

/**
 * Calculate total revenue from orders
 * @param {Date} startDate - Start date for filtering
 * @param {Date} endDate - End date for filtering
 * @returns {Object} Total revenue and percentage change
 */
const calculateTotalRevenue = async (startDate = null, endDate = null) => {
  try {
    const currentPeriodQuery = {
      paymentStatus: { $in: ["confirmed", "completed"] },
    };

    if (startDate && endDate) {
      currentPeriodQuery.createdAt = { $gte: startDate, $lte: endDate };
    }

    // Current period revenue
    const currentRevenue = await orderModel.aggregate([
      { $match: currentPeriodQuery },
      {
        $group: {
          _id: null,
          total: { $sum: "$totalOrderPrice" },
        },
      },
    ]);

    const currentTotal = currentRevenue.length > 0 ? currentRevenue[0].total : 0;

    // Previous period for comparison (same duration)
    let percentageChange = 0;
    if (startDate && endDate) {
      const duration = endDate - startDate;
      const previousStartDate = new Date(startDate.getTime() - duration);
      const previousEndDate = new Date(startDate.getTime());

      const previousRevenue = await orderModel.aggregate([
        {
          $match: {
            paymentStatus: { $in: ["confirmed", "completed"] },
            createdAt: { $gte: previousStartDate, $lt: previousEndDate },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$totalOrderPrice" },
          },
        },
      ]);

      const previousTotal = previousRevenue.length > 0 ? previousRevenue[0].total : 0;

      if (previousTotal > 0) {
        percentageChange = ((currentTotal - previousTotal) / previousTotal) * 100;
      } else if (currentTotal > 0) {
        percentageChange = 100;
      }
    }

    return {
      total: currentTotal,
      percentageChange: parseFloat(percentageChange.toFixed(2)),
      trend: percentageChange >= 0 ? "up" : "down",
    };
  } catch (error) {
    throw new Error(`Error calculating total revenue: ${error.message}`);
  }
};

/**
 * Calculate new customers count
 * @param {Date} startDate - Start date for filtering
 * @param {Date} endDate - End date for filtering
 * @returns {Object} New customers count and percentage change
 */
const calculateNewCustomers = async (startDate = null, endDate = null) => {
  try {
    const currentPeriodQuery = { role: "user" };

    if (startDate && endDate) {
      currentPeriodQuery.createdAt = { $gte: startDate, $lte: endDate };
    }

    // Current period customers
    const currentCount = await userModel.countDocuments(currentPeriodQuery);

    // Previous period for comparison
    let percentageChange = 0;
    if (startDate && endDate) {
      const duration = endDate - startDate;
      const previousStartDate = new Date(startDate.getTime() - duration);
      const previousEndDate = new Date(startDate.getTime());

      const previousCount = await userModel.countDocuments({
        role: "user",
        createdAt: { $gte: previousStartDate, $lt: previousEndDate },
      });

      if (previousCount > 0) {
        percentageChange = ((currentCount - previousCount) / previousCount) * 100;
      } else if (currentCount > 0) {
        percentageChange = 100;
      }
    }

    return {
      total: currentCount,
      percentageChange: parseFloat(percentageChange.toFixed(2)),
      trend: percentageChange >= 0 ? "up" : "down",
    };
  } catch (error) {
    throw new Error(`Error calculating new customers: ${error.message}`);
  }
};

/**
 * Calculate total orders
 * @param {Date} startDate - Start date for filtering
 * @param {Date} endDate - End date for filtering
 * @returns {Object} Total orders count and percentage change
 */
const calculateTotalOrders = async (startDate = null, endDate = null) => {
  try {
    const currentPeriodQuery = {};

    if (startDate && endDate) {
      currentPeriodQuery.createdAt = { $gte: startDate, $lte: endDate };
    }

    // Current period orders
    const currentCount = await orderModel.countDocuments(currentPeriodQuery);

    // Previous period for comparison
    let percentageChange = 0;
    if (startDate && endDate) {
      const duration = endDate - startDate;
      const previousStartDate = new Date(startDate.getTime() - duration);
      const previousEndDate = new Date(startDate.getTime());

      const previousCount = await orderModel.countDocuments({
        createdAt: { $gte: previousStartDate, $lt: previousEndDate },
      });

      if (previousCount > 0) {
        percentageChange = ((currentCount - previousCount) / previousCount) * 100;
      } else if (currentCount > 0) {
        percentageChange = 100;
      }
    }

    return {
      total: currentCount,
      percentageChange: parseFloat(percentageChange.toFixed(2)),
      trend: percentageChange >= 0 ? "up" : "down",
    };
  } catch (error) {
    throw new Error(`Error calculating total orders: ${error.message}`);
  }
};

/**
 * Get top selling product
 * @param {Date} startDate - Start date for filtering
 * @param {Date} endDate - End date for filtering
 * @returns {Object} Top product details
 */
const getTopProduct = async (startDate = null, endDate = null) => {
  try {
    const matchQuery = {
      paymentStatus: { $in: ["confirmed", "completed"] },
    };

    if (startDate && endDate) {
      matchQuery.createdAt = { $gte: startDate, $lte: endDate };
    }

    const topProducts = await orderModel.aggregate([
      { $match: matchQuery },
      { $unwind: "$cartItems" },
      {
        $group: {
          _id: "$cartItems.product",
          totalQuantity: { $sum: "$cartItems.quantity" },
          totalRevenue: { $sum: { $multiply: ["$cartItems.quantity", "$cartItems.price"] } },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 1 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: { path: "$productDetails", preserveNullAndEmptyArrays: true } },
    ]);

    if (topProducts.length === 0) {
      return {
        name: "No sales yet",
        totalQuantity: 0,
        totalRevenue: 0,
        percentageChange: 0,
        trend: "neutral",
      };
    }

    const topProduct = topProducts[0];

    // Calculate percentage change
    let percentageChange = 0;
    if (startDate && endDate) {
      const duration = endDate - startDate;
      const previousStartDate = new Date(startDate.getTime() - duration);
      const previousEndDate = new Date(startDate.getTime());

      const previousTopProduct = await orderModel.aggregate([
        {
          $match: {
            paymentStatus: { $in: ["confirmed", "completed"] },
            createdAt: { $gte: previousStartDate, $lt: previousEndDate },
          },
        },
        { $unwind: "$cartItems" },
        {
          $match: {
            "cartItems.product": topProduct._id,
          },
        },
        {
          $group: {
            _id: "$cartItems.product",
            totalQuantity: { $sum: "$cartItems.quantity" },
          },
        },
      ]);

      const previousQuantity = previousTopProduct.length > 0 ? previousTopProduct[0].totalQuantity : 0;

      if (previousQuantity > 0) {
        percentageChange = ((topProduct.totalQuantity - previousQuantity) / previousQuantity) * 100;
      } else if (topProduct.totalQuantity > 0) {
        percentageChange = 100;
      }
    }

    return {
      productId: topProduct._id,
      name: topProduct.productDetails?.name || "Unknown Product",
      totalQuantity: topProduct.totalQuantity,
      totalRevenue: topProduct.totalRevenue,
      percentageChange: parseFloat(percentageChange.toFixed(2)),
      trend: percentageChange >= 0 ? "up" : "down",
    };
  } catch (error) {
    throw new Error(`Error getting top product: ${error.message}`);
  }
};

/**
 * Get growth rate data for charts
 * @param {Number} days - Number of days (7, 30, or 90)
 * @returns {Array} Daily growth data
 */
const getGrowthRateData = async (days = 90) => {
  try {
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const dailyData = await orderModel.aggregate([
      {
        $match: {
          paymentStatus: { $in: ["confirmed", "completed"] },
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
          },
          desktop: { $sum: "$totalOrderPrice" },
        },
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          _id: 0,
          date: "$_id",
          desktop: { $round: ["$desktop", 0] },
        },
      },
    ]);

    // Fill in missing dates with 0 values
    const result = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split("T")[0];
      const existingData = dailyData.find((d) => d.date === dateStr);

      result.push({
        date: dateStr,
        desktop: existingData ? existingData.desktop : 0,
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  } catch (error) {
    throw new Error(`Error getting growth rate data: ${error.message}`);
  }
};

/**
 * Get best orders (highest value orders)
 * @param {Number} limit - Number of orders to return
 * @returns {Array} Best orders
 */
const getBestOrders = async (limit = 5) => {
  try {
    const orders = await orderModel
      .find({
        paymentStatus: { $in: ["confirmed", "completed"] },
      })
      .sort({ totalOrderPrice: -1 })
      .limit(limit)
      .select("_id user totalOrderPrice createdAt")
      .populate("user", "name")
      .lean();

    return orders.map((order) => ({
      id: order._id.toString().substring(18, 24).toUpperCase(),
      customer: order.user?.name || "Unknown",
      total: `$${order.totalOrderPrice.toFixed(2)}`,
      date: order.createdAt.toISOString().split("T")[0],
    }));
  } catch (error) {
    throw new Error(`Error getting best orders: ${error.message}`);
  }
};

/**
 * Get top customers by revenue
 * @param {Number} limit - Number of customers to return
 * @returns {Array} Top customers
 */
const getTopCustomers = async (limit = 5) => {
  try {
    const topCustomers = await orderModel.aggregate([
      {
        $match: {
          paymentStatus: { $in: ["confirmed", "completed"] },
        },
      },
      {
        $group: {
          _id: "$user",
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: "$totalOrderPrice" },
        },
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      { $unwind: { path: "$userDetails", preserveNullAndEmptyArrays: true } },
    ]);

    return topCustomers.map((customer) => ({
      name: customer.userDetails?.name || "Unknown",
      products: customer.totalOrders,
      revenue: `$${customer.totalRevenue.toFixed(2)}`,
    }));
  } catch (error) {
    throw new Error(`Error getting top customers: ${error.message}`);
  }
};

/**
 * Get best selling products
 * @param {Number} limit - Number of products to return
 * @returns {Array} Best products
 */
const getBestProducts = async (limit = 5) => {
  try {
    const bestProducts = await orderModel.aggregate([
      {
        $match: {
          paymentStatus: { $in: ["confirmed", "completed"] },
        },
      },
      { $unwind: "$cartItems" },
      {
        $group: {
          _id: "$cartItems.product",
          sold: { $sum: "$cartItems.quantity" },
          revenue: { $sum: { $multiply: ["$cartItems.quantity", "$cartItems.price"] } },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: { path: "$productDetails", preserveNullAndEmptyArrays: true } },
    ]);

    return bestProducts.map((product) => ({
      name: product.productDetails?.name || "Unknown Product",
      sold: product.sold,
      revenue: `$${product.revenue.toFixed(2)}`,
    }));
  } catch (error) {
    throw new Error(`Error getting best products: ${error.message}`);
  }
};

/**
 * Get all dashboard analytics data
 * @returns {Object} Complete dashboard data
 */
const getDashboardAnalytics = async () => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [revenue, customers, orders, topProduct] = await Promise.all([
      calculateTotalRevenue(thirtyDaysAgo, now),
      calculateNewCustomers(thirtyDaysAgo, now),
      calculateTotalOrders(thirtyDaysAgo, now),
      getTopProduct(thirtyDaysAgo, now),
    ]);

    return {
      cards: {
        revenue,
        customers,
        orders,
        topProduct,
      },
    };
  } catch (error) {
    throw new Error(`Error getting dashboard analytics: ${error.message}`);
  }
};

/**
 * Get all dashboard tables data
 * @returns {Object} All tables data
 */
const getDashboardTables = async () => {
  try {
    const [bestOrders, topCustomers, bestProducts] = await Promise.all([
      getBestOrders(5),
      getTopCustomers(5),
      getBestProducts(5),
    ]);

    return {
      bestOrders,
      topCustomers,
      bestProducts,
    };
  } catch (error) {
    throw new Error(`Error getting dashboard tables: ${error.message}`);
  }
};

module.exports = {
  calculateTotalRevenue,
  calculateNewCustomers,
  calculateTotalOrders,
  getTopProduct,
  getGrowthRateData,
  getBestOrders,
  getTopCustomers,
  getBestProducts,
  getDashboardAnalytics,
  getDashboardTables,
};