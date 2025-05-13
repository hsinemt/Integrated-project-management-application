// utils/gitEvaluator.js
const validCommitTypes = ['feat', 'fix', 'refactor', 'chore', 'test', 'docs', 'style', 'perf', 'ci', 'build'];

function evaluateCommits(commits) {
    if (!commits || !Array.isArray(commits)) {
        return {
            noteGit: 0,
            evaluationDetails: {
                validCommits: 0,
                totalCommits: 0,
                baseScore: 0,
                bonusScore: 0,
                finalScore: 0,
                message: 'Aucun commit à évaluer'
            }
        };
    }

    const commitPattern = /^(feat|fix|refactor|chore|test|docs|style|perf|ci|build)(\([^)]+\))?!?\s*:\s*.+$/i;

    let validCount = 0;
    let bonusPoints = 0;
    const maxBonus = 5;

    commits.forEach(commit => {
        if (!commit.message) return;

        const message = commit.message.trim();
        const isValid = commitPattern.test(message);

        if (isValid) {
            validCount++;

            // Bonus pour format parfait (sans espace avant :)
            if (/^(feat|fix|refactor|chore|test|docs|style|perf|ci|build)(\([^)]+\))?!?:\s.+$/i.test(message)) {
                bonusPoints += 0.5;
            }

            // Bonus pour présence d'un scope
            if (/\(.+\)/.test(message)) {
                bonusPoints += 0.5;
            }
        }
    });

    // Calcul des scores
    const baseScore = (validCount / commits.length) * 15; // 15 points max
    const totalBonus = Math.min(bonusPoints, maxBonus); // Limit bonus to 5
    const totalScore = Math.min(Math.round(baseScore + totalBonus), 20); // Cap at 20

    return {
        noteGit: totalScore,
        evaluationDetails: {
            validCommits: validCount,
            totalCommits: commits.length,
            baseScore: parseFloat(baseScore.toFixed(2)),
            bonusScore: parseFloat(totalBonus.toFixed(2)),
            finalScore: totalScore,
            message: `Détail du calcul: Commits valides: ${validCount}/${commits.length} - Note de base: ${baseScore.toFixed(2)}/15 - Bonus: ${totalBonus.toFixed(2)}/5 - Note finale: ${totalScore}/20`
        }
    };
}

module.exports = {evaluateCommits};