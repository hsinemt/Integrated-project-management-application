const express = require('express');
const router = express.Router();
const projectController = require('../Controllers/projectController');

router.post('/add', projectController.createProject);
router.get('/all', projectController.getAllProjects);
router.get('/one/:id', projectController.getProjectById);
router.put('/upd/:id', projectController.updateProject);
router.delete('/del/:id', projectController.deleteProject);

module.exports = router;
