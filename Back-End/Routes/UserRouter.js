const express = require('express');
const { logout , login, isUserEmailAvailable} = require('../Controllers/UserController');

const { authMiddleware } = require('../Middlewares/UserValidation');
const router = express.Router();

router.post("/login", login);
router.post("/logout", logout);
router.get("/check-email", isUserEmailAvailable);
router.get("/dashboard/:role", authMiddleware, (req, res) => {
  const allowedRoles = ["admin", "manager", "tutor", "student"];

  if (!allowedRoles.includes(req.params.role) || req.params.role !== req.user.role) {
      return res.status(403).json({ message: "Access denied" });
  }

  res.json({ message: `Welcome ${req.params.role}` });
});


module.exports = router;