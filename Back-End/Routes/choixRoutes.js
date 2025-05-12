const express = require('express');
const router = express.Router();
const choixController = require('../Controllers/choixController');

router.post('/create', choixController.createChoix);
router.get('/all', choixController.getAllChoix);
router.get('/check-student', choixController.checkStudentInGroup);

module.exports = router;
