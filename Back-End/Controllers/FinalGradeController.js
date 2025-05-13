const FinalGrade = require('../Models/FinalGrade');
const Task = require('../Models/tasks');
const CodeMark = require('../Models/CodeMark');

const FinalGradeController = {
    calculateFinalGrade: async (req, res) => {
        try {
            const { studentId, projectId, customGrade, weights } = req.body;

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

            // Check for existing final grade
            let finalGrade = await FinalGrade.findOne({ studentId, projectId });

            // Get all tasks for the student in this project
            const tasks = await Task.find({
                project: projectId,
                assignedTo: studentId
            });

            // Calculate averages
            let totalQuizScore = 0;
            let totalProgressScore = 0;
            let totalGitScore = 0;
            let taskCount = tasks.length;

            tasks.forEach(task => {
                // Quiz score (convert from 100 to 20)
                if (task.quizScore !== undefined) {
                    totalQuizScore += task.quizScore / 5;
                }

                // Progress score (from progressAnalysis)
                if (task.progressAnalysis?.scoreProgress !== undefined) {
                    totalProgressScore += task.progressAnalysis.scoreProgress;
                }

                // Git score
                if (task.noteGit !== undefined) {
                    totalGitScore += task.noteGit;
                }
            });

            const averages = {
                quiz: taskCount > 0 ? totalQuizScore / taskCount : 0,
                progress: taskCount > 0 ? totalProgressScore / taskCount : 0,
                git: taskCount > 0 ? totalGitScore / taskCount : 0
            };

            // Get CodeMark scores
            const codeMarks = await CodeMark.find({
                student: studentId,
                project: projectId
            });

            // Calculate CodeMark average (convert from 100 to 20)
            let totalCodeScore = 0;
            codeMarks.forEach(mark => {
                // Use tutor-reviewed score if available, otherwise automated score
                const score = mark.tutorReview.reviewed ?
                    mark.tutorReview.score :
                    mark.score;
                totalCodeScore += score / 5;
            });

            averages.code = codeMarks.length > 0 ?
                totalCodeScore / codeMarks.length :
                0;

            // Calculate final weighted score
            const finalScore = (
                (averages.quiz * (weights.quizWeight / 100)) +
                (averages.progress * (weights.progressWeight / 100)) +
                (averages.git * (weights.gitWeight / 100)) +
                (averages.code * (weights.codeWeight / 100)) +
                (customGrade.score * (customGrade.weight / 100))
            );

            // Create or update final grade
            if (finalGrade) {
                finalGrade.customGrade = customGrade;
                finalGrade.weights = weights;
                finalGrade.finalGrade = finalScore;
                finalGrade.updatedAt = new Date();
            } else {
                finalGrade = new FinalGrade({
                    studentId,
                    projectId,
                    customGrade,
                    weights,
                    finalGrade: finalScore,
                    averages // Store the component averages
                });
            }

            await finalGrade.save();

            return res.status(200).json({
                success: true,
                data: {
                    finalGrade,
                    averages,
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
            const { studentId, projectId } = req.params;

            const finalGrade = await FinalGrade.findOne({ studentId, projectId })
                .populate('studentId', 'name lastname')
                .populate('projectId', 'title');

            if (!finalGrade) {
                return res.status(404).json({
                    success: false,
                    message: 'Final grade not found'
                });
            }

            // On extrait les champs pour le front
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