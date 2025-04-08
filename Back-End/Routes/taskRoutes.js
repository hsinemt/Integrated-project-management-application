const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');

router.post('/generate', taskController.generateTasks);

module.exports = router;