// components/TaskBoard.tsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import dragula from 'dragula';
import 'dragula/dist/dragula.css';
import Modal from 'react-modal';
import styles from "./page.module.css";
import TaskColumn from './TaskColumn';

Modal.setAppElement('#root');

interface Task {
    _id: string;
    name: string;
    description: string;
    priority: string;
    date: string;
    état: string;
    image: string;
    estimatedTime: string;
    assignedTo: {
        name: string;
        lastname: string;
    };
}

interface Project {
    name: string;
    tasks: Task[];
}




const getEstimatedTimeFromGemini = async (task: { description: string; priority: string }): Promise<string> => {
    try {
        const response = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyA6INUs4kDr4xGtLPQlBt8aiPFsRQZLhFE`,
            {
                contents: [
                    {
                        parts: [{ text: `Estimate time for task: ${task.description} with priority ${task.priority}.` }],
                    },
                ],
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                },
            }
        );

        console.log('Gemini API response:', response.data);

        // Extract the response content text
        const responseText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

        // Define a regex pattern to match durations (e.g., "3 hours", "2 days", "45 minutes")
        const durationPattern = /\b(\d+)\s*(hours?|minutes?|days?)\b/i;

        // Find the duration match using regex
        const match = responseText?.match(durationPattern);

        // If a match is found, return the duration, otherwise return 'Unknown'
        return match ? match[0] : 'Unknown';
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        return 'Unknown';
    }
};



const TaskBoard = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projectName, setProjectName] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedPriority, setSelectedPriority] = useState<string>('All');
    const [updatedTasks, setUpdatedTasks] = useState<Map<string, string>>(new Map());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const toDoTasksRef = useRef<HTMLDivElement>(null);
    const inProgressTasksRef = useRef<HTMLDivElement>(null);
    const inReviewTasksRef = useRef<HTMLDivElement>(null);
    const completedTasksRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const token = localStorage.getItem('token');

                if (!token) {
                    console.error('No token found in localStorage');
                    setLoading(false);
                    return;
                }
    
                // Make the API request using the token from localStorage
                const response = await axios.get('http://localhost:9777/user/profilegroupe', {
                    headers: {
                        Authorization: `${token}`, // Use the token from localStorage
                    },
                });
                const tasksWithEstimatedTime = await Promise.all(response.data.tasks.map(async (task: Task) => {
                    const estimatedTime = await getEstimatedTimeFromGemini(task);
                    return {
                        ...task,
                        estimatedTime,
                    };
                }));
    
                setTasks(tasksWithEstimatedTime);
                if (response.data.projects && response.data.projects.length > 0) {
                    setProjectName(response.data.projects[0].title);
                }
                setLoading(false);
            } catch (error) {
                console.error('Error fetching tasks:', error);
                setLoading(false);
            }
        };
    
        fetchTasks();
    }, []);

    useEffect(() => {
        const containers = [
            toDoTasksRef.current,
            inProgressTasksRef.current,
            inReviewTasksRef.current,
            completedTasksRef.current,
        ].filter((container) => container !== null) as HTMLDivElement[];

        const drake = dragula(containers);

        drake.on('drop', (el, target) => {
            const taskId = el.getAttribute('data-task-id');
            const newEtat = target.getAttribute('data-etat');

            if (taskId && newEtat) {
                setUpdatedTasks((prev) => new Map(prev).set(taskId, newEtat));
            }
        });

        return () => {
            drake.destroy();
        };
    }, [tasks]);

    const saveTaskStatusChanges = async () => {
        try {
            const statusUpdates = Array.from(updatedTasks.entries()).map(([taskId, newEtat]) =>
                axios.put(`http://localhost:9777/api/tasks/tasks/${taskId}/status`, { etat: newEtat })
            );
            await Promise.all(statusUpdates);
            window.location.reload();
        } catch (error) {
            console.error('Error saving task status changes:', error);
        }
    };

    const handleImageChange = async (taskId: string, event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const formData = new FormData();
            formData.append('image', file);

            try {
                const response = await axios.put(
                    `http://localhost:9777/api/tasks/tasks/${taskId}/image`,
                    formData,
                    {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                        },
                    }
                );

                const updatedTask = response.data;
                setTasks((prevTasks) =>
                    prevTasks.map((task) =>
                        task._id === taskId ? { ...task, image: updatedTask.image } : task
                    )
                );

                console.log('Image uploaded successfully:', updatedTask);
            } catch (error) {
                console.error('Error uploading image:', error);
                alert('Failed to upload the image. Please try again.');
            }
        }
    };

    const openModal = (image: string) => {
        setSelectedImage(image);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedImage(null);
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    const totalTasks = tasks.length;
    const toDoTasks = tasks.filter(task => task.état === 'To Do').length;
    const inProgressTasks = tasks.filter(task => task.état === 'In Progress').length;
    const inReviewTasks = tasks.filter(task => task.état === 'In Review').length;
    const completedTasks = tasks.filter(task => task.état === 'Completed').length;

    const filteredTasks = tasks.filter(task =>
        (selectedPriority === 'All' || task.priority === selectedPriority) &&
        (task.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <>
            <div className="page-wrapper">
                <div className="content">
                    <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
                        <div className="my-auto mb-2">
                            <h2 className="mb-1">{projectName}</h2>
                            <nav>
                                <ol className="breadcrumb mb-0">
                                    <li className="breadcrumb-item">
                                        <Link to="index.html">
                                            <i className="ti ti-smart-home" />
                                        </Link>
                                    </li>
                                    <li className="breadcrumb-item">Projects</li>
                                    <li className="breadcrumb-item active" aria-current="page">
                                        Task Board
                                    </li>
                                </ol>
                            </nav>
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
                            <h4>{projectName}</h4>
                            <div className="d-flex align-items-center flex-wrap row-gap-3">
                                <div className="avatar-list-stacked avatar-group-sm me-3">
                                    <span className="avatar avatar-rounded">
                                        <img className="border border-white" src="assets/img/profiles/avatar-19.jpg" alt="img" />
                                    </span>
                                    <span className="avatar avatar-rounded">
                                        <img className="border border-white" src="assets/img/profiles/avatar-29.jpg" alt="img" />
                                    </span>
                                    <span className="avatar avatar-rounded">
                                        <img className="border border-white" src="assets/img/profiles/avatar-16.jpg" alt="img" />
                                    </span>
                                    <span className="avatar avatar-rounded bg-primary fs-12">1+</span>
                                </div>
                                <div className="d-flex align-items-center me-3">
                                    <p className="mb-0 me-3 pe-3 border-end fs-14">
                                        Total Task : <span className="text-dark">{totalTasks}</span>
                                    </p>
                                    <p className="mb-0 me-3 pe-3 border-end fs-14">
                                        In Progress : <span className="text-dark">{inProgressTasks}</span>
                                    </p>
                                    <p className="mb-0 me-3 pe-3 border-end fs-14">
                                        In Review : <span className="text-dark">{inReviewTasks}</span>
                                    </p>
                                    <p className="mb-0 fs-14">
                                        Completed : <span className="text-dark">{completedTasks}</span>
                                    </p>
                                </div>
                                <div className="input-icon-start position-relative">
                                    <span className="input-icon-addon">
                                        <i className="ti ti-search" />
                                    </span>
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="Search Project"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="card-body">
                            <div className="row">
                                <div className="col-lg-4">
                                    <div className="d-flex align-items-center flex-wrap row-gap-3 mb-3">
                                        <h6 className="me-2">Priority</h6>
                                        <ul className="nav nav-pills border d-inline-flex p-1 rounded bg-light todo-tabs" id="pills-tab" role="tablist">
                                            <li className="nav-item" role="presentation">
                                                <button className={`nav-link ${selectedPriority === 'All' ? 'active' : ''}`} onClick={() => setSelectedPriority('All')}>All</button>
                                            </li>
                                            <li className="nav-item" role="presentation">
                                                <button className={`nav-link ${selectedPriority === 'High' ? 'active' : ''}`} onClick={() => setSelectedPriority('High')}>High</button>
                                            </li>
                                            <li className="nav-item" role="presentation">
                                                <button className={`nav-link ${selectedPriority === 'Medium' ? 'active' : ''}`} onClick={() => setSelectedPriority('Medium')}>Medium</button>
                                            </li>
                                            <li className="nav-item" role="presentation">
                                                <button className={`nav-link ${selectedPriority === 'Low' ? 'active' : ''}`} onClick={() => setSelectedPriority('Low')}>Low</button>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                                <div className="col-lg-8">
                                    {/* Additional content can go here */}
                                </div>
                            </div>
                            <div className="tab-content" id="pills-tabContent">
                                <div className="tab-pane fade show active" id="pills-all" role="tabpanel">
                                    <div className="d-flex align-items-start overflow-auto project-status pb-4">
                                        <TaskColumn
                                            etat="To Do"
                                            tasks={filteredTasks.filter(task => task.état === 'To Do')}
                                            handleImageChange={handleImageChange}
                                            openModal={openModal}
                                            ref={toDoTasksRef}
                                        />
                                        <TaskColumn
                                            etat="In Progress"
                                            tasks={filteredTasks.filter(task => task.état === 'In Progress')}
                                            handleImageChange={handleImageChange}
                                            openModal={openModal}
                                            ref={inProgressTasksRef}
                                        />
                                        <TaskColumn
                                            etat="In Review"
                                            tasks={filteredTasks.filter(task => task.état === 'In Review')}
                                            handleImageChange={handleImageChange}
                                            openModal={openModal}
                                            ref={inReviewTasksRef}
                                        />
                                        <TaskColumn
                                            etat="Completed"
                                            tasks={filteredTasks.filter(task => task.état === 'Completed')}
                                            handleImageChange={handleImageChange}
                                            openModal={openModal}
                                            ref={completedTasksRef}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="d-flex justify-content-end mt-3">
                                <button className="btn btn-primary" onClick={saveTaskStatusChanges}>Save</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <Modal 
                isOpen={isModalOpen}
                onRequestClose={closeModal}
                contentLabel="Image Modal"
                className={styles.modal}
                overlayClassName="overlay"
            >
                <button onClick={closeModal} className="close-button">Close</button>
                {selectedImage && <img src={selectedImage} alt="Full Size" className="full-size-image" />}
            </Modal>
        </>
    );
};

export default TaskBoard;