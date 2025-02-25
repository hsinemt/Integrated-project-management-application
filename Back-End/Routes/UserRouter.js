const express = require('express');
const { logout , login} = require('../Controllers/UserController');

const { signupValidation, authMiddleware, roleMiddleware } = require('../Middlewares/UserValidation');
const router = express.Router();

router.post("/login", login);
router.post("/logout", logout);
router.get("/dashboard/:role", authMiddleware, (req, res) => {
  const allowedRoles = ["admin", "manager", "tutor", "student"];

  if (!allowedRoles.includes(req.params.role) || req.params.role !== req.user.role) {
      return res.status(403).json({ message: "Access denied" });
  }

  res.json({ message: `Welcome ${req.params.role}` });
});

module.exports = router;