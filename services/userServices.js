const factory = require("./handlersFactory");
const User = require("../models/userModel");
const expressAsyncHandler = require("express-async-handler");
const userModel = require("../models/userModel");
const endpointError = require("../utils/endpointError");
const bcrypt = require("bcryptjs");
const { uploadSingleImage } = require("../middlewares/uploadImageMiddleware");
const ActivityLogger = require("../socket/activityLogger");

// Upload to Cloudinary 'users' folder
const uploadUserImage = uploadSingleImage("image", "users");

// No need for sharp anymore - Cloudinary handles it!
const resizeUserImage = expressAsyncHandler(async (req, res, next) => {
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
      profileImg: req.body.profileImg,
      active: req.body.active,
      role: req.body.role,
      image: req.body.image,
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
  const updatedUserPassword = await User.findByIdAndUpdate(
    req.params.id,
    {
      password: await bcrypt.hash(req.body.password, 12),
      passwordChangedAt: Date.now(),
    },
    { new: true }
  );

  if (!updatedUserPassword) {
    return next(new endpointError(`there is no user with this ID format`, 404));
  }

  // Log activity
  if (req.user) {
    await ActivityLogger.logUserActivity(
      "passwordChange",
      updatedUserPassword,
      req.user
    );
  }

  res.status(200).json({ data: updatedUserPassword });
});

const deleteUser = expressAsyncHandler(async (req, res, next) => {
  const userToDeactivate = await User.findById(req.params.id);

  if (!userToDeactivate) {
    return next(new endpointError(`There is no user with this ID`, 404));
  }

  const deactivatedUser = await User.findByIdAndUpdate(
    req.params.id,
    { active: false },
    { new: true }
  );

  // Log activity
  if (req.user) {
    await ActivityLogger.logUserActivity("delete", deactivatedUser, req.user);
  }

  res.status(200).json({
    status: "Success",
    message: "User deactivated successfully",
    data: deactivatedUser,
  });
});

const deleteManyUsers = expressAsyncHandler(async (req, res, next) => {
  const { ids } = req.body;

  if (!ids || !Array.isArray(ids) || ids.length === 0) {
    return next(new endpointError("Please provide an array of user IDs", 400));
  }

  const result = await User.updateMany(
    { _id: { $in: ids } },
    { active: false }
  );

  // Log activity
  if (req.user) {
    await ActivityLogger.logBulkDeactivateActivity(
      result.modifiedCount,
      ids,
      req.user
    );
  }

  res.status(200).json({
    status: "Success",
    message: `${result.modifiedCount} user(s) deactivated successfully`,
    data: {
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
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

  const result = await User.updateMany(
    { _id: { $in: ids } },
    { active: true }
  );

  // Log activity
  if (req.user) {
    await ActivityLogger.logBulkActivateActivity(
      result.modifiedCount,
      ids,
      req.user
    );
  }

  res.status(200).json({
    status: "Success",
    message: `${result.modifiedCount} user(s) activated successfully`,
    data: {
      modifiedCount: result.modifiedCount,
      matchedCount: result.matchedCount,
    },
  });
});

// User endpoints
const getLoggedUserData = expressAsyncHandler(async (req, res, next) => {
  req.params.id = req.user._id;
  next();
});

const updateLoggedUserPassword = expressAsyncHandler(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    {
      password: await bcrypt.hash(req.body.password, 12),
      passwordChangedAt: Date.now(),
    },
    {
      new: true,
    }
  );

  const token = createToken(user._id);

  res.status(200).json({ data: user, token });
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

const deleteLoggedUserData = expressAsyncHandler(async (req, res, next) => {
  const deactivatedUser = await userModel.findByIdAndUpdate(req.user._id, {
    active: false,
  });

  // Log activity - user deactivated their own account
  if (req.user) {
    await ActivityLogger.logUserActivity("delete", deactivatedUser, req.user, {
      selfDeactivation: true,
      reason: "User deactivated their own account",
    });
  }

  res.status(204).json({ status: "Success" });
});

module.exports = {
  createUser,
  getAllUsers,
  getOneUser,
  updateUser,
  updateUserPassword,
  deleteUser,
  deleteManyUsers,
  activateUser,
  activateManyUsers,
  getLoggedUserData,
  updateLoggedUserPassword,
  updateLoggedUserData,
  deleteLoggedUserData,
  uploadUserImage,
  resizeUserImage,
};