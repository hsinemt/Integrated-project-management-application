import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import { all_routes } from "../../router/all_routes";
import ReCAPTCHA from "react-google-recaptcha";

type PasswordField = "password";

const Login = () => {
  const routes = all_routes;
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error] = useState("");
  const [loading] = useState(false);
  const [passwordVisibility, setPasswordVisibility] = useState({
    password: false,
  });

  const togglePasswordVisibility = (field: PasswordField) => {
    setPasswordVisibility((prevState) => ({
      ...prevState,
      [field]: !prevState[field],
    }));
  };



  return (
    <div className="container-fluid">
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
                <form className="vh-100" >
               
                  <div className="vh-100 d-flex flex-column justify-content-between p-4 pb-0">
                    <div className="mx-auto mb-5 text-center">
                      <ImageWithBasePath src="assets/img/logo.svg" className="img-fluid" alt="Logo" />
                    </div>
                    <div>
                      <div className="text-center mb-3">
                        <h2 className="mb-2">Sign In</h2>
                        <p className="mb-0">Please enter your details to sign in</p>
                      </div>
                      {error && <div className="alert alert-danger">{error}</div>}
                      <div className="mb-3">
                        <label className="form-label">Email</label>
                        <div className="input-group">
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="form-control border-end-0"
                            required
                          />
                          <span className="input-group-text border-start-0">
                            <i className="ti ti-mail" />
                          </span>
                        </div>
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Password</label>
                        <div className="pass-group">
                          <input
                            type={passwordVisibility.password ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pass-input form-control"
                            required
                          />
                          <span
                            className={`ti toggle-passwords ${passwordVisibility.password ? "ti-eye" : "ti-eye-off"}`}
                            onClick={() => togglePasswordVisibility("password")}
                          ></span>
                        </div>
                      </div>
                      <div className="mb-3 text-center">

        </div>

                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <div className="form-check form-check-md mb-0">
                          <input className="form-check-input" id="remember_me" type="checkbox" />
                          <label htmlFor="remember_me" className="form-check-label mt-0">
                            Remember Me
                          </label>
                        </div>
                        <div className="text-end">
                          <Link to={all_routes.forgotPassword} className="link-danger">
                            Forgot Password?
                          </Link>
                        </div>
                      </div>
                      <div className="mb-3 text-center">
           

                </div>
                      <div className="mb-3">
                        <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                          {loading ? "Signing in..." : "Sign In"}
                        </button>
                      </div>
                      <div className="text-center">
                        <h6 className="fw-normal text-dark mb-0">
                          Don’t have an account?
                          <Link to={all_routes.register} className="hover-a">
                            {" "} Create Account
                          </Link>
                        </h6>
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

export default Login;
