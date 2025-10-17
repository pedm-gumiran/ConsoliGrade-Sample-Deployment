import React, { Suspense } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from 'react-router-dom';
import { ToastContainer, Slide } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import Layout from './components/Layouting/Layout.jsx';
import PrivateRoute from './components/Layouting/PrivateRoute.jsx';
import { UserProvider } from './context/UserContext.jsx';

// Lazy load Page
import LoginPage from './pages/LogIn/LogInPage';
import ForgotPasswordPage from './pages/LogIn/ForgotPasswordPage.jsx';
import ResetPasswordPage from './pages/LogIn/ResetPasswordPage.jsx';
const NotFound = React.lazy(() => import('./pages/FallbackPage/NotFound.jsx'));

// Admin Pages
const Home_Admin = React.lazy(() =>
  import('./pages/Dashboards/Admin/Home.jsx'),
);
const ManageUsers_Admin = React.lazy(() =>
  import('./pages/Dashboards/Admin/Manage_Users.jsx'),
);

const Manage_Section_Admin = React.lazy(() =>
  import('./pages/Dashboards/Admin/Manage_Sections.jsx'),
);
const Manage_Student_Admin = React.lazy(() =>
  import('./pages/Dashboards/Admin/Manage_Students.jsx'),
);
const Manage_Subject_Admin = React.lazy(() =>
  import('./pages/Dashboards/Admin/Manage_Subjects.jsx'),
);
const ManageAudit_Admin = React.lazy(() =>
  import('./pages/Dashboards/Admin/Manage_Audit.jsx'),
);
const Backup_Restore_Admin = React.lazy(() =>
  import('./pages/Dashboards/Admin/Backup_Restore.jsx'),
);
const Manage_Grades_Admin = React.lazy(() =>
  import('./pages/Dashboards/Admin/Manage_Grades.jsx'),
);

// Subject Teacher Pages
const Home_SubjectTeacher = React.lazy(() =>
  import('./pages/Dashboards/Subject_Teacher/Home.jsx'),
);
const UploadGrades_SubjectTeacher = React.lazy(() =>
  import('./pages/Dashboards/Subject_Teacher/Upload_Grades.jsx'),
);

// Adviser Pages
const Home_Adviser = React.lazy(() =>
  import('./pages/Dashboards/Adviser/Home.jsx'),
);
const ConsolidatedGrades_Adviser = React.lazy(() =>
  import('./pages/Dashboards/Adviser/Consolidated_Grade.jsx'),
);
//Combined Teacher Pages
const Home_CombinedTeacher = React.lazy(() =>
  import('./pages/Dashboards/Combined_Teacher/Home.jsx'),
);

// Simple loading spinner
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
  </div>
);

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        path: '/',
        element: <Navigate to="/login" replace />,
      },
      {
        path: 'login',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <LoginPage />
          </Suspense>
        ),
      },
      {
        path: 'forgot-password',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <ForgotPasswordPage />
          </Suspense>
        ),
      },
      {
        path: 'reset-password',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <ResetPasswordPage />
          </Suspense>
        ),
      },

      // Admin Routes
      {
        path: 'home_admin',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <PrivateRoute>
              <Home_Admin />
            </PrivateRoute>
          </Suspense>
        ),
      },
      {
        path: 'manage_users_admin',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <PrivateRoute>
              <ManageUsers_Admin />
            </PrivateRoute>
          </Suspense>
        ),
      },

      {
        path: 'manage_students_admin',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <PrivateRoute>
              <Manage_Student_Admin />
            </PrivateRoute>
          </Suspense>
        ),
      },
      {
        path: 'manage_subjects_admin',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <PrivateRoute>
              <Manage_Subject_Admin />
            </PrivateRoute>
          </Suspense>
        ),
      },
      {
        path: 'manage_sections_admin',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <PrivateRoute>
              <Manage_Section_Admin />
            </PrivateRoute>
          </Suspense>
        ),
      },
      {
        path: 'manage_audit_admin',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <PrivateRoute>
              <ManageAudit_Admin />
            </PrivateRoute>
          </Suspense>
        ),
      },
      {
        path: 'backup_restore_admin',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <PrivateRoute>
              <Backup_Restore_Admin />
            </PrivateRoute>
          </Suspense>
        ),
      },
      {
        path: 'manage_grades_admin',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <PrivateRoute>
              <Manage_Grades_Admin />
            </PrivateRoute>
          </Suspense>
        ),
      },

      // Subject Teacher Routes
      {
        path: 'home_subject_teacher',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <PrivateRoute>
              <Home_SubjectTeacher />
            </PrivateRoute>
          </Suspense>
        ),
      },
      {
        path: 'upload_grades_subject_teacher',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <PrivateRoute>
              <UploadGrades_SubjectTeacher />
            </PrivateRoute>
          </Suspense>
        ),
      },

      // Adviser Routes
      {
        path: 'home_adviser',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <PrivateRoute>
              <Home_Adviser />
            </PrivateRoute>
          </Suspense>
        ),
      },
      {
        path: 'consolidated_grades_adviser',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <PrivateRoute>
              <ConsolidatedGrades_Adviser />
            </PrivateRoute>
          </Suspense>
        ),
      },

      //Combined Teacher Routes
      {
        path: 'combined_home',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <PrivateRoute>
              <Home_CombinedTeacher />
            </PrivateRoute>
          </Suspense>
        ),
      },
    ],
  },
  {
    path: '*',
    element: (
      <Suspense fallback={<LoadingSpinner />}>
        <NotFound />
      </Suspense>
    ),
  },
]);

export default function App() {
  return (
    <UserProvider>
      <div className="bg-background font-sans">
        <RouterProvider router={router} />

        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          pauseOnHover
          draggable={false}
          theme="light"
          transition={Slide}
          limit={3}
          rtl={false}
        />
      </div>
    </UserProvider>
  );
}
