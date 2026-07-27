const factory = require("./handlersFactory");
const User = require("../models/userModel");
const expressAsyncHandler = require("express-async-handler");
const endpointError = require("../utils/endpointError");
const sendEmail = require("../utils/sendEmail");
const { createAccessToken } = require("./authServices");
const { uploadSingleImage } = require("../middlewares/uploadImageMiddleware");
const ActivityLogger = require("../socket/activityLogger");

// Upload to Cloudinary 'users' folder
const uploadUserImage = uploadSingleImage("image", "users");

// No need for sharp anymore - Cloudinary handles it!
const processUserImage = expressAsyncHandler(async (req, res, next) => {
  if (req.file) {
    // Cloudinary automatically uploads and returns the full URL
    req.body.image = req.file.path; // This is the Cloudinary URL
  }
  next();
});

const createUser = factory.createOne(User);
const getAllUsers = factory.getAll(User, ["name"]);
const getOneUser = factory.getOne(User);
const updateUser = expressAsyncHandler(async (req, res, next) => {
  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    {
      name: req.body.name,
      slug: req.body.slug,
      email: req.body.email,
      active: req.body.active,
      role: req.body.role,
      image: req.body.image,
      phone: req.body.phone,
    },
    { new: true }
  );

  if (!updatedUser) {
    return next(new endpointError(`there is no user with this ID format`, 404));
  }

  // Log activity
  if (req.user) {
    const originalUser = await User.findById(req.params.id);
    await ActivityLogger.logUserActivity("update", updatedUser, req.user, {
      changes: `User profile updated by admin`,
    });
  }

  res.status(200).json({ data: updatedUser });
});

const updateUserPassword = expressAsyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id).select("+password");

  if (!user) {
    return next(new endpointError(`there is no user with this ID format`, 404));
  }

  // Assign plain text — pre("save") hook will hash automatically
  user.password = req.body.password;
  user.passwordChangedAt = Date.now() - 1000;
  await user.save();

  // Log activity
  if (req.user) {
    await ActivityLogger.logUserActivity(
      "passwordChange",
      user,
      req.user
    );
  }

  // Strip password from response
  const userResponse = user.toObject();
  delete userResponse.password;
  res.status(200).json({ data: userResponse });
});

const banUser = expressAsyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new endpointError(`There is no user with this ID`, 404));
  }

  if (user.role === "admin") {
    return next(new endpointError(`Cannot ban an admin user`, 403));
  }

  if (user.active === false) {
    return next(new endpointError(`User is already banned`, 400));
  }

  const bannedUser = await User.findByIdAndUpdate(
    req.params.id,
    {
      active: false,
      passwordChangedAt: Date.now(),
    },
    { new: true }
  );

  // Send ban notification email
  try {
    await sendEmail({
      email: bannedUser.email,
      subject: `Your account has been suspended`,
      html: `<h1>Hello ${bannedUser.name}</h1><p>Your account has been suspended by an administrator.</p><p>If you believe this is a mistake, please contact our support team.</p>`,
    });
  } catch (err) {
    // Email failure should not block the ban operation
  }

  // Log activity
  if (req.user) {
    await ActivityLogger.logUserActivity("ban", bannedUser, req.user, {
      reason: "No reason provided",
      changes: "Account suspended by admin",
    });
  }

  res.status(200).json({
    status: "Success",
    message: "User banned successfully",
    data: bannedUser,
  });
});

const unbanUser = expressAsyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(new endpointError(`There is no user with this ID`, 404));
  }

  if (user.active === true) {
    return next(new endpointError(`User is not banned`, 400));
  }

  const unbannedUser = await User.findByIdAndUpdate(
    req.params.id,
    {
      active: true,
    },
    { new: true }
  );

  // Send unban notification email
  try {
    await sendEmail({
      email: unbannedUser.email,
      subject: `Your account has been reactivated`,
      html: `<h1>Hello ${unbannedUser.name}</h1><p>Your account has been reactivated.</p><p>You can now log in and continue using our services.</p>`,
    });
  } catch (err) {
    // Email failure should not block the unban operation
  }

  // Log activity
  if (req.user) {
    await ActivityLogger.logUserActivity("unban", unbannedUser, req.user);
  }

  res.status(200).json({
    status: "Success",
    message: "User unbanned successfully",
    data: unbannedUser,
  });
});

