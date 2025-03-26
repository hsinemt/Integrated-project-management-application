const Project = require('../Models/Project');
const UserModel = require('../Models/User');

exports.createProject = async (req, res) => {
    try {
        console.log('Full request body:', req.body);
        const { title, description, keyFeatures, userId } = req.body;

        console.log('User ID extracted from request:', userId);

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User authentication required'
            });
        }

        let creatorInfo = null;
        try {
            const user = await UserModel.findById(userId);
            console.log('User found:', user ? 'Yes' : 'No');

            if (user) {
                creatorInfo = {
                    userId: user._id,
                    name: user.name,
                    lastname: user.lastname,
                    email: user.email,
                    role: user.role,
                    avatar: user.avatar || ''
                };
                console.log('Creator info created:', creatorInfo);
            } else {
                console.log('User not found with ID:', userId);
            }
        } catch (userError) {
            console.error('Error finding user:', userError);
        }

        const newProject = new Project({
            title,
            description,
            keyFeatures,
            creator: creatorInfo,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        console.log('Project being saved with creator:', newProject.creator);
        const savedProject = await newProject.save();
        console.log('Saved project:', savedProject);

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
exports.getAllProjects = async (req, res) => {
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
        const { title, description, keyFeatures } = req.body;

        const updatedProject = await Project.findByIdAndUpdate(
            req.params.id,
            {
                title,
                description,
                keyFeatures,
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