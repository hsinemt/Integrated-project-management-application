import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setDataLayout } from "../../data/redux/themeSettingSlice";
import ImageWithBasePath from "../imageWithBasePath";
import { setMobileSidebar, toggleMiniSidebar } from "../../data/redux/sidebarSlice";
import { all_routes } from "../../../feature-module/router/all_routes";
import { HorizontalSidebarData } from '../../data/json/horizontalSidebar';
import axios from 'axios';
import Modal from 'react-modal';
import { getFullAvatarUrl } from '../../../api/config';

Modal.setAppElement('#root');

const Header = () => {
  const navigate = useNavigate();
  const routes = all_routes;
  const dispatch = useDispatch();
  const dataLayout = useSelector((state: any) => state.themeSetting.dataLayout);
  const Location = useLocation();
  const mobileSidebar = useSelector((state: any) => state.sidebarSlice.mobileSidebar);

  // Refs for handling dropdown clicks
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  const [subOpen, setSubopen] = useState<any>("");
  const [subsidebar, setSubsidebar] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  // New state to manage profile dropdown visibility
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [user, setUser] = useState({
    _id: "",
    name: "",
    lastname: "",
    email: "",
    birthday: "",
    password: "",
    avatar: "",
    skills: [],
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) {
          console.error("No token found in localStorage");
          return;
        }

        const response = await axios.get("http://localhost:9777/user/profile", {
          headers: { Authorization: `${token}` },
        });

        if (response.data) {
          const formattedBirthday = response.data.birthday
              ? response.data.birthday.split("T")[0]
              : "";
          setUser({
            _id: response.data._id,
            name: response.data.name,
            lastname: response.data.lastname,
            email: response.data.email,
            birthday: formattedBirthday,
            password: "",
            avatar: response.data.avatar,
            skills: response.data.skills || [],
          });
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      }
    };

    fetchProfile();

    // Add click event listener to handle clicks outside the dropdown
    const handleClickOutside = (event: MouseEvent) => {
      if (
          profileDropdownRef.current &&
          !profileDropdownRef.current.contains(event.target as Node)
      ) {
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    // Clean up the event listener on component unmount
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const toggleSidebar = (title: any) => {
    localStorage.setItem("menuOpened", title);
    if (title === subOpen) {
      setSubopen("");
    } else {
      setSubopen(title);
    }
  };

  const toggleSubsidebar = (subitem: any) => {
    if (subitem === subsidebar) {
      setSubsidebar("");
    } else {
      setSubsidebar(subitem);
    }
  };

  const toggleMobileSidebar = () => {
    dispatch(setMobileSidebar(!mobileSidebar));
  };

  const handleToggleMiniSidebar = () => {
    if (dataLayout === "mini_layout") {
      dispatch(setDataLayout("default_layout"));
      localStorage.setItem("dataLayout", "default_layout");
    } else {
      dispatch(toggleMiniSidebar());
    }
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch((err) => {});
        setIsFullscreen(true);
      }
    } else {
      if (document.exitFullscreen) {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch((err) => {});
        }
        setIsFullscreen(false);
      }
    }
  };

  // Toggle profile dropdown visibility
  const toggleProfileDropdown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setProfileDropdownOpen(!profileDropdownOpen);
  };

  const handleLogout = async () => {
    try {
      await axios.post("http://localhost:9777/user/logout", null, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      });

      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("email");
      localStorage.removeItem("password");
      navigate(routes.login);
    } catch (error) {
      console.error("Erreur lors de la déconnexion", error);
    }
  };

  const openModal = (image: string) => {
    setSelectedImage(image);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedImage(null);
  };

  return (
      <div className="header">
        <div className="main-header">
          <div className="header-left">
            <Link to={routes.adminDashboard} className="logo">
              <ImageWithBasePath src="assets/img/projexus-logo.svg" alt="Logo"/>
            </Link>
            <Link to={routes.adminDashboard} className="dark-logo">
              <ImageWithBasePath src="assets/img/white-projexus-logo.svg" alt="Logo"/>
            </Link>
          </div>

          <Link id="mobile_btn" onClick={toggleMobileSidebar} className="mobile_btn" to="#sidebar">
          <span className="bar-icon">
            <span></span>
            <span></span>
            <span></span>
          </span>
          </Link>

          <div className="header-user">
            <div className="nav user-menu nav-list">
              <div className="me-auto d-flex align-items-center" id="header-search">
                <Link id="toggle_btn" to="#" onClick={handleToggleMiniSidebar} className="btn btn-menubar me-1">
                  <i className="ti ti-arrow-bar-to-left"></i>
                </Link>
                <div className="input-group input-group-flat d-inline-flex me-1">
                <span className="input-icon-addon">
                  <i className="ti ti-search"></i>
                </span>
                  <input type="text" className="form-control" placeholder="Search in Projexus" />
                  <span className="input-group-text">
                  <kbd>CTRL + / </kbd>
                </span>
                </div>
              </div>

              <div className="sidebar sidebar-horizontal" id="horizontal-single">
                <div className="sidebar-menu">
                  <div className="main-menu">
                    <ul className="nav-menu">
                      <li className="menu-title">
                        <span>Main</span>
                      </li>
                      {HorizontalSidebarData?.map((mainMenu, index) => (
                          <React.Fragment key={`main-${index}`}>
                            {mainMenu?.menu?.map((data, i) => (
                                <li className="submenu" key={`menu-${i}`}>
                                  <Link to="#" className={`
                              ${
                                      data?.subMenus
                                          ?.map((link: any) => link?.route)
                                          .includes(Location.pathname)
                                          ? "active"
                                          : ""
                                  } ${subOpen === data.menuValue ? "subdrop" : ""}`}
                                        onClick={() => toggleSidebar(data.menuValue)}>
                                    <i className={`ti ti-${data.icon}`}></i>
                                    <span>{data.menuValue}</span>
                                    <span className="menu-arrow"></span>
                                  </Link>

                                  <ul style={{ display: subOpen === data.menuValue ? "block" : "none" }}>
                                    {data?.subMenus?.map((subMenu:any, j) => (
                                        <li key={`submenu-${j}`} className={subMenu?.customSubmenuTwo ? "submenu" : ""}>
                                          <Link to={subMenu?.route || "#"} className={`${
                                              subMenu?.subMenusTwo
                                                  ?.map((link: any) => link?.route)
                                                  .includes(Location.pathname) || subMenu?.route === Location.pathname
                                                  ? "active"
                                                  : ""
                                          } ${subsidebar === subMenu.menuValue ? "subdrop" : ""}`}
                                                onClick={() => toggleSubsidebar(subMenu.menuValue)}>
                                            <span>{subMenu?.menuValue}</span>
                                            {subMenu?.customSubmenuTwo && <span className="menu-arrow"></span>}
                                          </Link>

                                          {subMenu?.customSubmenuTwo && subMenu?.subMenusTwo && (
                                              <ul style={{ display: subsidebar === subMenu.menuValue ? "block" : "none" }}>
                                                {subMenu.subMenusTwo.map((subMenuTwo:any, k:number) => (
                                                    <li key={`submenu-two-${k}`}>
                                                      <Link className={subMenuTwo.route === Location.pathname?'active':''} to={subMenuTwo.route}>{subMenuTwo.menuValue}</Link>
                                                    </li>
                                                ))}
                                              </ul>
                                          )}
                                        </li>
                                    ))}
                                  </ul>
                                </li>
                            ))}
                          </React.Fragment>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <div className="d-flex align-items-center">
                <div className="me-1">
                  <Link to="#" onClick={toggleFullscreen} className="btn btn-menubar btnFullscreen">
                    <i className="ti ti-maximize"></i>
                  </Link>
                </div>
                {/*<div className="dropdown me-1">*/}
                {/*  <Link to="#" className="btn btn-menubar" data-bs-toggle="dropdown">*/}
                {/*    <i className="ti ti-layout-grid-remove"></i>*/}
                {/*  </Link>*/}
                {/*  <div className="dropdown-menu dropdown-menu-end">*/}
                {/*    <div className="card mb-0 border-0 shadow-none">*/}
                {/*      <div className="card-header">*/}
                {/*        <h4>Applications</h4>*/}
                {/*      </div>*/}
                {/*      <div className="card-body">*/}
                {/*        <Link to={routes.calendar} className="d-block pb-2">*/}
                {/*          <span className="avatar avatar-md bg-transparent-dark me-2"><i className="ti ti-calendar text-gray-9"></i></span>Calendar*/}
                {/*        </Link>*/}
                {/*        <Link to={routes.todo} className="d-block py-2">*/}
                {/*          <span className="avatar avatar-md bg-transparent-dark me-2"><i className="ti ti-subtask text-gray-9"></i></span>To Do*/}
                {/*        </Link>*/}
                {/*        <Link to={routes.notes} className="d-block py-2">*/}
                {/*          <span className="avatar avatar-md bg-transparent-dark me-2"><i className="ti ti-notes text-gray-9"></i></span>Notes*/}
                {/*        </Link>*/}
                {/*        <Link to={routes.fileManager} className="d-block py-2">*/}
                {/*          <span className="avatar avatar-md bg-transparent-dark me-2"><i className="ti ti-folder text-gray-9"></i></span>File Manager*/}
                {/*        </Link>*/}
                {/*        <Link to={routes.kanbanView} className="d-block py-2">*/}
                {/*          <span className="avatar avatar-md bg-transparent-dark me-2"><i className="ti ti-layout-kanban text-gray-9"></i></span>Kanban*/}
                {/*        </Link>*/}
                {/*        <Link to={routes.invoice} className="d-block py-2 pb-0">*/}
                {/*          <span className="avatar avatar-md bg-transparent-dark me-2"><i className="ti ti-file-invoice text-gray-9"></i></span>Invoices*/}
                {/*        </Link>*/}
                {/*      </div>*/}
                {/*    </div>*/}
                {/*  </div>*/}
                {/*</div>*/}
                {/*<div className="me-1">*/}
                {/*  <Link to={routes.chat} className="btn btn-menubar position-relative">*/}
                {/*    <i className="ti ti-brand-hipchat"></i>*/}
                {/*    <span className="badge bg-info rounded-pill d-flex align-items-center justify-content-center header-badge">5</span>*/}
                {/*  </Link>*/}
                {/*</div>*/}

                {/*<div className="me-1 notification_item">*/}
                {/*  <Link to="#" className="btn btn-menubar position-relative me-1" id="notification_popup"*/}
                {/*        data-bs-toggle="dropdown">*/}
                {/*    <i className="ti ti-bell"></i>*/}
                {/*    <span className="notification-status-dot"></span>*/}
                {/*  </Link>*/}
                {/*  <div className="dropdown-menu dropdown-menu-end notification-dropdown p-4">*/}
                {/*    <div className="d-flex align-items-center justify-content-between border-bottom p-0 pb-3 mb-3">*/}
                {/*      <h4 className="notification-title">Notifications (2)</h4>*/}
                {/*      <div className="d-flex align-items-center">*/}
                {/*        <Link to="#" className="text-primary fs-15 me-3 lh-1">Mark all as read</Link>*/}
                {/*        <div className="dropdown">*/}
                {/*          <Link to="#" className="bg-white dropdown-toggle"*/}
                {/*                data-bs-toggle="dropdown">*/}
                {/*            <i className="ti ti-calendar-due me-1"></i>Today*/}
                {/*          </Link>*/}
                {/*          <ul className="dropdown-menu mt-2 p-3">*/}
                {/*            <li>*/}
                {/*              <Link to="#" className="dropdown-item rounded-1">*/}
                {/*                This Week*/}
                {/*              </Link>*/}
                {/*            </li>*/}
                {/*            <li>*/}
                {/*              <Link to="#" className="dropdown-item rounded-1">*/}
                {/*                Last Week*/}
                {/*              </Link>*/}
                {/*            </li>*/}
                {/*            <li>*/}
                {/*              <Link to="#" className="dropdown-item rounded-1">*/}
                {/*                Last Month*/}
                {/*              </Link>*/}
                {/*            </li>*/}
                {/*          </ul>*/}
                {/*        </div>*/}
                {/*      </div>*/}
                {/*    </div>*/}
                {/*    <div className="noti-content">*/}
                {/*      <div className="d-flex flex-column">*/}
                {/*        <div className="border-bottom mb-3 pb-3">*/}
                {/*          <Link to={routes.activity}>*/}
                {/*            <div className="d-flex">*/}
                {/*            <span className="avatar avatar-lg me-2 flex-shrink-0">*/}
                {/*              <ImageWithBasePath src="assets/img/profiles/avatar-27.jpg" alt="Profile"/>*/}
                {/*            </span>*/}
                {/*              <div className="flex-grow-1">*/}
                {/*                <p className="mb-1"><span*/}
                {/*                    className="text-dark fw-semibold">Shawn</span>*/}
                {/*                  performance in Math is below the threshold.</p>*/}
                {/*                <span>Just Now</span>*/}
                {/*              </div>*/}
                {/*            </div>*/}
                {/*          </Link>*/}
                {/*        </div>*/}
                {/*        <div className="border-bottom mb-3 pb-3">*/}
                {/*          <Link to={routes.activity} className="pb-0">*/}
                {/*            <div className="d-flex">*/}
                {/*            <span className="avatar avatar-lg me-2 flex-shrink-0">*/}
                {/*              <ImageWithBasePath src="assets/img/profiles/avatar-23.jpg" alt="Profile"/>*/}
                {/*            </span>*/}
                {/*              <div className="flex-grow-1">*/}
                {/*                <p className="mb-1"><span*/}
                {/*                    className="text-dark fw-semibold">Sylvia</span> added*/}
                {/*                  appointment on 02:00 PM</p>*/}
                {/*                <span>10 mins ago</span>*/}
                {/*                <div*/}
                {/*                    className="d-flex justify-content-start align-items-center mt-1">*/}
                {/*                  <span className="btn btn-light btn-sm me-2">Deny</span>*/}
                {/*                  <span className="btn btn-primary btn-sm">Approve</span>*/}
                {/*                </div>*/}
                {/*              </div>*/}
                {/*            </div>*/}
                {/*          </Link>*/}
                {/*        </div>*/}
                {/*      </div>*/}
                {/*    </div>*/}
                {/*    <div className="d-flex p-0">*/}
                {/*      <Link to="#" className="btn btn-light w-100 me-2">Cancel</Link>*/}
                {/*      <Link to={routes.activity} className="btn btn-primary w-100">View All</Link>*/}
                {/*    </div>*/}
                {/*  </div>*/}
                {/*</div>*/}

                {/* Profile Dropdown - Modified for React state control */}
                <div className="dropdown profile-dropdown" ref={profileDropdownRef}>
                  <div
                      className="dropdown-toggle d-flex align-items-center cursor-pointer"
                      onClick={toggleProfileDropdown}
                      style={{ cursor: 'pointer' }}
                  >
                    <span className="avatar avatar-lg me-2 avatar-rounded">
                      {user.avatar ? (
                          <img
                              src={getFullAvatarUrl(user.avatar)}
                              alt="Profile"
                              className="img-fluid rounded-circle"
                              onError={(e) => {
                                e.currentTarget.src = "https://via.placeholder.com/150";
                              }}
                          />
                      ) : (
                          <img
                              src="https://via.placeholder.com/150"
                              alt="Profile"
                              className="img-fluid rounded-circle"
                          />
                      )}
                    </span>
                  </div>

                  {/* Use React state to control visibility instead of Bootstrap */}
                  <div
                      className={`dropdown-menu shadow-none ${profileDropdownOpen ? 'show' : ''}`}
                      style={{
                        display: profileDropdownOpen ? 'block' : 'none',
                        position: 'absolute',
                        inset: '0px auto auto 0px',
                        margin: '0px',
                        transform: 'translate(0px, 40px)',
                        zIndex: 1000
                      }}
                  >
                    <div className="card mb-0">
                      <div className="card-header">
                        <div className="d-flex align-items-center">
                          <span className="avatar avatar-lg me-2 avatar-rounded">
                            {user.avatar ? (
                                <img
                                    src={getFullAvatarUrl(user.avatar)}
                                    alt="Profile"
                                    className="img-fluid rounded-circle"
                                    onError={(e) => {
                                      e.currentTarget.src = "https://via.placeholder.com/150";
                                    }}
                                />
                            ) : (
                                <img
                                    src="https://via.placeholder.com/150"
                                    alt="Profile"
                                    className="img-fluid rounded-circle"
                                />
                            )}
                          </span>
                          <div>
                            <h5 className="mb-0">{user.name || "User"}</h5>
                            <p className="fs-12 fw-medium mb-0">{user.email || "user@example.com"}</p>
                          </div>
                        </div>
                      </div>
                      <div className="card-body">
                        <Link
                            className="dropdown-item d-inline-flex align-items-center p-0 py-2"
                            to={routes.profile}
                            onClick={() => setProfileDropdownOpen(false)}
                        >
                          <i className="ti ti-user-circle me-1"></i>My Profile
                        </Link>
                        <Link
                            className="dropdown-item d-inline-flex align-items-center p-0 py-2"
                            to={routes.bussinessSettings}
                            onClick={() => setProfileDropdownOpen(false)}
                        >
                          <i className="ti ti-settings me-1"></i>Settings
                        </Link>
                        <button
                            className="dropdown-item d-inline-flex align-items-center p-0 py-2"
                            onClick={handleLogout}
                        >
                          <i className="ti ti-login me-2"></i>Logout
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="dropdown mobile-user-menu">
            <Link to="#" className="nav-link dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
              <i className="fa fa-ellipsis-v"></i>
            </Link>
            <div className="dropdown-menu dropdown-menu-end">
              <Link className="dropdown-item" to={routes.profile}>My Profile</Link>
              <Link className="dropdown-item" to={routes.profilesettings}>Settings</Link>
              <button
                  className="dropdown-item d-inline-flex align-items-center p-0 py-2"
                  onClick={handleLogout}
              >
                <i className="ti ti-login me-2"></i>Logout
              </button>
            </div>
          </div>
        </div>
      </div>
  );
};

export default Header;
