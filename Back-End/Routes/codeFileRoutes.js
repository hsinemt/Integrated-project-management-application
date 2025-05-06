const express = require('express');
const router = express.Router();
const codeFileController = require('../Controllers/CodeFileController');

// Get all code files for a task
router.get('/tasks/:taskId/codefiles', codeFileController.getAllCodeFiles);

// Get a specific code file by ID
router.get('/codefiles/:fileId', codeFileController.getCodeFileById);

// Create a new code file
router.post('/tasks/:taskId/codefiles', codeFileController.createCodeFile);

// Update a code file
router.put('/codefiles/:fileId', codeFileController.updateCodeFile);

// Delete a code file
router.delete('/codefiles/:fileId', codeFileController.deleteCodeFile);

module.exports = router;
