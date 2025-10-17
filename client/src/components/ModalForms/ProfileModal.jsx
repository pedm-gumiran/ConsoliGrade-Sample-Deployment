import React, { useEffect } from 'react';
import { useUser } from '../../context/UserContext';
import useHandledSection from '../../context/crud_hooks/fetch/useHandledSection';
import useHandledSubjects from '../../context/crud_hooks/fetch/useHandledSubjects';
import Btn_X from '../Buttons/Btn_X';

export default function ProfileModal({ isOpen, onClose }) {
  const { user } = useUser(); // dynamic logged-in user

  // Fetch teacher data if user is a teacher
  const { sections: handledSections, } =
    useHandledSection(user);
  const {
    subjects: handledSubjects,

  } = useHandledSubjects(user);

  // Determine if teacher is adviser or subject teacher
  const isAdviser = handledSections.length > 0;
  const isSubjectTeacher = handledSubjects.length > 0;

  // Prevent body scroll when modal is isopen
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'; // disable scroll
    } else {
      document.body.style.overflow = ''; // enable scroll
    }

    // Clean up when component unmounts
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const getInitials = (firstName = '', lastName = '') => {
    if (!firstName && !lastName) return 'U';
    return `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose}></div>

      {/* Modal Content */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] z-10 mx-4 sm:mx-0 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shadow-sm border-gray-200 sticky top-0 bg-white z-10 rounded-t-2xl">
          <h2 className="text-lg font-semibold">Profile</h2>
          <Btn_X onClick={onClose} />
        </div>

        {/* Scrollable Details */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Profile Picture */}
          <div className="flex flex-col items-center mb-6">
            {user?.profilePicture ? (
              <img
                src={user.profilePicture}
                alt="Profile"
                className="w-20 h-20 rounded-full border border-gray-200 shadow-sm"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-gray-600 text-white flex items-center justify-center text-2xl font-bold">
                {getInitials(user?.first_name, user?.last_name)}
              </div>
            )}
          </div>

          {/* User Details */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">
                First Name
              </label>
              <div className="text-gray-900">{user?.first_name || '-'}</div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">
                Last Name
              </label>
              <div className="text-gray-900">{user?.last_name || '-'}</div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Email</label>
              <div className="text-gray-900">{user?.email || '-'}</div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-600">Role</label>
              <div className="text-gray-900">{user?.role || 'Guest'}</div>
            </div>

            {/* Teacher-specific roles */}
            {user?.role === 'Teacher' && (isAdviser || isSubjectTeacher) && (
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Teacher Type
                </label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {isAdviser && (
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
                      Adviser
                    </span>
                  )}
                  {isSubjectTeacher && (
                    <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                      Subject Teacher
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Show advised sections */}
            {isAdviser && handledSections.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Advised Section{handledSections.length > 1 ? 's' : ''}
                </label>
                <div className="text-gray-900">
                  {handledSections
                    .map((s) => `${s.grade_level} - ${s.section_name}`)
                    .join(', ')}
                </div>
              </div>
            )}

            {/* Show handled subjects */}
            {isSubjectTeacher && handledSubjects.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-600">
                  Handled Subjects ({handledSubjects.length})
                </label>
                <div className="text-gray-900 max-h-32 overflow-y-auto">
                  <ul className="list-disc list-inside space-y-1">
                    {handledSubjects.slice(0, 5).map((subject, idx) => (
                      <li key={idx} className="text-sm">
                        {subject.subject_name} - {subject.section_name}
                      </li>
                    ))}
                    {handledSubjects.length > 5 && (
                      <li className="text-sm text-blue-600 font-medium">
                        +{handledSubjects.length - 5} more
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            )}


          </div>
        </div>
      </div>
    </div>
  );
}
