const expressAsyncHandler = require("express-async-handler");

const User = require("../models/userModel");
const endpointError = require("../utils/endpointError");

// Helper: promote an address to be the user's single default.
// Two-step so we never leave more than one default in place.
const promoteToDefault = async (userId, addressId) => {
  // Verify the target address exists before touching any defaults.
  const targetExists = await User.exists({
    _id: userId,
    "addresses._id": addressId,
  });
  if (!targetExists) return null;

  // Step 1: unset the default flag on every address.
  await User.updateOne(
    { _id: userId },
    { $set: { "addresses.$[].isDefault": false } }
  );
  // Step 2: mark the target address as the default.
  return User.findOneAndUpdate(
    { _id: userId, "addresses._id": addressId },
    { $set: { "addresses.$.isDefault": true } },
    { new: true }
  );
};

// @desc    Add address to user addresses list
// @route   POST /api/v1/addresses
// @access  Protected/User
exports.addAddress = expressAsyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  // Dedupe by the full wilaya/dayra/baladiya combo: $addToSet cannot compare
  // subdocuments (each has its own _id), so skip when the same address is
  // already saved. Legacy rows (old {details, phone} shape) carry no
  // wilaya/dayra/baladiya, so they never match and are left untouched.
  const alreadyExists = user.addresses.some(
    (a) =>
      a.wilaya === req.body.wilaya &&
      a.dayra === req.body.dayra &&
      a.baladiya === req.body.baladiya
  );

  // Labels are unique per type, case-insensitive. Legacy rows (no label) are
  // skipped so they never block a new entry.
  const labelCollision = user.addresses.some(
    (a) => a.label && a.label.toLowerCase() === req.body.label.toLowerCase()
  );
  if (labelCollision) {
    return next(
      new endpointError(
        "Label already exists. Please choose a different label.",
        400
      )
    );
  }

  let updatedUser = user;
  if (!alreadyExists) {
    // The very first saved address automatically becomes the default.
    const address = {
      label: req.body.label,
      wilaya: req.body.wilaya,
      dayra: req.body.dayra,
      baladiya: req.body.baladiya,
      isDefault: user.addresses.length === 0,
    };

    // $addToSet => add address object to user addresses array if address not exist
    updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      {
        $addToSet: { addresses: address },
      },
      { new: true }
    );
  }

  res.status(200).json({
    status: "success",
    message: alreadyExists
      ? "Address already exists."
      : "Address added successfully.",
    data: updatedUser.addresses,
  });
  next();
});

// @desc    Update a specific address in user addresses list
// @route   PUT /api/v1/addresses/:addressId
// @access  Protected/User
exports.updateAddress = expressAsyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  const targetAddress = user.addresses.find(
    (a) => a._id.toString() === req.params.addressId
  );
  if (!targetAddress) {
    return next(
      new endpointError(
        `There is no address with this ID: ${req.params.addressId}`,
        404
      )
    );
  }

  // Labels are unique per type, case-insensitive; exclude the entry being
  // edited so re-saving its own label (or a case variant) is allowed.
  if (req.body.label !== undefined) {
    const labelCollision = user.addresses.some(
      (a) =>
        a._id.toString() !== req.params.addressId &&
        a.label &&
        a.label.toLowerCase() === req.body.label.toLowerCase()
    );
    if (labelCollision) {
      return next(
        new endpointError(
          "Label already exists. Please choose a different label.",
          400
        )
      );
    }
  }

  // Positional $set => only the matched address subdocument is updated.
  const setFields = {};
  if (req.body.wilaya !== undefined)
    setFields["addresses.$.wilaya"] = req.body.wilaya;
  if (req.body.dayra !== undefined) setFields["addresses.$.dayra"] = req.body.dayra;
  if (req.body.baladiya !== undefined)
    setFields["addresses.$.baladiya"] = req.body.baladiya;
  if (req.body.label !== undefined)
    setFields["addresses.$.label"] = req.body.label;

  let updatedUser = user;
  if (Object.keys(setFields).length > 0) {
    updatedUser = await User.findOneAndUpdate(
      { _id: req.user._id, "addresses._id": req.params.addressId },
      { $set: setFields },
      { new: true }
    );
  }

  // Optional isDefault flag keeps the single-default invariant.
  if (req.body.isDefault !== undefined) {
    if (req.body.isDefault === true) {
      updatedUser = await promoteToDefault(req.user._id, req.params.addressId);
    } else {
      updatedUser = await User.findOneAndUpdate(
        { _id: req.user._id, "addresses._id": req.params.addressId },
        { $set: { "addresses.$.isDefault": false } },
        { new: true }
      );
    }
  }

  res.status(200).json({
    status: "success",
    message: "Address updated successfully.",
    data: updatedUser.addresses,
  });
  next();
});

// @desc    Set a specific address as the default one
// @route   PATCH /api/v1/addresses/:addressId/default
// @access  Protected/User
exports.setDefaultAddress = expressAsyncHandler(async (req, res, next) => {
  const user = await promoteToDefault(req.user._id, req.params.addressId);

  if (!user) {
    return next(
      new endpointError(
        `There is no address with this ID: ${req.params.addressId}`,
        404
      )
    );
  }

  res.status(200).json({
    status: "success",
    message: "Default address updated successfully.",
    data: user.addresses,
  });
  next();
});

// @desc    Remove address from user addresses list
// @route   DELETE /api/v1/addresses/:addressId
// @access  Protected/User
exports.removeAddress = expressAsyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  const removedAddress = user.addresses.find(
    (address) => address._id.toString() === req.params.addressId
  );
  const wasDefault = removedAddress ? removedAddress.isDefault : false;

  // $pull => remove address object from user addresses array if addressId exist
  let updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      $pull: { addresses: { _id: req.params.addressId } },
    },
    { new: true }
  );

  // Deleting the default promotes the most recent remaining address.
  if (wasDefault && updatedUser.addresses.length > 0) {
    const lastAddress = updatedUser.addresses[updatedUser.addresses.length - 1];
    updatedUser = await User.findOneAndUpdate(
      { _id: req.user._id, "addresses._id": lastAddress._id },
      { $set: { "addresses.$.isDefault": true } },
      { new: true }
    );
  }

  res.status(200).json({
    status: "success",
    message: "Address removed successfully.",
    data: updatedUser.addresses,
  });
  next();
});

// @desc    Get logged user addresses list
// @route   GET /api/v1/addresses
// @access  Protected/User
exports.getLoggedUserAddresses = expressAsyncHandler(async (req, res, next) => {
  const user = await User.findById(req.user._id);

  res.status(200).json({
    status: "success",
    results: user.addresses.length,
    data: user.addresses,
  });
  next();
});
