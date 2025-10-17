import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../Buttons/Button';

export default function DashboardCard({
  title,
  count,
  icon: Icon,
  color = 'blue',
  loading = false,
  error = false,
  link,
  onButtonClick,
  buttonLabel = 'View Details',
}) {
  // Color palette
  const colors = {
    blue: { bg: 'bg-blue-100', iconBg: 'bg-blue-500' },
    green: { bg: 'bg-green-100', iconBg: 'bg-green-500' },
    yellow: { bg: 'bg-yellow-100', iconBg: 'bg-yellow-500' },
    purple: { bg: 'bg-purple-100', iconBg: 'bg-purple-500' },
    cyan: { bg: 'bg-cyan-100', iconBg: 'bg-cyan-500' },
    red: { bg: 'bg-red-100', iconBg: 'bg-red-500' },
    gray: { bg: 'bg-gray-100', iconBg: 'bg-gray-500' },
  };

  const c = colors[color] || colors.blue;

  //  handle button behavior (modal first, else redirect)
  const handleClick = (e) => {
    if (onButtonClick) {
      e.preventDefault(); // prevent navigation if modal is used
      onButtonClick();
    }
  };

  return (
    <div
      className={`${c.bg} p-4 sm:p-6 rounded-xl shadow-md flex flex-col justify-between transition hover:shadow-lg duration-200`}
    >
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm uppercase tracking-wide mb-1">
            {title}
          </p>

          {loading ? (
            <div className="flex items-center gap-2 mt-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-b-transparent border-gray-400"></div>
              <span className="text-gray-600 text-sm">Loading...</span>
            </div>
          ) : error ? (
            <p className="text-red-500 text-sm mt-1">Error loading data</p>
          ) : (
            <h3 className="text-2xl font-semibold text-gray-800 mt-1">
              {count ?? 0}
            </h3>
          )}
        </div>

        {Icon && (
          <div className={`${c.iconBg} p-3 rounded-full text-white text-3xl`}>
            <Icon />
          </div>
        )}
      </div>

      {(link || onButtonClick) && (
        <div className="mt-3">
          {link ? (
            <Link to={link} onClick={handleClick}>
              <Button
                label={buttonLabel}
                className={`btn-primary btn-outline text-xs hover:text-white ${c.border}`}
              />
            </Link>
          ) : (
            <Button
              label={buttonLabel}
              onClick={onButtonClick}
              className={`btn-primary btn-outline text-xs hover:text-white ${c.border}`}
            />
          )}
        </div>
      )}
    </div>
  );
}
