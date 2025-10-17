import React, { useEffect } from 'react';
import Btn_X from '../../components/Buttons/Btn_X';

export default function Info_Modal({
  isOpen,
  onClose,
  title = 'Information',
  items = [],
}) {
  // Disable body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-base-200 bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 sticky top-0 bg-white rounded-t-2xl border-b border-gray-200 shadow-sm">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <Btn_X onClick={onClose} />
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {items && items.length > 0 ? (
            <ul className="space-y-2">
              {items.map((item, index) => (
                <li
                  key={index}
                  className="p-3 border rounded-lg bg-gray-50 hover:bg-gray-100 transition text-gray-800 text-sm"
                >
                  {item}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 text-sm italic text-center">
              No data available.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
