import React from 'react';
import {
  FaUsers,
  FaHandPaper,
  FaBook,
  FaThLarge,
  FaGraduationCap,
  FaCalendarCheck,
} from 'react-icons/fa';
import { useUser } from '../../../context/UserContext';
import useStudents from '../../../context/crud_hooks/fetch/useStudents';
import useUsers from '../../../context/crud_hooks/fetch/useUsers';
import useSections from '../../../context/crud_hooks/fetch/useSection';
import useSubjects from '../../../context/crud_hooks/fetch/useSubjects';
import useActiveSchoolYear from '../../../context/crud_hooks/fetch/useActiveSchoolYear';
import SchoolYearManagement from '../../../components/Tables/SchoolYearManagement';
import DashboardCard from '../../../components/Cards/DashboardCard';

export default function Home_Admin() {
  const { totalCount, loading: s_loading, error: s_error } = useStudents();
  const {
    totalCount: userTotalCount,
    loading: u_loading,
    error: u_error,
  } = useUsers();
  const {
    totalCount: sectionTotalCount,
    loading: se_loading,
    error: se_error,
  } = useSections();
  const {
    totalCount: subjectTotalCount,
    loading: su_loading,
    error: su_error,
  } = useSubjects();
  const {
    schoolYear,
    loading: sy_loading,
    error: sy_error,
  } = useActiveSchoolYear();
  const { user } = useUser();

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 flex flex-col min-w-0">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 min-w-0">
        {/* Welcome Card */}
        <div className="bg-yellow-100 p-4 sm:p-6 rounded-xl shadow-md flex items-center justify-between">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-800">
              Welcome, {user.first_name || 'Admin'}!
            </h2>
            <p className="text-gray-600 text-sm mt-1">
              Here’s an overview of your school data.
            </p>
          </div>
          <FaHandPaper className="text-yellow-500 text-4xl animate-wave" />
        </div>

        {/* Current School Year */}
        <DashboardCard
          title="Current School Year"
          count={schoolYear?.school_year || 'No active school year'}
          icon={FaCalendarCheck}
          color="cyan"
          loading={sy_loading}
          error={sy_error}
        />

        {/* Total Users */}
        <DashboardCard
          title="Total Users"
          count={userTotalCount}
          icon={FaUsers}
          color="blue"
          loading={u_loading}
          error={u_error}
          link="/manage_users_admin"
        />

        {/* Total Students */}
        <DashboardCard
          title="Total Students"
          count={totalCount}
          icon={FaGraduationCap}
          color="green"
          loading={s_loading}
          error={s_error}
          link="/manage_students_admin"
        />

        {/* Total Sections */}
        <DashboardCard
          title="Total Sections"
          count={sectionTotalCount}
          icon={FaThLarge}
          color="orange"
          loading={se_loading}
          error={se_error}
          link="/manage_sections_admin"
        />

        {/* Total Subjects */}
        <DashboardCard
          title="Total Subjects"
          count={subjectTotalCount}
          icon={FaBook}
          color="purple"
          loading={su_loading}
          error={su_error}
          link="/manage_subjects_admin"
        />
      </div>

      {/* School Year Management Table */}
      <div >
        <SchoolYearManagement />
      </div>
    </div>
  );
}
