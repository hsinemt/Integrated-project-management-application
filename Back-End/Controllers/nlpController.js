const express = require('express');
const router = express.Router();
const ChoixModel = require('../Models/Choix');
const ProjectModel = require('../Models/Project');
const GroupeModel = require('../Models/Group');

let model;
let pipeline;

// Load the model using dynamic import
async function loadModel() {
    const transformers = await import('@xenova/transformers');
    pipeline = transformers.pipeline;
    model = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
}
loadModel();

function cosineSimilarity(vecA, vecB) {
    const dotProduct = vecA.reduce((sum, a, idx) => sum + a * vecB[idx], 0);
    const normA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
    const normB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
    return dotProduct / (normA * normB);
}

async function rankMotivations(motivations, projectDescription) {
    if (!model) {
        console.error("Model is not loaded yet.");
        return [];
    }

    const projectEmbedding = (await model(projectDescription, { pooling: 'mean', normalize: true })).data;

    const scoredMotivations = await Promise.all(
        motivations.map(async (motivation) => {
            const motivationEmbedding = (await model(motivation.motivation, { pooling: 'mean', normalize: true })).data;
            const score = cosineSimilarity(motivationEmbedding, projectEmbedding);
            return { ...motivation, score };
        })
    );

    return scoredMotivations.sort((a, b) => b.score - a.score);
}

router.get('/project/:projectId/top-motivations', async (req, res) => {
    try {
        const { projectId } = req.params;

        const project = await ProjectModel.findById(projectId);
        if (!project || !project.description) {
            return res.status(404).json({ message: "Project not found or missing description" });
        }

        const choix = await ChoixModel.find({ 'list_projects.id_project': projectId });

        const motivations = choix.flatMap(c =>
            c.list_projects
                .filter(p => p.id_project.toString() === projectId)
                .map(p => ({
                    id_group: c._id,
                    motivation: p.motivation,
                    project_name: project.title,
                    project_id: projectId,
                    group_name: c.nom_groupe,
                })));

        const rankedMotivations = await rankMotivations(motivations, project.description);

        res.json(rankedMotivations);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
});

router.post('/:projectId/assign', async (req, res) => {
    try {
        const { projectId } = req.params;
        const { groupId } = req.body;

        const group = await GroupeModel.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        group.id_project = projectId;
        await group.save();

        res.json({ message: 'Project assigned successfully!' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;