const CodeMark = require('../Models/CodeMark');
const Project = require('../Models/Project');
const Student = require('../Models/Student');
const Task = require('../Models/tasks');
const codeReviewService = require('../services/codeReviewService');


const CodeReviewController = {

    submitCode: async (req, res) => {
        try {
            const { projectId, taskId, code, language } = req.body;


            const studentId = req.user?.id;

            if (!studentId) {
                return res.status(400).json({
                    success: false,
                    message: 'Authentication required - student ID not found in token'
                });
            }


            if (!projectId || !code || !language) {
                return res.status(400).json({
                    success: false,
                    message: 'Project ID, code, and language are required'
                });
            }


            const project = await Project.findById(projectId);
            if (!project) {
                return res.status(404).json({
                    success: false,
                    message: 'Project not found'
                });
            }


            if (taskId) {
                const task = await Task.findById(taskId);
                if (!task) {
                    return res.status(404).json({
                        success: false,
                        message: 'Task not found'
                    });
                }
            }


            const assessmentCriteria = project.assessmentCriteria || {};


            const assessment = await codeReviewService.assessCode(code, language, assessmentCriteria);

            const codeMark = new CodeMark({
                studentId,
                projectId,
                taskId: taskId || null,
                code,
                language,
                assessment
            });

            await codeMark.save();

            return res.status(201).json({
                success: true,
                message: 'Code submitted and assessed successfully',
                data: {
                    assessmentId: codeMark._id,
                    score: assessment.score,
                    feedback: assessment.overallFeedback
                }
            });
        } catch (error) {
            console.error('Error submitting and assessing code:', error);
            return res.status(500).json({
                success: false,
                message: 'Error submitting and assessing code',
                error: error.message
            });
        }
    },


    getAssessment: async (req, res) => {
        try {
            const { assessmentId } = req.params;
            const userId = req.user.id;
            const userRole = req.user.role;

            const assessment = await CodeMark.findById(assessmentId)
                .populate('studentId', 'name email')
                .populate('projectId', 'name description')
                .populate('taskId', 'name description');

            if (!assessment) {
                return res.status(404).json({
                    success: false,
                    message: 'Assessment not found'
                });
            }


            if (userRole !== 'tutor' && userRole !== 'manager' &&
                assessment.studentId._id.toString() !== userId.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to access this assessment'
                });
            }

            return res.status(200).json({
                success: true,
                data: assessment
            });
        } catch (error) {
            console.error('Error retrieving assessment:', error);
            return res.status(500).json({
                success: false,
                message: 'Error retrieving assessment',
                error: error.message
            });
        }
    },


    tutorReview: async (req, res) => {
        try {
            const { assessmentId } = req.params;
            const { approved, comments, adjustedScore } = req.body;
            const tutorId = req.user.id;


            if (req.user.role !== 'tutor' && req.user.role !== 'manager') {
                return res.status(403).json({
                    success: false,
                    message: 'Only tutors and managers can review assessments'
                });
            }

            const assessment = await CodeMark.findById(assessmentId);
            if (!assessment) {
                return res.status(404).json({
                    success: false,
                    message: 'Assessment not found'
                });
            }


            assessment.tutorReview = {
                approved,
                comments,
                adjustedScore: adjustedScore || assessment.assessment.score
            };

            assessment.updatedAt = Date.now();
            await assessment.save();

            return res.status(200).json({
                success: true,
                message: 'Assessment reviewed successfully',
                data: {
                    assessmentId: assessment._id,
                    approved,
                    adjustedScore: assessment.tutorReview.adjustedScore
                }
            });
        } catch (error) {
            console.error('Error reviewing assessment:', error);
            return res.status(500).json({
                success: false,
                message: 'Error reviewing assessment',
                error: error.message
            });
        }
    },


    getProjectAssessments: async (req, res) => {
        try {
            const { projectId } = req.params;

            if (req.user.role !== 'tutor' && req.user.role !== 'manager') {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied'
                });
            }

            const assessments = await CodeMark.find({ projectId })
                .populate('studentId', 'name email')
                .populate('projectId', 'name description')
                .populate('taskId', 'name description');

            return res.status(200).json({
                success: true,
                data: assessments
            });
        } catch (error) {
            console.error('Error retrieving project assessments:', error);
            return res.status(500).json({
                success: false,
                message: 'Error retrieving project assessments',
                error: error.message
            });
        }
    },


    getStudentAssessments: async (req, res) => {
        try {
            const { studentId } = req.params;
            const userId = req.user.id;
            const userRole = req.user.role;

            if (userRole !== 'tutor' && userRole !== 'manager' &&
                studentId !== userId.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Not authorized to access these assessments'
                });
            }

            const assessments = await CodeMark.find({ studentId })
                .populate('projectId', 'name description')
                .populate('taskId', 'name description');

            return res.status(200).json({
                success: true,
                data: assessments
            });
        } catch (error) {
            console.error('Error retrieving student assessments:', error);
            return res.status(500).json({
                success: false,
                message: 'Error retrieving student assessments',
                error: error.message
            });
        }
    }
};

module.exports = CodeReviewController;