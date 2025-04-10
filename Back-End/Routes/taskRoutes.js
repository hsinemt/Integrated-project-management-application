const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');

router.post('/preview', taskController.previewTasks); // New endpoint for preview
router.post('/save', taskController.saveTasks);       // New endpoint for saving

module.exports = router;