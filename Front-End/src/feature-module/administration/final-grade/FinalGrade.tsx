import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Table from '../../../core/common/dataTable';
import axios from 'axios';
import FinalGradeModal from './FinalGradeModal';

export type FinalGrade = {
    studentId: string;
    projectId: string;
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
    finalGrade: number;
    averages?: {
        quiz: number;
        progress: number;
        git: number;
        code: number;
    };
};

const FinalGradeComponent = () => {
    const [grades, setGrades] = useState<FinalGrade[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
    const { projectId } = useParams<{ projectId: string }>();

    useEffect(() => {
        if (projectId) {
            fetchGrades();
        }
    }, [projectId]);

    const fetchGrades = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/api/projects/${projectId}/final-grades`);
            setGrades(response.data);
        } catch (error) {
            console.error('Error fetching grades:', error);
            // Fallback data for demonstration
            setGrades([
                {
                    studentId: 'student1',
                    projectId: projectId || '',
                    customGrade: { score: 0, weight: 0 },
                    weights: { quizWeight: 30, progressWeight: 20, gitWeight: 10, codeWeight: 40 },
                    finalGrade: 0,
                    averages: { quiz: 75, progress: 80, git: 90, code: 85 }
                },
                {
                    studentId: 'student2',
                    projectId: projectId || '',
                    customGrade: { score: 0, weight: 0 },
                    weights: { quizWeight: 30, progressWeight: 20, gitWeight: 10, codeWeight: 40 },
                    finalGrade: 0,
                    averages: { quiz: 65, progress: 70, git: 80, code: 75 }
                }
            ]);
        } finally {
            setLoading(false);
        }
    };

    const calculateFinalGrade = (averages: any, weights: any, customGrade: any) => {
        const totalWeight = weights.quizWeight + weights.progressWeight + weights.gitWeight + weights.codeWeight + customGrade.weight;

        if (totalWeight !== 100) {
            console.warn(`Total weights sum to ${totalWeight}% (should be 100%)`);
        }

        const weightedSum =
            (averages.quiz * weights.quizWeight / 100) +
            (averages.progress * weights.progressWeight / 100) +
            (averages.git * weights.gitWeight / 100) +
            (averages.code * weights.codeWeight / 100) +
            (customGrade.score * customGrade.weight / 100);

        return Math.min(20, weightedSum); // Ensure grade doesn't exceed 20
    };

    const handleSaveGrades = async (studentId: string, data: {
        customGrade: { score: number; weight: number };
        weights: {
            quizWeight: number;
            progressWeight: number;
            gitWeight: number;
            codeWeight: number;
        };
    }) => {
        try {
            const studentIndex = grades.findIndex(g => g.studentId === studentId);
            if (studentIndex === -1) return;

            const updatedGrades = [...grades];
            const studentData = updatedGrades[studentIndex];

            // Update weights and custom grade
            studentData.weights = data.weights;
            studentData.customGrade = data.customGrade;

            // Calculate new final grade if averages exist
            if (studentData.averages) {
                studentData.finalGrade = calculateFinalGrade(
                    studentData.averages,
                    data.weights,
                    data.customGrade
                );
            }

            setGrades(updatedGrades);

            // API call to save changes
            await axios.put(`/api/projects/${projectId}/final-grades/${studentId}`, {
                weights: data.weights,
                customGrade: data.customGrade,
                finalGrade: studentData.finalGrade
            });

            setIsModalOpen(false);
        } catch (error) {
            console.error('Error saving grades:', error);
        }
    };

    const columns = [
        {
            title: 'Student ID',
            dataIndex: 'studentId',
            key: 'studentId',
        },
        {
            title: 'Quiz (20)',
            dataIndex: ['averages', 'quiz'],
            key: 'quiz',
            render: (text: number) => text?.toFixed(2) || 'N/A',
        },
        {
            title: 'Progress (20)',
            dataIndex: ['averages', 'progress'],
            key: 'progress',
            render: (text: number) => text?.toFixed(2) || 'N/A',
        },
        {
            title: 'Git (20)',
            dataIndex: ['averages', 'git'],
            key: 'git',
            render: (text: number) => text?.toFixed(2) || 'N/A',
        },
        {
            title: 'Code (20)',
            dataIndex: ['averages', 'code'],
            key: 'code',
            render: (text: number) => text?.toFixed(2) || 'N/A',
        },
        {
            title: 'Custom Grade',
            key: 'customGrade',
            render: (_: any, record: FinalGrade) => (
                <span>
                    {record.customGrade.score?.toFixed(2)} ({(record.customGrade.weight)}%)
                </span>
            ),
        },
        {
            title: 'Final Grade (20)',
            dataIndex: 'finalGrade',
            key: 'finalGrade',
            render: (text: number) => (
                <strong>{text?.toFixed(2) || 'N/A'}</strong>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: FinalGrade) => (
                <button
                    className="btn btn-sm btn-primary"
                    onClick={() => {
                        setSelectedStudent(record.studentId);
                        setIsModalOpen(true);
                    }}
                >
                    Configure
                </button>
            ),
        },
    ];

    return (
        <div className="page-wrapper">
            <div className="content container-fluid">
                <div className="page-header">
                    <div className="row align-items-center">
                        <div className="col">
                            <h3 className="page-title">Final Grades</h3>
                            <p className="text-muted">
                                Configure grading weights and custom grades for each student
                            </p>
                        </div>
                    </div>
                </div>

                <div className="row">
                    <div className="col-sm-12">
                        <div className="card">
                            <div className="card-body">
                                <Table
                                    columns={columns}
                                    dataSource={grades}
                                    loading={loading}
                                    rowKey="studentId"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <FinalGradeModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={(data) => {
                    if (selectedStudent) {
                        handleSaveGrades(selectedStudent, data);
                    }
                }}
                initialData={selectedStudent ? grades.find(g => g.studentId === selectedStudent) : undefined}
            />
        </div>
    );
};

export default FinalGradeComponent;