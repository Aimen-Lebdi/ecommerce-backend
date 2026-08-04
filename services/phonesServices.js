const expressAsyncHandler = require("express-async-handler");

const User = require("../models/userModel");
const endpointError = require("../utils/endpointError");

// Helper: promote a phone to be the user's single default.
// Two-step so we never leave more than one default in place.
const promoteToDefault = async (userId, phoneId) => {
  // Verify the target phone exists before touching any defaults.
  const targetExists = await User.exists({
    _id: userId,
    "phones._id": phoneId,
  });
  if (!targetExists) return null;

  // Step 1: unset the default flag on every phone.
  await User.updateOne(
    { _id: userId },
    { $set: { "phones.$[].isDefault": false } }
  );
  // Step 2: mark the target phone as the default.
  return User.findOneAndUpdate(
    { _id: userId, "phones._id": phoneId },
    { $set: { "phones.$.isDefault": true } },
    { new: true }
  );
};

// @desc    Add phone to user phones list
// @route   POST /api/phones
// @access  Protected/User
exports.addPhone = expressAsyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  // Dedupe by phone number: $addToSet cannot compare subdocuments (each has
  // its own _id), so skip when the number is already saved.
  const alreadyExists = user.phones.some((p) => p.phone === req.body.phone);

  let updatedUser = user;
  if (!alreadyExists) {
    // The very first saved phone automatically becomes the default.
    const phone = {
      phone: req.body.phone,
      isDefault: user.phones.length === 0,
    };

    // $addToSet => add phone object to user phones array if phone not exist
    updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        $addToSet: { phones: phone },
      },
      { new: true }
    );
  }

  res.status(200).json({
    status: "success",
    message: alreadyExists
      ? "Phone number already exists."
      : "Phone added successfully.",
    data: updatedUser.phones,
  });
  next();
});

// @desc    Update a specific phone in user phones list
// @route   PUT /api/phones/:phoneId
// @access  Protected/User
exports.updatePhone = expressAsyncHandler(async (req, res, next) => {
  // Positional $set => only the matched phone subdocument is updated.
  const setFields = {};
  if (req.body.phone !== undefined) setFields["phones.$.phone"] = req.body.phone;

  let user;
  if (Object.keys(setFields).length > 0) {
    user = await User.findOneAndUpdate(
      { _id: req.user._id, "phones._id": req.params.phoneId },
      { $set: setFields },
      { new: true }
    );
  } else {
    user = await User.findOne({
      _id: req.user._id,
      "phones._id": req.params.phoneId,
    });
  }

  if (!user) {
    return next(
      new endpointError(
        `There is no phone with this ID: ${req.params.phoneId}`,
        404
      )
    );
  }

  // Optional isDefault flag keeps the single-default invariant.
  if (req.body.isDefault !== undefined) {
    if (req.body.isDefault === true) {
      user = await promoteToDefault(req.user._id, req.params.phoneId);
    } else {
      user = await User.findOneAndUpdate(
        { _id: req.user._id, "phones._id": req.params.phoneId },
        { $set: { "phones.$.isDefault": false } },
        { new: true }
      );
    }
  }

  res.status(200).json({
    status: "success",
    message: "Phone updated successfully.",
    data: user.phones,
  });
  next();
});

// @desc    Set a specific phone as the default one
// @route   PATCH /api/phones/:phoneId/default
// @access  Protected/User
exports.setDefaultPhone = expressAsyncHandler(async (req, res, next) => {
  const user = await promoteToDefault(req.user._id, req.params.phoneId);

  if (!user) {
    return next(
      new endpointError(
        `There is no phone with this ID: ${req.params.phoneId}`,
        404
      )
    );
  }

  res.status(200).json({
    status: "success",
    message: "Default phone updated successfully.",
    data: user.phones,
  });
  next();
});

// @desc    Remove phone from user phones list
// @route   DELETE /api/phones/:phoneId
// @access  Protected/User
exports.removePhone = expressAsyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  const removedPhone = user.phones.find(
    (phone) => phone._id.toString() === req.params.phoneId
  );
  const wasDefault = removedPhone ? removedPhone.isDefault : false;

  // $pull => remove phone object from user phones array if phoneId exist
  let updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $pull: { phones: { _id: req.params.phoneId } },
    },
    { new: true }
  );

  // Deleting the default promotes the most recent remaining phone.
  if (wasDefault && updatedUser.phones.length > 0) {
    const lastPhone = updatedUser.phones[updatedUser.phones.length - 1];
    updatedUser = await User.findOneAndUpdate(
      { _id: req.user._id, "phones._id": lastPhone._id },
      { $set: { "phones.$.isDefault": true } },
      { new: true }
    );
  }

  res.status(200).json({
    status: "success",
    message: "Phone removed successfully.",
    data: updatedUser.phones,
  });
  next();
});

// @desc    Get logged user phones list
// @route   GET /api/phones
// @access  Protected/User
exports.getLoggedUserPhones = expressAsyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  res.status(200).json({
    status: "success",
    results: user.phones.length,
    data: user.phones,
  });
  next();
});
