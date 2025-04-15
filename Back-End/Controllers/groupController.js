const GroupeModel = require('../Models/Group');

exports.createGroupe = async (req, res) => {
    try {
        const { nom_groupe, id_students, id_tutor, id_project } = req.body;

        const newGroupe = new GroupeModel({
            nom_groupe,
            id_students,
            id_tutor,
            id_project
        });

        await newGroupe.save();
        res.status(201).json({ message: "Groupe créé avec succès", groupe: newGroupe });

    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la création du groupe", error });
    }
};

exports.getAllGroupes = async (req, res) => {
    try {
        const groupes = await GroupeModel.find()
            .populate('id_students', 'name email')
            .populate('id_tutor', 'name email')
            .populate('id_project', 'title');
        res.status(200).json(groupes);
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la récupération des groupes", error });
    }
};
exports.getGroupesByProjectId = async (req, res) => {
    try {
        const { projectId } = req.params;

        if (!projectId) {
            return res.status(400).json({
                success: false,
                message: "Project ID is required"
            });
        }
        const groupes = await GroupeModel.find({ id_project: projectId });

        return res.status(200).json(groupes);
    } catch (error) {
        console.error("Error fetching groups by project ID:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching groups",
            error: error.message
        });
    }
};