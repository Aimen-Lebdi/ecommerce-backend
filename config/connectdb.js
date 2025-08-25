const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const connectdb = () => {
  mongoose.connect(process.env.MONGO_DB_URI).then(() => {
    console.log("MongoDB connected successfully");
  });
};

module.exports = connectdb;
