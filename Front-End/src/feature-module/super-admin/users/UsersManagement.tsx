import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { all_routes } from '../../router/all_routes'
import PredefinedDateRanges from '../../../core/common/datePicker'
import ImageWithBasePath from '../../../core/common/imageWithBasePath';
import Table from "../../../core/common/dataTable/index";
import CommonSelect from '../../../core/common/commonSelect'
import { DatePicker } from 'antd'
import ReactApexChart from 'react-apexcharts'
import CollapseHeader from '../../../core/common/collapse-header/collapse-header'
import {fetchUsers, users_type, updateUser, deleteUser} from "../../../api/getUsers/getAllUsers";
import { updateUserWithPhoto, uploadUserPhoto } from "../../../api/uploadApi/uploadUserPhoto";
import AddUserModal from "./addUser";
import Swal from "sweetalert2";

type PasswordField = "password" | "confirmPassword";

const UsersManagement = () => {
  const [data, setData] = useState<users_type[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedUser, setSelectedUser] = useState<users_type | null>(null);
  const [editingUser, setEditingUser] = useState<users_type | null>(null);
  const [editingUserRole, setEditingUserRole] = useState<string>('');

  // User statistics state
  const [totalUsers, setTotalUsers] = useState<number>(0);
  const [managerCount, setManagerCount] = useState<number>(0);
  const [tutorCount, setTutorCount] = useState<number>(0);
  const [studentCount, setStudentCount] = useState<number>(0);

  // Photo upload state for edit form
  const [selectedEditFile, setSelectedEditFile] = useState<File | null>(null);
  const [editPreviewUrl, setEditPreviewUrl] = useState<string | null>(null);
  const [isEditUploading, setIsEditUploading] = useState<boolean>(false);
  const [editFileError, setEditFileError] = useState<string | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');

  // Clean up preview URL when component unmounts or when editing user changes
  useEffect(() => {
    // Set loading state
    setLoading(true);

    // Get the current user ID from localStorage
    const userId = localStorage.getItem('userId');
    if (userId) {
      setCurrentUserId(userId);
      //console.log('Current user ID:', userId);
      console.warn('No userId found in localStorage. User may need to log in again.');
    }

    const getData = async () => {
      try {
        const result = await fetchUsers();

        const usersWithAvatars = result.map(user => ({
          ...user,
          avatar: user.avatar || generateAvatarUrl(user),
          Status: 'Active'
        }));
        setData(usersWithAvatars);

        // Calculate user statistics
        setTotalUsers(usersWithAvatars.length);

        // Count users by role
        const managers = usersWithAvatars.filter(user => user.role === 'manager').length;
        const tutors = usersWithAvatars.filter(user => user.role === 'tutor').length;
        const students = usersWithAvatars.filter(user => user.role === 'student').length;

        setManagerCount(managers);
        setTutorCount(tutors);
        setStudentCount(students);

      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };
    getData();
  }, []);

// 2. useEffect for cleaning up preview URL when component unmounts
  useEffect(() => {
    return () => {
      if (editPreviewUrl && !editPreviewUrl.startsWith('http')) {
        URL.revokeObjectURL(editPreviewUrl);
      }
    };
  }, [editPreviewUrl]);

// 3. useEffect for resetting edit photo state when editing user changes
  useEffect(() => {
    if (editingUser) {
      setEditPreviewUrl(editingUser.avatar || null);
      setSelectedEditFile(null);
      setEditFileError(null);
      if (editFileInputRef.current) {
        editFileInputRef.current.value = '';
      }
    }
  }, [editingUser]);

  // Handle file selection for edit form
  const handleEditFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setEditFileError(null);

    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setEditFileError('Please select a valid image file (JPEG, PNG, GIF, or WEBP)');
        return;
      }

      // Validate file size (4MB max)
      if (file.size > 4 * 1024 * 1024) {
        setEditFileError('Image size should be less than 4MB');
        return;
      }

      setSelectedEditFile(file);

      // Create preview URL
      const objectUrl = URL.createObjectURL(file);
      setEditPreviewUrl(objectUrl);
    }
  };

  // Handle cancel button click for edit form
  const handleEditCancelClick = (e: React.MouseEvent) => {
    e.preventDefault();

    // Reset file input
    if (editFileInputRef.current) {
      editFileInputRef.current.value = '';
    }

    // Clean up preview URL if it's a blob URL
    if (editPreviewUrl && !editPreviewUrl.startsWith('http')) {
      URL.revokeObjectURL(editPreviewUrl);
    }

    // Reset to user's original avatar
    setSelectedEditFile(null);
    setEditPreviewUrl(editingUser?.avatar || null);
    setEditFileError(null);
  };
  const generateAvatarUrl = (user: { name: string; lastname: string; role: string; }) => {
    const nameInitial = user.name ? user.name.charAt(0).toUpperCase() : 'U';
    const lastnameInitial = user.lastname ? user.lastname.charAt(0).toUpperCase() : '';
    const initials = nameInitial + lastnameInitial;

    const roleColors: { [key: string]: string } = {
      'admin': '8e44ad',
      'manager': '2980b9',
      'tutor': '27ae60',
      'student': 'e67e22',
      'default': '7f8c8d'
    };
    const roleColor = roleColors[user.role] || roleColors['default'];

    return `https://api.dicebear.com/7.x/initials/svg?seed=${initials}&backgroundColor=${roleColor}&radius=50`;

  };


  useEffect(() => {
    const getData = async () => {
      try {
        const result = await fetchUsers();

        const usersWithAvatars = result.map(user => ({
          ...user,
          avatar: user.avatar || generateAvatarUrl(user),
          Status: 'Active'
        }));
        setData(usersWithAvatars);
      } catch (error) {
        console.error("Error fetching users:", error);
      } finally {
        setLoading(false);
      }
    };
    getData();
  }, []);


  const refreshUserList = async () => {
    try {
      const result = await fetchUsers();
      const usersWithAvatars = result.map(user => ({
        ...user,
        avatar: user.avatar || generateAvatarUrl(user),
        Status: 'Active'
      }));
      setData(usersWithAvatars);
    } catch (error) {
      console.error('Error refreshing user list:', error);
    }
  };


  const columns = [
    {
      title: "Name",
      dataIndex: "name",
      render: (text: String, record: users_type) => (
          <div className="d-flex align-items-center file-name-icon">
            <Link to="#" className="avatar avatar-md border rounded-circle">
              <img
                  src={record.avatar || generateAvatarUrl(record)}
                  className="img-fluid rounded-circle"
                  alt={`${record.name} ${record.lastname}`}
              />
            </Link>
            <div className="ms-2">
              <h6 className="fw-medium">
                <Link to="#">{record.name}</Link>
              </h6>
            </div>
          </div>
      ),
      sorter: (a: any, b: any) => a.name.length - b.name.length,
    },
    {
      title: "Last Name",
      dataIndex: "lastname",
      sorter: (a: any, b: any) => a.lastname.length - b.lastname.length,
    },
    {
      title: "Email",
      dataIndex: "email",
      sorter: (a: any, b: any) => a.email.length - b.email.length,
    },
    {
      title: "Role",
      dataIndex: "role",
      render: (text: String, record: any) => (
          <div className="d-flex align-items-center justify-content-between">
            <p className="mb-0 me-2">{record.role}</p>
            {/*<Link*/}
            {/*    to="#"*/}
            {/*    data-bs-toggle="modal"*/}
            {/*    className="badge badge-purple badge-xs"*/}
            {/*    data-bs-target="#upgrade_info"*/}
            {/*>*/}
            {/*  Upgrade*/}
            {/*</Link>*/}
          </div>

      ),
      sorter: (a: any, b: any) => a.Role.length - b.Role.length,
    },
    // {
    //   title: "Created Date",
    //   dataIndex: "CreatedDate",
    //   sorter: (a: any, b: any) => a.CreatedDate.length - b.CreatedDate.length,
    // },
    {
      title: "Status",
      dataIndex: "Status",
      render: (text: string, record: any) => (
          <span className={`badge ${text === 'Active' ? 'badge-success' : 'badge-danger'} d-inline-flex align-items-center badge-xs`}>
          <i className="ti ti-point-filled me-1" />
            {text}
        </span>

      ),
      sorter: (a: any, b: any) => a.Status.length - b.Status.length,
    },
    {
      title: "",
      dataIndex: "actions",
      render: (_:any, record: users_type) => (
          <div className="action-icon d-inline-flex">
            <Link
                to="#"
                className="me-2"
                data-bs-toggle="modal"
                data-bs-target="#company_detail"
                onClick={() => {
                  // console.log("Opening Modal for User:", record);
                  setSelectedUser(record);
                }}

            >
              <i className="ti ti-eye" />
            </Link>
            <Link
                to="#"
                className="me-2"
                data-bs-toggle="modal"
                data-bs-target="#edit_company"
                onClick={() => {
                  setEditingUser(record);
                  setEditingUserRole(record.role);
                }}
            >
              <i className="ti ti-edit" />
            </Link>
            <Link
                to="#"
                data-bs-toggle="modal"
                data-bs-target="#delete_modal"
                onClick={() => {
                  setEditingUser(record);
                  setEditingUserRole(record.role);
                }}
            >
              <i className="ti ti-trash" />
            </Link>
          </div>

      ),
    },
  ]
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

  const planName = [
    { value: "Advanced", label: "Advanced" },
    { value: "Basic", label: "Basic" },
    { value: "Enterprise", label: "Enterprise" },
  ];
  const planType = [
    { value: "Monthly", label: "Monthly" },
    { value: "Yearly", label: "Yearly" },
  ];
  const currency = [
    { value: "USD", label: "USD" },
    { value: "Euro", label: "Euro" },
  ];
  const language = [
    { value: "English", label: "English" },
    { value: "Arabic", label: "Arabic" },
  ];
  const statusChoose = [
    { value: "Active", label: "Active" },
    { value: "Inactive", label: "Inactive" },
  ];

  const getModalContainer = () => {
    const modalElement = document.getElementById('modal-datepicker');
    return modalElement ? modalElement : document.body; // Fallback to document.body if modalElement is null
  };

  const [totalChart] = React.useState<any>({
    series: [{
      name: "Messages",
      data: [25, 66, 41, 12, 36, 9, 21]
    }],
    fill: {
      type: 'gradient',
      gradient: {
        opacityFrom: 0,
        opacityTo: 0
      }
    },
    chart: {
      foreColor: '#fff',
      type: "area",
      width: 50,
      toolbar: {
        show: !1
      },
      zoom: {
        enabled: !1
      },
      dropShadow: {
        enabled: 0,
        top: 3,
        left: 14,
        blur: 4,
        opacity: .12,
        color: "#fff"
      },
      sparkline: {
        enabled: !0
      }
    },
    markers: {
      size: 0,
      colors: ["#F26522"],
      strokeColors: "#fff",
      strokeWidth: 2,
      hover: {
        size: 7
      }
    },
    plotOptions: {
      bar: {
        horizontal: !1,
        columnWidth: "35%",
        endingShape: "rounded"
      }
    },
    dataLabels: {
      enabled: !1
    },
    stroke: {
      show: !0,
      width: 2.5,
      curve: "smooth"
    },
    colors: ["#F26522"],
    xaxis: {
      categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"]
    },
    tooltip: {
      theme: "dark",
      fixed: {
        enabled: !1
      },
      x: {
        show: !1
      },
      y: {
        title: {
          formatter: function (e: any) {
            return ""
          }
        }
      },
      marker: {
        show: !1
      }
    }
  })
  const [activeChart] = React.useState<any>({
    series: [{
      name: "Active Company",
      data: [25, 40, 35, 20, 36, 9, 21]
    }],
    fill: {
      type: 'gradient',
      gradient: {
        opacityFrom: 0, // Start with 0 opacity (transparent)
        opacityTo: 0    // End with 0 opacity (transparent)
      }
    },
    chart: {
      foreColor: '#fff',
      type: "area",
      width: 50,
      toolbar: {
        show: !1
      },
      zoom: {
        enabled: !1
      },
      dropShadow: {
        enabled: 0,
        top: 3,
        left: 14,
        blur: 4,
        opacity: .12,
        color: "#fff"
      },
      sparkline: {
        enabled: !0
      }
    },
    markers: {
      size: 0,
      colors: ["#F26522"],
      strokeColors: "#fff",
      strokeWidth: 2,
      hover: {
        size: 7
      }
    },
    plotOptions: {
      bar: {
        horizontal: !1,
        columnWidth: "35%",
        endingShape: "rounded"
      }
    },
    dataLabels: {
      enabled: !1
    },
    stroke: {
      show: !0,
      width: 2.5,
      curve: "smooth"
    },
    colors: ["#F26522"],
    xaxis: {
      categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"]
    },
    tooltip: {
      theme: "dark",
      fixed: {
        enabled: !1
      },
      x: {
        show: !1
      },
      y: {
        title: {
          formatter: function (e: any) {
            return ""
          }
        }
      },
      marker: {
        show: !1
      }
    }
  })
  const [inactiveChart] = React.useState<any>({
    series: [{
      name: "Inactive Company",
      data: [25, 10, 35, 5, 25, 28, 21]
    }],
    fill: {
      type: 'gradient',
      gradient: {
        opacityFrom: 0, // Start with 0 opacity (transparent)
        opacityTo: 0    // End with 0 opacity (transparent)
      }
    },
    chart: {
      foreColor: '#fff',
      type: "area",
      width: 50,
      toolbar: {
        show: !1
      },
      zoom: {
        enabled: !1
      },
      dropShadow: {
        enabled: 0,
        top: 3,
        left: 14,
        blur: 4,
        opacity: .12,
        color: "#fff"
      },
      sparkline: {
        enabled: !0
      }
    },
    markers: {
      size: 0,
      colors: ["#F26522"],
      strokeColors: "#fff",
      strokeWidth: 2,
      hover: {
        size: 7
      }
    },
    plotOptions: {
      bar: {
        horizontal: !1,
        columnWidth: "35%",
        endingShape: "rounded"
      }
    },
    dataLabels: {
      enabled: !1
    },
    stroke: {
      show: !0,
      width: 2.5,
      curve: "smooth"
    },
    colors: ["#F26522"],
    xaxis: {
      categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"]
    },
    tooltip: {
      theme: "dark",
      fixed: {
        enabled: !1
      },
      x: {
        show: !1
      },
      y: {
        title: {
          formatter: function (e: any) {
            return ""
          }
        }
      },
      marker: {
        show: !1
      }
    }
  })
  const [locationChart] = React.useState<any>({
    series: [{
      name: "Inactive Company",
      data: [30, 40, 15, 23, 20, 23, 25]
    }],
    fill: {
      type: 'gradient',
      gradient: {
        opacityFrom: 0, // Start with 0 opacity (transparent)
        opacityTo: 0    // End with 0 opacity (transparent)
      }
    },
    chart: {
      foreColor: '#fff',
      type: "area",
      width: 50,
      toolbar: {
        show: !1
      },
      zoom: {
        enabled: !1
      },
      dropShadow: {
        enabled: 0,
        top: 3,
        left: 14,
        blur: 4,
        opacity: .12,
        color: "#fff"
      },
      sparkline: {
        enabled: !0
      }
    },
    markers: {
      size: 0,
      colors: ["#F26522"],
      strokeColors: "#fff",
      strokeWidth: 2,
      hover: {
        size: 7
      }
    },
    plotOptions: {
      bar: {
        horizontal: !1,
        columnWidth: "35%",
        endingShape: "rounded"
      }
    },
    dataLabels: {
      enabled: !1
    },
    stroke: {
      show: !0,
      width: 2.5,
      curve: "smooth"
    },
    colors: ["#F26522"],
    xaxis: {
      categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep"]
    },
    tooltip: {
      theme: "dark",
      fixed: {
        enabled: !1
      },
      x: {
        show: !1
      },
      y: {
        title: {
          formatter: function (e: any) {
            return ""
          }
        }
      },
      marker: {
        show: !1
      }
    }
  })

  return (
      <>
        {/* Page Wrapper */}
        <div className="page-wrapper">
          <div className="content">
            {/* Breadcrumb */}
            <div className="d-md-flex d-block align-items-center justify-content-between page-breadcrumb mb-3">
              <div className="my-auto mb-2">
                <h2 className="mb-1">Users</h2>
                <nav>
                  <ol className="breadcrumb mb-0">
                    <li className="breadcrumb-item">
                      <Link to={all_routes.adminDashboard}>
                        <i className="ti ti-smart-home" />
                      </Link>
                    </li>
                    <li className="breadcrumb-item">Application</li>
                    <li className="breadcrumb-item active" aria-current="page">
                      Users List
                    </li>
                  </ol>
                </nav>
              </div>
              <div className="d-flex my-xl-auto right-content align-items-center flex-wrap ">
                <div className="me-2 mb-2">
                  <div className="dropdown">
                    <Link
                        to="#"
                        className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                        data-bs-toggle="dropdown"
                    >
                      <i className="ti ti-file-export me-1" />
                      Export
                    </Link>
                    <ul className="dropdown-menu  dropdown-menu-end p-3">
                      <li>
                        <Link
                            to="#"
                            className="dropdown-item rounded-1"
                        >
                          <i className="ti ti-file-type-pdf me-1" />
                          Export as PDF
                        </Link>
                      </li>
                      <li>
                        <Link
                            to="#"
                            className="dropdown-item rounded-1"
                        >
                          <i className="ti ti-file-type-xls me-1" />
                          Export as Excel{" "}
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="mb-2">
                  <Link
                      to="#"
                      data-bs-toggle="modal"
                      data-bs-target="#add_company"
                      className="btn btn-primary d-flex align-items-center"
                  >
                    <i className="ti ti-circle-plus me-2" />
                    Add User
                  </Link>
                </div>
                <div className="ms-2 head-icons">
                  <CollapseHeader />
                </div>
              </div>
            </div>
            {/* /Breadcrumb */}
            <div className="row">
              {/* Total Users */}
              <div className="col-lg-3 col-md-6 d-flex">
                <div className="card flex-fill">
                  <div className="card-body d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center overflow-hidden">
                    <span className="avatar avatar-lg bg-primary flex-shrink-0">
                      <i className="ti ti-users fs-16" />
                    </span>
                      <div className="ms-2 overflow-hidden">
                        <p className="fs-12 fw-medium mb-1 text-truncate">
                          Total Users
                        </p>
                        <h4>{totalUsers}</h4>
                      </div>
                    </div>
                    <ReactApexChart
                        options={totalChart}
                        series={totalChart.series}
                        type="area"
                        width={50}
                    />
                  </div>
                </div>
              </div>
              {/* /Total Users */}
              {/* Managers */}
              <div className="col-lg-3 col-md-6 d-flex">
                <div className="card flex-fill">
                  <div className="card-body d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center overflow-hidden">
                    <span className="avatar avatar-lg bg-success flex-shrink-0">
                      <i className="ti ti-user-check fs-16" />
                    </span>
                      <div className="ms-2 overflow-hidden">
                        <p className="fs-12 fw-medium mb-1 text-truncate">
                          Managers
                        </p>
                        <h4>{managerCount}</h4>
                      </div>
                    </div>
                    <ReactApexChart
                        options={activeChart}
                        series={activeChart.series}
                        type="area"
                        width={50}
                    />
                  </div>
                </div>
              </div>
              {/* /Managers */}
              {/* Tutors */}
              <div className="col-lg-3 col-md-6 d-flex">
                <div className="card flex-fill">
                  <div className="card-body d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center overflow-hidden">
                    <span className="avatar avatar-lg bg-danger flex-shrink-0">
                      <i className="ti ti-user-star fs-16" />
                    </span>
                      <div className="ms-2 overflow-hidden">
                        <p className="fs-12 fw-medium mb-1 text-truncate">
                          Tutors
                        </p>
                        <h4>{tutorCount}</h4>
                      </div>
                    </div>
                    <ReactApexChart
                        options={inactiveChart}
                        series={inactiveChart.series}
                        type="area"
                        width={50}
                    />
                  </div>
                </div>
              </div>
              {/* /Tutors */}
              {/* Students */}
              <div className="col-lg-3 col-md-6 d-flex">
                <div className="card flex-fill">
                  <div className="card-body d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center overflow-hidden">
                    <span className="avatar avatar-lg bg-skyblue flex-shrink-0">
                      <i className="ti ti-user-plus fs-16" />
                    </span>
                      <div className="ms-2 overflow-hidden">
                        <p className="fs-12 fw-medium mb-1 text-truncate">
                          Students
                        </p>
                        <h4>{studentCount}</h4>
                      </div>
                    </div>
                    <ReactApexChart
                        options={locationChart}
                        series={locationChart.series}
                        type="area"
                        width={50}
                    />
                  </div>
                </div>
              </div>
              {/* /Students */}
            </div>
            <div className="card">
              <div className="card-header d-flex align-items-center justify-content-between flex-wrap row-gap-3">
                <h5>Users List</h5>
                <div className="d-flex my-xl-auto right-content align-items-center flex-wrap row-gap-3">
                  <div className="me-3">
                    <div className="input-icon-end position-relative">
                      <PredefinedDateRanges />
                      <span className="input-icon-addon">
                      <i className="ti ti-chevron-down" />
                    </span>
                    </div>
                  </div>
                  <div className="dropdown me-3">
                    <Link
                        to="#"
                        className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                        data-bs-toggle="dropdown"
                    >
                      Select Plan
                    </Link>
                    <ul className="dropdown-menu  dropdown-menu-end p-3">
                      <li>
                        <Link
                            to="#"
                            className="dropdown-item rounded-1"
                        >
                          Advanced
                        </Link>
                      </li>
                      <li>
                        <Link
                            to="#"
                            className="dropdown-item rounded-1"
                        >
                          Basic
                        </Link>
                      </li>
                      <li>
                        <Link
                            to="#"
                            className="dropdown-item rounded-1"
                        >
                          Enterprise
                        </Link>
                      </li>
                    </ul>
                  </div>
                  <div className="dropdown me-3">
                    <Link
                        to="#"
                        className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                        data-bs-toggle="dropdown"
                    >
                      Select Status
                    </Link>
                    <ul className="dropdown-menu  dropdown-menu-end p-3">
                      <li>
                        <Link
                            to="#"
                            className="dropdown-item rounded-1"
                        >
                          Active
                        </Link>
                      </li>
                      <li>
                        <Link
                            to="#"
                            className="dropdown-item rounded-1"
                        >
                          Inactive
                        </Link>
                      </li>
                    </ul>
                  </div>
                  <div className="dropdown">
                    <Link
                        to="#"
                        className="dropdown-toggle btn btn-white d-inline-flex align-items-center"
                        data-bs-toggle="dropdown"
                    >
                      Sort By : Last 7 Days
                    </Link>
                    <ul className="dropdown-menu  dropdown-menu-end p-3">
                      <li>
                        <Link
                            to="#"
                            className="dropdown-item rounded-1"
                        >
                          Recently Added
                        </Link>
                      </li>
                      <li>
                        <Link
                            to="#"
                            className="dropdown-item rounded-1"
                        >
                          Ascending
                        </Link>
                      </li>
                      <li>
                        <Link
                            to="#"
                            className="dropdown-item rounded-1"
                        >
                          Desending
                        </Link>
                      </li>
                      <li>
                        <Link
                            to="#"
                            className="dropdown-item rounded-1"
                        >
                          Last Month
                        </Link>
                      </li>
                      <li>
                        <Link
                            to="#"
                            className="dropdown-item rounded-1"
                        >
                          Last 7 Days
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="card-body p-0">
                <Table dataSource={data} columns={columns} Selection={true} />
              </div>
            </div>
          </div>
          <div className="footer d-sm-flex align-items-center justify-content-between border-top bg-white p-3">
            <p className="mb-0">2014 - 2025 © SmartHR.</p>
            <p>
              Designed &amp; Developed By{" "}
              <Link to="#" className="text-primary">
                Dreams
              </Link>
            </p>
          </div>
        </div>
        {/* /Page Wrapper */}
        {/* Add User */}
        <AddUserModal onAddUser={refreshUserList} userId={currentUserId} />
        {/* /Add User */}
        {/* Edit User */}
        <div className="modal fade" id="edit_company">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Edit User</h4>
                <button
                    type="button"
                    className="btn-close custom-btn-close"
                    data-bs-dismiss="modal"
                    aria-label="Close"
                >
                  <i className="ti ti-x" />
                </button>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!editingUser?._id) return;

                // Set uploading state
                setIsEditUploading(true);

                const formData = new FormData(e.currentTarget);
                const userData = {
                  name: formData.get('name'),
                  lastname: formData.get('lastname'),
                  email: formData.get('email'),
                  role: formData.get('role'),
                  password: formData.get('password') ? formData.get('password') : undefined
                };

                try {
                  if (selectedEditFile) {
                    // Use the new updateUserWithPhoto function if we have a file
                    await updateUserWithPhoto(editingUser._id, userData, selectedEditFile);
                  } else {
                    // Use the original updateUser function if no file is selected
                    await updateUser(editingUser._id, userData);
                  }

                  // Refresh user list
                  refreshUserList();

                  // Reset file state
                  setSelectedEditFile(null);
                  if (editFileInputRef.current) {
                    editFileInputRef.current.value = '';
                  }

                  // Close modal
                  document.getElementById('closeEditModal')?.click();

                  // Show success message
                  Swal.fire({
                    title: 'Success!',
                    text: 'User updated successfully',
                    icon: 'success',
                    confirmButtonText: 'OK'
                  });
                } catch (error: any) {
                  console.error('Error updating user:', error);
                  Swal.fire({
                    title: 'Error!',
                    text: `Error updating user: ${error.response?.data?.message || error.message}`,
                    icon: 'error',
                    confirmButtonText: 'OK'
                  });
                } finally {
                  // Reset uploading state
                  setIsEditUploading(false);
                }
              }}>
                <div className="modal-body pb-0">
                  <div className="row">
                    <div className="col-md-12">
                      <div className="d-flex align-items-center flex-wrap row-gap-3 bg-light w-100 rounded p-3 mb-4">
                        <div className="d-flex align-items-center justify-content-center avatar avatar-xxl rounded-circle border border-dashed me-2 flex-shrink-0 text-dark frames">
                          <img
                              src={editPreviewUrl || editingUser?.avatar || generateAvatarUrl(editingUser || { name: '', lastname: '', role: '' })}
                              alt="Profile preview"
                              className="rounded-circle"
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        </div>
                        <div className="profile-upload">
                          <div className="mb-2">
                            <h6 className="mb-1">Upload Profile Image</h6>
                            <p className="fs-12">Image should be below 4 mb</p>
                            {editFileError && (
                                <p className="text-danger fs-12">{editFileError}</p>
                            )}
                          </div>
                          <div className="profile-uploader d-flex align-items-center">
                            <div className="drag-upload-btn btn btn-sm btn-primary me-2">
                              {isEditUploading ? 'Uploading...' : 'Upload'}
                              <input
                                  ref={editFileInputRef}
                                  type="file"
                                  className="form-control image-sign"
                                  accept="image/jpeg,image/png,image/gif,image/webp"
                                  onChange={handleEditFileChange}
                                  disabled={isEditUploading}
                              />
                            </div>
                            <button 
                                className="btn btn-light btn-sm"
                                onClick={handleEditCancelClick}
                                disabled={isEditUploading || !selectedEditFile}
                                type="button"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Name <span className="text-danger"> *</span>
                        </label>
                        <input
                            type="text"
                            name="name"
                            className="form-control"
                            defaultValue={editingUser?.name}
                            required
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Last Name</label>
                        <input
                            type="text"
                            name="lastname"
                            className="form-control"
                            defaultValue={editingUser?.lastname}
                            required
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">Email Address</label>
                        <input
                            type="email"
                            name="email"
                            className="form-control"
                            defaultValue={editingUser?.email}
                            required
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          User Role <span className="text-danger"> *</span>
                        </label>
                        <div className="d-flex gap-2">
                          <button
                              type="button"
                              className={`btn ${
                                  editingUserRole === 'manager' ? 'btn-primary' : 'btn-outline-primary'
                              }`}
                              onClick={() => setEditingUserRole('manager')}
                          >
                              Manager
                          </button>
                          <button
                              type="button"
                              className={`btn ${
                                  editingUserRole === 'tutor' ? 'btn-primary' : 'btn-outline-primary'
                              }`}
                              onClick={() => setEditingUserRole('tutor')}
                          >
                              Tutor
                          </button>
                          <button
                              type="button"
                              className={`btn ${
                                  editingUserRole === 'student' ? 'btn-primary' : 'btn-outline-primary'
                              }`}
                              onClick={() => setEditingUserRole('student')}
                          >
                              Student
                          </button>
                        </div>
                        <input type="hidden" name="role" value={editingUserRole} />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3 ">
                        <label className="form-label">
                          Password <span className="text-muted">(Leave blank to keep current password)</span>
                        </label>
                        <div className="pass-group">
                          <input
                              type={
                                passwordVisibility.password
                                    ? "text"
                                    : "password"
                              }
                              name="password"
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
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                      type="button"
                      className="btn btn-light me-2"
                      data-bs-dismiss="modal"
                      id="closeEditModal"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        {/* /Edit User */}
        {/* Upgrade Information */}
        <div className="modal fade" id="upgrade_info">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Upgrade Package</h4>
                <button
                    type="button"
                    className="btn-close custom-btn-close"
                    data-bs-dismiss="modal"
                    aria-label="Close"
                >
                  <i className="ti ti-x" />
                </button>
              </div>
              {/*<div className="p-3 mb-1">*/}
              {/*  <div className="rounded bg-light p-3">*/}
              {/*    <h5 className="mb-3">Current Plan Details</h5>*/}
              {/*    <div className="row align-items-center">*/}
              {/*      <div className="col-md-4">*/}
              {/*        <div className="mb-3">*/}
              {/*          <p className="fs-12 mb-0">Company Name</p>*/}
              {/*          <p className="text-gray-9">BrightWave Innovations</p>*/}
              {/*        </div>*/}
              {/*      </div>*/}
              {/*      <div className="col-md-4">*/}
              {/*        <div className="mb-3">*/}
              {/*          <p className="fs-12 mb-0">Plan Name</p>*/}
              {/*          <p className="text-gray-9">Advanced</p>*/}
              {/*        </div>*/}
              {/*      </div>*/}
              {/*      <div className="col-md-4">*/}
              {/*        <div className="mb-3">*/}
              {/*          <p className="fs-12 mb-0">Plan Type</p>*/}
              {/*          <p className="text-gray-9">Monthly</p>*/}
              {/*        </div>*/}
              {/*      </div>*/}
              {/*    </div>*/}
              {/*    <div className="row align-items-center">*/}
              {/*      <div className="col-md-4">*/}
              {/*        <div className="mb-3">*/}
              {/*          <p className="fs-12 mb-0">Price</p>*/}
              {/*          <p className="text-gray-9">200</p>*/}
              {/*        </div>*/}
              {/*      </div>*/}
              {/*      <div className="col-md-4">*/}
              {/*        <div className="mb-3">*/}
              {/*          <p className="fs-12 mb-0">Register Date</p>*/}
              {/*          <p className="text-gray-9">12 Sep 2024</p>*/}
              {/*        </div>*/}
              {/*      </div>*/}
              {/*      <div className="col-md-4">*/}
              {/*        <div className="mb-3">*/}
              {/*          <p className="fs-12 mb-0">Expiring On</p>*/}
              {/*          <p className="text-gray-9">11 Oct 2024</p>*/}
              {/*        </div>*/}
              {/*      </div>*/}
              {/*    </div>*/}
              {/*  </div>*/}
              {/*</div>*/}
              <form action="companies.html">
                <div className="modal-body pb-0">
                  <h5 className="mb-4">Change Plan</h5>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="mb-3 ">
                        <label className="form-label">
                          Plan Name <span className="text-danger">*</span>
                        </label>
                        <CommonSelect
                            className='select'
                            options={planName}
                            defaultValue={planName[0]}
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3 ">
                        <label className="form-label">
                          Plan Type <span className="text-danger">*</span>
                        </label>
                        <CommonSelect
                            className='select'
                            options={planType}
                            defaultValue={planType[0]}
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Ammount<span className="text-danger">*</span>
                        </label>
                        <input type="text" className="form-control" />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Payment Date <span className="text-danger">*</span>
                        </label>
                        <div className="input-icon-end position-relative">
                          <DatePicker
                              className="form-control datetimepicker"
                              format={{
                                format: "DD-MM-YYYY",
                                type: "mask",
                              }}
                              getPopupContainer={getModalContainer}
                              placeholder="DD-MM-YYYY"
                          />
                          <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-7" />
                        </span>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Next Payment Date <span className="text-danger">*</span>
                        </label>
                        <div className="input-icon-end position-relative">
                          <DatePicker
                              className="form-control datetimepicker"
                              format={{
                                format: "DD-MM-YYYY",
                                type: "mask",
                              }}
                              getPopupContainer={getModalContainer}
                              placeholder="DD-MM-YYYY"
                          />
                          <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-7" />
                        </span>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="mb-3">
                        <label className="form-label">
                          Expiring On <span className="text-danger">*</span>
                        </label>
                        <div className="input-icon-end position-relative">
                          <DatePicker
                              className="form-control datetimepicker"
                              format={{
                                format: "DD-MM-YYYY",
                                type: "mask",
                              }}
                              getPopupContainer={getModalContainer}
                              placeholder="DD-MM-YYYY"
                          />
                          <span className="input-icon-addon">
                          <i className="ti ti-calendar text-gray-7" />
                        </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                      type="button"
                      className="btn btn-light me-2"
                      data-bs-dismiss="modal"
                  >
                    Cancel
                  </button>
                  <button type="button" data-bs-dismiss="modal" className="btn btn-primary">
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        {/* /Upgrade Information */}
        {/* Company Detail */}
        <div className="modal fade" id="company_detail">
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">User Detail</h4>
                <button
                    type="button"
                    className="btn-close custom-btn-close"
                    data-bs-dismiss="modal"
                    aria-label="Close"
                >
                  <i className="ti ti-x" />
                </button>
              </div>
              <div className="moday-body">
                <div className="p-3">
                  <div className="d-flex justify-content-between align-items-center rounded bg-light p-3">
                    <div className="file-name-icon d-flex align-items-center">
                      <Link
                          to="#"
                          className="avatar avatar-md border rounded-circle flex-shrink-0 me-2"
                      >
                        <img
                            src={selectedUser?.avatar || generateAvatarUrl(selectedUser || { name: '', lastname: '', role: '' })}
                            className="img-fluid rounded-circle"
                            alt={`${selectedUser?.name} ${selectedUser?.lastname}`}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </Link>
                      <div>
                        <p className="text-gray-9 fw-medium mb-0">
                          {selectedUser?.name} {selectedUser?.lastname}
                        </p>
                        <p>{selectedUser?.email}</p>
                      </div>
                    </div>
                    <span className="badge badge-success">
                    <i className="ti ti-point-filled" />
                    Active
                  </span>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-gray-9 fw-medium">Basic Info</p>
                  <div className="pb-1 border-bottom mb-4">
                    <div className="row align-items-center">
                      <div className="col-md-4">
                        <div className="mb-3">
                          <p className="fs-12 mb-0">First Name</p>
                          <p className="text-gray-9">{selectedUser?.name}</p>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="mb-3">
                          <p className="fs-12 mb-0">Last Name</p>
                          <p className="text-gray-9">{selectedUser?.lastname}</p>
                        </div>
                      </div>
                      <div className="col-md-4">
                        <div className="mb-3">
                          <p className="fs-12 mb-0">Email</p>
                          <p className="text-gray-9">{selectedUser?.email}</p>
                        </div>
                      </div>
                    </div>
                    {/*<div className="row align-items-center">*/}
                    {/*  <div className="col-md-4">*/}
                    {/*    <div className="mb-3">*/}
                    {/*      <p className="fs-12 mb-0">Currency</p>*/}
                    {/*      <p className="text-gray-9">United Stated Dollar (USD)</p>*/}
                    {/*    </div>*/}
                    {/*  </div>*/}
                    {/*  <div className="col-md-4">*/}
                    {/*    <div className="mb-3">*/}
                    {/*      <p className="fs-12 mb-0">Language</p>*/}
                    {/*      <p className="text-gray-9">English</p>*/}
                    {/*    </div>*/}
                    {/*  </div>*/}
                    {/*  <div className="col-md-4">*/}
                    {/*    <div className="mb-3">*/}
                    {/*      <p className="fs-12 mb-0">Addresss</p>*/}
                    {/*      <p className="text-gray-9">*/}
                    {/*        3705 Lynn Avenue, Phelps, WI 54554*/}
                    {/*      </p>*/}
                    {/*    </div>*/}
                    {/*  </div>*/}
                    {/*</div>*/}
                  </div>
                  {/*<p className="text-gray-9 fw-medium">Plan Details</p>*/}
                  {/*<div>*/}
                  {/*  <div className="row align-items-center">*/}
                  {/*    <div className="col-md-4">*/}
                  {/*      <div className="mb-3">*/}
                  {/*        <p className="fs-12 mb-0">Plan Name</p>*/}
                  {/*        <p className="text-gray-9">Advanced</p>*/}
                  {/*      </div>*/}
                  {/*    </div>*/}
                  {/*    <div className="col-md-4">*/}
                  {/*      <div className="mb-3">*/}
                  {/*        <p className="fs-12 mb-0">Plan Type</p>*/}
                  {/*        <p className="text-gray-9">Monthly</p>*/}
                  {/*      </div>*/}
                  {/*    </div>*/}
                  {/*    <div className="col-md-4">*/}
                  {/*      <div className="mb-3">*/}
                  {/*        <p className="fs-12 mb-0">Price</p>*/}
                  {/*        <p className="text-gray-9">$200</p>*/}
                  {/*      </div>*/}
                  {/*    </div>*/}
                  {/*  </div>*/}
                  {/*  <div className="row align-items-center">*/}
                  {/*    <div className="col-md-4">*/}
                  {/*      <div className="mb-3">*/}
                  {/*        <p className="fs-12 mb-0">Register Date</p>*/}
                  {/*        <p className="text-gray-9">12 Sep 2024</p>*/}
                  {/*      </div>*/}
                  {/*    </div>*/}
                  {/*    <div className="col-md-4">*/}
                  {/*      <div className="mb-3">*/}
                  {/*        <p className="fs-12 mb-0">Expiring On</p>*/}
                  {/*        <p className="text-gray-9">11 Oct 2024</p>*/}
                  {/*      </div>*/}
                  {/*    </div>*/}
                  {/*  </div>*/}
                  {/*</div>*/}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* /Company Detail */}

        {/* Delete User Modal */}
        <div className="modal fade" id="delete_modal">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h4 className="modal-title">Delete User</h4>
                <button
                    type="button"
                    className="btn-close custom-btn-close"
                    data-bs-dismiss="modal"
                    aria-label="Close"
                >
                  <i className="ti ti-x" />
                </button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete this user?</p>
                <p><strong>{editingUser?.name} {editingUser?.lastname}</strong> ({editingUser?.email})</p>
                <p className="text-danger">This action cannot be undone.</p>
              </div>
              <div className="modal-footer">
                <button
                    type="button"
                    className="btn btn-light me-2"
                    data-bs-dismiss="modal"
                    id="closeDeleteModal"
                >
                  Cancel
                </button>
                <button 
                    type="button" 
                    className="btn btn-danger"
                    onClick={async () => {
                      if (!editingUser?._id) return;

                      try {
                        await deleteUser(editingUser._id);
                        refreshUserList();
                        document.getElementById('closeDeleteModal')?.click();
                        Swal.fire({
                          title: 'Success!',
                          text: 'User deleted successfully',
                          icon: 'success',
                          confirmButtonText: 'OK'
                        });
                      } catch (error: any) {
                        console.error('Error deleting user:', error);
                        Swal.fire({
                          title: 'Error!',
                          text: `Error deleting user: ${error.response?.data?.message || error.message}`,
                          icon: 'error',
                          confirmButtonText: 'OK'
                        });
                      }
                    }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
        {/* /Delete User Modal */}
      </>


  )
}

export default UsersManagement;
