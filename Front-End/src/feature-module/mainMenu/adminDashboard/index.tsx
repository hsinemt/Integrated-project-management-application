import React, { useEffect, useState } from "react";
import ReactApexChart from "react-apexcharts";
import { Link } from "react-router-dom";
import ImageWithBasePath from "../../../core/common/imageWithBasePath";
import { all_routes } from "../../router/all_routes";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { Chart } from "primereact/chart";
import { Calendar } from "primereact/calendar";
import ProjectModals from "../../../core/modals/projectModal";
import RequestModals from "../../../core/modals/requestModal";
import TodoModal from "../../../core/modals/todoModal";
import CollapseHeader from "../../../core/common/collapse-header/collapse-header";
import axios, { AxiosError } from "axios";

// Interfaces pour typer les données
interface Task {
  name: string;
  description: string;
  priority: string;
  date: string;
  état: string;
  project: string;
  group: string;
  assignedTo: string;
}

interface Project {
  _id: string;
  name: string; // Note : dans votre backend, c'est "title"
}

interface Group {
  _id: string;
  name: string; // Note : dans votre backend, c'est "nom_groupe"
}

const AdminDashboard = () => {
  const routes = all_routes;

  const [isTodo, setIsTodo] = useState([false, false, false]);
  const [date, setDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string>("");
  const [groupId, setGroupId] = useState<string>("");

  // Fonction pour générer les tâches (preview)
  const previewTasks = async () => {
    if (!projectId || !groupId) {
      setError("Veuillez entrer un ID de projet et un ID de groupe.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await axios.post("http://localhost:3000/api/tasks/preview", {
        projectId: projectId,
        groupId: groupId,
      });

      if (response.data.success) {
        setTasks(response.data.tasks);
        setSuccess(response.data.message);
      } else {
        setError(response.data.message || "Erreur inattendue lors de la génération des tâches.");
      }
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      setError(error.response?.data?.message || "Erreur serveur lors de la génération des tâches.");
      console.error("Erreur génération tâches :", error.message);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour gérer les modifications des champs des tâches
  const handleTaskChange = (index: number, field: keyof Task, value: string) => {
    const updatedTasks = [...tasks];
    updatedTasks[index][field] = value;
    setTasks(updatedTasks);
  };

  // Fonction pour enregistrer les tâches modifiées
  const saveTasks = async () => {
    if (tasks.length === 0) {
      setError("Aucune tâche à enregistrer.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await axios.post("http://localhost:3000/api/tasks/save", {
        tasks: tasks,
      });

      if (response.data.success) {
        setSuccess(response.data.message);
        setTasks([]); // Réinitialiser les tâches après l'enregistrement
      } else {
        setError(response.data.message || "Erreur inattendue lors de l'enregistrement des tâches.");
      }
    } catch (err) {
      const error = err as AxiosError<{ message?: string }>;
      setError(error.response?.data?.message || "Erreur serveur lors de l'enregistrement des tâches.");
      console.error("Erreur enregistrement tâches :", error.message);
    } finally {
      setLoading(false);
    }
  };

  // Configurations des graphiques
  const [empDepartment] = useState<any>({
    chart: { height: 235, type: "bar", padding: { top: 0, left: 0, right: 0, bottom: 0 }, toolbar: { show: false } },
    fill: { colors: ["#F26522"], opacity: 1 },
    colors: ["#F26522"],
    grid: { borderColor: "#E5E7EB", strokeDashArray: 5, padding: { top: -20, left: 0, right: 0, bottom: 0 } },
    plotOptions: { bar: { borderRadius: 5, horizontal: true, barHeight: "35%", endingShape: "rounded" } },
    dataLabels: { enabled: false },
    series: [{ data: [80, 110, 80, 20, 60, 100], name: "Employee" }],
    xaxis: { categories: ["UI/UX", "Development", "Management", "HR", "Testing", "Marketing"], labels: { style: { colors: "#111827", fontSize: "13px" } } },
  });

  const [salesIncome] = useState<any>({
    chart: { height: 290, type: "bar", stacked: true, toolbar: { show: false } },
    colors: ["#FF6F28", "#F8F9FA"],
    responsive: [{ breakpoint: 480, options: { legend: { position: "bottom", offsetX: -10, offsetY: 0 } } }],
    plotOptions: { bar: { borderRadius: 5, borderRadiusWhenStacked: "all", horizontal: false, endingShape: "rounded" } },
    series: [
      { name: "Income", data: [40, 30, 45, 80, 85, 90, 80, 80, 80, 85, 20, 80] },
      { name: "Expenses", data: [60, 70, 55, 20, 15, 10, 20, 20, 20, 15, 80, 20] },
    ],
    xaxis: { categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], labels: { style: { colors: "#6B7280", fontSize: "13px" } } },
    yaxis: { labels: { offsetX: -15, style: { colors: "#6B7280", fontSize: "13px" } } },
    grid: { borderColor: "#E5E7EB", strokeDashArray: 5, padding: { left: -8 } },
    legend: { show: false },
    dataLabels: { enabled: false },
    fill: { opacity: 1 },
  });

  const [chartData, setChartData] = useState({});
  const [chartOptions, setChartOptions] = useState({});
  useEffect(() => {
    const data = {
      labels: ["Late", "Present", "Permission", "Absent"],
      datasets: [
        {
          label: "Semi Donut",
          data: [40, 20, 30, 10],
          backgroundColor: ["#0C4B5E", "#03C95A", "#FFC107", "#E70D0D"],
          borderWidth: 5,
          borderRadius: 10,
          borderColor: "#fff",
          hoverBorderWidth: 0,
          cutout: "60%",
        },
      ],
    };
    const options = {
      rotation: -100,
      circumference: 200,
      layout: { padding: { top: -20, bottom: -20 } },
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
    };
    setChartData(data);
    setChartOptions(options);
  }, []);

  const [semidonutData, setSemidonutData] = useState({});
  const [semidonutOptions, setSemidonutOptions] = useState({});
  const toggleTodo = (index: number) => {
    setIsTodo((prevIsTodo) => {
      const newIsTodo = [...prevIsTodo];
      newIsTodo[index] = !newIsTodo[index];
      return newIsTodo;
    });
  };
  useEffect(() => {
    const data = {
      labels: ["Ongoing", "Onhold", "Completed", "Overdue"],
      datasets: [
        {
          label: "Semi Donut",
          data: [20, 40, 20, 10],
          backgroundColor: ["#FFC107", "#1B84FF", "#03C95A", "#E70D0D"],
          borderWidth: -10,
          borderColor: "transparent",
          hoverBorderWidth: 0,
          cutout: "75%",
          spacing: -30,
        },
      ],
    };
    const options = {
      rotation: -100,
      circumference: 185,
      layout: { padding: { top: -20, bottom: 20 } },
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      elements: { arc: { borderWidth: -30, borderRadius: 30 } },
    };
    setSemidonutData(data);
    setSemidonutOptions(options);
  }, []);

  return (
    <>
      <div className="page-wrapper">
        <div className="content">
          {/* Breadcrumb */}
          <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
            <div className="my-auto mb-2">
              <h2 className="mb-1">Admin Dashboard</h2>
              <nav>
                <ol className="breadcrumb mb-0">
                  <li className="breadcrumb-item">
                    <Link to={routes.adminDashboard}><i className="ti ti-smart-home" /></Link>
                  </li>
                  <li className="breadcrumb-item">Dashboard</li>
                  <li className="breadcrumb-item active" aria-current="page">Admin Dashboard</li>
                </ol>
              </nav>
            </div>
            <div className="d-flex my-xl-auto right-content align-items-center flex-wrap">
              <div className="me-2 mb-2">
                <div className="dropdown">
                  <Link to="#" className="dropdown-toggle btn btn-white d-inline-flex align-items-center" data-bs-toggle="dropdown">
                    <i className="ti ti-file-export me-1" /> Export
                  </Link>
                  <ul className="dropdown-menu dropdown-menu-end p-3">
                    <li><Link to="#" className="dropdown-item rounded-1"><i className="ti ti-file-type-pdf me-1" /> Export as PDF</Link></li>
                    <li><Link to="#" className="dropdown-item rounded-1"><i className="ti ti-file-type-xls me-1" /> Export as Excel</Link></li>
                  </ul>
                </div>
              </div>
              <div className="mb-2">
                <div className="input-icon w-120 position-relative">
                  <span className="input-icon-addon"><i className="ti ti-calendar text-gray-9" /></span>
                  <Calendar value={date} onChange={(e: any) => setDate(e.value)} view="year" dateFormat="yy" className="Calendar-form" />
                </div>
              </div>
              <div className="ms-2 head-icons"><CollapseHeader /></div>
            </div>
          </div>

          {/* Welcome Wrap */}
          <div className="card border-0">
            <div className="card-body d-flex align-items-center justify-content-between flex-wrap pb-1">
              <div className="d-flex align-items-center mb-3">
                <span className="avatar avatar-xl flex-shrink-0">
                  <ImageWithBasePath src="assets/img/profiles/avatar-31.jpg" className="rounded-circle" alt="img" />
                </span>
                <div className="ms-3">
                  <h3 className="mb-2">Welcome Back, Adrian <Link to="#" className="edit-icon"><i className="ti ti-edit fs-14" /></Link></h3>
                  <p>You have <span className="text-primary text-decoration-underline">21</span> Pending Approvals & <span className="text-primary text-decoration-underline">14</span> Leave Requests</p>
                </div>
              </div>
              <div className="d-flex align-items-center flex-wrap mb-1">
                <Link to="#" className="btn btn-secondary btn-md me-2 mb-2" data-bs-toggle="modal" data-inert={true} data-bs-target="#add_project">
                  <i className="ti ti-square-rounded-plus me-1" /> Add Project
                </Link>
                <Link to="#" className="btn btn-primary btn-md mb-2" data-bs-toggle="modal" data-inert={true} data-bs-target="#add_leaves">
                  <i className="ti ti-square-rounded-plus me-1" /> Add Requests
                </Link>
              </div>
            </div>
          </div>  

          {/* Section : Génération et modification des tâches */}
          <div className="row">
            <div className="col-xxl-4 col-xl-6 d-flex">
              <div className="card flex-fill">
                <div className="card-header pb-2 d-flex align-items-center justify-content-between flex-wrap">
                  <h5 className="mb-2">Générer et Modifier des Tâches</h5>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <label htmlFor="projectIdInput" className="form-label">ID du Projet</label>
                    <input
                      type="text"
                      id="projectIdInput"
                      className="form-control"
                      value={projectId}
                      onChange={(e) => setProjectId(e.target.value)}
                      placeholder="Entrez l'ID du projet"
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="groupIdInput" className="form-label">ID du Groupe</label>
                    <input
                      type="text"
                      id="groupIdInput"
                      className="form-control"
                      value={groupId}
                      onChange={(e) => setGroupId(e.target.value)}
                      placeholder="Entrez l'ID du groupe"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={previewTasks}
                    disabled={loading || !projectId || !groupId}
                    className="btn btn-primary mb-3"
                  >
                    {loading ? "Génération en cours..." : "Générer les tâches"}
                  </button>

                  {error && (
                    <div className="alert alert-danger mt-3" role="alert">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="alert alert-success mt-3" role="alert">
                      {success}
                    </div>
                  )}

                  {tasks.length > 0 && (
                    <div className="mt-3">
                      <h6>Tâches générées ({tasks.length})</h6>
                      <div className="list-group" style={{ maxHeight: "300px", overflowY: "auto" }}>
                        {tasks.map((task, index) => (
                          <div key={index} className="list-group-item mb-3 border rounded">
                            <div className="mb-2">
                              <label className="form-label">Nom:</label>
                              <input
                                type="text"
                                className="form-control"
                                value={task.name}
                                onChange={(e) => handleTaskChange(index, 'name', e.target.value)}
                              />
                            </div>
                            <div className="mb-2">
                              <label className="form-label">Description:</label>
                              <textarea
                                className="form-control"
                                value={task.description}
                                onChange={(e) => handleTaskChange(index, 'description', e.target.value)}
                              />
                            </div>
                            <div className="mb-2">
                              <label className="form-label">Priorité:</label>
                              <select
                                className="form-select"
                                value={task.priority}
                                onChange={(e) => handleTaskChange(index, 'priority', e.target.value)}
                              >
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                              </select>
                            </div>
                            <div className="mb-2">
                              <label className="form-label">État:</label>
                              <input
                                type="text"
                                className="form-control"
                                value={task.état}
                                onChange={(e) => handleTaskChange(index, 'état', e.target.value)}
                              />
                            </div>
                            <small>
                              Assigné à : {task.assignedTo} | Date : {new Date(task.date).toLocaleDateString()}
                            </small>
                          </div>
                        ))}
                      </div>
                      <button
                        type="button"
                        onClick={saveTasks}
                        disabled={loading}
                        className="btn btn-success mt-3"
                      >
                        {loading ? "Enregistrement en cours..." : "Enregistrer toutes les tâches"}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Autres widgets */}
            <div className="col-xxl-8 d-flex">
              <div className="row flex-fill">
                <div className="col-md-3 d-flex">
                  <div className="card flex-fill">
                    <div className="card-body">
                      <span className="avatar rounded-circle bg-primary mb-2"><i className="ti ti-calendar-share fs-16" /></span>
                      <h6 className="fs-13 fw-medium text-default mb-1">Attendance</h6>
                      <h3 className="mb-3">92/99 <span className="fs-12 fw-medium text-success"><i className="fa-solid fa-caret-up me-1" />+2.1%</span></h3>
                      <Link to="attendance-employee.html" className="link-default">View Details</Link>
                    </div>
                  </div>
                </div>
                <div className="col-md-3 d-flex">
                  <div className="card flex-fill">
                    <div className="card-body">
                      <span className="avatar rounded-circle bg-success mb-2"><i className="ti ti-users fs-16" /></span>
                      <h6 className="fs-13 fw-medium text-default mb-1">Total Employees</h6>
                      <h3 className="mb-3">99 <span className="fs-12 fw-medium text-success"><i className="fa-solid fa-caret-up me-1" />+1.2%</span></h3>
                      <Link to="employee.html" className="link-default">View Details</Link>
                    </div>
                  </div>
                </div>
                <div className="col-md-3 d-flex">
                  <div className="card flex-fill">
                    <div className="card-body">
                      <span className="avatar rounded-circle bg-warning mb-2"><i className="ti ti-briefcase fs-16" /></span>
                      <h6 className="fs-13 fw-medium text-default mb-1">Total Projects</h6>
                      <h3 className="mb-3">45 <span className="fs-12 fw-medium text-success"><i className="fa-solid fa-caret-up me-1" />+0.5%</span></h3>
                      <Link to="projects.html" className="link-default">View Details</Link>
                    </div>
                  </div>
                </div>
                <div className="col-md-3 d-flex">
                  <div className="card flex-fill">
                    <div className="card-body">
                      <span className="avatar rounded-circle bg-danger mb-2"><i className="ti ti-clock-hour-5 fs-16" /></span>
                      <h6 className="fs-13 fw-medium text-default mb-1">Total Hours</h6>
                      <h3 className="mb-3">2,450 <span className="fs-12 fw-medium text-success"><i className="fa-solid fa-caret-up me-1" />+1.5%</span></h3>
                      <Link to="timesheet.html" className="link-default">View Details</Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-xxl-8 d-flex">
              <div className="card flex-fill">
                <div className="card-header pb-2 d-flex align-items-center justify-content-between flex-wrap">
                  <h5 className="mb-2">Sales & Income</h5>
                  <div className="d-flex align-items-center">
                    <div className="me-3">
                      <span className="fs-12 me-1"><i className="ti ti-circle-filled me-1 text-orange" />Income</span>
                      <span className="fs-12"><i className="ti ti-circle-filled me-1 text-gray-2" />Expenses</span>
                    </div>
                    <div className="dropdown mb-2">
                      <Link to="#" className="btn btn-white border btn-sm d-inline-flex align-items-center" data-bs-toggle="dropdown">
                        <i className="ti ti-calendar me-1" /> This Year
                      </Link>
                      <ul className="dropdown-menu dropdown-menu-end p-3">
                        <li><Link to="#" className="dropdown-item rounded-1">This Month</Link></li>
                        <li><Link to="#" className="dropdown-item rounded-1">This Week</Link></li>
                        <li><Link to="#" className="dropdown-item rounded-1">Last Week</Link></li>
                      </ul>
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  <ReactApexChart id="sales-income" options={salesIncome} series={salesIncome.series} type="bar" height={290} />
                </div>
              </div>
            </div>
            <div className="col-xxl-4 d-flex">
              <div className="card flex-fill">
                <div className="card-header pb-2 d-flex align-items-center justify-content-between flex-wrap">
                  <h5 className="mb-2">Employees By Department</h5>
                  <div className="dropdown mb-2">
                    <Link to="#" className="btn btn-white border btn-sm d-inline-flex align-items-center" data-bs-toggle="dropdown">
                      <i className="ti ti-calendar me-1" /> This Week
                    </Link>
                    <ul className="dropdown-menu dropdown-menu-end p-3">
                      <li><Link to="#" className="dropdown-item rounded-1">This Month</Link></li>
                      <li><Link to="#" className="dropdown-item rounded-1">This Week</Link></li>
                      <li><Link to="#" className="dropdown-item rounded-1">Last Week</Link></li>
                    </ul>
                  </div>
                </div>
                <div className="card-body">
                  <ReactApexChart id="emp-department" options={empDepartment} series={empDepartment.series} type="bar" height={220} />
                  <p className="fs-13"><i className="ti ti-circle-filled me-2 fs-8 text-primary" />No of Employees increased by <span className="text-success fw-bold">+20%</span> from last Week</p>
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-6 col-xxl-3 d-flex">
              <div className="card flex-fill">
                <div className="card-header pb-2 d-flex align-items-center justify-content-between flex-wrap">
                  <h5 className="mb-2">Attendance</h5>
                  <div className="dropdown mb-2">
                    <Link to="#" className="btn btn-white border btn-sm d-inline-flex align-items-center" data-bs-toggle="dropdown">
                      <i className="ti ti-calendar me-1" /> This Week
                    </Link>
                    <ul className="dropdown-menu dropdown-menu-end p-3">
                      <li><Link to="#" className="dropdown-item rounded-1">This Month</Link></li>
                      <li><Link to="#" className="dropdown-item rounded-1">This Week</Link></li>
                      <li><Link to="#" className="dropdown-item rounded-1">Last Week</Link></li>
                    </ul>
                  </div>
                </div>
                <div className="card-body">
                  <div className="position-relative">
                    <Chart type="doughnut" data={chartData} options={chartOptions} className="w-100 h-100" style={{ maxHeight: "150px" }} />
                    <div className="position-absolute top-50 start-50 translate-middle text-center">
                      <h3 className="mb-0">92%</h3>
                      <p className="fs-12 mb-0">Present</p>
                    </div>
                  </div>
                  <ul className="list-unstyled d-flex align-items-center justify-content-center flex-wrap mt-3 mb-0">
                    <li className="me-3"><span className="fs-12"><i className="ti ti-circle-filled me-1 text-primary" />Late</span></li>
                    <li className="me-3"><span className="fs-12"><i className="ti ti-circle-filled me-1 text-success" />Present</span></li>
                    <li className="me-3"><span className="fs-12"><i className="ti ti-circle-filled me-1 text-warning" />Permission</span></li>
                    <li><span className="fs-12"><i className="ti ti-circle-filled me-1 text-danger" />Absent</span></li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="col-md-6 col-xxl-3 d-flex">
              <div className="card flex-fill">
                <div className="card-header pb-2 d-flex align-items-center justify-content-between flex-wrap">
                  <h5 className="mb-2">Project Status</h5>
                  <div className="dropdown mb-2">
                    <Link to="#" className="btn btn-white border btn-sm d-inline-flex align-items-center" data-bs-toggle="dropdown">
                      <i className="ti ti-calendar me-1" /> This Week
                    </Link>
                    <ul className="dropdown-menu dropdown-menu-end p-3">
                      <li><Link to="#" className="dropdown-item rounded-1">This Month</Link></li>
                      <li><Link to="#" className="dropdown-item rounded-1">This Week</Link></li>
                      <li><Link to="#" className="dropdown-item rounded-1">Last Week</Link></li>
                    </ul>
                  </div>
                </div>
                <div className="card-body">
                  <div className="position-relative">
                    <Chart type="doughnut" data={semidonutData} options={semidonutOptions} className="w-100 h-100" style={{ maxHeight: "150px" }} />
                    <div className="position-absolute top-50 start-50 translate-middle text-center">
                      <h3 className="mb-0">45</h3>
                      <p className="fs-12 mb-0">Projects</p>
                    </div>
                  </div>
                  <ul className="list-unstyled d-flex align-items-center justify-content-center flex-wrap mt-3 mb-0">
                    <li className="me-3"><span className="fs-12"><i className="ti ti-circle-filled me-1 text-warning" />Ongoing</span></li>
                    <li className="me-3"><span className="fs-12"><i className="ti ti-circle-filled me-1 text-primary" />Onhold</span></li>
                    <li className="me-3"><span className="fs-12"><i className="ti ti-circle-filled me-1 text-success" />Completed</span></li>
                    <li><span className="fs-12"><i className="ti ti-circle-filled me-1 text-danger" />Overdue</span></li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="col-md-6 col-xxl-3 d-flex">
              <div className="card flex-fill">
                <div className="card-header pb-2 d-flex align-items-center justify-content-between flex-wrap">
                  <h5 className="mb-2">To Do List</h5>
                  <Link to="#" className="link-primary mb-2" data-bs-toggle="modal" data-inert={true} data-bs-target="#add_todo"><i className="ti ti-square-rounded-plus me-1" />Add Task</Link>
                </div>
                <div className="card-body">
                  <ul className="list-unstyled todo-list mb-0">
                    <li className="d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center">
                        <span className="todo-check me-2">
                          <input type="checkbox" id="task1" />
                          <label htmlFor="task1" />
                        </span>
                        <div>
                          <h6 className="fs-14 mb-1">Meeting with client</h6>
                          <p className="fs-12 mb-0">10:00 AM Today</p>
                        </div>
                      </div>
                      <div className="dropdown">
                        <Link to="#" className="text-gray-5 d-inline-flex align-items-center" data-bs-toggle="dropdown">
                          <i className="ti ti-dots-vertical" />
                        </Link>
                        <ul className="dropdown-menu dropdown-menu-end p-3">
                          <li><Link to="#" className="dropdown-item rounded-1"><i className="ti ti-edit me-1" />Edit</Link></li>
                          <li><Link to="#" className="dropdown-item rounded-1"><i className="ti ti-trash me-1" />Delete</Link></li>
                        </ul>
                      </div>
                    </li>
                    <li className="d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center">
                        <span className="todo-check me-2">
                          <input type="checkbox" id="task2" />
                          <label htmlFor="task2" />
                        </span>
                        <div>
                          <h6 className="fs-14 mb-1">Project discussion</h6>
                          <p className="fs-12 mb-0">11:00 AM Today</p>
                        </div>
                      </div>
                      <div className="dropdown">
                        <Link to="#" className="text-gray-5 d-inline-flex align-items-center" data-bs-toggle="dropdown">
                          <i className="ti ti-dots-vertical" />
                        </Link>
                        <ul className="dropdown-menu dropdown-menu-end p-3">
                          <li><Link to="#" className="dropdown-item rounded-1"><i className="ti ti-edit me-1" />Edit</Link></li>
                          <li><Link to="#" className="dropdown-item rounded-1"><i className="ti ti-trash me-1" />Delete</Link></li>
                        </ul>
                      </div>
                    </li>
                    <li className="d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center">
                        <span className="todo-check me-2">
                          <input type="checkbox" id="task3" checked={isTodo[2]} onChange={() => toggleTodo(2)} />
                          <label htmlFor="task3" />
                        </span>
                        <div>
                          <h6 className={isTodo[2] ? "fs-14 mb-1 text-decoration-line-through" : "fs-14 mb-1"}>Send project report</h6>
                          <p className="fs-12 mb-0">02:00 PM Today</p>
                        </div>
                      </div>
                      <div className="dropdown">
                        <Link to="#" className="text-gray-5 d-inline-flex align-items-center" data-bs-toggle="dropdown">
                          <i className="ti ti-dots-vertical" />
                        </Link>
                        <ul className="dropdown-menu dropdown-menu-end p-3">
                          <li><Link to="#" className="dropdown-item rounded-1"><i className="ti ti-edit me-1" />Edit</Link></li>
                          <li><Link to="#" className="dropdown-item rounded-1"><i className="ti ti-trash me-1" />Delete</Link></li>
                        </ul>
                      </div>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="col-md-6 col-xxl-3 d-flex">
              <div className="card flex-fill">
                <div className="card-header pb-2 d-flex align-items-center justify-content-between flex-wrap">
                  <h5 className="mb-2">Upcoming Events</h5>
                  <Link to="#" className="link-primary mb-2"><i className="ti ti-square-rounded-plus me-1" />Add Events</Link>
                </div>
                <div className="card-body">
                  <ul className="list-unstyled events-list mb-0">
                    <li className="d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center">
                        <span className="avatar rounded-circle bg-primary-light me-2"><i className="ti ti-party fs-14" /></span>
                        <div>
                          <h6 className="fs-14 mb-1">Annual Day Celebration</h6>
                          <p className="fs-12 mb-0">10:00 AM Today</p>
                        </div>
                      </div>
                      <Link to="#" className="text-gray-5"><i className="ti ti-chevron-right" /></Link>
                    </li>
                    <li className="d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center">
                        <span className="avatar rounded-circle bg-success-light me-2"><i className="ti ti-party fs-14" /></span>
                        <div>
                          <h6 className="fs-14 mb-1">Hackathon Event</h6>
                          <p className="fs-12 mb-0">11:00 AM Today</p>
                        </div>
                      </div>
                      <Link to="#" className="text-gray-5"><i className="ti ti-chevron-right" /></Link>
                    </li>
                    <li className="d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center">
                        <span className="avatar rounded-circle bg-warning-light me-2"><i className="ti ti-party fs-14" /></span>
                        <div>
                          <h6 className="fs-14 mb-1">Alumni Meet</h6>
                          <p className="fs-12 mb-0">02:00 PM Today</p>
                        </div>
                      </div>
                      <Link to="#" className="text-gray-5"><i className="ti ti-chevron-right" /></Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="footer d-sm-flex align-items-center justify-content-between border-top bg-white p-3">
            <p className="mb-0">2014 - 2025 © SmartHR.</p>
            <p>Designed & Developed By <Link to="#" className="text-primary">Dreams</Link></p>
          </div>
        </div>
      </div>
      <ProjectModals />
      <RequestModals />
      <TodoModal />
    </>
  );
};

export default AdminDashboard;