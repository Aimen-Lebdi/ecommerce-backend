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

router.use(authServices.protectRoute);

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
.put(updateUserValidator, updateUser)
.delete(deleteUserValidator, deleteUser);

router.put("/changePassword/:id", updateUserPasswordValidator, updateUserPassword);

module.exports = router;
