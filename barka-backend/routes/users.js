const express = require("express");
const router = express.Router();
const { check } = require("express-validator");
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  updatePassword,
} = require("../controllers/userController");
const { protect, authorize, isAdmin } = require("../middleware/auth");
const { ROLES } = require("../models/User");
const { updateUserValidator } = require("../middleware/validators");

// Apply protection to all routes
router.use(protect);

// Get all users - admin only
router.get("/", isAdmin, getUsers);

// Create a new user - admin only
router.post("/", isAdmin, createUser);

// Get, update, delete single user
router
  .route("/:id")
  .get(getUser)
  .put(updateUserValidator, updateUser)
  .delete(isAdmin, deleteUser);

// Update user password
router.put(
  "/:id/password",
  [
    check("currentPassword", "Current password is required").not().isEmpty(),
    check("newPassword", "New password must be at least 6 characters").isLength(
      { min: 6 }
    ),
  ],
  updatePassword
);

module.exports = router;
