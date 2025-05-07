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

interface QuizQuestion {
    question: string;
    correctAnswer: string;
    explanation: string;
}

interface TaskBoardProps {}

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

        const responseText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        const durationPattern = /\b(\d+)\s*(hours?|minutes?|days?)\b/i;
        const match = responseText?.match(durationPattern);
        return match ? match[0] : 'Unknown';
    } catch (error) {
        console.error('Error calling Gemini API:', error);
        return 'Unknown';
    }
};

const TaskBoard: React.FC<TaskBoardProps> = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [projectName, setProjectName] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedPriority, setSelectedPriority] = useState<string>('All');
    const [updatedTasks, setUpdatedTasks] = useState<Map<string, string>>(new Map());
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
    const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
    const [quizTaskId, setQuizTaskId] = useState<string | null>(null);
    const [quizAnswers, setQuizAnswers] = useState<string[]>(Array(5).fill(''));
    const [quizFeedback, setQuizFeedback] = useState<any>(null);

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

                const response = await axios.get('http://localhost:9777/user/profilegroupe', {
                    headers: {
                        Authorization: `${token}`,
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
            } catch (error) {
                console.error('Error uploading image:', error);
                alert('Failed to upload the image. Please try again.');
            }
        }
    };

    const openImageModal = (image: string) => {
        setSelectedImage(image);
        setIsImageModalOpen(true);
    };

    const closeImageModal = () => {
        setIsImageModalOpen(false);
        setSelectedImage(null);
    };

    const launchQuiz = async () => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Please log in to start a quiz.');
                return;
            }

            // Select the first task assigned to the logged-in user (simplified logic)
            const userTask = tasks.find(task => task.assignedTo); // Adjust based on how you identify the logged-in user
            if (!userTask) {
                alert('No tasks assigned to you.');
                return;
            }

            const taskId = userTask._id;
            const response = await axios.get(`http://localhost:9777/api/quiz/${taskId}/generate`, {
                headers: {
                    Authorization: `${token}`,
                },
            });
            setQuizQuestions(response.data.questions);
            setQuizTaskId(taskId);
            setQuizAnswers(Array(5).fill(''));
            setQuizFeedback(null);
            setIsQuizModalOpen(true);
        } catch (error) {
            console.error('Error generating quiz:', error);
            alert('Failed to generate quiz. Please try again.');
        }
    };

    const handleQuizAnswerChange = (index: number, value: string) => {
        setQuizAnswers((prev) => {
            const newAnswers = [...prev];
            newAnswers[index] = value;
            return newAnswers;
        });
    };

    const submitQuiz = async () => {
        if (!quizTaskId) return;

        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(
                `http://localhost:9777/api/quiz/${quizTaskId}/submit`,
                { answers: quizAnswers },
                {
                    headers: {
                        Authorization: `${token}`,
                    },
                }
            );
            setQuizFeedback(response.data);
        } catch (error) {
            console.error('Error submitting quiz:', error);
            alert('Failed to submit quiz. Please try again.');
        }
    };

    const closeQuizModal = () => {
        setIsQuizModalOpen(false);
        setQuizQuestions([]);
        setQuizTaskId(null);
        setQuizAnswers([]);
        setQuizFeedback(null);
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
                                <button className="btn btn-primary ml-2" onClick={launchQuiz}>Lancer Quiz</button>
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
                                            openModal={openImageModal}
                                            ref={toDoTasksRef}
                                        />
                                        <TaskColumn
                                            etat="In Progress"
                                            tasks={filteredTasks.filter(task => task.état === 'In Progress')}
                                            handleImageChange={handleImageChange}
                                            openModal={openImageModal}
                                            ref={inProgressTasksRef}
                                        />
                                        <TaskColumn
                                            etat="In Review"
                                            tasks={filteredTasks.filter(task => task.état === 'In Review')}
                                            handleImageChange={handleImageChange}
                                            openModal={openImageModal}
                                            ref={inReviewTasksRef}
                                        />
                                        <TaskColumn
                                            etat="Completed"
                                            tasks={filteredTasks.filter(task => task.état === 'Completed')}
                                            handleImageChange={handleImageChange}
                                            openModal={openImageModal}
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
                isOpen={isImageModalOpen}
                onRequestClose={closeImageModal}
                contentLabel="Image Modal"
                className={styles.modal}
                overlayClassName="overlay"
            >
                <button onClick={closeImageModal} className="close-button">Close</button>
                {selectedImage && <img src={selectedImage} alt="Full Size" className="full-size-image" />}
            </Modal>

            <Modal 
                isOpen={isQuizModalOpen}
                onRequestClose={closeQuizModal}
                contentLabel="Quiz Modal"
                className={styles.modal}
                overlayClassName="overlay"
            >
                <div className="p-4">
                    <h2 className="mb-4">Task Quiz</h2>
                    {quizFeedback ? (
                        <div>
                            <h3>Results</h3>
                            <p>Score: {quizFeedback.score} / {quizFeedback.maxScore}</p>
                            {quizFeedback.feedback.map((fb: any, index: number) => (
                                <div key={index} className="mb-3">
                                    <p><strong>Question {index + 1}:</strong> {quizQuestions[index]?.question}</p>
                                    <p><strong>Your Answer:</strong> {quizAnswers[index]}</p>
                                    <p><strong>Correct Answer:</strong> {quizFeedback.correctAnswers[index]}</p>
                                    <p><strong>Feedback:</strong> {fb.explanation}</p>
                                    <p><strong>Status:</strong> {fb.isCorrect ? 'Correct' : 'Incorrect'}</p>
                                </div>
                            ))}
                            <button className="btn btn-primary mt-3" onClick={closeQuizModal}>Close</button>
                        </div>
                    ) : (
                        <div>
                            {quizQuestions.map((q, index) => (
                                <div key={index} className="mb-3">
                                    <p><strong>Question {index + 1}:</strong> {q.question}</p>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={quizAnswers[index]}
                                        onChange={(e) => handleQuizAnswerChange(index, e.target.value)}
                                        placeholder="Your answer"
                                    />
                                </div>
                            ))}
                            <button className="btn btn-primary mt-3" onClick={submitQuiz}>Submit Quiz</button>
                            <button className="btn btn-secondary mt-3 ml-2" onClick={closeQuizModal}>Cancel</button>
                        </div>
                    )}
                </div>
            </Modal>
        </>
    );
};

export default TaskBoard;