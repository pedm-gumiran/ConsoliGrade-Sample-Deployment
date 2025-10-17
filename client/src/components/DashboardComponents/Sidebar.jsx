import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  FaHome,
  FaUsers,
  FaClipboardCheck,
  FaUpload,
  FaBook,
  FaThLarge,
  FaGraduationCap,
  FaCog,
  FaFileArchive,
  FaDatabase,
  FaChevronDown,
} from 'react-icons/fa';
import System_Logo from '../Logo/System_Logo';
import Tooltip from '../utility/Tooltip';
import { useUser } from '../../context/UserContext';

export default function Sidebar({ isMobileOpen, onCloseMobile, isModalOpen }) {
  const [collapsed, setCollapsed] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [openSubmenu, setOpenSubmenu] = useState({});
  const [hoveredSubIndex, setHoveredSubIndex] = useState({});
  const [hovered, setHovered] = useState(false);
  const location = useLocation(); // for monitoring location
  const { user } = useUser();
  const { role, isAdviser = false, isSubjectTeacher = false } = user || {};

  // Collapse sidebar on window resize
  useEffect(() => {
    const handleResize = () => setCollapsed(window.innerWidth >= 1024);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close all submenus when collapsed
  useEffect(() => {
    if (collapsed) setOpenSubmenu({});
  }, [collapsed]);

  // Base role menus
  const roleMenus = {
    Admin: [
      { name: 'Home', icon: <FaHome />, path: '/home_admin' },
      { name: 'Users', icon: <FaUsers />, path: '/manage_users_admin' },

      {
        name: 'Students',
        icon: <FaGraduationCap />,
        path: '/manage_students_admin',
      },
      {
        name: 'Subjects',
        icon: <FaBook />,
        path: '/manage_subjects_admin',
      },
      {
        name: 'Sections',
        icon: <FaThLarge />,
        path: '/manage_sections_admin',
      },
      {
        name: 'Grades',
        icon: <FaClipboardCheck />,
        path: '/manage_grades_admin',
      },
      {
        name: 'Settings',
        icon: <FaCog />,
        submenu: [
          {
            name: 'Audit Trail',
            icon: <FaFileArchive />,
            path: '/manage_audit_admin',
          },
          {
            name: 'Backup & Restore',
            icon: <FaDatabase />,
            path: '/backup_restore_admin',
          },
        ],
      },
    ],
  };

  let teacherMenu = [];

  if (role === 'Teacher') {
    if (isAdviser && isSubjectTeacher) {
      // Both Adviser & Subject Teacher
      teacherMenu = [
        {
          name: 'Home',
          icon: <FaHome />,
          path: '/combined_home', // NEW unified route
        },
        {
          name: 'Consolidated Grades ',
          icon: <FaClipboardCheck />,
          path: '/consolidated_grades_adviser',
        },
        {
          name: 'Upload Grades ',
          icon: <FaUpload />,
          path: '/upload_grades_subject_teacher',
        },
      ];
    } else if (isAdviser) {
      // Adviser Only
      teacherMenu = [
        { name: 'Home', icon: <FaHome />, path: '/home_adviser' },
        {
          name: 'Consolidated Grades',
          icon: <FaClipboardCheck />,
          path: '/consolidated_grades_adviser',
        },
      ];
    } else if (isSubjectTeacher) {
      // Subject Teacher Only
      teacherMenu = [
        {
          name: 'Home',
          icon: <FaHome />,
          path: '/home_subject_teacher',
        },
        {
          name: 'Upload Grades ',
          icon: <FaUpload />,
          path: '/upload_grades_subject_teacher',
        },
      ];
    }
  }

  // Final menu based on role
  let menuItems =
    role === 'Admin'
      ? roleMenus.Admin
      : role === 'Admin'
      ? roleMenus.Admin
      : teacherMenu;

  const toggleSubmenu = (name) =>
    setOpenSubmenu((prev) => ({ ...prev, [name]: !prev[name] }));

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:sticky top-0 left-0 h-screen bg-base-100 border-r border-base-200 flex flex-col transition-all duration-500 ease-in-out shadow-lg z-50
    ${collapsed && !hovered ? 'w-20' : 'w-64'}
    ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
    ${isModalOpen ? 'lg:z-0' : 'lg:z-50'}
  `}
        onMouseEnter={() => {
          if (window.innerWidth >= 1024) setHovered(true);
        }}
        onMouseLeave={() => setHovered(false)}
      >
        {/* Logo */}
        <div className="bg-primary  flex items-center justify-center h-16 border-b border-base-200">
          {collapsed && !hovered ? (
            <System_Logo className="w-5 h-5" />
          ) : (
            <div className="flex items-center gap-2">
              <System_Logo className="w-5 h-5" />
              <span className="text-lg font-extrabold text-white tracking-wide">
                Consoli<span className="text-yellow-400">Grade</span>
              </span>
            </div>
          )}
        </div>

        {/* Menu */}
        <nav className="flex-1 px-1 py-4 ">
          <ul className="space-y-2">
            {menuItems.map((item, idx) => {
              const tooltipText =
                collapsed && item.name === 'Settings'
                  ? 'Please expand to view Settings'
                  : item.name;

              // Check if active
              const isActive = item.path === location.pathname;

              return (
                <li key={idx} className="relative">
                  <Tooltip
                    text={tooltipText}
                    show={hoveredIndex === idx && collapsed && !hovered}
                  >
                    <div className="flex flex-col w-full rounded-lg transition-colors text-xs">
                      {/* Parent Row */}
                      <div
                        onMouseEnter={() => setHoveredIndex(idx)}
                        onMouseLeave={() => setHoveredIndex(null)}
                        className={`flex rounded-md w-full py-3 px-4 items-center justify-between cursor-pointer transition-colors
              ${isActive ? 'bg-primary text-white' : ''}
              ${hoveredIndex === idx ? 'bg-primary/80 text-white' : ''}
              ${collapsed && !hovered ? 'justify-center' : 'justify-between gap-3'}
            `}
                        onClick={() => item.submenu && toggleSubmenu(item.name)}
                      >
                        {item.path && !item.submenu ? (
                          <Link
                            to={item.path}
                            className="flex items-center gap-3 w-full"
                            onClick={() => {
                              // Always close sidebar on mobile, even if same route
                              if (window.innerWidth < 1024) {
                                onCloseMobile();
                              }
                            }}
                          >
                            <span className="text-lg">{item.icon}</span>
                            {!(collapsed && !hovered) && (
                              <span className="text-sm font-medium">
                                {String(item.name)}
                              </span>
                            )}
                          </Link>
                        ) : (
                          <div className="flex items-center gap-3 w-full">
                            <span className="text-lg">{item.icon}</span>
                            {!(collapsed && !hovered) && (
                              <span className="text-sm font-medium">
                                {item.name}
                              </span>
                            )}
                          </div>
                        )}

                        {!(collapsed && !hovered) && item.submenu && (
                          <span
                            className={`transition-transform duration-500 ease-in-out ${
                              openSubmenu[item.name] ? 'rotate-180' : ''
                            }`}
                          >
                            <FaChevronDown />
                          </span>
                        )}
                      </div>

                      {/* Submenu */}
                      {!(collapsed && !hovered) && item.submenu && openSubmenu[item.name] && (
                        <ul className="pl-10 space-y-1">
                          {item.submenu.map((sub, subIdx) => {
                            const isSubActive = sub.path === location.pathname;
                            return (
                              <li
                                key={subIdx}
                                onMouseEnter={() =>
                                  setHoveredSubIndex((prev) => ({
                                    ...prev,
                                    [item.name]: subIdx,
                                  }))
                                }
                                onMouseLeave={() =>
                                  setHoveredSubIndex((prev) => ({
                                    ...prev,
                                    [item.name]: null,
                                  }))
                                }
                                className={`flex items-center gap-2 py-2 px-2 rounded cursor-pointer transition-colors
                      ${isSubActive ? 'bg-primary text-white' : ''}
                      ${
                        hoveredSubIndex[item.name] === subIdx
                          ? 'bg-primary/80 text-white'
                          : ''
                      }
                    `}
                              >
                                {sub.path ? (
                                  <Link
                                    to={sub.path}
                                    className="flex items-center gap-2 w-full"
                                    onClick={() => {
                                      // Close the submenu
                                      setOpenSubmenu((prev) => ({
                                        ...prev,
                                        [item.name]: false,
                                      }));

                                      // Always close sidebar on mobile
                                      if (window.innerWidth < 1024) {
                                        onCloseMobile();
                                      }
                                    }}
                                  >
                                    <span className="text-lg">{sub.icon}</span>
                                    <span className="text-sm">{sub.name}</span>
                                  </Link>
                                ) : (
                                  <>
                                    <span className="text-lg">{sub.icon}</span>
                                    <span className="text-sm">{sub.name}</span>
                                  </>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </Tooltip>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </>
  );
}
