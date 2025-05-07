const Project = require('../Models/Project');
const UserModel = require('../Models/User');
const natural = require('natural');
const _ = require('lodash');
const TfIdf = natural.TfIdf;

exports.createProject = async (req, res) => {
    try {
        //console.log('Full request body:', req.body);
        // console.log('Request headers content-type:', req.headers['content-type']);

        let keywords = req.body.keywords;
        //console.log('Keywords received:', keywords, 'Type:', typeof keywords);

        if (typeof keywords === 'string') {
            try {
                keywords = JSON.parse(keywords);
                //console.log('Successfully parsed keywords string to array:', keywords);
            } catch (error) {
                console.error('Error parsing keywords string:', error);
                keywords = keywords.split(',').map(k => k.trim()).filter(k => k);
                //console.log('Fallback keywords parsing:', keywords);
            }
        } else if (!Array.isArray(keywords)) {
            console.warn('Keywords is neither string nor array, setting to empty array');
            keywords = [];
        }

        const { title, description, userId, difficulty, status, speciality } = req.body;

        //console.log('Extracted userId:', userId);
        //console.log('Project fields:', { title, description, difficulty, status, speciality });

        let projectLogo;
        if (req.file) {
            projectLogo = `/uploads/project-logos/${req.file.filename}`;
            console.log('Project logo uploaded:', projectLogo);
        } else {
            console.log('No logo file uploaded');
        }

        if (!userId) {
            console.error('Missing userId in request');
            return res.status(401).json({
                success: false,
                message: 'User authentication required'
            });
        }

        let creatorInfo = null;
        try {
            const user = await UserModel.findById(userId);
            if (user) {
                creatorInfo = {
                    userId: user._id,
                    name: user.name,
                    lastname: user.lastname,
                    email: user.email,
                    role: user.role,
                    avatar: user.avatar || ''
                };
                //console.log('Creator info found:', creatorInfo);
            } else {
                console.error('User not found with ID:', userId);
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
        } catch (userError) {
            console.error('Error finding user:', userError);
            return res.status(500).json({
                success: false,
                message: 'Error retrieving user information',
                error: userError.message
            });
        }

        const newProject = new Project({
            title,
            description,
            keywords,
            difficulty: difficulty || 'Medium',
            status: status || 'Not Started',
            speciality,
            projectLogo,
            creator: creatorInfo,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        console.log('Project object created, saving to database...');
        const savedProject = await newProject.save();
        console.log('Project saved successfully with ID:', savedProject._id);

        res.status(201).json({
            success: true,
            message: 'Project created successfully',
            project: savedProject
        });
    } catch (error) {
        console.error("Error creating project:", error);
        res.status(500).json({
            success: false,
            message: 'Failed to create project',
            error: error.message
        });
    }
};exports.getAllProjects = async (req, res) => {
    try {
        const userRole = req.user.role;
        const userId = req.user.id;
        let query = {};


        if (userRole === 'admin') {

            query = {};
        } else if (userRole === 'manager') {

            try {
                const manager = await UserModel.findById(userId);
                if (manager && manager.speciality) {
                    query = { speciality: manager.speciality };
                }
            } catch (err) {
                console.error('Error finding manager:', err);
            }
        } else if (userRole === 'tutor') {

            query = { 'assignedTutor.tutorId': userId };
        }


        const projects = await Project.find(query).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: projects.length,
            projects
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch projects',
            error: error.message
        });
    }
};

exports.getProjectById = async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        res.status(200).json({
            success: true,
            project
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch project',
            error: error.message
        });
    }
};

exports.updateProject = async (req, res) => {
    try {
        const { title, description, keywords, difficulty, status, speciality } = req.body;

        let updateData = {
            title,
            description,
            keywords,
            difficulty,
            status,
            speciality,
            updatedAt: new Date()
        };

        if (req.file) {
            updateData.projectLogo = `/uploads/project-logos/${req.file.filename}`;
        }

        const updatedProject = await Project.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        );

        if (!updatedProject) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Project updated successfully',
            project: updatedProject
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update project',
            error: error.message
        });
    }
};

exports.deleteProject = async (req, res) => {
    try {
        const deletedProject = await Project.findByIdAndDelete(req.params.id);

        if (!deletedProject) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Project deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete project',
            error: error.message
        });
    }
};

exports.getProjectsCount = async (req, res) => {
    try {
        const count = await Project.countDocuments();

        res.status(200).json({
            success: true,
            count: count
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to get projects count',
            error: error.message
        });
    }
};

