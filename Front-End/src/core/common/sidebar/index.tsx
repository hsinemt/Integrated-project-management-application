import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import Scrollbars from "react-custom-scrollbars-2";
import ImageWithBasePath from "../imageWithBasePath";
import "../../../style/icon/tabler-icons/webfont/tabler-icons.css";
import { setExpandMenu } from "../../data/redux/sidebarSlice";
import { useDispatch } from "react-redux";
import {
  resetAllMode,
  setDataLayout,
} from "../../data/redux/themeSettingSlice";
import usePreviousRoute from "./usePreviousRoute";
import { SidebarDataTest } from "../../data/json/sidebarMenu";

const Sidebar = () => {
  const userRole = localStorage.getItem('userRole'); // Récupérer le rôle de l'utilisateur
  const Location = useLocation();
  const [subOpen, setSubopen] = useState<any>("Dashboard");
  const [subsidebar, setSubsidebar] = useState("");

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

  const handleLayoutChange = (layout: string) => {
    dispatch(setDataLayout(layout));
  };

  const handleClick = (label: any, themeSetting: any, layout: any) => {
    toggleSidebar(label);
    if (themeSetting) {
      handleLayoutChange(layout);
    }
  };

  const getLayoutClass = (label: any) => {
    switch (label) {
      case "Default":
        return "default_layout";
      case "Mini":
        return "mini_layout";
      case "Box":
        return "boxed_layout";
      case "Dark":
        return "dark_data_theme";
      case "RTL":
        return "rtl";
      default:
        return "";
    }
  };

  const location = useLocation();
  const dispatch = useDispatch();
  const previousLocation = usePreviousRoute();

  useEffect(() => {
    const currentMenu = localStorage.getItem("menuOpened") || 'Dashboard'
    setSubopen(currentMenu);
    // Select all 'submenu' elements
    const submenus = document.querySelectorAll(".submenu");
    submenus.forEach((submenu) => {
      const listItems = submenu.querySelectorAll("li");
      submenu.classList.remove("active");
      listItems.forEach((item) => {
        if (item.classList.contains("active")) {
          submenu.classList.add("active");
          return;
        }
      });
    });
  }, [Location.pathname]);

  const onMouseEnter = () => {
    dispatch(setExpandMenu(true));
  };
  const onMouseLeave = () => {
    dispatch(setExpandMenu(false));
  };

  return (
    <>
      <div
        className="sidebar"
        id="sidebar"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        <div className="sidebar-logo">
          <Link to="routes.index" className="logo logo-normal">
            <ImageWithBasePath src="assets/img/logo.svg" alt="Logo" />
          </Link>
          <Link to="routes.index" className="logo-small">
            <ImageWithBasePath src="assets/img/logo-small.svg" alt="Logo" />
          </Link>
          <Link to="routes.index" className="dark-logo">
            <ImageWithBasePath src="assets/img/logo-white.svg" alt="Logo" />
          </Link>
        </div>
        <div className="modern-profile p-3 pb-0">
          <div className="text-center rounded bg-light p-3 mb-4 user-profile">
            <div className="avatar avatar-lg online mb-3">
              <ImageWithBasePath
                src="assets/img/profiles/avatar-02.jpg"
                alt="Img"
                className="img-fluid rounded-circle"
              />
            </div>
            <h6 className="fs-12 fw-normal mb-1">Adrian Herman</h6>
            <p className="fs-10">System Admin</p>
          </div>
        </div>

        <Scrollbars>
          <div className="sidebar-inner slimscroll">
            <div id="sidebar-menu" className="sidebar-menu">
              <ul>
                {SidebarDataTest?.map((mainLabel, index) => (
                  <React.Fragment key={`main-${index}`}>
                    {/* Afficher seulement certains éléments du menu selon le rôle */}
                    {(userRole === 'admin' || mainLabel?.tittle !== 'Admin-only') && (
                      <>
                        <li className="menu-title">
                          <span>{mainLabel?.tittle}</span>
                        </li>
                        <li>
                          <ul>
                            {mainLabel?.submenuItems?.map((title: any, i) => {
                              let link_array: any = [];
                              if ("submenuItems" in title) {
                                title.submenuItems?.forEach((link: any) => {
                                  link_array.push(link?.link);
                                  if (link?.submenu && "submenuItems" in link) {
                                    link.submenuItems?.forEach((item: any) => {
                                      link_array.push(item?.link);
                                    });
                                  }
                                });
                              }
                              title.links = link_array;

                              return (
                                <li className="submenu" key={`title-${i}`}>
                                  <Link
                                    to={title?.submenu ? "#" : title?.link}
                                    onClick={() =>
                                      handleClick(
                                        title?.label,
                                        title?.themeSetting,
                                        getLayoutClass(title?.label)
                                      )
                                    }
                                    className={`${
                                      subOpen === title?.label ? "subdrop" : ""
                                    } ${
                                      title?.links?.includes(Location.pathname) ? "active" : ""
                                    }`}
                                  >
                                    <i className={`ti ti-${title.icon}`}></i>
                                    <span>{title?.label}</span>
                                    {title?.dot && (
                                      <span className="badge badge-danger fs-10 fw-medium text-white p-1">
                                        Hot
                                      </span>
                                    )}
                                    <span className={title?.submenu ? "menu-arrow" : ""} />
                                  </Link>
                                  {title?.submenu !== false && subOpen === title?.label && (
                                    <ul
                                      style={{
                                        display: subOpen === title?.label ? "block" : "none",
                                      }}
                                    >
                                      {title?.submenuItems?.map((item: any, j: any) => (
                                        <li
                                          className={
                                            item?.submenuItems ? "submenu submenu-two" : ""
                                          }
                                          key={`item-${j}`}
                                        >
                                          <Link
                                            to={item?.submenu ? "#" : item?.link}
                                            className={`${
                                              subsidebar === item?.label ? "subdrop" : ""
                                            }`}
                                            onClick={() => {
                                              toggleSubsidebar(item?.label);
                                            }}
                                          >
                                            {item?.label}
                                            <span
                                              className={item?.submenu ? "menu-arrow" : ""}
                                            />
                                          </Link>
                                          {item?.submenuItems ? (
                                            <ul
                                              style={{
                                                display: subsidebar === item?.label ? "block" : "none",
                                              }}
                                            >
                                              {item?.submenuItems?.map((items: any, k: any) => (
                                                <li key={`submenu-item-${k}`}>
                                                  <Link
                                                    to={items?.submenu ? "#" : items?.link}
                                                    className={`${
                                                      subsidebar === items?.label
                                                        ? "submenu-two subdrop"
                                                        : "submenu-two"
                                                    }`}
                                                  >
                                                    {items?.label}
                                                  </Link>
                                                </li>
                                              ))}
                                            </ul>
                                          ) : null}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </li>
                      </>
                    )}
                  </React.Fragment>
                ))}
              </ul>
            </div>
          </div>
        </Scrollbars>
      </div>
    </>
  );
};


export default Sidebar;
