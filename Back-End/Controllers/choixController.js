const ChoixModel = require('../Models/Choix');
const GroupeModel = require('../Models/Group');

// Check if a student is already in a group
exports.checkStudentInGroup = async (req, res) => {
    try {
        const studentId = req.query.studentId;

        if (!studentId) {
            return res.status(400).json({ message: "Student ID is required" });
        }

        const group = await GroupeModel.findOne({ id_students: studentId });

        return res.status(200).json({ 
            isInGroup: !!group,
            group: group
        });
    } catch (error) {
        return res.status(500).json({ 
            message: "Error checking if student is in a group", 
            error: error.message 
        });
    }
};

exports.createChoix = async (req, res) => {
    try {
        const { nom_groupe, id_students, id_tutor, id_project, list_projects } = req.body;

        // Check if any of the students are already in a group
        for (const studentId of id_students) {
            const existingGroup = await GroupeModel.findOne({ id_students: studentId });
            if (existingGroup) {
                return res.status(400).json({ 
                    message: "This student is already a member of another group and cannot be added", 
                    studentId: studentId 
                });
            }
        }

        const newChoix = new ChoixModel({
            nom_groupe,
            id_students,
            id_tutor,
            id_project,
            list_projects
        });

        await newChoix.save();
        res.status(201).json({ message: "Choix créé avec succès", choix: newChoix });

    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la création du choix", error });
    }
};

exports.getAllChoix = async (req, res) => {
    try {
        const choix = await ChoixModel.find()
            .populate('id_students', 'name email')
            .populate('id_tutor', 'name email')
            .populate('id_project', 'title');
        res.status(200).json(choix);
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la récupération des choix", error });
    }
};
