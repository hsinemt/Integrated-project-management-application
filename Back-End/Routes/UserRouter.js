const express = require('express');
const {authMiddleware, roleMiddleware } = require('../Middlewares/UserValidation');
const router = express.Router();
const {login,getProfile} = require('../Controllers/userControllers');
router.get("/profile", authMiddleware, getProfile);
router.post("/login", login);
router.get("/dashboard/:role", authMiddleware, (req, res) => {
  const allowedRoles = ["admin", "manager", "tutor", "student"];
  if (!allowedRoles.includes(req.params.role) || req.params.role !== req.user.role) {
      return res.status(403).json({ message: "Access denied" });
  }
  res.json({ message: `Welcome ${req.params.role}` });
});


module.exports = router;