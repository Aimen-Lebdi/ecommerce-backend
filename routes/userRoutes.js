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
  deleteManyUsers,
  activateManyUsers,
  activateUser,
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
  activateManyUsersValidator,
} = require("../utils/validators/userValidators");
const handleNullValues = (req, res, next) => {
  // Convert '__NULL__' markers back to null for optional fields
  if (req.body.image === "__NULL__") {
    req.body.image = null;
  }
  next();
};
router.use(authServices.protectRoute);

// ===== USER ROUTES =====
router.get(
  "/getMe",
  authServices.allowTo("user"),
  getLoggedUserData,
  getOneUser
);
router.put(
  "/updateMe",
  authServices.allowTo("user"),
  uploadUserImage,
  resizeUserImage,
  updateLoggedUserDataValidator,
  updateLoggedUserData
);
router.put(
  "/changeMyPassword",
  authServices.allowTo("user"),
  updateLoggedUserPasswordValidator,
  updateLoggedUserPassword
);
router.delete("/deleteMe", authServices.allowTo("user"), deleteLoggedUserData);

// ===== ADMIN ROUTES =====
router
  .route("/")
  .get(authServices.allowTo("admin"), getAllUsers)
  .post(
    authServices.allowTo("admin"),
    uploadUserImage,
    resizeUserImage,
    createUserValidator,
    createUser
  );
router
  .route("/bulk-delete")
  .post(
    authServices.allowTo("admin"),
    deleteManyUsersValidator,
    deleteManyUsers
  );
  // NEW: Bulk activate route
router
  .route("/bulk-activate")
  .post(
    authServices.allowTo("admin"),
    activateManyUsersValidator,
    activateManyUsers
  );
router
  .route("/:id/activate")
  .put(
    authServices.allowTo("admin"),
    getUserValidator,
    activateUser
  );

router
  .route("/:id")
  .get(authServices.allowTo("admin"), getUserValidator, getOneUser)
  .put(
    authServices.allowTo("admin"),
    uploadUserImage,
    resizeUserImage,
    handleNullValues,
    updateUserValidator,
    updateUser
  )
  .delete(authServices.allowTo("admin"), deleteUserValidator, deleteUser);

router.put(
  "/changePassword/:id",
  authServices.allowTo("admin"),
  updateUserPasswordValidator,
  updateUserPassword
);

module.exports = router;
