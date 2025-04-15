const Project = require('../Models/Project');
const UserModel = require('../Models/User');
const TutorModel = require('../Models/Tutor');

const natural = require('natural');
const _ = require('lodash');
const TfIdf = natural.TfIdf;


const createProject = async (req, res) => {
    try {
        let keywords = req.body.keywords;

        if (typeof keywords === 'string') {
            try {
                keywords = JSON.parse(keywords);
            } catch (error) {
                console.error('Error parsing keywords string:', error);
                keywords = keywords.split(',').map(k => k.trim()).filter(k => k);
            }
        } else if (!Array.isArray(keywords)) {
            console.warn('Keywords is neither string nor array, setting to empty array');
            keywords = [];
        }

        const { title, description, userId, difficulty, status, speciality } = req.body;

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
};

const getAllProjects = async (req, res) => {
    try {
        const projects = await Project.find().sort({ createdAt: -1 });

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

const getProjectById = async (req, res) => {
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

const updateProject = async (req, res) => {
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

const deleteProject = async (req, res) => {
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

const getProjectsCount = async (req, res) => {
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

const recommendProjects = async (studentSkills) => {
    try {
        const projects = await Project.find();

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

const recommend = async (req, res) => {
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


const getAllTutors = async (req, res) => {
    try {

        const user = await UserModel.findById(req.body.userId);
        if (!user || user.role !== 'manager') {
            return res.status(403).json({
                success: false,
                message: 'Only managers can view tutors for assignment'
            });
        }


        const tutors = await TutorModel.find({}, {
            _id: 1,
            name: 1,
            lastname: 1,
            email: 1,
            classe: 1,
            avatar: 1
        });

        res.status(200).json({
            success: true,
            count: tutors.length,
            tutors
        });
    } catch (error) {
        console.error("Error fetching tutors:", error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch tutors',
            error: error.message
        });
    }
};


const assignTutor = async (req, res) => {
    try {
        const { projectId, tutorId } = req.body;
        const { id } = req.params;


        const user = await UserModel.findById(req.body.userId);
        if (!user || user.role !== 'manager') {
            return res.status(403).json({
                success: false,
                message: 'Only managers can assign tutors to projects'
            });
        }


        const project = await Project.findById(id || projectId);
        if (!project) {
            return res.status(404).json({
                success: false,
                message: 'Project not found'
            });
        }


        const tutor = await TutorModel.findById(tutorId);
        if (!tutor) {
            return res.status(404).json({
                success: false,
                message: 'Tutor not found'
            });
        }


        project.assignedTutor = {
            tutorId: tutor._id,
            name: tutor.name,
            lastname: tutor.lastname,
            email: tutor.email,
            classe: tutor.classe,
            avatar: tutor.avatar
        };
        project.updatedAt = new Date();

        await project.save();

        res.status(200).json({
            success: true,
            message: 'Project successfully assigned to tutor',
            project
        });
    } catch (error) {
        console.error("Error assigning tutor:", error);
        res.status(500).json({
            success: false,
            message: 'Failed to assign tutor to project',
            error: error.message
        });
    }
};

module.exports = {
    createProject,
    getAllProjects,
    getProjectById,
    updateProject,
    deleteProject,
    getProjectsCount,
    recommend,
    getAllTutors,
    assignTutor
};