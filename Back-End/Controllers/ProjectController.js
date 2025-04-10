const Project = require('../Models/Project');
const UserModel = require('../Models/User');

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
        const projects = await Project.find().sort({ createdAt: -1 });

        // Log the projects to see if they have creator info
        // console.log('Projects being returned:', projects.map(p => ({
        //     id: p._id,
        //     title: p.title,
        //     hasCreator: !!p.creator,
        //     creatorInfo: p.creator
        // })));

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