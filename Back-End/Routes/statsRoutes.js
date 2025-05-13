const express = require('express');
const router = express.Router();
const statsController = require('../Controllers/StatsController');

router.get('/stats/codefiles-count', statsController.getCodeFilesCount);
router.get('/stats/zipfiles-count', statsController.getZipFilesCount);
router.get('/stats/managers-count', statsController.getManagersCount);
router.get('/stats/tutors-count', statsController.getTutorsCount);
router.get('/stats/dashboard', statsController.getDashboardStats);

module.exports = router;