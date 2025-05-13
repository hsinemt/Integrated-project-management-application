import React, { useState, useEffect } from 'react';
import type { FinalGrade } from "./FinalGrade";

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
    initialData?: FinalGrade;
}

const FinalGradeModal: React.FC<FinalGradeModalProps> = ({
                                                             isOpen,
                                                             onClose,
                                                             onSave,
                                                             initialData
                                                         }) => {
    const [customGrade, setCustomGrade] = useState({ score: 0, weight: 0 });
    const [weights, setWeights] = useState({
        quizWeight: 25,
        progressWeight: 25,
        gitWeight: 25,
        codeWeight: 25
    });
    const [totalWeight, setTotalWeight] = useState(100);

    useEffect(() => {
        if (initialData) {
            setCustomGrade(initialData.customGrade || { score: 0, weight: 0 });
            setWeights(initialData.weights || {
                quizWeight: 25,
                progressWeight: 25,
                gitWeight: 25,
                codeWeight: 25
            });
        }
    }, [initialData]);

    useEffect(() => {
        const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0) + customGrade.weight;
        setTotalWeight(total);
    }, [weights, customGrade.weight]);

    const handleWeightChange = (key: keyof typeof weights, value: number) => {
        setWeights(prev => ({
            ...prev,
            [key]: Math.max(0, Math.min(100, value))
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ customGrade, weights });
    };

    if (!isOpen) return null;

    // @ts-ignore
    // @ts-ignore
    return (
        <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">
                            {initialData ? `Configure Grades for ${initialData.studentId}` : 'Configure Grades'}
                        </h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        <form onSubmit={handleSubmit}>
                            <div className="row mb-4">
                                <div className="col-md-6">
                                    <div className="card h-100">
                                        <div className="card-header">
                                            <h6>Custom Grade</h6>
                                        </div>
                                        <div className="card-body">
                                            <div className="mb-3">
                                                <label className="form-label">Score (0-20)</label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    min="0"
                                                    max="20"
                                                    step="0.1"
                                                    value={customGrade.score}
                                                    onChange={(e) => setCustomGrade({
                                                        ...customGrade,
                                                        score: parseFloat(e.target.value) || 0
                                                    })}
                                                />
                                            </div>
                                            <div className="mb-3">
                                                <label className="form-label">Weight (%)</label>
                                                <input
                                                    type="number"
                                                    className="form-control"
                                                    min="0"
                                                    max="100"
                                                    value={customGrade.weight}
                                                    onChange={(e) => setCustomGrade({
                                                        ...customGrade,
                                                        weight: parseFloat(e.target.value) || 0
                                                    })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="card h-100">
                                        <div className="card-header d-flex justify-content-between">
                                            <h6>Component Weights</h6>
                                            <span className={`badge ${totalWeight === 100 ? 'bg-success' : 'bg-warning'}`}>
                                                Total: {totalWeight}%
                                            </span>
                                        </div>
                                        <div className="card-body">
                                            {(['quizWeight', 'progressWeight', 'gitWeight', 'codeWeight'] as const).map((key) => (
                                                <div className="mb-3" key={key}>
                                                    <label className="form-label">
                                                        {key.replace('Weight', '')} (%)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        className="form-control"
                                                        min="0"
                                                        max="100"
                                                        value={weights[key]}
                                                        onChange={(e) => handleWeightChange(key, parseFloat(e.target.value) || 0)}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {initialData?.averages && (
                                <div className="card mb-4">
                                    <div className="card-header">
                                        <h6>Grade Calculation Preview</h6>
                                    </div>
                                    <div className="card-body">
                                        <table className="table table-sm">
                                            <thead>
                                            <tr>
                                                <th>Component</th>
                                                <th>Average</th>
                                                <th>Weight</th>
                                                <th>Contribution</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {([
                                                { key: 'quiz', label: 'Quiz' },
                                                { key: 'progress', label: 'Progress' },
                                                { key: 'git', label: 'Git' },
                                                { key: 'code', label: 'Code' },
                                            ] as const).map(({ key, label }) => <tr key={key}>
                                                <td>{label}</td>
                                                <td>{initialData.averages?.[key]?.toFixed(2)}</td>
                                                <td>{weights[`${key}Weight`]}%</td>

                                            </tr>)}
                                            <tr>
                                                <td>Custom Grade</td>
                                                <td>{customGrade.score.toFixed(2)}</td>
                                                <td>{customGrade.weight}%</td>
                                                <td>{(customGrade.score * customGrade.weight / 100).toFixed(2)}</td>
                                            </tr>
                                            <tr className="table-primary">
                                                <td colSpan={3}><strong>Final Grade (20)</strong></td>
                                                <td>
                                                    <strong>
                                                        {(
                                                            (initialData.averages.quiz * weights.quizWeight / 100) +
                                                            (initialData.averages.progress * weights.progressWeight / 100) +
                                                            (initialData.averages.git * weights.gitWeight / 100) +
                                                            (initialData.averages.code * weights.codeWeight / 100) +
                                                            (customGrade.score * customGrade.weight / 100)
                                                        ).toFixed(2)}
                                                    </strong>
                                                </td>
                                            </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={onClose}>
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={totalWeight !== 100}
                                    title={totalWeight !== 100 ? 'Total weights must equal 100%' : ''}
                                >
                                    Save Configuration
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