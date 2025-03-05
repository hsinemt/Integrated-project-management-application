import React, { useState, useEffect } from "react";
import { Form, Button, ListGroup, Alert, Card, Container, Row, Col } from "react-bootstrap";
import axios from "axios";
import Swal from "sweetalert2"; // Import SweetAlert2
import { useNavigate } from "react-router-dom"; // Import useNavigate for redirection

interface AddGroupFormProps {
  onSubmit: (data: { nom_groupe: string; emails: string[]; selectedProjects: string[]; motivations: { [key: string]: string } }) => void;
  availableProjects: Project[];
}

interface Project {
  _id: string;
  title: string;
  description: string;
  __v: number;
}

interface Student {
  email: string;
  id: string; // Identifiant unique de l'étudiant
}

const AddGroupForm: React.FC<AddGroupFormProps> = ({ onSubmit, availableProjects }) => {
  const [groupName, setGroupName] = useState<string>("");
  const [emails, setEmails] = useState<Student[]>([]); // Tableau d'objets Student
  const [email, setEmail] = useState<string>("");
  const [selectedProjects, setSelectedProjects] = useState<string[]>(["", "", ""]);
  const [motivations, setMotivations] = useState<{ [key: string]: string }>({});
  const [error, setError] = useState<string>("");
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [availableProjectsState, setAvailableProjectsState] = useState<Project[]>([]);

  const navigate = useNavigate(); // Initialize useNavigate

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isUserEmailAvailable = async (email: string) => {
    try {
      const response = await axios.get(`http://localhost:5000/auth/check-email?email=${email}`);
      return response.data.available;
    } catch (error) {
      console.error("Erreur lors de la vérification de l'email :", error);
      return false;
    }
  };

  const isFormValid = () => {
    return (
      groupName.trim() !== "" &&
      emails.length >= 4 &&
      emails.length <= 6 &&
      selectedProjects.every((project) => project !== "") &&
      selectedProjects.every((project) => motivations[project] && motivations[project].trim() !== "")
    );
  };

  const fetchStudentId = async (email: string) => {
    try {
      const response = await axios.get(`http://localhost:5000/auth/check-email?email=${email}`);
      return response.data.id; // Assurez-vous que la réponse contient un champ 'id'
    } catch (error) {
      console.error("Erreur lors de la récupération de l'ID de l'étudiant :", error);
      return null;
    }
  };

  const addStudent = async () => {
    if (!isValidEmail(email)) {
      setError("Veuillez entrer un email valide.");
      return;
    }
    if (emails.some((student) => student.email === email)) {
      setError("Cet étudiant est déjà ajouté.");
      return;
    }
    if (emails.length >= 6) {
      setError("Un groupe ne peut pas contenir plus de 6 étudiants.");
      return;
    }

    try {
      const isAvailable = await isUserEmailAvailable(email);
      if (isAvailable) {
        const studentId = await fetchStudentId(email);
        if (studentId) {
          // Ajout de l'ID dans la liste studentIds
          setEmails([...emails, { email, id: studentId }]);
          setEmail("");
          setError("");
          setShowAlert(false);
        } else {
          setError("ID de l'étudiant introuvable.");
        }
      } else {
        setShowAlert(true);
      }
    } catch (error) {
      console.error("Erreur lors de l'ajout de l'étudiant :", error);
      setShowAlert(true);
    }
  };

  const removeStudent = (studentEmail: string) => {
    setEmails(emails.filter((student) => student.email !== studentEmail));
  };

  const handleProjectChange = (index: number, value: string) => {
    const updatedProjects = [...selectedProjects];
    updatedProjects[index] = value;
    setSelectedProjects(updatedProjects);
  };

  const handleMotivationChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, projectId: string) => {
    setMotivations({ ...motivations, [projectId]: e.target.value });
  };

  const handleSubmit = async () => {
    for (const projectId of selectedProjects) {
      if (!projectId) {
        setError("Tous les projets doivent être sélectionnés.");
        return;
      }
    }

    const listProjects = selectedProjects.map((projectId) => {
      const project = availableProjectsState.find((p) => p._id === projectId);
      return {
        id_project: project?._id,
        motivation: motivations[projectId] || "",
      };
    });

    try {
      const response = await axios.post("http://localhost:5000/choix/create", {
        nom_groupe: groupName,
        id_students: emails.map((student) => student.id), // Liste des IDs des étudiants
        list_projects: listProjects,
      });

      console.log("Réponse serveur :", response.data);

      // Display success message using SweetAlert
      Swal.fire({
        title: "Success",
        text: "Group added successfully!",
        icon: "success",
        confirmButtonText: "Ok",
      }).then(() => {
        // Redirect to /index page after the alert is closed
        navigate("/index"); // Redirection après l'alerte
      });

      setGroupName("");
      setEmails([]);
      setSelectedProjects(["", "", ""]);
      setMotivations({});
      setError("");
    } catch (error) {
      console.error("Erreur lors de l'ajout du groupe :", error);
      setError("Erreur lors de l'ajout du groupe.");
    }
  };

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await axios.get("http://localhost:5000/projects/all");
        setAvailableProjectsState(response.data);
      } catch (error) {
        console.error("Erreur API projets :", error);
        setError("Erreur lors de la récupération des projets.");
      }
    };
    fetchProjects();
  }, []);

  return (
    <Container className="mt-4">
      <Card>
        <Card.Header as="h3" className="d-flex justify-content-between align-items-center">
          Créer un groupe
          <Button variant="secondary" onClick={() => navigate("/index")}>
            Retour
          </Button>
        </Card.Header>
        <Card.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {showAlert && <Alert variant="warning">Email non trouvé</Alert>}

          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Nom du groupe</Form.Label>
              <Form.Control
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Nom du groupe"
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label>Ajouter un étudiant (Email)</Form.Label>
              <Row>
                <Col>
                  <Form.Control
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemple@domaine.com"
                  />
                </Col>
                <Col xs="auto">
                  <Button variant="primary" onClick={addStudent} disabled={!email}>
                    Ajouter
                  </Button>
                </Col>
              </Row>
            </Form.Group>

            <h5 className="mt-4">Étudiants ajoutés :</h5>
            <ListGroup>
              {emails.map((student, index) => (
                <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
                  {student.email}
                  <Button variant="danger" size="sm" onClick={() => removeStudent(student.email)}>
                    Supprimer
                  </Button>
                </ListGroup.Item>
              ))}
            </ListGroup>

            <Form.Group className="mt-4">
              <Form.Label>Choisir 3 projets</Form.Label>
              {[0, 1, 2].map((index) => (
                <div key={index} className="mb-3">
                  <Form.Label>Projet {index + 1}</Form.Label>
                  <Form.Control
                    as="select"
                    value={selectedProjects[index]}
                    onChange={(e) => handleProjectChange(index, e.target.value)}
                  >
                    <option value="">Sélectionner un projet</option>
                    {availableProjectsState && availableProjectsState.length > 0 ? (
                      availableProjectsState.map((project) => (
                        <option key={project._id} value={project._id}>
                          {project.title}
                        </option>
                      ))
                    ) : (
                      <option disabled>Aucun projet disponible</option>
                    )}
                  </Form.Control>
                  {selectedProjects[index] && (
                    <Form.Control
                      as="textarea"
                      placeholder="Motivation pour ce projet"
                      value={motivations[selectedProjects[index]] || ""}
                      onChange={(e) => handleMotivationChange(e, selectedProjects[index])}
                      className="mt-2"
                    />
                  )}
                </div>
              ))}
            </Form.Group>

            {isFormValid() && (
              <Button className="mt-4" variant="success" onClick={handleSubmit}>
                Valider
              </Button>
            )}
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default AddGroupForm;