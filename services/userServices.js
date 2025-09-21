const factory = require("./handlersFactory");
const User = require("../models/userModel");
const expressAsyncHandler = require("express-async-handler");
const userModel = require("../models/userModel");
const endpointError = require("../utils/endpointError");
const bcrypt= require("bcryptjs")
const { uploadSingleImage } = require("../middlewares/uploadImageMiddleware");
const sharp = require("sharp");
const { v4: uuidv4 } = require("uuid");


const uploadUserImage = uploadSingleImage('image');

const resizeUserImage = expressAsyncHandler(async (req, res, next) => {
  //1- Image processing for image
  if (req.file) {
    const imageFileName = `user-${uuidv4()}-${Date.now()}.jpeg`;
    await sharp(req.file.buffer)
      .resize(600, 600)
      .toFormat("jpeg")
      .jpeg({ quality: 95 })
      .toFile(`uploads/users/${imageFileName}`);

    // Save image into our db
    req.body.image = imageFileName;
  }
  next();
});

//Admin

const createUser = factory.createOne(User);
const getAllUsers = factory.getAll(User ,["name"]);
const getOneUser = factory.getOne(User);
const updateUser = expressAsyncHandler(async (req, res, next) => {

  
  const updatedUser = await User.findByIdAndUpdate(
    req.params.id,
    {
      name: req.body.name,
      slug: req.body.slug,
      phone: req.body.phone,
      email: req.body.email,
      profileImg: req.body.profileImg,
      role: req.body.role,
      image: req.body.image,
    },
    { new: true }
  );
  if (!updatedUser) {
    new endpointError(`there is no user with this ID format`, 404);
  }
  res.status(200).json({ data: updatedUser });
  next();
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
    new endpointError(`there is no user with this ID format`, 404);
  }
  res.status(200).json({ data: updatedUserPassword });
});
const deleteUser = factory.deleteOne(User);
const deleteManyUsers = factory.deleteMany(User);

//User

const getLoggedUserData = expressAsyncHandler(async (req, res, next) => {
  req.params.id = req.user._id;
  next();
});

const updateLoggedUserPassword = expressAsyncHandler(async (req, res, next) => {
  // 1) Update user password based user payload (req.user._id)
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

  // 2) Generate token
  const token = createToken(user._id);

  res.status(200).json({ data: user, token });
});

const updateLoggedUserData = expressAsyncHandler(async (req, res, next) => {
  const updatedUser = await User.findByIdAndUpdate(
    req.user._id,
    {
      name: req.body.name,
      email: req.body.email,
      phone: req.body.phone,
      image: req.body.image,
    },
    { new: true }
  );

  res.status(200).json({ data: updatedUser });
});

const deleteLoggedUserData = expressAsyncHandler(async (req, res, next) => {
  await userModel.findByIdAndUpdate(req.user._id, { active: false });

  res.status(204).json({ status: 'Success' });
});

module.exports = {
  createUser,
  getAllUsers,
  getOneUser,
  updateUser,
  updateUserPassword,
  deleteUser,
  deleteManyUsers,
  getLoggedUserData,
  updateLoggedUserPassword,
  updateLoggedUserData,
  deleteLoggedUserData,
  uploadUserImage,
  resizeUserImage
};
