const express = require('express');
const router = express.Router();
const groupeController = require('../Controllers/groupController');

router.post('/create', groupeController.createGroupe);
router.get('/all', groupeController.getAllGroupes);
router.get('/by-project/:projectId', groupeController.getGroupesByProjectId);

module.exports = router;
