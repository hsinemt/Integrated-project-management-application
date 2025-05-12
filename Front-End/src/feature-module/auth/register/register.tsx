import React, { useState, useRef, ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { all_routes } from "../../router/all_routes";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import {registerUser, initialRegisterFormData} from "../../../api/authApi/register/register";
import Select from "react-select";
import { Option } from "../../../core/common/multiSelect";

// Available specialties array
const specialties = ['Twin', 'ERP/BI', 'AI', 'SAE', 'SE', 'SIM', 'NIDS', 'SLEAM', 'GAMIX', 'WIN', 'IoSyS', 'ArcTic'];


type PasswordField = "password" | "confirmPassword";

const Register = () => {
  const routes = all_routes;
  const navigate = useNavigate();

  const [formData, setFormData] = useState(initialRegisterFormData);

  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [passwordVisibility, setPasswordVisibility] = useState({
    password: false,
    confirmPassword: false,
  });

  const togglePasswordVisibility = (field: PasswordField) => {
    setPasswordVisibility((prevState) => ({
      ...prevState,
      [field]: !prevState[field],
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked, files } = e.target as HTMLInputElement;

    if (type === 'file' && files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();

      reader.onloadend = () => {
        setFormData(prevData => ({
          ...prevData,
          photo: file,
          photoPreview: reader.result as string
        }));
      };

      reader.readAsDataURL(file);
    } else {
      setFormData((prevData) => ({
        ...prevData,
        [name]: type === 'checkbox' ? checked : value,
      }));
    }
  };

  // Handle speciality selection
  const handleSpecialityChange = (selectedOption: Option | null) => {
    setFormData(prevData => ({
      ...prevData,
      speciality: selectedOption ? selectedOption.value : ''
    }));
  };

  const handlePhotoClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleSubmit = async (e:React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (formData.password !== formData.confirmPassword) {
      setMessage("Passwords don't match");
      return;
    }
    if (!formData.agreeToTerms){
      setMessage("You must agree to terms and conditions");
      return;
    }
    console.log("Form data:", formData);

    try
    {
      const response = await registerUser(formData);
      setMessage(response.message);
      localStorage.setItem("userEmail", response.email);
      // i use it for testing token
      // if (response.token) {
      //   localStorage.setItem('token', response.token);
      //   console.log("Token stored:", response.token);
      // }
      navigate(routes.emailVerification);
    }catch(error: any){
      console.error("Error:", error);
      if(error.response){
        setMessage(error.response.message);
      }else{
        setMessage("registraion failed, please try again later");
      }
    }
  };

  return (
      <div className="container-fuild">
        <div className="w-100 overflow-hidden position-relative flex-wrap d-block vh-100">
          <div className="row">
            <div className="col-lg-5">
              <div className="login-background position-relative d-lg-flex align-items-center justify-content-center d-none flex-wrap vh-100">
                <div className="bg-overlay-img">
                  <ImageWithBasePath src="assets/img/bg/bg-01.png" className="bg-1" alt="Img" />
                  <ImageWithBasePath src="assets/img/bg/bg-02.png" className="bg-2" alt="Img" />
                  <ImageWithBasePath src="assets/img/bg/bg-03.png" className="bg-3" alt="Img" />
                </div>
                <div className="authentication-card w-100">
                  <div className="authen-overlay-item border w-100">
                    <h1 className="text-white display-1">
                      Welcome to our application <br /> Powered By <br /> Hunters Group.
                    </h1>
                    <div className="my-4 mx-auto authen-overlay-img">
                      <ImageWithBasePath src="assets/img/bg/authentication-bg-01.png" alt="Img" />
                    </div>
                    <div>
                      <p className="text-white fs-20 fw-semibold text-center">
                        Efficiently manage your Integrated Project Evaluation.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-7 col-md-12 col-sm-12">
              <div className="row justify-content-center align-items-center vh-100 overflow-auto flex-wrap">
                <div className="col-md-7 mx-auto vh-100">
                  <form className="vh-100" onSubmit={handleSubmit}>
                    <div className="vh-100 d-flex flex-column justify-content-between p-4 pb-0">
                      <div className=" mx-auto mb-5 text-center">
                        <ImageWithBasePath
                            src="assets/img/projexus-logo.svg"
                            className="img-fluid"
                            alt="Logo"
                        />
                      </div>
                      <div className="">
                        <div className="text-center mb-3">
                          <h2 className="mb-2">Sign Up</h2>
                          <p className="mb-0">Please enter your details to sign up</p>
                        </div>
                        <div className="mb-3">
                          <label className="form-label">Name</label>
                          <div className="input-group">
                            <input
                                type="text"
                                name="name"
                                placeholder="Enter your name"
                                value={formData.name}
                                onChange={handleChange}
                                className="form-control border-end-0"
                            />
                            <span className="input-group-text border-start-0">
                            <i className="ti ti-user"/>
                          </span>
                          </div>
                        </div>
                        <div className="mb-3">
                          <label className="form-label">Last Name</label>
                          <div className="input-group">
                            <input
                                type="text"
                                name="lastName"
                                placeholder="Enter your last name"
                                value={formData.lastName}
                                onChange={handleChange}
                                className="form-control border-end-0"
                            />
                            <span className="input-group-text border-start-0">
                            <i className="ti ti-user"/>
                          </span>
                          </div>
                        </div>

                        <div className="mb-3">
                          <label className="form-label">Email Address</label>
                          <div className="input-group">
                            <input
                                type="text"
                                name="email"
                                placeholder="Ex: Name.lastname@esprit.tn"
                                value={formData.email}
                                onChange={handleChange}
                                className="form-control border-end-0"
                            />
                            <span className="input-group-text border-start-0">
                            <i className="ti ti-mail"/>
                          </span>
                          </div>
                        </div>
                        <div className="mb-3">
                          <label className="form-label">Password</label>
                          <div className="pass-group">
                            <input
                                type={
                                  passwordVisibility.password
                                      ? "text"
                                      : "password"
                                }
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className="pass-input form-control"
                            />
                            <span
                                className={`ti toggle-passwords ${passwordVisibility.password
                                    ? "ti-eye"
                                    : "ti-eye-off"
                                }`}
                                onClick={() =>
                                    togglePasswordVisibility("password")
                                }
                            ></span>
                          </div>
                        </div>
                        <div className="mb-3">
                          <label className="form-label">Confirm Password</label>
                          <div className="pass-group">
                            <input
                                type={
                                  passwordVisibility.confirmPassword
                                      ? "text"
                                      : "password"
                                }
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                className="pass-input form-control"
                            />
                            <span
                                className={`ti toggle-passwords ${passwordVisibility.confirmPassword
                                    ? "ti-eye"
                                    : "ti-eye-off"
                                }`}
                                onClick={() =>
                                    togglePasswordVisibility("confirmPassword")
                                }
                            ></span>
                          </div>
                        </div>

                        <div className="mb-3">
                          <label className="form-label">Speciality</label>
                          <Select
                            options={specialties.map(specialty => ({ value: specialty, label: specialty }))}
                            onChange={handleSpecialityChange}
                            value={formData.speciality ? { value: formData.speciality, label: formData.speciality } : null}
                            className="form-control"
                            classNamePrefix="react-select"
                            placeholder="Select a speciality"
                          />
                        </div>

                        <div className="mb-3">
                          <label className="form-label">Profile Photo (Optional)</label>
                          <div className="d-flex align-items-center">
                            <div
                              className="avatar-upload position-relative me-3"
                              onClick={handlePhotoClick}
                              style={{
                                width: '100px',
                                height: '100px',
                                borderRadius: '50%',
                                border: '2px dashed #ccc',
                                cursor: 'pointer',
                                overflow: 'hidden',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: '#f8f9fa'
                              }}
                            >
                              {formData.photoPreview ? (
                                <img
                                  src={formData.photoPreview}
                                  alt="Profile Preview"
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : (
                                <i className="ti ti-camera" style={{ fontSize: '24px', color: '#6c757d' }}></i>
                              )}
                              <input
                                ref={fileInputRef}
                                type="file"
                                name="photo"
                                accept="image/*"
                                onChange={handleChange}
                                style={{ display: 'none' }}
                              />
                            </div>
                            <div>
                              <p className="mb-1">Upload your profile photo</p>
                              <small className="text-muted">Click to browse or drag and drop</small>
                            </div>
                          </div>
                        </div>
                        <div className="d-flex align-items-center justify-content-between mb-3">
                          <div className="d-flex align-items-center">
                            <div className="form-check form-check-md mb-0">
                              <input
                                  className="form-check-input"
                                  id="agreeToTerms"
                                  type="checkbox"
                                  name="agreeToTerms"
                                  checked={formData.agreeToTerms}
                                  onChange={handleChange}
                              />
                              <label
                                  htmlFor="agreeToTerms"
                                  className="form-check-label text-dark mt-0"
                              >
                                Agree to{" "}
                                <span className="text-primary">
                                Terms &amp; Privacy
                              </span>
                              </label>
                            </div>
                          </div>
                        </div>
                        <div className="mb-3">
                          <button type="submit" className="btn btn-primary w-100">
                            Sign Up
                          </button>
                        </div>
                        {message && <div className="alert alert-danger">{message}</div>}
                        <div className="text-center">
                          <h6 className="fw-normal text-dark mb-0">
                            Already have an account?
                            <Link to={all_routes.login} className="hover-a ms-1">
                              Sign In
                            </Link>
                          </h6>
                        </div>
                        <div className="login-or">
                          <span className="span-or">Or</span>
                        </div>
                        <div className="mt-2">
                          <div className="d-flex align-items-center justify-content-center flex-wrap">
                            <div className="text-center me-2 flex-fill">
                              <a

                              href="http://localhost:9777/auth/github"
                              className="br-10 p-2 btn btn-dark d-flex align-items-center justify-content-center"
                              >
                              <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  width="24"
                                  height="24"
                                  viewBox="0 0 24 24"
                                  fill="white"
                                  className="m-1"
                              >
                                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                              </svg>
                            </a>
                          </div>

                          <div className="text-center me-2 flex-fill">
                            <a

                            href="http://localhost:9777/auth/google"
                            className="br-10 p-2 btn btn-outline-light border d-flex align-items-center justify-content-center"
                            >
                            <ImageWithBasePath
                                className="img-fluid m-1"
                                src="assets/img/icons/google-logo.svg"
                                alt="Google"
                            />
                          </a>
                        </div>
                      </div>
                    </div>

                      </div>
                      <div className="mt-5 pb-4 text-center">
                        <p className="mb-0 text-gray-9">Copyright © 2024 - Smarthr</p>
                      </div>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

  );
};

export default Register;
