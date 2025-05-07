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
