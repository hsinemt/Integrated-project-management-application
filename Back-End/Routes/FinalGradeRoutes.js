const express = require('express');
const router = express.Router();
const FinalGradeController = require('../Controllers/FinalGradeController');
const { authMiddleware } = require('../Middlewares/UserValidation');

// Route pour calculer la note finale
router.post('/calculate', authMiddleware, FinalGradeController.calculateFinalGrade);

// Route pour obtenir la note finale d'un étudiant pour un projet
router.get('/:studentId/:projectId', authMiddleware, FinalGradeController.getFinalGrade);

module.exports = router;