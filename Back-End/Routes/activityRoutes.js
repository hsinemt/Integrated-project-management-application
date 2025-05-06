const express = require('express');
const router = express.Router();
const activityController = require('../Controllers/ActivityController');

// Get all activities for a specific task
router.get('/tasks/:taskId/activities', activityController.getTaskActivities);

// Get all activities for a specific user
router.get('/users/:userId/activities', activityController.getUserActivities);

// Create a new activity (direct API endpoint, though typically activities will be created via file operations)
router.post('/activities', activityController.createActivityEndpoint);

module.exports = router;