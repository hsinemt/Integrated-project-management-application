import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import dragula from 'dragula';
import 'dragula/dist/dragula.css';
import Modal from 'react-modal';
import styles from "./page.module.css";
import TaskCard from './TaskCard';
import TaskColumn from './TaskColumn';
import SkeletonTaskColumn from './SkeletonTaskColumn';
import Webcam from 'react-webcam';
import io from 'socket.io-client';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import CourseQuiz from './CourseQuiz';

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
    git?: string;
    quizTheme?: string;
    quizScore?: number;
    quizId?: string;
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
    const [loadError, setLoadError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedPriority, setSelectedPriority] = useState<string>('All');
    const [filterLoading, setFilterLoading] = useState(false);
    const [updatedTasks, setUpdatedTasks] = useState<Map<string, string>>(new Map());
    const [changingTaskIds, setChangingTaskIds] = useState<Set<string>>(new Set());
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [isQuizModalOpen, setIsQuizModalOpen] = useState(false);
    const [verificationMessage, setVerificationMessage] = useState<string | null>(null);
    const [verificationStatus, setVerificationStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isChatExpanded, setIsChatExpanded] = useState(true);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState<string>('');
    const [groupId, setGroupId] = useState<string | null>(null);
    const [groupName, setGroupName] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [chatError, setChatError] = useState<string | null>(null);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
    const [currentQuizTheme, setCurrentQuizTheme] = useState<string | null>(null);
    const webcamRef = useRef<Webcam>(null);
    const toDoTasksRef = useRef<HTMLDivElement>(null);
    const inProgressTasksRef = useRef<HTMLDivElement>(null);
    const inReviewTasksRef = useRef<HTMLDivElement>(null);
    const completedTasksRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const emojiButtonRef = useRef<HTMLButtonElement>(null);
    const navigate = useNavigate();

    const handleGitBranchUpdate = (taskId: string, gitBranch: string) => {
        setTasks(prevTasks =>
            prevTasks.map(task =>
                task._id === taskId ? { ...task, git: gitBranch } : task
            )
        );
    };

    const fetchMessagesWithBearer = async (groupId: string) => {
        try {
            const token = localStorage.getItem('token');
            console.log('Fetching messages with Bearer token:', token ? `Bearer ${token.substring(0, 20)}...` : 'No token');
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

    const fetchUserAndGroupForSocket = async (token: string) => {
        try {
            console.log('Fetching user and group for Socket.IO with Bearer token:', `Bearer ${token.substring(0, 20)}...`);
            const response = await axios.get('http://localhost:9777/user/profilegroupe', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            console.log('User and group response for Socket.IO:', response.data);

            // Extract IDs from student and group fields
            const fetchedGroupId = response.data.group?._id;
            const fetchedUserId = response.data.student?._id; // Changed from user to student
            const fetchedGroupName = response.data.group?.nom_groupe;

            // Set state
            setGroupId(fetchedGroupId);
            setUserId(fetchedUserId);
            setGroupName(fetchedGroupName || 'Group Chat');

            // Validate IDs before connecting to Socket.IO
            if (fetchedUserId && fetchedGroupId) {
                socket.auth = { userId: fetchedUserId };
                socket.connect();
                console.log('Socket.IO connecting, joining group:', fetchedGroupId, 'with user:', fetchedUserId);
                socket.emit('joinGroup', { groupId: fetchedGroupId, userId: fetchedUserId });
            } else {
                console.error('Missing userId or groupId for Socket.IO:', { fetchedUserId, fetchedGroupId });
                setChatError('Erreur: Impossible de rejoindre le groupe. Données manquantes.');
            }

            return { userId: fetchedUserId, groupId: fetchedGroupId };
        } catch (error: any) {
            console.error('Error fetching user and group for Socket.IO:', error.response?.data || error.message);
            setChatError(`Erreur lors du chargement des données du groupe: ${error.message}`);
            throw error;
        }
    };

    const fetchTasksAndProject = async (token: string) => {
        try {
            console.log('Fetching tasks with token:', token.substring(0, 20) + '...');
            const response = await axios.get('http://localhost:9777/user/profilegroupe', {
                headers: {
                    Authorization: token,
                },
            });

            console.log('Tasks and project response:', response.data);

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
        } catch (error: any) {
            console.error('Error fetching tasks or project:', error.response?.data || error.message);
            throw error;
        }
    };

    const initializeData = async () => {
        try {
            setLoadError(null);
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('No token found in localStorage');
                setLoadError('Authentication required. Please log in to view tasks.');
                setLoading(false);
                return;
            }

            try {
                await fetchTasksAndProject(token);
            } catch (taskError: any) {
                console.error('Error fetching tasks:', taskError);
                setLoadError('Failed to load tasks. Please try again.');
                setLoading(false);
                return;
            }

            try {
                await fetchUserAndGroupForSocket(token);
            } catch (socketError: any) {
                if (socketError.response?.status === 401) {
                    const storedUserId = localStorage.getItem('userId');
                    const storedRole = localStorage.getItem('role');
                    if (storedUserId && storedRole) {
                        setUserId(storedUserId);
                        try {
                            const groupResponse = await axios.get(`http://localhost:9777/group/by-user/${storedUserId}`);
                            console.log('Fetched groups:', groupResponse.data);
                            if (groupResponse.data.success && groupResponse.data.groups.length > 0) {
                                const fetchedGroupId = groupResponse.data.groups[0]._id;
                                const fetchedGroupName = groupResponse.data.groups[0].nom_groupe;
                                setGroupId(fetchedGroupId);
                                setGroupName(fetchedGroupName || 'Group Chat');
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
                        setTimeout(() => {
                            navigate('/login');
                        }, 2000);
                    }
                } else {
                    setChatError(`Erreur lors du chargement des données du groupe: ${socketError.message}`);
                }
            }

            setLoading(false);
        } catch (error: any) {
            console.error('Error initializing data:', error.response?.data || error.message);
            if (error.response?.status === 401) {
                setLoadError('Session expired. Please log in again.');
                setChatError('Session expirée. Veuillez vous reconnecter.');
                setTimeout(() => {
                    navigate('/login');
                }, 2000);
            } else {
                setLoadError(`Failed to load data: ${error.message}`);
                setChatError(`Erreur lors du chargement des données: ${error.message}`);
            }
            setLoading(false);
        }
    };

    useEffect(() => {
        initializeData();

        socket.on('receiveMessage', (message: Message) => {
            console.log('Received message:', message);
            setMessages((prev) => {
                // Replace the temporary message with the server-confirmed one
                const tempIndex = prev.findIndex((msg) => msg._id.startsWith('temp-'));
                if (tempIndex !== -1) {
                    const updatedMessages = [...prev];
                    updatedMessages[tempIndex] = message;
                    return updatedMessages;
                }
                // If no temp message, append only if not a duplicate
                if (!prev.some((msg) => msg._id === message._id)) {
                    return [...prev, message];
                }
                return prev;
            });
        });

        socket.on('error', (error: { message: string }) => {
            console.error('Socket.IO error:', error.message);
            setChatError(`Socket.IO error: ${error.message}`);
        });

        socket.on('connect', () => {
            console.log('Socket.IO connected');
            setChatError(null);
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
            fetchMessagesWithBearer(groupId);
        }
    }, [groupId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Reference to store the dragula instance
    const dragulaRef = useRef<any>(null);

    // Function to initialize or reinitialize dragula
    const initializeDragula = () => {
        // Clean up previous instance if it exists
        if (dragulaRef.current) {
            console.log('Cleaning up previous dragula instance');
            dragulaRef.current.destroy();
        }

        // Check if refs are available
        if (!toDoTasksRef.current || !inProgressTasksRef.current || !inReviewTasksRef.current) {
            console.log('Refs not available yet, skipping dragula initialization');
            return;
        }

        const containers = [
            toDoTasksRef.current,
            inProgressTasksRef.current,
            inReviewTasksRef.current,
        ];

        console.log('Initializing dragula with containers:', containers);
        console.log('Current changingTaskIds:', Array.from(changingTaskIds));

        // Create new dragula instance
        const drake = dragula(containers, {
            moves: (el, source, handle, sibling) => {
                // Don't allow dragging from completed column
                if (source === completedTasksRef.current) {
                    console.log('Cannot drag from completed column');
                    return false;
                }

                // Don't allow dragging if the task is being updated
                const taskId = el?.getAttribute('data-task-id');
                if (taskId && changingTaskIds.has(taskId)) {
                    console.log('Cannot drag task that is being updated:', taskId);
                    return false;
                }

                console.log('Can drag element:', el);
                return true;
            },
            accepts: (el, target, source, sibling) => {
                // Don't allow dropping to completed column
                if (target === completedTasksRef.current) {
                    console.log('Cannot drop to completed column');
                    return false;
                }

                console.log('Can drop element to target:', target);
                return true;
            },
            revertOnSpill: true, // Revert drag if dropped outside a container
            removeOnSpill: false, // Don't remove element if dropped outside a container
            copy: false, // Don't copy the element, move it
            mirrorContainer: document.body, // Append mirror to body for better positioning
        });

        // Set up drop event handler
        drake.on('drop', async (el, target, source, sibling) => {
            console.log('Dragula drop event:', { el, target, source, sibling });
            const taskId = el?.getAttribute('data-task-id');
            const newEtat = target?.getAttribute('data-etat');
            const oldEtat = source?.getAttribute('data-etat');

            if (taskId && newEtat && oldEtat && newEtat !== oldEtat) {
                console.log('Updating task status:', { taskId, oldEtat, newEtat });

                // Add to updated tasks map for batch save button
                setUpdatedTasks((prev) => new Map(prev).set(taskId, newEtat));

                // Immediately update the task status
                const success = await updateTaskStatus(taskId, newEtat);

                if (!success) {
                    console.log('Task status update failed, reverting UI');

                    // If the update failed, move the element back to its original position
                    // This will happen automatically when dragula is reinitialized in updateTaskStatus
                }
            } else if (newEtat === oldEtat) {
                console.log('Task dropped in the same column, no update needed');
            } else {
                console.log('Missing taskId, newEtat, or oldEtat:', { taskId, newEtat, oldEtat });
            }
        });

        // Store the instance in the ref
        dragulaRef.current = drake;
    };

    // Initialize dragula when the component mounts
    useEffect(() => {
        console.log('Component mounted, initializing dragula');
        initializeDragula();

        // Clean up on unmount
        return () => {
            if (dragulaRef.current) {
                console.log('Component unmounting, cleaning up dragula');
                dragulaRef.current.destroy();
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Reinitialize dragula when changingTaskIds changes
    useEffect(() => {
        console.log('changingTaskIds changed, reinitializing dragula');
        initializeDragula();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [changingTaskIds]);

    useEffect(() => {
        console.log('Chat state updated, isChatOpen:', isChatOpen, 'chatError:', chatError, 'newMessage:', newMessage, 'groupId:', groupId, 'userId:', userId);
        if (isChatOpen && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isChatOpen, chatError, newMessage, groupId, userId]);

    const saveTaskStatusChanges = async () => {
        try {
            // Mark all updated tasks as changing
            const taskIds = Array.from(updatedTasks.keys());
            setChangingTaskIds(new Set(taskIds));

            const token = localStorage.getItem('token');
            console.log('Saving task status with token:', token ? token.substring(0, 20) + '...' : 'No token');

            const statusUpdates = Array.from(updatedTasks.entries()).map(([taskId, newEtat]) =>
                axios.put(`http://localhost:9777/api/tasks/tasks/${taskId}/status`, { etat: newEtat }, {
                    headers: {
                        Authorization: token,
                    },
                })
            );

            await Promise.all(statusUpdates);

            // Add a minimum delay to ensure loading state is visible
            setTimeout(() => {
                setChangingTaskIds(new Set());
                setUpdatedTasks(new Map()); // Clear the updated tasks map

                // Show success message
                const successMessage = document.createElement('div');
                successMessage.className = 'alert alert-success position-fixed top-0 start-50 translate-middle-x mt-3';
                successMessage.style.zIndex = '9999';
                successMessage.innerHTML = `
                    <div class="d-flex align-items-center">
                        <i class="ti ti-check-circle me-2"></i>
                        <span>Task status updated successfully!</span>
                    </div>
                `;
                document.body.appendChild(successMessage);

                // Remove the message after 3 seconds
                setTimeout(() => {
                    document.body.removeChild(successMessage);
                    window.location.reload(); // Reload the page to get the latest data
                }, 1500);
            }, 500);
        } catch (error) {
            console.error('Error saving task status changes:', error);
            // Clear loading states on error
            setChangingTaskIds(new Set());

            // Show error message
            const errorMessage = document.createElement('div');
            errorMessage.className = 'alert alert-danger position-fixed top-0 start-50 translate-middle-x mt-3';
            errorMessage.style.zIndex = '9999';
            errorMessage.innerHTML = `
                <div class="d-flex align-items-center">
                    <i class="ti ti-alert-circle me-2"></i>
                    <span>Failed to update task status. Please try again.</span>
                </div>
            `;
            document.body.appendChild(errorMessage);

            // Remove the message after 5 seconds
            setTimeout(() => {
                document.body.removeChild(errorMessage);

                // Reinitialize dragula to restore the original state
                initializeDragula();
            }, 3000);
        }
    };

    // Function to handle individual task status update
    const updateTaskStatus = async (taskId: string, newEtat: string) => {
        try {
            // Mark the task as changing
            setChangingTaskIds(prev => {
                const newSet = new Set(prev);
                newSet.add(taskId);
                return newSet;
            });

            const token = localStorage.getItem('token');
            console.log(`Updating task ${taskId} status to ${newEtat}`);

            await axios.put(
                `http://localhost:9777/api/tasks/tasks/${taskId}/status`, 
                { etat: newEtat }, 
                {
                    headers: {
                        Authorization: token,
                    },
                }
            );

            // Update successful, remove from changing tasks
            setTimeout(() => {
                setChangingTaskIds(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(taskId);
                    return newSet;
                });

                // Remove from updated tasks map
                setUpdatedTasks(prev => {
                    const newMap = new Map(prev);
                    newMap.delete(taskId);
                    return newMap;
                });
            }, 500);

            return true;
        } catch (error) {
            console.error(`Error updating task ${taskId} status:`, error);

            // Update failed, remove from changing tasks
            setChangingTaskIds(prev => {
                const newSet = new Set(prev);
                newSet.delete(taskId);
                return newSet;
            });

            // Show error toast
            alert(`Failed to update task status. Please try again.`);

            // Reinitialize dragula to restore the original state
            initializeDragula();

            return false;
        }
    };

    const handleImageChange = async (taskId: string, event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const formData = new FormData();
            formData.append('image', file);
            const token = localStorage.getItem('token');
            console.log('Uploading image with token:', token ? token.substring(0, 20) + '...' : 'No token');

            try {
                const response = await axios.put(
                    `http://localhost:9777/api/tasks/tasks/${taskId}/image`,
                    formData,
                    {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                            Authorization: token,
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

    const openQuizForTask = (taskId: string, quizTheme: string) => {
        setCurrentTaskId(taskId);
        setCurrentQuizTheme(quizTheme);
        setIsCameraOpen(true);
        setVerificationStatus('idle');
        setVerificationMessage(null);
    };

    const closeQuizModal = () => {
        setIsQuizModalOpen(false);
        setCurrentTaskId(null);
        setCurrentQuizTheme(null);
    };

    const handleQuizSubmit = (taskId: string, score: number) => {
        setTasks((prevTasks) =>
            prevTasks.map((task) => (task._id === taskId ? { ...task, quizScore: score } : task))
        );
        setIsQuizModalOpen(false);
        setCurrentTaskId(null);
        setCurrentQuizTheme(null);
    };

    const verifyFace = async () => {
        try {
            if (!webcamRef.current) {
                setVerificationStatus('error');
                setVerificationMessage('Webcam not available. Please ensure your camera is connected and permissions are granted.');
                console.error('Webcam reference is null');
                return;
            }

            const imageSrc = webcamRef.current.getScreenshot();
            if (!imageSrc) {
                setVerificationStatus('error');
                setVerificationMessage('Failed to capture image. Please ensure your camera is working.');
                console.error('Failed to capture image from webcam');
                return;
            }

            setVerificationStatus('loading');
            setVerificationMessage('Verifying your face...');

            const token = localStorage.getItem('token');
            if (!token) {
                setVerificationStatus('error');
                setVerificationMessage('Authentication token missing. Please log in again.');
                console.error('No token available');
                return;
            }

            console.log('Sending verification request with token:', token.substring(0, 10) + '...');
            console.log('Image data size:', imageSrc.length, 'bytes');
            const startTime = Date.now();

            const response = await axios.post(
                'http://localhost:9777/user/loginWithFace',
                { imageData: imageSrc },
                {
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    timeout: 30000, // Increased to 30 seconds
                }
            );

            const endTime = Date.now();
            console.log(`Verification request completed in ${(endTime - startTime) / 1000} seconds`);
            console.log('Verification response:', response.data);

            if (response.data.success) {
                setVerificationStatus('success');
                setVerificationMessage('Face verification successful! Opening quiz...');
                setTimeout(() => {
                    closeCamera();
                    if (currentTaskId && currentQuizTheme) {
                        setIsQuizModalOpen(true);
                    } else {
                        setVerificationStatus('error');
                        setVerificationMessage('No task or quiz theme selected.');
                    }
                }, 3000);
            } else {
                setVerificationStatus('error');
                setVerificationMessage(`Face verification failed: ${response.data.message || 'Unknown error'}. Please try again.`);
                console.error('Verification failed:', response.data.message);
            }
        } catch (error) {
            console.error('Error during face verification:', error);
            if (axios.isAxiosError(error)) {
                setVerificationStatus('error');
                setVerificationMessage(
                    `Error during verification: ${error.response?.data?.message || error.message}. Please try again.`
                );
                console.error('Axios error details:', error.response?.data || error.message);
            } else {
                setVerificationStatus('error');
                setVerificationMessage('Error during verification. Please try again.');
            }
        }
    };

    const toggleChat = () => {
        console.log('Toggling chat, current isChatOpen:', isChatOpen);
        setIsChatOpen(!isChatOpen);
        if (!isChatOpen) {
            setIsChatExpanded(true);
        }
    };

    const toggleChatExpand = () => {
        console.log('Toggling chat expand, current isChatExpanded:', isChatExpanded);
        setIsChatExpanded(!isChatExpanded);
        setShowEmojiPicker(false);
    };

    const toggleEmojiPicker = () => {
        setShowEmojiPicker((prev) => !prev);
    };

    const handleEmojiClick = (emojiData: EmojiClickData) => {
        setNewMessage((prev) => prev + emojiData.emoji);
        setShowEmojiPicker(false);
        inputRef.current?.focus();
    };

    const sendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (newMessage.trim() && groupId && userId) {
            console.log('Sending message:', { groupId, userId, content: newMessage });

            // Optimistic update with temporary ID
            const tempMessageId = `temp-${Date.now()}`;
            const tempMessage: Message = {
                _id: tempMessageId,
                group: groupId,
                sender: {
                    _id: userId,
                    name: 'You',
                    lastname: '',
                    role: 'user',
                },
                content: newMessage,
                timestamp: new Date().toISOString(),
            };

            setMessages((prev) => [...prev, tempMessage]);

            // Emit to server
            socket.emit('sendMessage', {
                groupId,
                userId,
                content: newMessage,
            }, (serverMessage: Message) => {
                // Callback to replace the temporary message with the server-confirmed one
                setMessages((prev) => {
                    const updatedMessages = prev.map((msg) =>
                        msg._id === tempMessageId ? serverMessage : msg
                    );
                    return updatedMessages;
                });
            });

            setNewMessage('');
            setShowEmojiPicker(false);
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
        console.log('Image failed to load:', e.currentTarget.src);
        e.currentTarget.src = '/assets/img/fallback-avatar.jpg';
    };

    const handleRetry = () => {
        setLoading(true);
        initializeData();
    };

    if (loading) {
        return (
            <div className="page-wrapper">
                <div className="content">
                    <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
                        <div className="my-auto mb-2">
                            <h2 className="mb-1">
                                <div className="bg-light" style={{ width: '200px', height: '32px', borderRadius: '4px' }}></div>
                            </h2>
                            <nav>
                                <ol className="breadcrumb mb-0">
                                    <li className="breadcrumb-item">
                                        <div className="bg-light" style={{ width: '20px', height: '16px', borderRadius: '4px' }}></div>
                                    </li>
                                    <li className="breadcrumb-item">
                                        <div className="bg-light" style={{ width: '60px', height: '16px', borderRadius: '4px' }}></div>
                                    </li>
                                    <li className="breadcrumb-item active">
                                        <div className="bg-light" style={{ width: '80px', height: '16px', borderRadius: '4px' }}></div>
                                    </li>
                                </ol>
                            </nav>
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
                            <h4>
                                <div className="bg-light" style={{ width: '150px', height: '24px', borderRadius: '4px' }}></div>
                            </h4>
                        </div>
                        <div className="card-body">
                            <div className="row">
                                <div className="col-lg-4">
                                    <div className="d-flex align-items-center flex-wrap row-gap-3 mb-3">
                                        <h6 className="me-2">Priority</h6>
                                        <ul className="nav nav-pills border d-inline-flex p-1 rounded bg-light todo-tabs">
                                            <li className="nav-item">
                                                <button className="nav-link active">All</button>
                                            </li>
                                            <li className="nav-item">
                                                <button className="nav-link">High</button>
                                            </li>
                                            <li className="nav-item">
                                                <button className="nav-link">Medium</button>
                                            </li>
                                            <li className="nav-item">
                                                <button className="nav-link">Low</button>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                            <div className="tab-content">
                                <div className="tab-pane fade show active">
                                    <div className="d-flex align-items-start overflow-auto project-status pb-4">
                                        <SkeletonTaskColumn title="To Do" count={3} />
                                        <SkeletonTaskColumn title="In Progress" count={2} />
                                        <SkeletonTaskColumn title="In Review" count={2} />
                                        <SkeletonTaskColumn title="Completed" count={1} isCompletedColumn={true} />
                                    </div>
                                </div>
                            </div>
                            <style>
                                {`
                                    @keyframes shimmer {
                                        0% {
                                            background-position: -200% 0;
                                        }
                                        100% {
                                            background-position: 200% 0;
                                        }
                                    }
                                `}
                            </style>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="page-wrapper">
                <div className="content">
                    <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
                        <div className="alert alert-danger text-center" role="alert">
                            <i className="ti ti-alert-circle me-2" style={{ fontSize: '1.5rem' }}></i>
                            <p className="mb-3">{loadError}</p>
                            <button
                                className="btn btn-primary"
                                onClick={handleRetry}
                                aria-label="Retry loading tasks"
                            >
                                <i className="ti ti-refresh me-2"></i>
                                Retry
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
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
                                                <button
                                                    className={`nav-link ${selectedPriority === 'All' ? 'active' : ''}`}
                                                    onClick={() => {
                                                        if (selectedPriority !== 'All') {
                                                            setFilterLoading(true);
                                                            setTimeout(() => {
                                                                setSelectedPriority('All');
                                                                setFilterLoading(false);
                                                            }, 500);
                                                        }
                                                    }}
                                                    disabled={filterLoading}
                                                >
                                                    All
                                                </button>
                                            </li>
                                            <li className="nav-item" role="presentation">
                                                <button
                                                    className={`nav-link ${selectedPriority === 'High' ? 'active' : ''}`}
                                                    onClick={() => {
                                                        if (selectedPriority !== 'High') {
                                                            setFilterLoading(true);
                                                            setTimeout(() => {
                                                                setSelectedPriority('High');
                                                                setFilterLoading(false);
                                                            }, 500);
                                                        }
                                                    }}
                                                    disabled={filterLoading}
                                                >
                                                    High
                                                </button>
                                            </li>
                                            <li className="nav-item" role="presentation">
                                                <button
                                                    className={`nav-link ${selectedPriority === 'Medium' ? 'active' : ''}`}
                                                    onClick={() => {
                                                        if (selectedPriority !== 'Medium') {
                                                            setFilterLoading(true);
                                                            setTimeout(() => {
                                                                setSelectedPriority('Medium');
                                                                setFilterLoading(false);
                                                            }, 500);
                                                        }
                                                    }}
                                                    disabled={filterLoading}
                                                >
                                                    Medium
                                                </button>
                                            </li>
                                            <li className="nav-item" role="presentation">
                                                <button
                                                    className={`nav-link ${selectedPriority === 'Low' ? 'active' : ''}`}
                                                    onClick={() => {
                                                        if (selectedPriority !== 'Low') {
                                                            setFilterLoading(true);
                                                            setTimeout(() => {
                                                                setSelectedPriority('Low');
                                                                setFilterLoading(false);
                                                            }, 500);
                                                        }
                                                    }}
                                                    disabled={filterLoading}
                                                >
                                                    Low
                                                </button>
                                            </li>
                                        </ul>
                                    </div>
                                </div>
                                <div className="col-lg-8">
                                    {filterLoading && (
                                        <div className="d-flex align-items-center">
                                            <div className="spinner-border spinner-border-sm text-primary me-2" role="status">
                                                <span className="visually-hidden">Loading...</span>
                                            </div>
                                            <span>Filtering tasks...</span>
                                        </div>
                                    )}
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
                                            onGitBranchUpdate={handleGitBranchUpdate}
                                            changingTaskIds={changingTaskIds}
                                        />
                                        <TaskColumn
                                            etat="In Progress"
                                            tasks={filteredTasks.filter(task => task.état === 'In Progress')}
                                            handleImageChange={handleImageChange}
                                            openModal={openModal}
                                            ref={inProgressTasksRef}
                                            changingTaskIds={changingTaskIds}
                                        />
                                        <TaskColumn
                                            etat="In Review"
                                            tasks={filteredTasks.filter(task => task.état === 'In Review')}
                                            handleImageChange={handleImageChange}
                                            openModal={openModal}
                                            ref={inReviewTasksRef}
                                            changingTaskIds={changingTaskIds}
                                        />
                                        <TaskColumn
                                            etat="Completed"
                                            tasks={filteredTasks.filter(task => task.état === 'Completed')}
                                            handleImageChange={handleImageChange}
                                            openModal={openModal}
                                            ref={completedTasksRef}
                                            isCompletedColumn={true}
                                            openCamera={openCamera}
                                            openQuizForTask={openQuizForTask}
                                            changingTaskIds={changingTaskIds}
                                        />
                                    </div>
                                </div>
                            </div>
                            {updatedTasks.size > 0 && (
                                <div className="d-flex justify-content-end mt-3">
                                    <div className="d-flex align-items-center">
                                        <span className="me-3 text-muted">
                                            {updatedTasks.size} task{updatedTasks.size !== 1 ? 's' : ''} pending update
                                        </span>
                                        <button 
                                            className="btn btn-primary d-flex align-items-center" 
                                            onClick={saveTaskStatusChanges}
                                            disabled={Array.from(updatedTasks.keys()).some(id => changingTaskIds.has(id))}
                                        >
                                            {Array.from(updatedTasks.keys()).some(id => changingTaskIds.has(id)) ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                                    Updating...
                                                </>
                                            ) : (
                                                <>
                                                    <i className="ti ti-device-floppy me-2"></i>
                                                    Save All Changes
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
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

            <Modal
                isOpen={isQuizModalOpen}
                onRequestClose={closeQuizModal}
                contentLabel="Quiz Modal"
                className={styles.modal}
                overlayClassName="overlay"
            >
                <div className="quiz-modal">
                    <h3>Task Quiz</h3>
                    {currentTaskId && (
                        <CourseQuiz
                            courseId={currentTaskId}
                            quizTheme={currentQuizTheme || ''}
                            onClose={closeQuizModal}
                            onSubmit={handleQuizSubmit}
                        />
                    )}
                    <button className="btn btn-secondary mt-3" onClick={closeQuizModal} style={{ marginLeft: '10px' }}>
                        Close
                    </button>
                </div>
            </Modal>

            {isChatOpen && (
                <div
                    style={{
                        position: 'fixed',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: isChatExpanded ? '350px' : '60px',
                        background: 'linear-gradient(145deg, #ffffff, #f8fafc)',
                        boxShadow: '-4px 0 12px rgba(0,0,0,0.1)',
                        zIndex: 2000,
                        transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        display: 'flex',
                        flexDirection: 'column',
                        borderLeft: '1px solid #e2e8f0',
                    }}
                >
                    <div
                        style={{
                            padding: '12px 16px',
                            background: '#f97316',
                            color: '#ffffff',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            borderBottom: '1px solid rgba(255,255,255,0.1)',
                        }}
                    >
                        {isChatExpanded && (
                            <h3 style={{
                                fontSize: '18px',
                                margin: 0,
                                fontWeight: 600,
                                letterSpacing: '0.2px'
                            }}>
                                {groupName}
                            </h3>
                        )}
                        <button
                            onClick={toggleChatExpand}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#ffffff',
                                cursor: 'pointer',
                                padding: '8px',
                                borderRadius: '6px',
                                transition: 'background-color 0.2s',
                            }}
                            title={isChatExpanded ? 'Minimize' : 'Expand'}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                            <i className={`ti ${isChatExpanded ? 'ti-chevron-right' : 'ti-chevron-left'}`} style={{ fontSize: '24px' }}></i>
                        </button>
                    </div>
                    {isChatExpanded && (
                        <>
                            <div
                                style={{
                                    flex: 1,
                                    padding: '16px',
                                    overflowY: 'auto',
                                    background: '#ffffff',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '12px',
                                }}
                            >
                                {chatError ? (
                                    <div style={{
                                        textAlign: 'center',
                                        padding: '16px',
                                        background: '#fef2f2',
                                        borderRadius: '8px',
                                        color: '#dc2626',
                                        fontSize: '14px',
                                        border: '1px solid #fee2e2'
                                    }}>
                                        {chatError}
                                        <div style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                            <button
                                                onClick={() => {
                                                    setChatError(null);
                                                    if (groupId) {
                                                        fetchMessagesWithBearer(groupId);
                                                    }
                                                }}
                                                style={{
                                                    padding: '8px 16px',
                                                    background: '#f97316',
                                                    color: '#ffffff',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: 'pointer',
                                                    fontSize: '14px',
                                                    transition: 'background-color 0.2s',
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ea580c'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f97316'}
                                            >
                                                Retry
                                            </button>
                                            {chatError.includes('Session expirée') && (
                                                <button
                                                    onClick={handleReconnect}
                                                    style={{
                                                        padding: '8px 16px',
                                                        background: '#dc2626',
                                                        color: '#ffffff',
                                                        border: 'none',
                                                        borderRadius: '6px',
                                                        cursor: 'pointer',
                                                        fontSize: '14px',
                                                        transition: 'background-color 0.2s',
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#b91c1c'}
                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                                                >
                                                    Reconnect
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ) : messages.length === 0 ? (
                                    <div style={{
                                        color: '#6b7280',
                                        textAlign: 'center',
                                        fontSize: '14px',
                                        padding: '24px',
                                        fontStyle: 'italic'
                                    }}>
                                        No messages yet. Start the conversation!
                                    </div>
                                ) : (
                                    messages.map((message) => (
                                        <div
                                            key={message._id}
                                            style={{
                                                display: 'flex',
                                                flexDirection: message.sender._id === userId ? 'row-reverse' : 'row',
                                                gap: '8px',
                                                marginBottom: '12px',
                                                opacity: 0,
                                                animation: 'fadeIn 0.3s ease-in forwards',
                                            }}
                                        >
                                            <div
                                                style={{
                                                    maxWidth: '70%',
                                                    padding: '12px 16px',
                                                    borderRadius: '12px',
                                                    background: message.sender._id === userId
                                                        ? 'linear-gradient(135deg, #f97316, #fb923c)'
                                                        : '#f1f5f9',
                                                    color: message.sender._id === userId ? '#ffffff' : '#1f2937',
                                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                                    transition: 'transform 0.2s',
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                                onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                            >
                                                <p style={{
                                                    fontWeight: 600,
                                                    fontSize: '13px',
                                                    margin: '0 0 6px 0',
                                                    color: message.sender._id === userId ? '#ffffff' : '#1f2937'
                                                }}>
                                                    {message.sender.name} {message.sender.lastname}
                                                    <span style={{ fontWeight: 400, color: message.sender._id === userId ? '#fed7aa' : '#6b7280' }}>
                                                        ({message.sender.role})
                                                    </span>
                                                </p>
                                                <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
                                                    {message.content}
                                                </p>
                                                <p style={{
                                                    fontSize: '11px',
                                                    color: message.sender._id === userId ? '#fed7aa' : '#9ca3af',
                                                    marginTop: '6px',
                                                    textAlign: 'right'
                                                }}>
                                                    {new Date(message.timestamp).toLocaleTimeString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                            <div
                                style={{
                                    padding: '12px 16px',
                                    borderTop: '1px solid #e2e8f0',
                                    background: '#ffffff',
                                    boxShadow: '0 -2px 4px rgba(0,0,0,0.05)',
                                    position: 'relative',
                                }}
                            >
                                {showEmojiPicker && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            bottom: '60px',
                                            right: '16px',
                                            zIndex: 1000,
                                        }}
                                    >
                                        <EmojiPicker onEmojiClick={handleEmojiClick} />
                                    </div>
                                )}
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    background: '#f8fafc',
                                    borderRadius: '8px',
                                    border: '1px solid #e2e8f0',
                                    overflow: 'hidden',
                                    transition: 'border-color 0.2s'
                                }}
                                     onFocus={(e) => e.currentTarget.style.borderColor = '#f97316'}
                                     onBlur={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                                >
                                    <input
                                        ref={inputRef}
                                        type="text"
                                        value={newMessage}
                                        onChange={handleInputChange}
                                        onClick={handleInputClick}
                                        style={{
                                            flex: 1,
                                            padding: '12px 16px',
                                            border: 'none',
                                            fontSize: '14px',
                                            outline: 'none',
                                            background: 'transparent',
                                            color: '#1f2937',
                                            cursor: chatError ? 'not-allowed' : 'text',
                                        }}
                                        placeholder="Type your message..."
                                        disabled={!!chatError}
                                    />
                                    <button
                                        ref={emojiButtonRef}
                                        type="button"
                                        onClick={toggleEmojiPicker}
                                        style={{
                                            padding: '8px 12px',
                                            background: showEmojiPicker ? '#f1f5f9' : 'none',
                                            border: 'none',
                                            color: '#64748b',
                                            cursor: chatError ? 'not-allowed' : 'pointer',
                                            fontSize: '18px',
                                        }}
                                        title="Add emoji"
                                        disabled={!!chatError}
                                    >
                                        😊
                                    </button>
                                    <button
                                        onClick={sendMessage}
                                        style={{
                                            padding: '12px 16px',
                                            background: '#f97316',
                                            color: '#ffffff',
                                            border: 'none',
                                            cursor: chatError ? 'not-allowed' : 'pointer',
                                            fontSize: '14px',
                                            fontWeight: 500,
                                            transition: 'background-color 0.2s',
                                        }}
                                        disabled={!!chatError}
                                        onMouseEnter={(e) => !chatError && (e.currentTarget.style.backgroundColor = '#ea580c')}
                                        onMouseLeave={(e) => !chatError && (e.currentTarget.style.backgroundColor = '#f97316')}
                                    >
                                        Send
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}
            <style>
                {`
                    @keyframes fadeIn {
                        from { opacity: 0; transform: translateY(10px); }
                        to { opacity: 1; transform: translateY(0); }
                    }
                `}
            </style>
        </>
    );
};

export default TaskBoard;
