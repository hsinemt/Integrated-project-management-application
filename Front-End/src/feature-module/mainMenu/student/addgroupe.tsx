import React, { useState, useEffect } from "react";
import { Form, Button, ListGroup, Alert, Card, Container, Row, Col } from "react-bootstrap";
import axios from "axios";
import Swal from "sweetalert2";
import { useNavigate, Link } from "react-router-dom";
import { all_routes } from "../../router/all_routes";

interface AddGroupFormProps {
  onSubmit: (data: { nom_groupe: string; emails: string[]; selectedProjects: string[]; motivations: { [key: string]: string } }) => void;
  availableProjects: Project[];
}

interface Project {
  _id: string;
  title: string;
  description: string;
  __v: number;
  score?: number;
}

interface Student {
  email: string;
  id: string;
}

const AddGroupForm: React.FC<AddGroupFormProps> = ({ onSubmit, availableProjects }) => {
  const [groupName, setGroupName] = useState<string>("");
  const [emails, setEmails] = useState<Student[]>([]);
  const [email, setEmail] = useState<string>("");
  const [selectedProjects, setSelectedProjects] = useState<string[]>(["", "", ""]);
  const [motivations, setMotivations] = useState<{ [key: string]: string }>({});
  const [error, setError] = useState<string>("");
  const [showAlert, setShowAlert] = useState<boolean>(false);
  const [availableProjectsState, setAvailableProjectsState] = useState<Project[]>([]);
  const [suggestedProjects, setSuggestedProjects] = useState<Project[]>([]);
  const navigate = useNavigate();

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isUserEmailAvailable = async (email: string) => {
    try {
      const response = await axios.get(`http://localhost:9777/user/check-email?email=${email}`);
      return response.data.available;
    } catch (error) {
      console.error("Error checking email:", error);
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
      const response = await axios.get(`http://localhost:9777/user/check-email?email=${email}`);
      return response.data.id;
    } catch (error) {
      console.error("Error retrieving student ID:", error);
      return null;
    }
  };
  const fetchStudentSkills = async (email: string) => {
    try {
      const response = await axios.get(`http://localhost:9777/user/check-email?email=${email}`);
      return response.data.skills || []; // Returns an empty array if `skills` is not defined
    } catch (error) {
      console.error("Error retrieving student skills:", error);
      return [];
    }
  };


  const addStudent = async () => {
    if (!isValidEmail(email)) {
      setError("Please enter a valid email.");
      return;
    }
    if (emails.some((student) => student.email === email)) {
      setError("This student is already added.");
      return;
    }
    if (emails.length >= 6) {
      setError("A group cannot contain more than 6 students.");
      return;
    }

    try {
      const isAvailable = await isUserEmailAvailable(email);
      if (isAvailable) {
        const studentSkills = await fetchStudentSkills(email);
        const studentId = await fetchStudentId(email);

        if (studentId) {
          // Check if the student is already in a group
          try {
            const groupResponse = await axios.get(`http://localhost:9777/choix/check-student?studentId=${studentId}`);

            if (groupResponse.data.isInGroup) {
              setError("This student is already a member of another group and cannot be added.");
              Swal.fire({
                title: "Error",
                text: "This student is already a member of another group and cannot be added.",
                icon: "error",
                confirmButtonText: "Ok",
              });
              return;
            }

            // If not in a group, add the student
            setEmails([...emails, { email, id: studentId }]);
            setEmail("");
            setError("");
            setShowAlert(false);
          } catch (error) {
            console.error("Error checking student's group:", error);
            setError("Error checking student's group.");
          }
        } else {
          setError("Student ID not found.");
        }
      } else {
        setShowAlert(true);
      }
    } catch (error) {
      console.error("Error adding student:", error);
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

  const suggestProjects = async () => {
    try {
      // Get skills from all students
      const skillsPromises = emails.map(async (student) => await fetchStudentSkills(student.email));
      const skillsArrays = await Promise.all(skillsPromises);
      const flattenedSkills = skillsArrays.flat().filter(skill => skill && skill.trim()); // Remove undefined values and empty strings

      // Normalize skills (lowercase)
      const normalizedSkills = flattenedSkills.map(skill => skill.toString().toLowerCase());

      console.log("Skills being sent to backend:", normalizedSkills); // Debugging log

      // Call recommendation API with skills
      const response = await axios.post("http://localhost:9777/project/recommend-projects", {
        skills: normalizedSkills,
      });

      console.log("Response from backend:", response.data); // Debugging log

      // Update the list of suggested projects
      setSuggestedProjects(response.data);
    } catch (error) {
      console.error("Error suggesting projects:", error);
      setError("Error suggesting projects.");
    }
  };

  const handleSubmit = async () => {
    for (const projectId of selectedProjects) {
      if (!projectId) {
        setError("All projects must be selected.");
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
      const response = await axios.post("http://localhost:9777/choix/create", {
        nom_groupe: groupName,
        id_students: emails.map((student) => student.id),
        list_projects: listProjects,
      });

      Swal.fire({
        title: "Success",
        text: "Group added successfully!",
        icon: "success",
        confirmButtonText: "Ok",
      }).then(() => {
        navigate("/index");
      });

      setGroupName("");
      setEmails([]);
      setSelectedProjects(["", "", ""]);
      setMotivations({});
      setError("");
    } catch (error: any) {
      console.error("Error adding group:", error);

      // Check if the error is due to a student already being in a group
      if (error.response && error.response.status === 400 && error.response.data.message) {
        setError(error.response.data.message);

        // Show a more user-friendly alert
        Swal.fire({
          title: "Error",
          text: error.response.data.message,
          icon: "error",
          confirmButtonText: "Ok",
        });
      } else {
        setError("Error adding group.");
      }
    }
  };

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const token = localStorage.getItem('token');

        if (!token) {
          throw new Error('No authentication token found');
        }

        const response = await axios.get("http://localhost:9777/project//getProjectsByUserSpeciality", {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        setAvailableProjectsState(response.data.projects);
      } catch (error) {
        console.error("API projects error:", error);
        setError("Error retrieving projects.");
        // Redirect to login if token is invalid

      }
    };
    fetchProjects();
  }, []);

  return (
    <div className="page-wrapper">
      <div className="content">
        {/* Breadcrumb */}
        <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
          <div className="my-auto mb-2">
            <h2 className="mb-1">Add Group</h2>
            <nav>
              <ol className="breadcrumb mb-0">
                <li className="breadcrumb-item">
                  <Link to={all_routes.adminDashboard}>
                    <i className="ti ti-smart-home" />
                  </Link>
                </li>
                <li className="breadcrumb-item">Groups</li>
                <li className="breadcrumb-item active" aria-current="page">
                  Add Group
                </li>
              </ol>
            </nav>
          </div>
        </div>
        {/* /Breadcrumb */}

        <Container>
          <Card>
            <Card.Header as="h3" className="d-flex justify-content-between align-items-center">
              Create a Group
              <Button variant="secondary" onClick={() => navigate("/projects-grid")}>
                Back
              </Button>
            </Card.Header>
            <Card.Body>
              {error && <Alert variant="danger">{error}</Alert>}
              {showAlert && <Alert variant="warning">Email not found</Alert>}

              <Form>
                <Form.Group className="mb-3">
                  <Form.Label>Group Name</Form.Label>
                  <Form.Control
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Group Name"
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Add a Student (Email)</Form.Label>
                  <Row>
                    <Col>
                      <Form.Control
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="example@domain.com"
                      />
                    </Col>
                    <Col xs="auto">
                      <Button variant="primary" onClick={addStudent} disabled={!email}>
                        Add
                      </Button>
                    </Col>
                  </Row>
                </Form.Group>

                <h5 className="mt-4">Added Students:</h5>
                <ListGroup>
                  {emails.map((student, index) => (
                    <ListGroup.Item key={index} className="d-flex justify-content-between align-items-center">
                      {student.email}
                      <Button variant="danger" size="sm" onClick={() => removeStudent(student.email)}>
                        Remove
                      </Button>
                    </ListGroup.Item>
                  ))}
                </ListGroup>

                <Button variant="primary" onClick={suggestProjects} className="mt-4" disabled={emails.length < 4}>
                  Suggest Projects
                </Button>

                {suggestedProjects.length > 0 && (
                  <div className="mt-4">
                    <h5>Suggested Projects:</h5>
                    <ListGroup>
                      {suggestedProjects.map((project) => (
                        <ListGroup.Item key={project._id}>
                          {project.title} - Score: {project.score}
                        </ListGroup.Item>
                      ))}
                    </ListGroup>
                  </div>
                )}

                <Form.Group className="mt-4">
                  <Form.Label>Choose 3 projects</Form.Label>
                  {[0, 1, 2].map((index) => (
                    <div key={index} className="mb-3">
                      <Form.Label>Project {index + 1}</Form.Label>
                      <Form.Control
                        as="select"
                        value={selectedProjects[index]}
                        onChange={(e) => handleProjectChange(index, e.target.value)}
                      >
                        <option value="">Select a project</option>
                        {availableProjectsState && availableProjectsState.length > 0 ? (
                          availableProjectsState.map((project) => (
                            <option key={project._id} value={project._id}>
                              {project.title}
                            </option>
                          ))
                        ) : (
                          <option disabled>No project available</option>
                        )}
                      </Form.Control>

                      {selectedProjects[index] && (
                        <Form.Group controlId={`motivation${index}`}>
                          <Form.Label>Motivation</Form.Label>
                          <Form.Control
                            as="textarea"
                            rows={3}
                            value={motivations[selectedProjects[index]] || ""}
                            onChange={(e) => handleMotivationChange(e, selectedProjects[index])}
                          />
                        </Form.Group>
                      )}
                    </div>
                  ))}
                </Form.Group>

                <Button
                  variant="success"
                  onClick={handleSubmit}
                  disabled={!isFormValid()}
                  className="mt-4"
                >
                  Add Group
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Container>
      </div>
    </div>
  );
};

export default AddGroupForm;