const banManyUsers = expressAsyncHandler(async (req, res, next) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return next(new endpointError("Please provide an array of user IDs", 400));
  }

  const bannedUsers = [];
  const skippedUsers = [];
  const notFoundIds = [];

  for (const id of ids) {
    const user = await User.findById(id);

    if (!user) {
      notFoundIds.push(id);
      continue;
    }

    if (user.role === "admin") {
      skippedUsers.push({ id: user._id, name: user.name, reason: "Cannot ban an admin user" });
      continue;
    }

    if (user.active === false) {
      skippedUsers.push({ id: user._id, name: user.name, reason: "User is already banned" });
      continue;
    }

    const bannedUser = await User.findByIdAndUpdate(
      id,
      { active: false, passwordChangedAt: Date.now() },
      { new: true }
    );

    // Send ban notification email (non-blocking)
    try {
      await sendEmail({
        email: bannedUser.email,
        subject: `Your account has been suspended`,
        html: `<h1>Hello ${bannedUser.name}</h1><p>Your account has been suspended by an administrator.</p><p>If you believe this is a mistake, please contact our support team.</p>`,
      });
    } catch (err) {
      // Email failure should not block the ban operation
    }

    bannedUsers.push({ id: bannedUser._id, name: bannedUser.name, email: bannedUser.email });
  }

  // Log activity
  if (req.user && bannedUsers.length > 0) {
    await ActivityLogger.logBulkDeactivateActivity(
      bannedUsers.length,
      bannedUsers.map((u) => u.id),
      req.user
    );
  }

  res.status(200).json({
    status: "Success",
    message: `${bannedUsers.length} user(s) banned successfully`,
    data: {
      bannedCount: bannedUsers.length,
      bannedUsers,
      skippedUsers,
      notFoundIds,
    },
  });
});

const activateUser = expressAsyncHandler(async (req, res, next) => {
  const userToActivate = await User.findById(req.params.id);

  if (!userToActivate) {
    return next(new endpointError(`There is no user with this ID`, 404));
  }

  const activatedUser = await User.findByIdAndUpdate(
    req.params.id,
    { active: true },
    { new: true }
  );

  // Log activity
  if (req.user) {
    await ActivityLogger.logUserActivity("activate", activatedUser, req.user);
  }

  res.status(200).json({
    status: "Success",
    message: "User activated successfully",
    data: activatedUser,
  });
});

const activateManyUsers = expressAsyncHandler(async (req, res, next) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return next(new endpointError("Please provide an array of user IDs", 400));
  }

  const activatedUsers = [];
  const skippedUsers = [];
  const notFoundIds = [];

  for (const id of ids) {
    const user = await User.findById(id);
    if (!user) {
      notFoundIds.push(id);
      continue;
    }
    if (user.active === true) {
      skippedUsers.push({ id: user._id, name: user.name, reason: "User is already active" });
      continue;
    }
    const activatedUser = await User.findByIdAndUpdate(
      id,
      { active: true },
      { new: true }
    );
    activatedUsers.push({ id: activatedUser._id, name: activatedUser.name, email: activatedUser.email });
  }

  if (req.user && activatedUsers.length > 0) {
    await ActivityLogger.logBulkActivateActivity(
      activatedUsers.length,
      activatedUsers.map((u) => u.id),
      req.user
    );
  }

  res.status(200).json({
    status: "Success",
    message: `${activatedUsers.length} user(s) activated successfully`,
    data: { activatedCount: activatedUsers.length, activatedUsers, skippedUsers, notFoundIds },
  });
});

// User endpoints
const getLoggedUserData = expressAsyncHandler(async (req, res, next) => {
  req.params.id = req.user._id;
  next();
});

const updateLoggedUserPassword = expressAsyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id).select("+password");

  // Assign plain text — pre("save") hook will hash automatically
  user.password = req.body.password;
  user.passwordChangedAt = Date.now() - 1000;
  await user.save();

  const accessToken = createAccessToken(user._id);

  // Strip password from response
  const userResponse = user.toObject();
  delete userResponse.password;
  res.status(200).json({ data: userResponse, accessToken });
});

const updateLoggedUserData = expressAsyncHandler(async (req, res, next) => {
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      name: req.body.name,
      image: req.body.image,
    },
    { new: true }
  );

  res.status(200).json({ data: updatedUser });
});

module.exports = {
  createUser,
  getAllUsers,
  getOneUser,
  updateUser,
  updateUserPassword,
  banManyUsers,
  activateUser,
  activateManyUsers,
  banUser,
  unbanUser,
  getLoggedUserData,
  updateLoggedUserPassword,
  updateLoggedUserData,
  uploadUserImage,
  processUserImage,
};