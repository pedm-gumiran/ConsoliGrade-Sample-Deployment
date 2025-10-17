import React, { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../DashboardComponents/Sidebar';
import Navbar from '../DashboardComponents/Navbar';

const Layout = () => {
  const location = useLocation();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loginPath = ['/login', '/', '/forgot-password', '/reset-password']; // Define login paths
  const isLoginPage = loginPath.includes(location.pathname);

  useEffect(() => {
    setIsMobileSidebarOpen(false);
  }, [location.pathname]);

  const toggleMobileSidebar = () =>
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  const closeMobileSidebar = () => setIsMobileSidebarOpen(false);

  // LABEL Path → Menu name mapping
  const pathToMenu = {
    //  Admin Routes
    '/home_admin': 'Home',
    '/manage_users_admin': 'Users',
    '/manage_roles_admin': 'Roles',
    '/manage_students_admin': 'Students',
    '/manage_subjects_admin': 'Subjects',
    '/manage_sections_admin': 'Sections',
    '/manage_audit_admin': 'Audit Trail',
    '/backup_restore_admin': 'Backup & Restore',
    '/manage_grades_admin': 'Grades', // Added missing grades page

    //  Subject Teacher Routes
    '/home_subject_teacher': 'Home',
    '/upload_grades_subject_teacher': 'Upload Grades',

    //  Adviser Routes
    '/home_adviser': 'Home',
    '/consolidated_grades_adviser': 'Consolidated Grades',

    //Combined Teacher Routes
    '/combined_home': 'Home',
  };

  const activeMenu = pathToMenu[location.pathname] || 'Dashboard';

  if (isLoginPage) {
    // Special layout for login page → full screen center
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Outlet />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        isModalOpen={isModalOpen}
        onCloseMobile={closeMobileSidebar}
        activeMenu={location.pathname} // LABEL still pass path for highlighting
      />

      {/* Navbar + Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <Navbar
          toggleMobileSidebar={toggleMobileSidebar}
          activeMenu={activeMenu} // LABEL pass readable menu name
          setIsModalOpen={setIsModalOpen}
        />

        <main className="flex-1 overflow-y-auto px-1 min-w-0">
          <Outlet
            context={{
              toggleMobileSidebar,
              isMobileSidebarOpen,
            }}
          />
        </main>
      </div>
    </div>
  );
};

export default Layout;
