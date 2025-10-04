const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = mongoose.Schema(
  {
    name: {
      type: String,
      validate: {
        validator: (v) => typeof v === "string",
        message: "Name must be a string",
      },
      required: [true, "Name is required"],
      trim: true,
    },
    slug: {
      type: String,
      validate: {
        validator: (v) => typeof v === "string",
        message: "Slug must be a string",
      },
      lowercase: true,
    },
    email: {
      type: String,
      validate: {
        validator: (v) =>
          /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v),
        message: "Please enter a valid email",
      },
      required: [true, "Email is required"],
      unique: [true, "Email must be unique"],
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      validate: {
        validator: (v) => typeof v === "string",
        message: "Password must be a string",
      },
      required: [true, "Password is required"],
      min: [6, "Password must be at least 6 characters"],
      trim: true,
    },
    passwordChangedAt: {
      type: Date,
      validate: {
        validator: (v) => v instanceof Date,
        message: "Password changed at must be a date",
      },
    },
    passwordResetCode: {
      type: String,
      validate: {
        validator: (v) => typeof v === "string",
        message: "Password reset code must be a string",
      },
    },
    passwordResetExpires: {
      type: Date,
      validate: {
        validator: (v) => v instanceof Date,
        message: "Password reset expires must be a date",
      },
    },
    passwordResetVerified: {
      type: Boolean,
      validate: {
        validator: (v) => typeof v === "boolean",
        message: "Password reset verified must be a boolean",
      },
      default: false,
    },
    role: {
      type: String,
      validate: {
        validator: (v) => typeof v === "string",
        message: "Role must be a string",
      },
      enum: ["user", "admin"],
      default: "user",
    },
    active: {
      type: Boolean,
      validate: {
        validator: (v) => typeof v === "boolean",
        message: "Active must be a boolean",
      },
      default: true,
    },
    image: String,

    // child reference (one to many)
    wishlist: [
      {
        type: mongoose.Schema.ObjectId,
        ref: "Product",
      },
    ],
    addresses: [
      {
        id: { type: mongoose.Schema.Types.ObjectId },
        wilaya: String,
        dayra: String,
        details: String,
        phone: String,
      },
    ],
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10); // Here you would typically hash the password
  next();
});

const setImageURL = (doc) => {
  if (doc.image) {
    const imageUrl = `${process.env.BASE_URL}/users/${doc.image}`;
    doc.image = imageUrl;
  }
};
// findOne, findAll and update
userSchema.post("init", (doc) => {
  setImageURL(doc);
});

// create
userSchema.post("save", (doc) => {
  setImageURL(doc);
});

const userModel = mongoose.model("User", userSchema);

module.exports = userModel;
