const ChoixModel = require('../Models/Choix');

exports.createChoix = async (req, res) => {
    try {
        const { nom_groupe, id_students, id_tutor, id_project, list_projects } = req.body;

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
