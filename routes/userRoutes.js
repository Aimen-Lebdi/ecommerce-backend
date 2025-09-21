const express = require("express");
const router = express.Router();
const {
  createUser,
  getAllUsers,
  getOneUser,
  updateUser,
  updateUserPassword,
  deleteUser,
  getLoggedUserData,
  updateLoggedUserPassword,
  updateLoggedUserData,
  deleteLoggedUserData,
  uploadUserImage,
  resizeUserImage,
  deleteManyUsers
} = require("../services/userServices");
const authServices = require("../services/authServices");
const {
  createUserValidator,
  getUserValidator,
  updateUserValidator,
  deleteUserValidator,
  updateUserPasswordValidator,
  updateLoggedUserDataValidator,
  updateLoggedUserPasswordValidator,
  deleteManyUsersValidator,
} = require("../utils/validators/userValidators");
const handleNullValues = (req, res, next) => {
  // Convert '__NULL__' markers back to null for optional fields
  if (req.body.subCategory === "__NULL__") {
    req.body.subCategory = null;
  }
  if (req.body.brand === "__NULL__") {
    req.body.brand = null;
  }

  // Also handle empty strings as null for these fields
  if (req.body.image === "" || req.body.image === "null") {
    req.body.image = null;
  }

  next();
};
// router.use(authServices.protectRoute);

//User
// router.use(authServices.allowTo("user"));

router.get("/getMe", getLoggedUserData, getOneUser);
router.put("/updateMe",uploadUserImage,
  resizeUserImage,updateLoggedUserDataValidator, updateLoggedUserData);
router.put("/changeMyPassword",updateLoggedUserPasswordValidator, updateLoggedUserPassword);
router.delete("/deleteMe", deleteLoggedUserData);

//Admin
// router.use(authServices.allowTo("admin"));

router.route("/")
.get(getAllUsers)
.post(createUserValidator, createUser)

router
  .route("/bulk-delete")
  .post(
    // protectRoute,
    // allowTo("user", "admin"),
    deleteManyUsersValidator,
    deleteManyUsers
  ); 

router.route("/:id")
.get(getUserValidator, getOneUser)
.put(uploadUserImage, resizeUserImage, handleNullValues, updateUserValidator, updateUser)
.delete(deleteUserValidator, deleteUser);

router.put("/changePassword/:id", updateUserPasswordValidator, updateUserPassword);

module.exports = router;
