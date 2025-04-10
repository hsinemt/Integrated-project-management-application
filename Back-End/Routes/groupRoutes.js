const express = require('express');
const router = express.Router();
const groupeController = require('../Controllers/groupController');

router.post('/create', groupeController.createGroupe);
router.get('/all', groupeController.getAllGroupes);

module.exports = router;
