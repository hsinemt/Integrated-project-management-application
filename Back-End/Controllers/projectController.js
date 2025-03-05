const ProjectModel = require('../Models/Project');

// Créer un projet
exports.createProject = async (req, res) => {
    try {
        const { title, description } = req.body;
        const newProject = new ProjectModel({ title, description });

        await newProject.save();
        res.status(201).json({ message: "Projet créé avec succès", project: newProject });

    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la création du projet", error });
    }
};

// Récupérer tous les projets
exports.getAllProjects = async (req, res) => {
    try {
        const projects = await ProjectModel.find();
        res.status(200).json(projects);
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la récupération des projets", error });
    }
};

// Récupérer un projet par ID
exports.getProjectById = async (req, res) => {
    try {
        const project = await ProjectModel.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ message: "Projet non trouvé" });
        }
        res.status(200).json(project);
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la récupération du projet", error });
    }
};

// Mettre à jour un projet
exports.updateProject = async (req, res) => {
    try {
        const { title, description } = req.body;
        const updatedProject = await ProjectModel.findByIdAndUpdate(
            req.params.id,
            { title, description },
            { new: true, runValidators: true }
        );

        if (!updatedProject) {
            return res.status(404).json({ message: "Projet non trouvé" });
        }

        res.status(200).json({ message: "Projet mis à jour avec succès", project: updatedProject });

    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la mise à jour du projet", error });
    }
};

// Supprimer un projet
exports.deleteProject = async (req, res) => {
    try {
        const deletedProject = await ProjectModel.findByIdAndDelete(req.params.id);

        if (!deletedProject) {
            return res.status(404).json({ message: "Projet non trouvé" });
        }

        res.status(200).json({ message: "Projet supprimé avec succès" });
    } catch (error) {
        res.status(500).json({ message: "Erreur lors de la suppression du projet", error });
    }
};
