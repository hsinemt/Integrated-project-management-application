import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ImageWithBasePath from '../../../core/common/imageWithBasePath';
import { addTutor, addManager, addStudent } from '../../../api/authApi/register/addUsers';
import { createUserWithPhoto } from '../../../api/uploadApi/uploadUserPhoto';
import Swal from 'sweetalert2';

// Available specialties array
const specialties = ['Twin', 'ERP/BI', 'AI', 'SAE', 'SE', 'SIM', 'NIDS', 'SLEAM', 'GAMIX', 'WIN', 'IoSyS', 'ArcTic'];

type PasswordField = 'password' | 'confirmPassword';

interface AddUserModalProps {
    onAddUser: () => void;
    userId: string;
}

const AddUserModal: React.FC<AddUserModalProps> = ({ onAddUser, userId }) => {
    const [passwordVisibility, setPasswordVisibility] = useState({
        password: false,
        confirmPassword: false,
    });

    const [userType, setUserType] = useState<'manager' | 'tutor' | 'student'>('manager');
    const [skills, setSkills] = useState<string[]>([]);
    const [skillInput, setSkillInput] = useState('');

    // Photo upload state
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string>('assets/img/profiles/avatar-30.jpg');
    const [isUploading, setIsUploading] = useState<boolean>(false);
    const [fileError, setFileError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Clean up preview URL when component unmounts
    useEffect(() => {
        return () => {
            if (previewUrl !== 'assets/img/profiles/avatar-30.jpg') {
                URL.revokeObjectURL(previewUrl);
            }
        };
    }, [previewUrl]);

    // Handle file selection
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        setFileError(null);

        if (file) {
            // Validate file type
            const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (!validTypes.includes(file.type)) {
                setFileError('Please select a valid image file (JPEG, PNG, GIF, or WEBP)');
                return;
            }

            // Validate file size (4MB max)
            if (file.size > 4 * 1024 * 1024) {
                setFileError('Image size should be less than 4MB');
                return;
            }

            setSelectedFile(file);

            // Create preview URL
            const objectUrl = URL.createObjectURL(file);
            setPreviewUrl(objectUrl);
        }
    };

    // Handle cancel button click
    const handleCancelClick = (e: React.MouseEvent) => {
        e.preventDefault();

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }

        // Clean up preview URL
        if (previewUrl !== 'assets/img/profiles/avatar-30.jpg') {
            URL.revokeObjectURL(previewUrl);
        }

        setSelectedFile(null);
        setPreviewUrl('assets/img/profiles/avatar-30.jpg');
        setFileError(null);
    };

    const togglePasswordVisibility = (field: PasswordField) => {
        setPasswordVisibility((prevState) => ({
            ...prevState,
            [field]: !prevState[field],
        }));
    };

    const handleAddSkill = () => {
        if (skillInput.trim()) {
            setSkills([...skills, skillInput.trim()]);
            setSkillInput('');
        }
    };

    const handleRemoveSkill = (index: number) => {
        const newSkills = [...skills];
        newSkills.splice(index, 1);
        setSkills(newSkills);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddSkill();
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        // Set uploading state
        setIsUploading(true);

        const commonData = {
            name: formData.get('name') as string,
            lastname: formData.get('lastname') as string,
            email: formData.get('email') as string,
            password: formData.get('password') as string,
        };

        try {
            let userData;
            switch (userType) {
                case 'manager':
                    userData = {
                        ...commonData,
                        speciality: formData.get('speciality') as string,
                        userId: userId, // Add this line to include the userId
                    };
                    break;
                case 'tutor':
                    userData = {
                        ...commonData,
                        classe: formData.get('classe') as string,
                        userId: userId, // Add this line to include the userId
                    };
                    break;
                case 'student':
                    userData = {
                        ...commonData,
                        speciality: formData.get('speciality') as string,
                        skills: skills,
                        level: formData.get('level') as string,
                        userId: userId, // Add this line to include the userId
                    };
                    break;
                default:
                    throw new Error('Invalid user type');
            }

            let result;

            // Use the new createUserWithPhoto function if we have a file
            if (selectedFile) {
                result = await createUserWithPhoto(selectedFile, userData, userType);
            } else {
                // Fall back to the original functions if no file is selected
                switch (userType) {
                    case 'manager':
                        result = await addManager(userData);
                        break;
                    case 'tutor':
                        result = await addTutor(userData);
                        break;
                    case 'student':
                        result = await addStudent(userData);
                        break;
                }
            }

            console.log(`${userType} added successfully:`, result);

            // Show success message
            Swal.fire({
                title: 'Success!',
                text: `${userType.charAt(0).toUpperCase() + userType.slice(1)} added successfully`,
                icon: 'success',
                confirmButtonText: 'OK'
            });

            // Close modal
            document.getElementById('closeAddUserModal')?.click();

            // Reset form state
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            setSelectedFile(null);
            setPreviewUrl('assets/img/profiles/avatar-30.jpg');
            setFileError(null);

            // Refresh user list
            onAddUser();
        } catch (error: any) {
            console.error(`Error adding ${userType}:`, error);
            console.error('Error details:', error.response?.data || error.message);

            // Show error message
            Swal.fire({
                title: 'Error!',
                text: `Error adding ${userType}: ${error.response?.data?.message || error.message}`,
                icon: 'error',
                confirmButtonText: 'OK'
            });
        } finally {
            // Reset uploading state
            setIsUploading(false);
        }
    };

    return (
        <div className="modal fade" id="add_company">
            <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content">
                    <div className="modal-header">
                        <h4 className="modal-title">Add New User</h4>
                        <button
                            type="button"
                            className="btn-close custom-btn-close"
                            data-bs-dismiss="modal"
                            aria-label="Close"
                        >
                            <i className="ti ti-x" />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body pb-0">
                            <div className="row">
                                <div className="col-md-12">
                                    <div className="d-flex align-items-center flex-wrap row-gap-3 bg-light w-100 rounded p-3 mb-4">
                                        <div className="d-flex align-items-center justify-content-center avatar avatar-xxl rounded-circle border border-dashed me-2 flex-shrink-0 text-dark frames">
                                            <img
                                                src={previewUrl}
                                                alt="Profile preview"
                                                className="rounded-circle"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        </div>
                                        <div className="profile-upload">
                                            <div className="mb-2">
                                                <h6 className="mb-1">Upload Profile Image</h6>
                                                <p className="fs-12">Image should be below 4 mb</p>
                                                {fileError && (
                                                    <p className="text-danger fs-12">{fileError}</p>
                                                )}
                                            </div>
                                            <div className="profile-uploader d-flex align-items-center">
                                                <div className="drag-upload-btn btn btn-sm btn-primary me-2">
                                                    {isUploading ? 'Uploading...' : 'Upload'}
                                                    <input
                                                        ref={fileInputRef}
                                                        type="file"
                                                        className="form-control image-sign"
                                                        accept="image/jpeg,image/png,image/gif,image/webp"
                                                        onChange={handleFileChange}
                                                        disabled={isUploading}
                                                    />
                                                </div>
                                                <button 
                                                    className="btn btn-light btn-sm"
                                                    onClick={handleCancelClick}
                                                    disabled={isUploading || !selectedFile}
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* User Type Selection */}
                                <div className="col-md-12">
                                    <div className="mb-3">
                                        <label className="form-label">
                                            User Type <span className="text-danger"> *</span>
                                        </label>
                                        <div className="d-flex gap-2">
                                            <button
                                                type="button"
                                                className={`btn ${
                                                    userType === 'manager' ? 'btn-primary' : 'btn-outline-primary'
                                                }`}
                                                onClick={() => setUserType('manager')}
                                            >
                                                Manager
                                            </button>
                                            <button
                                                type="button"
                                                className={`btn ${
                                                    userType === 'tutor' ? 'btn-primary' : 'btn-outline-primary'
                                                }`}
                                                onClick={() => setUserType('tutor')}
                                            >
                                                Tutor
                                            </button>
                                            <button
                                                type="button"
                                                className={`btn ${
                                                    userType === 'student' ? 'btn-primary' : 'btn-outline-primary'
                                                }`}
                                                onClick={() => setUserType('student')}
                                            >
                                                Student
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                {/* Common Fields */}
                                <div className="col-md-6">
                                    <div className="mb-3">
                                        <label className="form-label">
                                            Name <span className="text-danger"> *</span>
                                        </label>
                                        <input type="text" name="name" className="form-control" required />
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="mb-3">
                                        <label className="form-label">Last Name</label>
                                        <input type="text" name="lastname" className="form-control" required />
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="mb-3">
                                        <label className="form-label">Email Address</label>
                                        <input type="email" name="email" className="form-control" required />
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="mb-3">
                                        <label className="form-label">
                                            Password <span className="text-danger"> *</span>
                                        </label>
                                        <div className="pass-group">
                                            <input
                                                type={passwordVisibility.password ? 'text' : 'password'}
                                                name="password"
                                                className="pass-input form-control"
                                                required
                                            />
                                            <span
                                                className={`ti toggle-passwords ${
                                                    passwordVisibility.password ? 'ti-eye' : 'ti-eye-off'
                                                }`}
                                                onClick={() => togglePasswordVisibility('password')}
                                            ></span>
                                        </div>
                                    </div>
                                </div>

                                {/* Dynamic Fields Based on User Type */}
                                {userType === 'manager' && (
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label">Speciality</label>
                                            <select name="speciality" className="form-select" required>
                                                <option value="">Select a speciality</option>
                                                {specialties.map((specialty, index) => (
                                                    <option key={index} value={specialty}>
                                                        {specialty}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                )}

                                {userType === 'tutor' && (
                                    <div className="col-md-6">
                                        <div className="mb-3">
                                            <label className="form-label">Class</label>
                                            <input type="text" name="classe" className="form-control" required />
                                        </div>
                                    </div>
                                )}

                                {userType === 'student' && (
                                    <>
                                        <div className="col-md-6">
                                            <div className="mb-3">
                                                <label className="form-label">Speciality</label>
                                                <select name="speciality" className="form-select" required>
                                                    <option value="">Select a speciality</option>
                                                    {specialties.map((specialty, index) => (
                                                        <option key={index} value={specialty}>
                                                            {specialty}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <div className="mb-3">
                                                <label className="form-label">Level</label>
                                                <input type="text" name="level" className="form-control" required />
                                            </div>
                                        </div>
                                        <div className="col-md-12">
                                            <div className="mb-3">
                                                <label className="form-label">Skills</label>
                                                <div className="input-group">
                                                    <input
                                                        type="text"
                                                        className="form-control"
                                                        value={skillInput}
                                                        onChange={(e) => setSkillInput(e.target.value)}
                                                        onKeyDown={handleKeyDown}
                                                        placeholder="Add a skill and press Enter"
                                                    />
                                                    <button
                                                        className="btn btn-primary"
                                                        type="button"
                                                        onClick={handleAddSkill}
                                                    >
                                                        Add
                                                    </button>
                                                </div>
                                                <div className="mt-2">
                                                    {skills.map((skill, index) => (
                                                        <span
                                                            key={index}
                                                            className="badge bg-light text-dark me-2 mb-2 p-2"
                                                        >
                                                            {skill}
                                                            <i
                                                                className="ti ti-x ms-1 cursor-pointer"
                                                                onClick={() => handleRemoveSkill(index)}
                                                                style={{ cursor: 'pointer' }}
                                                            />
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn btn-light me-2"
                                data-bs-dismiss="modal"
                                id="closeAddUserModal"
                            >
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary">
                                Add User
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddUserModal;
