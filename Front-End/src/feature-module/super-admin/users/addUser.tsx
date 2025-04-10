import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import ImageWithBasePath from '../../../core/common/imageWithBasePath';
import { addTutor, addManager, addStudent } from '../../../api/authApi/register/addUsers';

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

        const commonData = {
            name: formData.get('name') as string,
            lastname: formData.get('lastname') as string,
            email: formData.get('email') as string,
            password: formData.get('password') as string,
        };

        try {
            let result;
            switch (userType) {
                case 'manager':
                    result = await addManager({
                        ...commonData,
                        speciality: formData.get('speciality') as string,
                    });
                    break;
                case 'tutor':
                    result = await addTutor({
                        ...commonData,
                        classe: formData.get('classe') as string,
                    });
                    break;
                case 'student':
                    result = await addStudent({
                        ...commonData,
                        speciality: formData.get('speciality') as string,
                        skills: skills,
                        level: formData.get('level') as string,
                    });
                    break;
                default:
                    throw new Error('Invalid user type');
            }

            console.log(`${userType} added successfully:`, result);

            document.getElementById('closeAddUserModal')?.click();

            onAddUser();
        } catch (error: any) {
            console.error(`Error adding ${userType}:`, error);
            console.error('Error details:', error.response?.data || error.message);
            alert(`Error adding ${userType}: ${error.response?.data?.message || error.message}`);
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
                                            <ImageWithBasePath
                                                src="assets/img/profiles/avatar-30.jpg"
                                                alt="img"
                                                className="rounded-circle"
                                            />
                                        </div>
                                        <div className="profile-upload">
                                            <div className="mb-2">
                                                <h6 className="mb-1">Upload Profile Image</h6>
                                                <p className="fs-12">Image should be below 4 mb</p>
                                            </div>
                                            <div className="profile-uploader d-flex align-items-center">
                                                <div className="drag-upload-btn btn btn-sm btn-primary me-2">
                                                    Upload
                                                    <input
                                                        type="file"
                                                        className="form-control image-sign"
                                                        multiple
                                                    />
                                                </div>
                                                <Link to="#" className="btn btn-light btn-sm">
                                                    Cancel
                                                </Link>
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
                                            <input type="text" name="speciality" className="form-control" required />
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
                                                <input type="text" name="speciality" className="form-control" required />
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