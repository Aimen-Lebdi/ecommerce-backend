const expressAsyncHandler = require("express-async-handler");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const userModel = require("../models/userModel");
const { createToken } = require("../utils/createToken");
const endpointError = require("../utils/endpointError");
const  sendEmail  = require("../utils/sendEmail");

exports.signUp = expressAsyncHandler(async (req, res, next) => {
  const user = await userModel.create({
    name: req.body.name,
    email: req.body.email,
    password: req.body.password,
  });

  const token = createToken(user._id);

  res.status(201).json({ data: user, token });
  next();
});

exports.signIn = expressAsyncHandler(async (req, res, next) => {
  const user = await userModel.findOne({
    email: req.body.email,
  });

  if (!user || !(await bcrypt.compare(req.body.password, user.password))) {
    return next(new Error("Invalid email or password"));
  }

  const token = createToken(user._id);

  delete user._doc.password;

  res.status(200).json({ data: user, token });
  next();
});

exports.protectRoute = expressAsyncHandler(async (req, res, next) => {
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return next(new Error("Not authorized"));
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET_KEY);

  const currentUser = await userModel.findById(decoded.userId);

  if (!currentUser) {
    return next(new endpointError("User not found", 404));
  }
  let passToTimeStamp;
  if (currentUser.passwordChangedAt) {
    passToTimeStamp = parseInt(
      currentUser.passwordChangedAt.getTime() / 1000,
      10
    );
  }

  if (passToTimeStamp > decoded.iat) {
    return next(
      new endpointError(
        "User recently changed password, please log in again",
        401
      )
    );
  }

  req.user = currentUser;
  next();
});

exports.allowTo = (...roles) => {
  return expressAsyncHandler(async (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(
        new Error("You do not have permission to perform this action")
      );
    }

    next();
  });
};

exports.forgotPassword = expressAsyncHandler(async (req, res, next) => {
  // 1) Get user by email
  const user = await userModel.findOne({ email: req.body.email });
  if (!user) {
    return next(
      new endpointError(
        `There is no user with that email ${req.body.email}`,
        404
      )
    );
  }
  // 2) If user exist, Generate hash reset random 6 digits and save it in db
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedResetCode = crypto
    .createHash("sha256")
    .update(resetCode)
    .digest("hex");

  // Save hashed password reset code into db
  user.passwordResetCode = hashedResetCode;
  // Add expiration time for password reset code (10 min)
  user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
  user.passwordResetVerified = false;

  await user.save();

  // 3) Send the reset code via email
  const message = `Your reset code is ${resetCode}`;
  const htmlMessage = `
  <div style="font-family: Arial, sans-serif; line-height: 1.6;">
    <p>Hi ${user.name},</p>
    <p>We received a request to reset the password on your E-shop Account.</p>
    <p style="font-size: 24px; font-weight: bold; color: #333; background-color: #f2f2f2; padding: 10px; border-radius: 5px; text-align: center;">${resetCode}</p>
    <p>Enter this code to complete the reset. This code is valid for 10 minutes.</p>
    <p>Thanks for helping us keep your account secure.</p>
    <p>The E-shop Team</p>
  </div>
`;
  try {
    await sendEmail({
      email: user.email,
      subject: "Your password reset code (valid for 10 min)",
      message,
      html: htmlMessage, // <-- Pass the HTML message here
    });
  } catch (err) {
    user.passwordResetCode = undefined;
    user.passwordResetExpires = undefined;
    user.passwordResetVerified = undefined;

    await user.save();
    return next(new endpointError(err, 500));
  }

  res
    .status(200)
    .json({ status: "Success", message: "Reset code sent to email" });
});

exports.verifyPassResetCode = expressAsyncHandler(async (req, res, next) => {
  // 1) Get user based on reset code
  const hashedResetCode = crypto
    .createHash("sha256")
    .update(req.body.resetCode)
    .digest("hex");

  const user = await userModel.findOne({
    passwordResetCode: hashedResetCode,
    passwordResetExpires: { $gt: Date.now() },
  });
  if (!user) {
    return next(new endpointError("Reset code invalid or expired"));
  }

  // 2) Reset code valid
  user.passwordResetVerified = true;
  await user.save();

  res.status(200).json({
    status: "Success",
  });
});

exports.resetPassword = expressAsyncHandler(async (req, res, next) => {
  // 1) Get user based on email
  const user = await userModel.findOne({ email: req.body.email });
  if (!user) {
    return next(
      new endpointError(`There is no user with email ${req.body.email}`, 404)
    );
  }

  // 2) Check if reset code verified
  if (!user.passwordResetVerified) {
    return next(new endpointError("Reset code not verified", 400));
  }

  user.password = await bcrypt.hash(req.body.newPassword, 12);
  user.passwordResetCode = undefined;
  user.passwordResetExpires = undefined;
  user.passwordResetVerified = undefined;

  await user.save();

  // 3) if everything is ok, generate token
  const token = createToken(user._id);
  res.status(200).json({ token });
});
