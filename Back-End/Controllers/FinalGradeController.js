const FinalGrade = require('../Models/FinalGrade');
const Task = require('../Models/tasks');
const CodeMark = require('../Models/CodeMark');

const FinalGradeController = {
    calculateFinalGrade: async (req, res) => {
        try {
            const { studentId, customGrade, weights, averages } = req.body;

            // Validate weights sum to 100
            const totalWeight = weights.quizWeight + weights.progressWeight +
                weights.gitWeight + weights.codeWeight +
                customGrade.weight;
            if (totalWeight !== 100) {
                return res.status(400).json({
                    success: false,
                    message: "Weights must sum to 100%",
                    currentTotal: totalWeight
                });
            }

            // Get all tasks for the student to derive projectId
            const tasks = await Task.find({ assignedTo: studentId });
            if (!tasks.length) {
                return res.status(404).json({
                    success: false,
                    message: "No tasks found for the student"
                });
            }
            const projectId = tasks[0].project; // Assuming one project per student for simplicity

            // Check for existing final grade
            let finalGrade = await FinalGrade.findOne({ studentId, projectId });

            // Calculate averages from tasks
            let totalQuizScore = 0;
            let totalProgressScore = 0;
            let totalGitScore = 0;
            let taskCount = tasks.length;

            tasks.forEach(task => {
                if (task.quizScore !== undefined) totalQuizScore += task.quizScore / 5;
                if (task.progressAnalysis?.scoreProgress !== undefined) totalProgressScore += task.progressAnalysis.scoreProgress;
                if (task.noteGit !== undefined) totalGitScore += task.noteGit;
            });

            // Get CodeMark scores
            const codeMarks = await CodeMark.find({ student: studentId, project: projectId });
            let totalCodeScore = 0;
            codeMarks.forEach(mark => {
                const score = mark.tutorReview.reviewed ? mark.tutorReview.score : mark.score;
                totalCodeScore += score / 5;
            });

            // Use provided averages or calculate
            let usedAverages = averages || {
                quiz: taskCount > 0 ? totalQuizScore / taskCount : 0,
                progress: taskCount > 0 ? totalProgressScore / taskCount : 0,
                git: taskCount > 0 ? totalGitScore / taskCount : 0,
                code: codeMarks.length > 0 ? totalCodeScore / codeMarks.length : 0
            };

            // Calculate final score
            const finalScore = (
                (usedAverages.quiz * (weights.quizWeight / 100)) +
                (usedAverages.progress * (weights.progressWeight / 100)) +
                (usedAverages.git * (weights.gitWeight / 100)) +
                (usedAverages.code * (weights.codeWeight / 100)) +
                (customGrade.score * (customGrade.weight / 100))
            );

            // Create or update final grade
            if (finalGrade) {
                finalGrade.customGrade = customGrade;
                finalGrade.weights = weights;
                finalGrade.finalGrade = finalScore;
                finalGrade.averages = usedAverages;
                finalGrade.updatedAt = new Date();
            } else {
                finalGrade = new FinalGrade({
                    studentId,
                    projectId,
                    customGrade,
                    weights,
                    finalGrade: finalScore,
                    averages: usedAverages
                });
            }

            await finalGrade.save();

            return res.status(200).json({
                success: true,
                data: {
                    finalGrade,
                    averages: usedAverages,
                    weights,
                    customGrade
                }
            });

        } catch (error) {
            console.error('Error calculating final grade:', error);
            return res.status(500).json({
                success: false,
                message: 'Error calculating final grade',
                error: error.message
            });
        }
    },

    getFinalGrade: async (req, res) => {
        try {
            const { studentId } = req.params;

            // Get all tasks for the student to derive projectId
            const tasks = await Task.find({ assignedTo: studentId });
            if (!tasks.length) {
                return res.status(404).json({
                    success: false,
                    message: 'No tasks found for the student'
                });
            }
            const projectId = tasks[0].project; // Assuming one project per student for simplicity

            const finalGrade = await FinalGrade.findOne({ studentId, projectId })
                .populate('studentId', 'name lastname')
                .populate('projectId', 'title');

            if (!finalGrade) {
                return res.status(404).json({
                    success: false,
                    message: 'Final grade not found'
                });
            }

            return res.status(200).json({
                success: true,
                data: {
                    finalGrade: {
                        studentId: finalGrade.studentId,
                        projectId: finalGrade.projectId,
                        finalGrade: finalGrade.finalGrade,
                    },
                    averages: finalGrade.averages || {
                        quiz: 0,
                        progress: 0,
                        git: 0,
                        code: 0
                    },
                    weights: finalGrade.weights || {
                        quizWeight: 0,
                        progressWeight: 0,
                        gitWeight: 0,
                        codeWeight: 0
                    },
                    customGrade: finalGrade.customGrade || { score: 0, weight: 0 }
                }
            });

        } catch (error) {
            console.error('Error getting final grade:', error);
            return res.status(500).json({
                success: false,
                message: 'Error getting final grade',
                error: error.message
            });
        }
    }
};

module.exports = FinalGradeController;