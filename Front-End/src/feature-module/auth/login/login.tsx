import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import { all_routes } from "../../router/all_routes";
import ReCAPTCHA from "react-google-recaptcha";
import Swal from "sweetalert2";

type PasswordField = "password";

const Login = () => {
  const routes = all_routes;
  const navigate = useNavigate();

  // States pour gérer le formulaire
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [passwordVisibility, setPasswordVisibility] = useState({ password: false });
  const [otp, setOtp] = useState(""); // State pour le code OTP
  const [otpSent, setOtpSent] = useState(false); // Pour vérifier si l'OTP a été envoyé
  const [otpLoading, setOtpLoading] = useState(false);

  // Pour gérer "Remember Me" et récupérer les infos si présentes dans localStorage
  useEffect(() => {
    const storedEmail = localStorage.getItem("email");
    const storedPassword = localStorage.getItem("password");
    if (storedEmail && storedPassword) {
      setEmail(storedEmail);
      setPassword(storedPassword);
      setRememberMe(true);
    }
  }, []);

  const togglePasswordVisibility = (field: PasswordField) => {
    setPasswordVisibility((prevState) => ({
      ...prevState,
      [field]: !prevState[field],
    }));
  };

  // Fonction pour envoyer l'OTP
  const handleSendOtp = async () => {
    setError("");
    setOtpLoading(true);

    if (!captchaToken) {
      setError("Please validate the reCAPTCHA!");
      setOtpLoading(false);
      return;
    }

    if (!email) {
      setError("Please enter your email address.");
      setOtpLoading(false);
      return;
    }

    try {
      const otpResponse = await axios.post("http://localhost:9777/user/send-2fa-otp1", {
        email,
      });

      if (otpResponse.data && otpResponse.data.success) {
        Swal.fire({
          icon: "success",
          title: "OTP Sent",
          text: "A verification code has been sent to your email",
          showConfirmButton: false,
          timer: 2000,
        });
        setOtpSent(true);
      } else {
        setError(otpResponse.data?.message || "Failed to send OTP");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Error sending OTP");
    } finally {
      setOtpLoading(false);
    }
  };

  // Fonction pour vérifier l'OTP et se connecter
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (!captchaToken) {
      setError("Veuillez valider le reCAPTCHA !");
      setLoading(false);
      return;
    }

    if (!email || !password || (otpSent && !otp)) {
      setError("Veuillez remplir tous les champs requis.");
      setLoading(false);
      return;
    }

    try {
      // Effectuer la connexion
      const response = await axios.post("http://localhost:9777/user/login", {
        email,
        password,
        captchaToken,
        otp: otpSent ? otp : undefined, // Envoyer l'OTP uniquement si nécessaire
      });

      if (response.data && response.data.token) {
        // Sauvegarder le token et le rôle
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("role", response.data.role);
        localStorage.setItem("userId", response.data.user.id);

        // Afficher l'alerte de succès et redirection
        Swal.fire({
          icon: "success",
          title: `Welcome!`,
          text: "You are successfully logged in.",
          showConfirmButton: false,
          timer: 2000,
        });

        // Rediriger après un court délai
        setTimeout(() => {
          if (['manager', 'tutor', 'student'].includes(response.data.role)) {
            navigate("/projects-grid");
          } else {
            const redirectTo = response.data.redirectTo || "/index";
            navigate(redirectTo);
          }
        }, 2000);
      } else {
        setError(response.data.message || "Échec de connexion. Vérifiez vos informations.");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Échec de connexion. Vérifiez vos informations.");
    } finally {
      setLoading(false);
    }
  };

  return (
      <div className="container-fluid">
        <div className="w-100 overflow-hidden position-relative flex-wrap d-block vh-100">
          <div className="row">
            <div className="col-lg-5">
              <div className="login-background position-relative d-lg-flex align-items-center justify-content-center d-none flex-wrap vh-100">
                <div className="bg-overlay-img">
                  <ImageWithBasePath src="assets/img/bg/bg-01.png" className="bg-1"  />
                  <ImageWithBasePath src="assets/img/bg/bg-02.png" className="bg-2"  />
                  <ImageWithBasePath src="assets/img/bg/bg-03.png" className="bg-3"  />
                </div>
                <div className="authentication-card w-100">
                  <div className="authen-overlay-item border w-100">
                    <h1 className="text-white display-1">
                      Welcome to our application <br /> Powered By <br /> Hunters Group.
                    </h1>
                    <div className="my-4 mx-auto authen-overlay-img">
                      <ImageWithBasePath src="assets/img/bg/authentication-bg-01.png"  />
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
                  <form className="vh-100" onSubmit={handleLogin}>
                    <div className="vh-100 d-flex flex-column justify-content-between p-4 pb-0">
                      <div className="mx-auto mb-5 text-center">
                        <ImageWithBasePath src="assets/img/projexus-logo.svg" className="img-fluid"  />
                      </div>
                      <div>
                        <div className="text-center mb-3">
                          <h2 className="mb-2">Sign In</h2>
                          <p className="mb-0">Please enter your details to sign in</p>
                        </div>
                        {error && <div className="alert alert-danger">{error}</div>}

                        {/* Champ Email */}
                        <div className="mb-3">
                          <label className="form-label">Email</label>
                          <div className="input-group">
                            <input
                                type="email"
                                placeholder="Enter your email"
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

                        {/* Champ Password */}
                        <div className="mb-3">
                          <label className="form-label">Password</label>
                          <div className="pass-group">
                            <input
                                type={passwordVisibility.password ? "text" : "password"}
                                value={password}
                                placeholder="Enter your password"
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
                        {otpSent && (
                            <div className="mb-3">
                              <label className="form-label">Verification Code</label>
                              <div className="input-group">
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    className="form-control"
                                    placeholder="Enter 6-digit code"
                                    required
                                />
                                <span className="input-group-text">
                              <i className="ti ti-key" />
                            </span>
                              </div>
                              <small className="text-muted">Check your email for the code</small>
                            </div>
                        )}
                        {/* reCAPTCHA */}
                        <div className="mb-3 text-center">
                          <ReCAPTCHA
                              sitekey="6Lf7r-EqAAAAAO4wc5S9o3ZhF5ronTLKiptJZFKp"
                              onChange={(token: string | null) => {
                                if (token) {
                                  setCaptchaToken(token);
                                } else {
                                  setCaptchaToken(null);
                                }
                              }}
                          />
                        </div>

                        {/* Bouton Send OTP */}
                        {/* Action Buttons */}
                        <div className="d-flex gap-2 mb-3">
                          <button
                              type="button"
                              className="btn btn-secondary flex-grow-1"
                              onClick={handleSendOtp}
                              disabled={otpLoading || otpSent}
                          >
                            {otpLoading ? "Sending..." : otpSent ? "Code Sent" : "Send Code"}
                          </button>
                          <button
                              type="submit"
                              className="btn btn-primary flex-grow-1"
                              disabled={loading}
                          >
                            {loading ? "Logging in..." : "Login"}
                          </button>
                        </div>
                        {/* Remember Me et Forgot Password */}
                        <div className="d-flex align-items-center justify-content-between mb-3">
                          <div className="form-check form-check-md mb-0">
                            <input
                                className="form-check-input"
                                id="remember_me"
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                            />
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

                        {/* Lien pour créer un compte */}
                        <div className="text-center">
                          <h6 className="fw-normal text-dark mb-0">
                            Don’t have an account?
                            <Link to={all_routes.register} className="hover-a">
                              {" "} Create Account
                            </Link>
                          </h6>
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
                        <p className="mb-0 text-gray-9">Projexus Copyright © 2025</p>
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
