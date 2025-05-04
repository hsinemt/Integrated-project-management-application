import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { all_routes } from "../../router/all_routes";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import SkillTags from "./SkillTags"; // Import the new SkillTags component
import Swal from "sweetalert2";

const Profile = () => {
  const route = all_routes;
  const [user, setUser] = useState({
    _id: "", // Add _id to the user state
    name: "",
    lastname: "",
    email: "",
    birthday: "",
    password: "",
    
avatar: "",
    skills: [], 

    role: ""// Add skills to the user state
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.error("No token found in localStorage");
          return;
        }

        const response = await axios.get("http://localhost:9777/user/profile", {
          headers: { Authorization: `${token}` },
        });

        if (response.data) {
          const formattedBirthday = response.data.birthday
            ? response.data.birthday.split("T")[0]
            : "";
          setUser({
            _id: response.data._id, // Set the _id property
            name: response.data.name,
            lastname: response.data.lastname,
            email: response.data.email,
            birthday: formattedBirthday,
            password: "",
            avatar: response.data.avatar,
            skills: response.data.skills || [], 
            role: response.data.role
            // Add skills from the backend
          });

          // Set the selected skills with the user's current skills
          setSelectedSkills(response.data.skills || []);
        } else {
          console.error("User data is empty");
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUser({ ...user, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const filePreviewUrl = URL.createObjectURL(file);
      setPreviewImage(filePreviewUrl);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return alert("Please select a file first!");

    const formData = new FormData();
    formData.append("image", selectedFile);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post("http://localhost:9777/user/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `${token}`,
        },
      });

      if (response.data.imageUrl) {
        setUser({ ...user, avatar: response.data.imageUrl });
        setPreviewImage(null);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  };

  const handleSaveSkills = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No token found");
        return;
      }
  
      const response = await axios.put(
        "http://localhost:9777/user/update-skills",
        { skills: selectedSkills }, // ✅ Only send skills (no userId)
        { headers: { Authorization: `${token}` } }
      );
  
      if (response.data.success) {
        setUser((prevUser) => ({
          ...prevUser,
          skills: response.data.updatedSkills,
        }));
        Swal.fire("Success!", "Skills updated!", "success");
      }
    } catch (error) {
      console.error("Error saving skills:", error);
      Swal.fire("Error!", "Failed to update skills.", "error");
    }
  };

  const handleSaveProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token || !user._id) {
        console.error("User is not authenticated");
        return;
      }

      // Prepare the payload with updated user data
      const payload = {
        name: user.name,
        lastname: user.lastname,
        birthday: user.birthday,
        password: user.password, // Only send the password if it's not empty
      };

      // Log the payload being sent
      console.log("Sending payload:", payload);

      const response = await axios.put(
        `http://localhost:9777/user/update-profile/${user._id}`,
        payload,
        { headers: { Authorization: `${token}` } }
      );

      // Log the response from the backend
      console.log("Backend response:", response.data);

      if (response.data.success) {
        Swal.fire({
          title: "Success!",
          text: "Profile updated successfully!",
          icon: "success",
          confirmButtonText: "OK",
        });
        
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      Swal.fire({
        title: "Error!",
        text: "Failed to update profile. Please try again.",
        icon: "error",
        confirmButtonText: "OK",
      });
      
    }
  };

  return (
    <div className="page-wrapper">
      <div className="content">
        <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
          <h2 className="mb-1">Profile</h2>
          <CollapseHeader />
        </div>

        <div className="card">
          <div className="card-body">
            <h4>Profile</h4>

            <div className="d-flex align-items-center flex-wrap bg-light w-100 rounded p-3 mb-4">
              <div className="avatar avatar-xxl rounded-circle border border-dashed me-2">
                {previewImage ? (
                  <img
                    src={previewImage}
                    className="img-fluid rounded-circle"
                    width="100"
                    height="100"
                    alt="Preview"
                  />
                ) : user.avatar ? (
                  <img
                    src={`http://localhost:9777${user.avatar}`}
                    className="img-fluid rounded-circle"
                    width="100"
                    height="100"
                    alt="Profile"
                  />
                ) : (
                  <i className="ti ti-photo text-gray-3 fs-16" />
                )}
              </div>
              <div className="profile-upload">
                <h6>Profile Photo</h6>
                <p className="fs-12">Recommended size: 40x40px</p>
                <div className="d-flex align-items-center">
                  <input type="file" className="form-control" onChange={handleFileChange} />
                  <button onClick={handleUpload} className="btn btn-primary btn-sm ms-2">
                    Upload
                  </button>
                </div>
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault(); // Prevent the default form submission
                handleSaveProfile(); // Call the handleSaveProfile function
              }}
            >
              <div className="border-bottom mb-3">
                <div className="row">
                  <div className="col-md-6">
                    <label className="form-label">First Name</label>
                    <input
                      type="text"
                      className="form-control"
                      name="name"
                      value={user.name}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Last Name</label>
                    <input
                      type="text"
                      className="form-control"
                      name="lastname"
                      value={user.lastname}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      value={user.email}
                      disabled
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Birthday</label>
                    <input
                      type="date"
                      className="form-control"
                      name="birthday"
                      value={user.birthday}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">New Password</label>
                    <input
                      type="password"
                      className="form-control"
                      name="password"
                      value={user.password}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="col-md-12">
                  {user.role === 'student' && (
          <>
            <label className="form-label">Skills</label>
            <SkillTags
              selectedSkills={selectedSkills}
              onChange={(skills) => setSelectedSkills(skills)}
            />
            <button
              type="button"
              onClick={handleSaveSkills}
              className="btn btn-primary mt-3"
            >
              Save Skills
            </button>
          </>
        )}
                  </div>
                </div>
              </div>
              <div className="d-flex justify-content-end">
                <button type="submit" className="btn btn-primary">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;