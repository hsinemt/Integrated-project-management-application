import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { all_routes } from "../../router/all_routes";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";

const ResetPassword = () => {
  const routes = all_routes;
  const navigation = useNavigate();
  const { token } = useParams(); // Extract the token from the URL

  const [passwordVisibility, setPasswordVisibility] = useState({
    password: false,
  });
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [passwordResponse, setPasswordResponse] = useState({
    passwordResponseText: "Use 8 or more characters with a mix of letters, numbers, and symbols.",
    passwordResponseKey: "",
  });

  const togglePasswordVisibility = (field: "password") => {
    setPasswordVisibility((prevState) => ({
      ...prevState,
      [field]: !prevState[field],
    }));
  };

  const onChangePassword = (password: string) => {
    setPassword(password);
    if (password.match(/^$|\s+/)) {
      setPasswordResponse({
        passwordResponseText: "Use 8 or more characters with a mix of letters, numbers & symbols",
        passwordResponseKey: "",
      });
    } else if (password.length === 0) {
      setPasswordResponse({
        passwordResponseText: "",
        passwordResponseKey: "",
      });
    } else if (password.length < 8) {
      setPasswordResponse({
        passwordResponseText: "Weak. Must contain at least 8 characters",
        passwordResponseKey: "0",
      });
    } else if (
        password.search(/[a-z]/) < 0 ||
        password.search(/[A-Z]/) < 0 ||
        password.search(/[0-9]/) < 0
    ) {
      setPasswordResponse({
        passwordResponseText: "Average. Must contain at least 1 upper case and number",
        passwordResponseKey: "1",
      });
    } else if (password.search(/(?=.*?[#?!@$%^&*-])/) < 0) {
      setPasswordResponse({
        passwordResponseText: "Almost. Must contain a special symbol",
        passwordResponseKey: "2",
      });
    } else {
      setPasswordResponse({
        passwordResponseText: "Awesome! You have a secure password.",
        passwordResponseKey: "3",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(`http://localhost:8090/auth/reset/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          password,
          otp,
        }),
      });

      if (response.ok) {
        navigation(routes.resetPasswordSuccess);
      } else {
        alert("Failed to reset password. Please check the OTP and try again.");
      }
    } catch (error) {
      console.error("Error resetting password:", error);
      alert("An error occurred while resetting the password.");
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
                      Empowering people <br /> through seamless HR <br /> management.
                    </h1>
                    <div className="my-4 mx-auto authen-overlay-img">
                      <ImageWithBasePath src="assets/img/bg/authentication-bg-01.png" alt="Img" />
                    </div>
                    <div>
                      <p className="text-white fs-20 fw-semibold text-center">
                        Efficiently manage your workforce, streamline <br />{" "}
                        operations effortlessly.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-7 col-md-12 col-sm-12">
              <div className="row justify-content-center align-items-center vh-100 overflow-auto flex-wrap">
                <div className="col-md-7 mx-auto vh-100">
                  <form onSubmit={handleSubmit} className="vh-100">
                    <div className="vh-100 d-flex flex-column justify-content-between p-4 pb-0">
                      <div className=" mx-auto mb-5 text-center">
                        <ImageWithBasePath
                            src="assets/img/logo.svg"
                            className="img-fluid"
                            alt="Logo"
                        />
                      </div>
                      <div className="">
                        <div className="text-center mb-3">
                          <h2 className="mb-2">Reset Password</h2>
                          <p className="mb-0">
                            Your new password must be different from previous used
                            passwords.
                          </p>
                        </div>
                        <div>
                          <div className="input-block mb-3">
                            <div className="mb-3">
                              <label className="form-label">Password</label>
                              <div className="pass-group" id="passwordInput">
                                <input
                                    type={passwordVisibility.password ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => onChangePassword(e.target.value)}
                                    className="form-control pass-input"
                                    placeholder="Enter your password"
                                />
                                <span
                                    className={`ti toggle-passwords ${passwordVisibility.password ? "ti-eye" : "ti-eye-off"}`}
                                    onClick={() => togglePasswordVisibility("password")}
                                    style={{ cursor: "pointer" }}
                                ></span>
                              </div>
                            </div>
                            <div
                                className={`password-strength d-flex ${passwordResponse.passwordResponseKey === "0"
                                    ? "poor-active"
                                    : passwordResponse.passwordResponseKey === "1"
                                        ? "avg-active"
                                        : passwordResponse.passwordResponseKey === "2"
                                            ? "strong-active"
                                            : passwordResponse.passwordResponseKey === "3"
                                                ? "heavy-active"
                                                : ""
                                }`}
                                id="passwordStrength"
                            >
                              <span id="poor" className="active" />
                              <span id="weak" className="active" />
                              <span id="strong" className="active" />
                              <span id="heavy" className="active" />
                            </div>
                          </div>
                          <p className="fs-12">{passwordResponse.passwordResponseText}</p>
                          <div className="mb-3">
                            <label className="form-label">OTP</label>
                            <div className="pass-group">
                              <input
                                  type="text"
                                  value={otp}
                                  onChange={(e) => setOtp(e.target.value)}
                                  className="form-control"
                                  placeholder="Enter OTP"
                              />
                            </div>
                          </div>
                          <div className="mb-3">
                            <button type="submit" className="btn btn-primary w-100">
                              Submit
                            </button>
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

export default ResetPassword;