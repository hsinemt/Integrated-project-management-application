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
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const API_URL = "http://localhost:9777/api";

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
      setError("Veuillez valider le reCAPTCHA !");
      setOtpLoading(false);
      return;
    }

    if (!email) {
      setError("Veuillez entrer votre adresse email.");
      setOtpLoading(false);
      return;
    }

    try {
      const otpResponse = await axios.post(`${API_URL}/user/send-2fa-otp1`, {
        email,
      });

      if (otpResponse.data && otpResponse.data.success) {
        Swal.fire({
          icon: "success",
          title: "Code OTP Envoyé",
          text: "Un code de vérification a été envoyé à votre email",
          showConfirmButton: false,
          timer: 2000,
        });
        setOtpSent(true);
      } else {
        setError(otpResponse.data?.message || "Échec de l'envoi du code OTP");
      }
    } catch (err: any) {
      setError(err.response?.data?.message || "Erreur lors de l'envoi du code OTP");
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
      const response = await axios.post(`${API_URL}/user/login`, {
        email,
        password,
        captchaToken,
        otp: otpSent ? otp : undefined,
      });

      if (response.data && response.data.token) {
        // Sauvegarder le token et le rôle
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("role", response.data.role);
        localStorage.setItem("userId", response.data.user.id);

        // Sauvegarder les informations si "Remember Me" est coché
        if (rememberMe) {
          localStorage.setItem("email", email);
          localStorage.setItem("password", password);
        } else {
          localStorage.removeItem("email");
          localStorage.removeItem("password");
        }

        // Afficher l'alerte de succès et redirection
        Swal.fire({
          icon: "success",
          title: "Bienvenue !",
          text: "Vous êtes connecté avec succès.",
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
      if (err.response?.status === 400 && err.response.data.message.includes("OTP")) {
        setOtpSent(true);
        setError("Veuillez entrer le code OTP envoyé à votre email");
      } else if (err.response?.status === 404) {
        setError("Point de terminaison de connexion introuvable. Vérifiez les routes du backend.");
      } else {
        setError(err.response?.data?.message || "Échec de connexion. Vérifiez vos informations.");
      }
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
                <ImageWithBasePath src="assets/img/bg/bg-01.png" className="bg-1" alt="Img" />
                <ImageWithBasePath src="assets/img/bg/bg-02.png" className="bg-2" alt="Img" />
                <ImageWithBasePath src="assets/img/bg/bg-03.png" className="bg-3" alt="Img" />
              </div>
              <div className="authentication-card w-100">
                <div className="authen-overlay-item border w-100">
                  <h1 className="text-white display-1">
                    Bienvenue dans notre application <br /> Propulsé par <br /> Hunters Group.
                  </h1>
                  <div className="my-4 mx-auto authen-overlay-img">
                    <ImageWithBasePath src="assets/img/bg/authentication-bg-01.png" alt="Img" />
                  </div>
                  <div>
                    <p className="text-white fs-20 fw-semibold text-center">
                      Gérez efficacement votre évaluation de projet intégré.
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
                      <ImageWithBasePath src="assets/img/projexus-logo.svg" className="img-fluid" alt="Logo" />
                    </div>
                    <div>
                      <div className="text-center mb-3">
                        <h2 className="mb-2">Connexion</h2>
                        <p className="mb-0">Veuillez entrer vos informations pour vous connecter</p>
                      </div>
                      {error && <div className="alert alert-danger">{error}</div>}

                      {/* Champ Email */}
                      <div className="mb-3">
                        <label className="form-label">Email</label>
                        <div className="input-group">
                          <input
                            type="email"
                            placeholder="Entrez votre email"
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
                        <label className="form-label">Mot de passe</label>
                        <div className="pass-group">
                          <input
                            type={passwordVisibility.password ? "text" : "password"}
                            value={password}
                            placeholder="Entrez votre mot de passe"
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

                      {/* Champ OTP */}
                      {otpSent && (
                        <div className="mb-3">
                          <label className="form-label">Code de vérification</label>
                          <div className="input-group">
                            <input
                              type="text"
                              value={otp}
                              onChange={(e) => setOtp(e.target.value)}
                              className="form-control"
                              placeholder="Entrez le code à 6 chiffres"
                              required
                            />
                            <span className="input-group-text">
                              <i className="ti ti-key" />
                            </span>
                          </div>
                          <small className="text-muted">Vérifiez votre email pour le code</small>
                        </div>
                      )}

                      {/* reCAPTCHA */}
                      <div className="mb-3 text-center">
                        <ReCAPTCHA
                          sitekey="6Lf7r-EqAAAAAO4wc5S9o3ZhF5ronTLKiptJZFKp"
                          onChange={(token: string | null) => {
                            setCaptchaToken(token);
                          }}
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="d-flex gap-2 mb-3">
                        <button
                          type="button"
                          className="btn btn-secondary flex-grow-1"
                          onClick={handleSendOtp}
                          disabled={otpLoading || otpSent}
                        >
                          {otpLoading ? "Envoi..." : otpSent ? "Code Envoyé" : "Envoyer Code"}
                        </button>
                        <button
                          type="submit"
                          className="btn btn-primary flex-grow-1"
                          disabled={loading}
                        >
                          {loading ? "Connexion..." : "Connexion"}
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
                            Se souvenir de moi
                          </label>
                        </div>
                        <div className="text-end">
                          <Link to={routes.forgotPassword} className="link-danger">
                            Mot de passe oublié ?
                          </Link>
                        </div>
                      </div>

                      {/* Lien pour créer un compte */}
                      <div className="text-center">
                        <h6 className="fw-normal text-dark mb-0">
                          Vous n'avez pas de compte ?
                          <Link to={routes.register} className="hover-a">
                            {" "} Créer un compte
                          </Link>
                        </h6>
                      </div>

                      {/* Authentification sociale */}
                      <div className="mt-2">
                        <div className="d-flex align-items-center justify-content-center flex-wrap">
                          <div className="text-center me-2 flex-fill">
                            <a
                              href="http://localhost:9777/auth/github"
                              className="br-10 p-2 btn btn-dark d-flex align-items-center justify-content-center"
                            >
                              <ImageWithBasePath
                                className="img-fluid m-1"
                                src="assets/img/icons/github-logos.svg"
                                alt="GitHub"
                              />
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