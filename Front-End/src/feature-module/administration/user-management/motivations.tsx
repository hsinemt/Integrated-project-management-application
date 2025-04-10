import React, { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import Table from '../../../core/common/dataTable';

type Motivation = {
    id_group: string;
    score: number;
    motivation: string;
    project_name: string;
    project_id: string;
    group_name: string;
};

const MotivationsTable = () => {
    const { projectId } = useParams();
    const [motivations, setMotivations] = useState<Motivation[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch ranked motivations for the project
    const fetchMotivations = () => {
        if (projectId) {
            setLoading(true);
            fetch(`http://localhost:9777/nlp/project/${projectId}/top-motivations`)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then((data) => {
                    const dataWithKeys = data.map((item: Motivation) => ({
                        ...item,
                        key: item.id_group,
                    }));
                    setMotivations(dataWithKeys);
                    setLoading(false);
                })
                .catch((error) => {
                    console.error('Error fetching motivations:', error);
                    setLoading(false);
                });
        }
    };

    useEffect(() => {
        fetchMotivations();
    }, [projectId]);

    // Assign project to a group
    const assignProject = (groupId: string) => {
        const isAlreadyAssigned = motivations.some(
            (motivation) => motivation.project_id === projectId
        );

        if (isAlreadyAssigned) {
            const shouldReassign = window.confirm(
                'This group is already assigned to a project. Do you want to continue?'
            );

            if (!shouldReassign) {
                return;
            }
        }

        fetch(`http://localhost:9777/nlp/${projectId}/assign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ groupId }),
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(() => {
                alert('Project assigned successfully!');
                fetchMotivations(); // Refresh the data
            })
            .catch((error) => {
                console.error('Error assigning project:', error);
                alert('Failed to assign project. Please try again.');
            });
    };

    // Table columns
    const columns = [
        {
            title: 'Group Name',
            dataIndex: 'group_name',
            render: (text: string, record: Motivation) => (
                <div className="d-flex align-items-center file-name-icon">
                    <div className="ms-2">
                        <h6 className="fw-medium">
                            <Link to="#">{text}</Link>
                        </h6>
                    </div>
                </div>
            ),
        },
        {
            title: 'Project Name',
            dataIndex: 'project_name',
        },
        {
            title: 'Motivation',
            dataIndex: 'motivation',
        },
        {
            title: 'Motivation Score',
            dataIndex: 'score',
            render: (text: number) => text.toFixed(2),
        },
        {
            title: 'Actions',
            dataIndex: 'actions',
            render: (text: any, record: Motivation) => (
                <button
                    className="btn btn-sm btn-primary"
                    onClick={() => assignProject(record.id_group)}
                >
                    Assign Project
                </button>
            ),
        },
    ];

    return (
        <div className="page-wrapper">
            <div className="content">
                <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
                    <div className="my-auto mb-2">
                        <h2 className="mb-1">Motivations Score</h2>
                        <nav>
                            <ol className="breadcrumb mb-0">
                                <li className="breadcrumb-item">
                                    <Link to="/adminDashboard">
                                        <i className="ti ti-smart-home" />
                                    </Link>
                                </li>
                                <li className="breadcrumb-item">Administration</li>
                                <li className="breadcrumb-item active" aria-current="page">
                                    Motivations Score
                                </li>
                            </ol>
                        </nav>
                    </div>
                </div>
                <div className="card">
                    <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
                        <h5>Motivations List</h5>
                    </div>
                    <div className="card-body p-0">
                        {loading ? (
                            <div>Loading...</div>
                        ) : motivations.length === 0 ? (
                            <div>No data found.</div>
                        ) : (
                            <Table dataSource={motivations} columns={columns} />
                        )}
                    </div>
                </div>
            </div>
            <div className="footer d-sm-flex align-items-center justify-content-between border-top bg-white p-3">
                <p className="mb-0">2014 - 2025 © SmartHR.</p>
                <p>
                    Designed & Developed By{' '}
                    <Link to="#" className="text-primary">
                        Hunters
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default MotivationsTable;