exports.assignTutorToProject = async (req, res) => {
    try {
        const projectId = req.params.id;
        const { tutorId } = req.body;

        if (!tutorId) {
            return res.status(400).json({
                success: false,
                message: 'Tutor ID is required'
            });
        }


        const tutor = await UserModel.findById(tutorId);
        if (!tutor || tutor.role !== 'tutor') {
            return res.status(404).json({
                success: false,
                message: 'Tutor not found or user is not a tutor'
            });
        }


        const tutorInfo = {
            tutorId: tutor._id,
            name: tutor.name,
            lastname: tutor.lastname,
            email: tutor.email,
            classe: tutor.classe || '',
            avatar: tutor.avatar || ''
        };


        const updatedProject = await Project.findByIdAndUpdate(
            projectId,
            { 
                assignedTutor: tutorInfo,
                updatedAt: new Date()
            },
            { new: true, runValidators: true }
        );

        if (!updatedProject) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Tutor assigned to project successfully',
            data: updatedProject
        });
    } catch (error) {
        console.error('Error assigning tutor to project:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to assign tutor to project',
            error: error.message
        });
    }
};

const recommendProjects = async (studentSkills) => {
    try {
        const projects = await Project.find();
        console.log("Projects fetched:", projects); // Debugging log
        if (!projects.length) {
            return [];
        }

        const tfidf = new TfIdf();

        // Ajouter les mots-clés de chaque projet dans TF-IDF
        projects.forEach((project, index) => {
            if (project.keywords && project.keywords.length > 0) {
                // Normaliser les mots-clés
                const keywords = project.keywords
                    .map(keyword => keyword ? keyword.toString().toLowerCase() : "") // Convertir en chaîne et en minuscules
                    .filter(keyword => keyword.trim()); // Supprimer les chaînes vides

                if (keywords.length > 0) {
                    tfidf.addDocument(keywords.join(" "));
                    console.log(`Document ${index} added with keywords:`, keywords); // Fixed template literal
                }
            }
        });

        // Calculer la similarité entre les compétences et les projets
        const projectScores = projects.map((project, index) => {
            // Normaliser les compétences des étudiants
            const normalizedSkills = studentSkills
                .map(skill => skill ? skill.toString().toLowerCase() : "") // Convertir en chaîne et en minuscules
                .filter(skill => skill.trim()); // Supprimer les chaînes vides

            console.log("Normalized Skills:", normalizedSkills); // Debugging log
            console.log("Project Keywords:", project.keywords); // Debugging log

            const score = normalizedSkills.reduce((acc, skill) => {
                try {
                    const tfidfScore = tfidf.tfidf(skill, index);
                    console.log(`Skill: ${skill}, TF-IDF Score: ${tfidfScore}`); // Fixed template literal
                    return acc + (isNaN(tfidfScore) ? 0 : tfidfScore); // Remplacer NaN par 0
                } catch (error) {
                    console.error(`Error calculating TF-IDF for skill: ${skill}`, error); // Fixed template literal
                    return acc; // Ignorer cette compétence
                }
            }, 0);

            console.log("Project Score:", score); // Debugging log

            return { ...project.toObject(), score };
        });

        // Trier les projets par score et renvoyer les 3 meilleurs
        const recommendedProjects = _.orderBy(projectScores, "score", "desc").slice(0, 3);
        return recommendedProjects;
    } catch (error) {
        console.error("Erreur lors de la recommandation :", error);
        return [];
    }
};

exports.recommend = async (req, res) => {
    const { skills } = req.body;

    if (!skills || !Array.isArray(skills)) {
        return res.status(400).json({ message: "Les compétences sont requises" });
    }

    try {
        const recommendedProjects = await recommendProjects(skills);
        return res.status(200).json(recommendedProjects);
    } catch (error) {
        console.error("Erreur serveur :", error);
        return res.status(500).json({ message: "Erreur serveur" });
    }
};

exports.getProjectsByUserSpeciality = async (req, res) => {
    try {
        // Récupérer l'ID de l'utilisateur directement depuis req.user (défini par le middleware)
        const userId = req.user.id;
        
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'Authentification requise'
            });
        }

        // Trouver l'utilisateur dans la base de données
        const user = await UserModel.findById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Utilisateur non trouvé'
            });
        }

        // Le reste de la fonction reste inchangé
        if (!user.speciality) {
            return res.status(400).json({
                success: false,
                message: "L'utilisateur n'a pas de spécialité définie"
            });
        }

        const projects = await Project.find({ 
            speciality: user.speciality 
        }).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: projects.length,
            speciality: user.speciality,
            projects
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Échec de la récupération des projets par spécialité',
            error: error.message
        });
    }
};