// utils/taskAnalyzer.js
const calculateTaskscoreProgress = (task) => {
    if (!task || !task.statusHistory || task.statusHistory.length === 0) {
        return {
            scoreProgress: 0,  // Changed from score to scoreProgress
            details: {
                timeManagement: 0,
                statusEvolution: 0,
                speedBonus: 0,
                isLate: false,
                completionDays: null,
                statusTransitions: 0,
                message: "No status history available"
            }
        };
    }

    const now = new Date();
    const isCompleted = task.état === 'Completed';
    const isLate = isCompleted ? now > new Date(task.date) : false;

    // 1. Time Management (10 points)
    const timeManagement = isCompleted ? (isLate ? 5 : 10) : 0;

    // 2. Status Evolution (7 points max)
    const statusTransitions = task.statusHistory.length - 1;
    const statusEvolution = Math.min(statusTransitions * 1.75, 7);

    // 3. Speed Bonus (3 points max)
    let speedBonus = 0;
    let completionDays = null;

    if (isCompleted) {
        const startDate = task.statusHistory[0].changedAt;
        const endDate = task.statusHistory.find(s => s.status === 'Completed').changedAt;
        completionDays = (endDate - startDate) / (1000 * 60 * 60 * 24); // in days

        speedBonus = completionDays < 1 ? 3 :
            completionDays < 3 ? 1 : 0;
    }

    // Total scoreProgress (20 max)
    const scoreProgress = Math.min(timeManagement + statusEvolution + speedBonus, 20);

    return {
        scoreProgress: Math.round(scoreProgress * 10) / 10, // 1 decimal
        details: {
            timeManagement,
            statusEvolution: parseFloat(statusEvolution.toFixed(2)),
            speedBonus,
            isLate,
            completionDays: completionDays ? parseFloat(completionDays.toFixed(2)) : null,
            statusTransitions,
            lastUpdate: new Date()
        }
    };
};

module.exports = { calculateTaskscoreProgress };