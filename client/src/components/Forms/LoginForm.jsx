import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Input_Text from '../InputFields/Input_Text';
import Input_Password from '../InputFields/Input_Password';
import Button from '../Buttons/Button';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

import { signInUser } from '../../context/supabase_auth/sup_LogIn.js';
import { supabase } from '../../supabaseClient';
import { useUser } from '../../context/UserContext';

export default function LoginForm() {
  const navigate = useNavigate();

  const { setUser } = useUser();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Sign in via Supabase Auth
      const authUser = await signInUser(formData.email, formData.password);
      if (!authUser) {
        return;
      }

      // 2. Fetch user info (including role) from users table
      const { data: userRows, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('email', authUser.email) // make sure user_id matches the primary key
        .single(); // fetch single row

      if (userError || !userRows) {
        toast.error('Failed to fetch user info.');
        return;
      }

      //  check the status of the user
      if (userRows.status?.toLowerCase() === 'inactive') {
        toast.error(
          'Your account is currently inactive. Please contact  the designated personnel.',
        );
        // Optional: Sign them out from Supabase Auth to ensure no session remains
        await supabase.auth.signOut();
        return; // Stop here – don’t let them proceed
      }

      toast.success(`Login Successful !`);
      const userRole = userRows.role; // fetch role from users table

      // 4. Fetch role-based flags
      const { data: subjectRows } = await supabase
        .from('teacher_subjects')
        .select('subject_id')
        .eq('teacher_id', userRows.user_id);

      const { data: adviserRows } = await supabase
        .from('section_advisers')
        .select('section_id')
        .eq('teacher_id', userRows.user_id);

      const isSubjectTeacher = subjectRows && subjectRows.length > 0;
      const isAdviser = adviserRows && adviserRows.length > 0;

      // Fetch section details if adviser
      let advisedSections = [];
      if (isAdviser && adviserRows) {
        const sectionIds = adviserRows.map((r) => r.section_id);
        const { data: sections } = await supabase
          .from('sections')
          .select('section_name')
          .in('section_id', sectionIds);
        advisedSections = sections ? sections.map((s) => s.section_name) : [];
      }

      const fullUser = {
        ...authUser,
        ...userRows,
        role: userRole,
        isSubjectTeacher,
        isAdviser,
        advisedSections,
      };
      console.log('Logged in user:', fullUser);

      // 4. Save to localStorage and context
      localStorage.setItem('user', JSON.stringify(fullUser));
      setUser(fullUser);

      // 5. Navigate based on role
      const userRoleNormalized = userRole?.toLowerCase();

      if (userRoleNormalized === 'admin') navigate('/home_admin');
      else if (userRoleNormalized === 'teacher') {
        if (isAdviser && isSubjectTeacher) navigate('/combined_home');
        else if (isAdviser) navigate('/home_adviser');
        else if (isSubjectTeacher) navigate('/home_subject_teacher');
        else toast.error('No assigned dashboard for this teacher');
      }
      console.log({
        userRole,
        userRoleNormalized,
        isAdviser,
        isSubjectTeacher,
      });
    } catch (error) {
      toast.error(`Unexpected login error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = formData.email.trim() && formData.password;

  return (
    <section className="md:w-1/2 flex items-center justify-center px-4 py-8 sm:px-6 md:px-10 border border-gray-300">
      <div className="w-full max-w-sm">
        <header className="text-center mb-8">
          <h2 className="text-xl md:text-2xl font-semibold text-neutral">
            Welcome
          </h2>
          <p className="text-sm text-gray-500">
            Please log in to access your account
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input_Text
            label="Email"
            id="email"
            name="email"
            placeholder="Please enter your email"
            required
            type="email"
            value={formData.email}
            onChange={handleChange}
            className="font-semibold"
            text_ClassName={loading ? 'opacity-50 cursor-not-allowed' : ''}
            disabled={loading}
          />

          <Input_Password
            label="Password"
            id="password"
            name="password"
            placeholder="Please enter your password"
            required
            value={formData.password}
            onChange={handleChange}
            className="font-semibold"
            password_className={loading ? 'opacity-50 cursor-not-allowed' : ''}
            disabled={loading}
          />
          {/*  Forgot Password link */}
          <div className="text-right -mt-4 ">
            <Link
              to="/forgot-password"
              className="text-sm text-blue-500 hover:underline font-medium"
            >
              Forgot Password?
            </Link>
          </div>

          <Button
            label={'Log In'}
            isLoading={loading}
            loadingText="Logging in ....Please wait .........."
            type="submit"
            className={`btn-primary w-full text-white ${
              !isFormValid || loading ? 'opacity-70 cursor-not-allowed' : ''
            }`}
            disabled={!isFormValid || loading}
          />
        </form>
      </div>
    </section>
  );
}
