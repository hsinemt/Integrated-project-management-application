import React, { useState } from 'react';

interface FinalGradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: {
        customGrade: {
            score: number;
            weight: number;
        };
        weights: {
            quizWeight: number;
            progressWeight: number;
            gitWeight: number;
            codeWeight: number;
        };
    }) => void;
    initialData?: {
        customGrade: {
            score: number;
            weight: number;
        };
        weights: {
            quizWeight: number;
            progressWeight: number;
            gitWeight: number;
            codeWeight: number;
        };
    };
}

const FinalGradeModal: React.FC<FinalGradeModalProps> = ({
    isOpen,
    onClose,
    onSave,
    initialData
}) => {
    const [customGrade, setCustomGrade] = useState(initialData?.customGrade || { score: 0, weight: 0 });
    const [weights, setWeights] = useState(initialData?.weights || {
        quizWeight: 25,
        progressWeight: 25,
        gitWeight: 25,
        codeWeight: 25
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ customGrade, weights });
    };

    if (!isOpen) return null;

    return (
        <div className="modal fade show" style={{ display: 'block' }}>
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Configure Final Grade</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        <form onSubmit={handleSubmit}>
                            <div className="row">
                                <div className="col-md-6">
                                    <div className="mb-3">
                                        <label className="form-label">Custom Grade Score (0-20)</label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            min="0"
                                            max="20"
                                            value={customGrade.score}
                                            onChange={(e) => setCustomGrade({
                                                ...customGrade,
                                                score: parseFloat(e.target.value)
                                            })}
                                        />
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="mb-3">
                                        <label className="form-label">Custom Grade Weight (%)</label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            min="0"
                                            max="100"
                                            value={customGrade.weight}
                                            onChange={(e) => setCustomGrade({
                                                ...customGrade,
                                                weight: parseFloat(e.target.value)
                                            })}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-md-6">
                                    <div className="mb-3">
                                        <label className="form-label">Quiz Weight (%)</label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            min="0"
                                            max="100"
                                            value={weights.quizWeight}
                                            onChange={(e) => setWeights({
                                                ...weights,
                                                quizWeight: parseFloat(e.target.value)
                                            })}
                                        />
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="mb-3">
                                        <label className="form-label">Progress Weight (%)</label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            min="0"
                                            max="100"
                                            value={weights.progressWeight}
                                            onChange={(e) => setWeights({
                                                ...weights,
                                                progressWeight: parseFloat(e.target.value)
                                            })}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="row">
                                <div className="col-md-6">
                                    <div className="mb-3">
                                        <label className="form-label">Git Weight (%)</label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            min="0"
                                            max="100"
                                            value={weights.gitWeight}
                                            onChange={(e) => setWeights({
                                                ...weights,
                                                gitWeight: parseFloat(e.target.value)
                                            })}
                                        />
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="mb-3">
                                        <label className="form-label">Code Weight (%)</label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            min="0"
                                            max="100"
                                            value={weights.codeWeight}
                                            onChange={(e) => setWeights({
                                                ...weights,
                                                codeWeight: parseFloat(e.target.value)
                                            })}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={onClose}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinalGradeModal; 