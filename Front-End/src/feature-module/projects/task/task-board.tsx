import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import dragula from 'dragula';
import 'dragula/dist/dragula.css';
import Modal from 'react-modal';
import styles from "./page.module.css";
import TaskColumn from './TaskColumn';
import Webcam from 'react-webcam';
import io from 'socket.io-client';

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

interface Message {
    _id: string;
    group: string;
    sender: {
        _id: string;
        name: string;
        lastname: string;
        role: string;
    };
    content: string;
    timestamp: string;
}

const socket = io('http://localhost:9777', { autoConnect: false });

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

        const responseText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        const durationPattern = /\b(\d+)\s*(hours?|minutes?|days?)\b/i;
        const match = responseText?.match(durationPattern);
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
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
    const [verificationStatus, setVerificationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isChatExpanded, setIsChatExpanded] = useState(true);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState<string>('');
    const [groupId, setGroupId] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [chatError, setChatError] = useState<string | null>(null);
    const webcamRef = useRef<Webcam>(null);
    const toDoTasksRef = useRef<HTMLDivElement>(null);
    const inProgressTasksRef = useRef<HTMLDivElement>(null);
    const inReviewTasksRef = useRef<HTMLDivElement>(null);
    const completedTasksRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchTasksAndGroup = async () => {
            try {
                const token = localStorage.getItem('token');
                console.log('Token for /user/profilegroupe:', token ? token.substring(0, 20) + '...' : 'No token');
                if (!token) {
                    console.error('No token found in localStorage');
                    setChatError('Veuillez vous connecter pour accéder au chat.');
                    setLoading(false);
                    return;
                }

                const response = await axios.get('http://localhost:9777/user/profilegroupe', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                console.log('Profile group response:', response.data);

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

                const fetchedGroupId = response.data.group?._id;
                const fetchedUserId = response.data.user?._id;
                setGroupId(fetchedGroupId);
                setUserId(fetchedUserId);

                if (fetchedUserId && fetchedGroupId) {
                    socket.auth = { userId: fetchedUserId };
                    socket.connect();
                    console.log('Socket.IO connecting, joining group:', fetchedGroupId, 'with user:', fetchedUserId);
                    socket.emit('joinGroup', { groupId: fetchedGroupId, userId: fetchedUserId });
                } else {
                    console.error('Missing userId or groupId for Socket.IO:', { fetchedUserId, fetchedGroupId });
                    setChatError('Erreur: Impossible de rejoindre le groupe. Données manquantes.');
                }

                setLoading(false);
            } catch (error: any) {
                console.error('Error fetching tasks or group:', error.response?.data || error.message);
                if (error.response?.status === 401) {
                    // Token expired, attempt to use localStorage data
                    const storedUserId = localStorage.getItem('userId');
                    const storedRole = localStorage.getItem('role');
                    if (storedUserId && storedRole) {
                        setUserId(storedUserId);
                        try {
                            // Fetch groups for the user using the new endpoint
                            const groupResponse = await axios.get(`http://localhost:9777/group/by-user/${storedUserId}`);
                            console.log('Fetched groups:', groupResponse.data);
                            if (groupResponse.data.success && groupResponse.data.groups.length > 0) {
                                const fetchedGroupId = groupResponse.data.groups[0]._id;
                                setGroupId(fetchedGroupId);
                                socket.auth = { userId: storedUserId };
                                socket.connect();
                                console.log('Socket.IO connecting, joining group:', fetchedGroupId, 'with user:', storedUserId);
                                socket.emit('joinGroup', { groupId: fetchedGroupId, userId: storedUserId });
                            } else {
                                setChatError('Aucun groupe trouvé pour cet utilisateur.');
                            }
                        } catch (groupError: any) {
                            console.error('Error fetching groups:', groupError.response?.data || groupError.message);
                            setChatError('Erreur lors de la récupération des groupes: ' + (groupError.response?.data?.message || groupError.message));
                        }
                    } else {
                        setChatError('Session expirée. Veuillez vous reconnecter.');
                        // Redirect to login page
                        setTimeout(() => {
                            navigate('/login');
                        }, 2000);
                    }
                } else {
                    setChatError(`Erreur lors du chargement des données: ${error.message}`);
                }
                setLoading(false);
            }
        };

        fetchTasksAndGroup();

        socket.on('receiveMessage', (message: Message) => {
            console.log('Received message:', message);
            setMessages((prev) => [...prev, message]);
        });

        socket.on('error', (error: { message: string }) => {
            console.error('Socket.IO error:', error.message);
            setChatError(`Socket.IO error: ${error.message}`);
        });

        socket.on('connect', () => {
            console.log('Socket.IO connected');
            setChatError(null); // Clear error on connect
        });

        socket.on('disconnect', () => {
            console.log('Socket.IO disconnected');
            setChatError('Socket.IO déconnecté. Veuillez vérifier la connexion au serveur.');
        });

        return () => {
            socket.off('receiveMessage');
            socket.off('error');
            socket.off('connect');
            socket.off('disconnect');
            socket.disconnect();
        };
    }, [navigate]);

    useEffect(() => {
        if (groupId) {
            const fetchMessages = async () => {
                try {
                    const token = localStorage.getItem('token');
                    console.log('Token for /messages/group:', token ? token.substring(0, 20) + '...' : 'No token');
                    if (!token) {
                        throw new Error('No token available');
                    }
                    const response = await axios.get(`http://localhost:9777/messages/group/${groupId}`, {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });
                    console.log('Fetched messages:', response.data.messages);
                    setMessages(response.data.messages);
                    setChatError(null);
                } catch (error: any) {
                    console.error('Error fetching messages:', error.response?.data || error.message);
                    const errorMessage = error.response?.status === 401
                        ? 'Session expirée. Veuillez vous reconnecter.'
                        : error.message === 'No token available'
                        ? 'Veuillez vous connecter pour accéder au chat.'
                        : `Impossible de charger les messages: ${error.message}`;
                    setChatError(errorMessage);
                }
            };
            fetchMessages();
        }
    }, [groupId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

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

    useEffect(() => {
        console.log('Chat state updated, isChatOpen:', isChatOpen, 'chatError:', chatError, 'newMessage:', newMessage, 'groupId:', groupId, 'userId:', userId);
        if (isChatOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isChatOpen, chatError, newMessage, groupId, userId]);

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

    const openCamera = () => {
        setIsCameraOpen(true);
        setVerificationStatus('idle');
        setVerificationMessage(null);
    };

    const closeCamera = () => {
        setIsCameraOpen(false);
    };

    const verifyFace = async () => {
        try {
            if (!webcamRef.current) {
                setVerificationStatus('error');
                setVerificationMessage('Camera not available');
                return;
            }

            const imageSrc = webcamRef.current.getScreenshot();
            if (!imageSrc) {
                setVerificationStatus('error');
                setVerificationMessage('Failed to capture image');
                return;
            }

            setVerificationStatus('loading');
            setVerificationMessage('Verifying your face...');

            const response = await axios.post(
                'http://localhost:9777/user/loginWithFace',
                { imageData: imageSrc },
                {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (response.data.success) {
                setVerificationStatus('success');
                setVerificationMessage('Face verification successful! Quiz passed.');
                setTimeout(() => {
                    closeCamera();
                }, 3000);
            } else {
                setVerificationStatus('error');
                setVerificationMessage('Face verification failed. Please try again.');
            }
        } catch (error) {
            console.error('Error during face verification:', error);
            setVerificationStatus('error');
            setVerificationMessage('Error during verification. Please try again.');
        }
    };

    const toggleChat = () => {
        console.log('Toggling chat, current isChatOpen:', isChatOpen);
        setIsChatOpen(!isChatOpen);
        if (!isChatOpen) {
            setIsChatExpanded(true); // Expand when opening
        }
    };

    const toggleChatExpand = () => {
        console.log('Toggling chat expand, current isChatExpanded:', isChatExpanded);
        setIsChatExpanded(!isChatExpanded);
    };

    const sendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim() && groupId && userId) {
            console.log('Sending message:', { groupId, userId, content: newMessage });
            socket.emit('sendMessage', {
                groupId,
                userId,
                content: newMessage,
            });
            setNewMessage('');
        } else {
            console.log('Cannot send message:', { newMessage, groupId, userId });
            setChatError('Erreur: Impossible d\'envoyer le message. Vérifiez votre connexion ou reconnectez-vous.');
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        console.log('Input changed, new value:', e.target.value);
        setNewMessage(e.target.value);
    };

    const handleInputClick = () => {
        console.log('Input clicked');
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    const handleReconnect = () => {
        localStorage.removeItem('token');
        navigate('/login');
    };

    const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
        console.error('Image failed to load:', e.currentTarget.src);
        e.currentTarget.src = '/assets/img/fallback-avatar.jpg';
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

    console.log('Rendering chat button, isChatOpen:', isChatOpen, 'isChatExpanded:', isChatExpanded);

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
                                        <img
                                            className="border border-white"
                                            src="/assets/img/profiles/avatar-19.jpg"
                                            alt="Avatar"
                                            onError={handleImageError}
                                        />
                                    </span>
                                    <span className="avatar avatar-rounded">
                                        <img
                                            className="border border-white"
                                            src="/assets/img/profiles/avatar-29.jpg"
                                            alt="Avatar"
                                            onError={handleImageError}
                                        />
                                    </span>
                                    <span className="avatar avatar-rounded">
                                        <img
                                            className="border border-white"
                                            src="/assets/img/profiles/avatar-16.jpg"
                                            alt="Avatar"
                                            onError={handleImageError}
                                        />
                                    </span>
                                    <span className="avatar avatar-rounded bg-primary fs-12">1+</span>
                                </div>
                                <button
                                    onClick={toggleChat}
                                    className="btn btn-primary d-flex align-items-center justify-content-center me-3"
                                    style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        padding: '0',
                                        zIndex: 1000,
                                    }}
                                    title="Ouvrir la discussion"
                                >
                                    <i className="ti ti-message-circle" style={{ fontSize: '20px' }}></i>
                                </button>
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
                                <div className="d-flex align-items-center">
                                    <div className="input-icon-start position-relative me-2">
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
                            <div className="d-flex justify-content-between mt-3">
                                <button
                                    className="btn d-flex align-items-center"
                                    style={{
                                        backgroundColor: '#f97316',
                                        color: '#fff',
                                        border: 'none',
                                        borderRadius: '4px',
                                        padding: '6px 12px',
                                    }}
                                    onClick={openCamera}
                                >
                                    <i className="ti ti-camera me-2"></i> Verify to Pass Quiz
                                </button>
                                <button className="btn btn-primary" onClick={saveTaskStatusChanges}>Save</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modale pour l'image */}
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

            {/* Modale pour la vérification faciale */}
            <Modal
                isOpen={isCameraOpen}
                onRequestClose={closeCamera}
                contentLabel="Face Verification"
                className={styles.modal}
                overlayClassName="overlay"
            >
                <div className="camera-modal">
                    <h3>Face Verification</h3>
                    <div className="webcam-container">
                        <Webcam
                            audio={false}
                            ref={webcamRef}
                            screenshotFormat="image/jpeg"
                            width={500}
                            height={375}
                            videoConstraints={{
                                width: 500,
                                height: 375,
                                facingMode: "user"
                            }}
                        />
                    </div>

                    {verificationStatus === 'idle' && (
                        <button
                            className="btn btn-primary mt-3"
                            onClick={verifyFace}
                        >
                            Capture and Verify
                        </button>
                    )}

                    {verificationStatus === 'loading' && (
                        <div className="mt-3">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                            <p>{verificationMessage}</p>
                        </div>
                    )}

                    {verificationStatus === 'success' && (
                        <div className="alert alert-success mt-3">
                            {verificationMessage}
                        </div>
                    )}

                    {verificationStatus === 'error' && (
                        <div className="alert alert-danger mt-3">
                            {verificationMessage}
                            <button
                                className="btn btn-primary mt-2"
                                onClick={verifyFace}
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    <button
                        className="btn btn-secondary mt-3 ms-2"
                        onClick={closeCamera}
                    >
                        Close
                    </button>
                </div>
            </Modal>

            {/* Sidebar Chat */}
            {isChatOpen && (
                <div
                    style={{
                        position: 'fixed',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: isChatExpanded ? '300px' : '50px',
                        backgroundColor: '#fff',
                        boxShadow: '-2px 0 5px rgba(0,0,0,0.2)',
                        zIndex: 2000,
                        transition: 'width 0.3s ease-in-out',
                        display: 'flex',
                        flexDirection: 'column',
                    }}
                >
                    <div
                        style={{
                            padding: '10px',
                            backgroundColor: '#f97316',
                            color: '#fff',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        {isChatExpanded && <h3 style={{ fontSize: '16px', margin: 0, color: '#fff' }}>Discussion avec le groupe</h3>}
                        <button
                            onClick={toggleChatExpand}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#fff',
                                cursor: 'pointer',
                            }}
                            title={isChatExpanded ? 'Réduire' : 'Agrandir'}
                        >
                            <i className={`ti ${isChatExpanded ? 'ti-chevron-right' : 'ti-chevron-left'}`} style={{ fontSize: '20px' }}></i>
                        </button>
                    </div>
                    {isChatExpanded && (
                        <>
                            <div
                                style={{
                                    flex: 1,
                                    padding: '10px',
                                    overflowY: 'auto',
                                    backgroundColor: '#fff',
                                }}
                            >
                                {chatError ? (
                                    <div style={{ color: '#dc2626', textAlign: 'center', fontSize: '14px' }}>
                                        {chatError}
                                        <div>
                                            <button
                                                onClick={() => {
                                                    setChatError(null);
                                                    if (groupId) {
                                                        const token = localStorage.getItem('token');
                                                        if (token) {
                                                            axios.get(`http://localhost:9777/messages/group/${groupId}`, {
                                                                headers: { Authorization: `Bearer ${token}` },
                                                            }).then(response => {
                                                                setMessages(response.data.messages);
                                                                setChatError(null);
                                                            }).catch(err => {
                                                                setChatError(`Erreur: ${err.message}`);
                                                            });
                                                        }
                                                    }
                                                }}
                                                style={{
                                                    marginTop: '10px',
                                                    padding: '5px 10px',
                                                    backgroundColor: '#f97316',
                                                    color: '#fff',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                }}
                                            >
                                                Réessayer
                                            </button>
                                            {chatError.includes('Session expirée') && (
                                                <button
                                                    onClick={handleReconnect}
                                                    style={{
                                                        marginTop: '10px',
                                                        marginLeft: '10px',
                                                        padding: '5px 10px',
                                                        backgroundColor: '#dc2626',
                                                        color: '#fff',
                                                        border: 'none',
                                                        borderRadius: '4px',
                                                        cursor: 'pointer',
                                                    }}
                                                >
                                                    Reconnexion
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div style={{ color: '#6b7280', textAlign: 'center', fontSize: '14px' }}>
                                        Aucun message pour le moment.
                                    </div>
                                ) : (
                                    messages.map((message) => (
                                        <div
                                            key={message._id}
                                            style={{
                                                marginBottom: '10px',
                                                textAlign: message.sender._id === userId ? 'right' : 'left',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: 'inline-block',
                                                    padding: '8px',
                                                    borderRadius: '6px',
                                                    backgroundColor:
                                                        message.sender._id === userId ? '#f97316' : '#e5e7eb',
                                                    color: message.sender._id === userId ? '#fff' : '#111827',
                                                    fontSize: '14px',
                                                    maxWidth: '80%',
                                                }}
                                            >
                                                <p style={{ fontWeight: 'bold', fontSize: '12px', margin: '0 0 4px 0', color: message.sender._id === userId ? '#fff' : '#111827' }}>
                                                    {message.sender.name} {message.sender.lastname} ({message.sender.role})
                                                </p>
                                                <p style={{ margin: 0 }}>{message.content}</p>
                                                <p style={{ fontSize: '10px', color: message.sender._id === userId ? '#fff' : '#6b7280', marginTop: '4px' }}>
                                                    {new Date(message.timestamp).toLocaleTimeString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                            <form
                                onSubmit={sendMessage}
                                style={{
                                    padding: '10px',
                                    borderTop: '1px solid #e5e7eb',
                                    backgroundColor: '#fff',
                                }}
                            >
                                <div style={{ display: 'flex' }}>
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={newMessage}
                                        onChange={handleInputChange}
                                        onClick={handleInputClick}
                                        style={{
                                            flex: 1,
                                            padding: '8px',
                                            border: '1px solid #d1d5db',
                                            borderRadius: '4px 0 0 4px',
                                            fontSize: '14px',
                                            outline: 'none',
                                            pointerEvents: 'auto',
                                            cursor: 'text',
                                            backgroundColor: '#fff',
                                            zIndex: 2500,
                                        }}
                                        placeholder="Tapez votre message..."
                                        disabled={!!chatError}
                                    />
                                    <button
                                        type="submit"
                                        style={{
                                            padding: '8px 12px',
                                            backgroundColor: '#f97316',
                                            color: '#fff',
                                            border: 'none',
                                            borderRadius: '0 4px 4px 0',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                        }}
                                        disabled={!!chatError}
                                    >
                                        Envoyer
                                    </button>
                                </div>
                            </form>
                        </>
                    )}
                </div>
            )}
        </>
    );
};

export default TaskBoard;