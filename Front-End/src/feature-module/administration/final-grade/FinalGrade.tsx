import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Table from '../../../core/common/dataTable';
import axios from 'axios';
import FinalGradeModal from './FinalGradeModal';

type FinalGrade = {
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
    const { projectId } = useParams();

    useEffect(() => {
        fetchGrades();
    }, [projectId]);

    const fetchGrades = async () => {
        try {
            const response = await axios.get(`/api/final-grade/${projectId}`);
            setGrades(response.data.data);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching grades:', error);
            setLoading(false);
        }
    };

    const calculateGrade = async (studentId: string, gradeData: {
        customGrade: { score: number; weight: number };
        weights: {
            quizWeight: number;
            progressWeight: number;
            gitWeight: number;
            codeWeight: number;
        };
    }) => {
        try {
            const response = await axios.post('/api/final-grade/calculate', {
                studentId,
                projectId,
                ...gradeData
            });
            fetchGrades();
            setIsModalOpen(false);
        } catch (error) {
            console.error('Error calculating grade:', error);
        }
    };

    const handleConfigureGrade = (studentId: string) => {
        setSelectedStudent(studentId);
        setIsModalOpen(true);
    };

    const handleModalSave = (data: {
        customGrade: { score: number; weight: number };
        weights: {
            quizWeight: number;
            progressWeight: number;
            gitWeight: number;
            codeWeight: number;
        };
    }) => {
        if (selectedStudent) {
            calculateGrade(selectedStudent, data);
        }
    };

    const columns = [
        {
            title: 'Student ID',
            dataIndex: 'studentId',
            key: 'studentId',
        },
        {
            title: 'Quiz Average',
            dataIndex: ['averages', 'quiz'],
            key: 'quiz',
            render: (text: number) => text?.toFixed(2) || 'N/A',
        },
        {
            title: 'Progress Average',
            dataIndex: ['averages', 'progress'],
            key: 'progress',
            render: (text: number) => text?.toFixed(2) || 'N/A',
        },
        {
            title: 'Git Average',
            dataIndex: ['averages', 'git'],
            key: 'git',
            render: (text: number) => text?.toFixed(2) || 'N/A',
        },
        {
            title: 'Code Average',
            dataIndex: ['averages', 'code'],
            key: 'code',
            render: (text: number) => text?.toFixed(2) || 'N/A',
        },
        {
            title: 'Final Grade',
            dataIndex: 'finalGrade',
            key: 'finalGrade',
            render: (text: number) => text?.toFixed(2) || 'N/A',
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (text: any, record: FinalGrade) => (
                <button
                    className="btn btn-sm btn-primary"
                    onClick={() => handleConfigureGrade(record.studentId)}
                >
                    Configure Grade
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
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <FinalGradeModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleModalSave}
                initialData={selectedStudent ? grades.find(g => g.studentId === selectedStudent) : undefined}
            />
        </div>
    );
};

export default FinalGradeComponent; 