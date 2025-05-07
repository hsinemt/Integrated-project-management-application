const express = require('express');
const mongoose = require('mongoose');
const { authMiddleware, userToken } = require('../Middlewares/UserValidation');

const router = express.Router();

// Récupérer les messages d'un groupe
router.get('/group/:groupId', userToken, async (req, res) => {
    try {
        console.log('Received request for groupId:', req.params.groupId);
        console.log('User ID from token:', req.user?.id);

        const groupId = req.params.groupId;
        const userId = req.user.id;

        if (!mongoose.Types.ObjectId.isValid(groupId)) {
            console.log('Invalid groupId:', groupId);
            return res.status(400).json({ success: false, message: 'ID de groupe invalide' });
        }

        const Group = mongoose.model('Groupes');
        console.log('Fetching group...');
        const group = await Group.findById(groupId);
        if (!group) {
            console.log('Group not found:', groupId);
            return res.status(404).json({ success: false, message: 'Groupe non trouvé' });
        }
        console.log('Group found:', group);

        const userIdStr = userId.toString();
        const isStudent = group.id_students.some(studentId => studentId.toString() === userIdStr);
        const isTutor = group.id_tutor && group.id_tutor.toString() === userIdStr;
        console.log('Authorization check - isStudent:', isStudent, 'isTutor:', isTutor);

        if (!isStudent && !isTutor) {
            console.log('Unauthorized access for user:', userId);
            return res.status(403).json({ success: false, message: 'Accès non autorisé' });
        }

        const Message = mongoose.model('Message');
        console.log('Fetching messages for group:', groupId);
        const messages = await Message.find({ group: groupId })
            .populate('sender', 'name lastname role')
            .sort({ timestamp: 1 });
        console.log('Messages fetched:', messages.length);

        res.json({ success: true, messages });
    } catch (error) {
        console.error('Error in /messages/group/:groupId:', {
            message: error.message,
            stack: error.stack,
            groupId: req.params.groupId,
            userId: req.user?.id
        });
        res.status(500).json({ success: false, message: 'Erreur serveur' });
    }
});

module.exports = router;