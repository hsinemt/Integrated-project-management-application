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
  _id: string;
  name: string;
  description: string;
  priority: string;
  date: string;
  état: string;
  project: string;
  group: string;
  assignedTo: string;
  __v: number;
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
  const [projectId, setProjectId] = useState<string>(""); // Nouvel état pour l'ID du projet
  const [groupId, setGroupId] = useState<string>(""); // Nouvel état pour l'ID du groupe

  // Fonction pour générer les tâches
  const generateTasks = async () => {
    if (!projectId || !groupId) {
      setError("Veuillez entrer un ID de projet et un ID de groupe.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await axios.post("http://localhost:3000/api/tasks/generate", {
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

  // Configurations des graphiques (inchangées)
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

          {/* Section : Génération de tâches avec inputs */}
          <div className="row">
            <div className="col-xxl-4 col-xl-6 d-flex">
              <div className="card flex-fill">
                <div className="card-header pb-2 d-flex align-items-center justify-content-between flex-wrap">
                  <h5 className="mb-2">Générer des Tâches</h5>
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
                    onClick={generateTasks}
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
                        {tasks.map((task) => (
                          <div key={task._id} className="list-group-item">
                            <strong>{task.name}</strong>
                            <p className="mb-1">{task.description}</p>
                            <small>
                              Priorité : {task.priority} | Date : {new Date(task.date).toLocaleDateString()} | État : {task.état} | Assigné à : {task.assignedTo}
                            </small>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Le reste du code reste inchangé */}
          <div className="row">
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
                {/* ... Autres widgets ... */}
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