import React, { useEffect, useState } from 'react';
import Btn_X from '../Buttons/Btn_X';
import Button from '../Buttons/Button';
import { toast } from 'react-toastify';
import { formatDate } from '../../components/utility/dateFormatter.js';
import { FaRegCopy } from 'react-icons/fa6';

export default function SummaryModal({
  isOpen,
  onClose,
  title = 'Account Summary',
  data = {},
  fields = [],
  hiddenKeys = [],
  countdownSeconds = 40,
}) {
  const [countdown, setCountdown] = useState(countdownSeconds);

  // -------------------Handle body scroll-------------------
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

  // -------------------Handle countdown-------------------
  // -------------------Handle countdown safely-------------------
  useEffect(() => {
    if (!isOpen) return;

    setCountdown(countdownSeconds);

    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, countdownSeconds]);

  //  Separate effect to close modal when countdown hits 0
  useEffect(() => {
    if (isOpen && countdown === 0) {
      onClose();
    }
  }, [countdown, isOpen, onClose]);

  if (!isOpen || !data || Object.keys(data).length === 0) return null;

  // -------------------Determine fields to show-------------------
  const fieldsToShow =
    fields.length > 0
      ? fields
      : Object.keys(data).map((key) => ({
          key,
          label: formatLabel(key),
          value: data[key],
          hidden: hiddenKeys.includes(key),
        }));

  // -------------------Helpers-------------------
  function formatLabel(key) {
    if (key.toLowerCase() === 'lrn') return 'LRN';
    return key
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  function isDateField(key) {
    const lowerKey = key.toLowerCase();
    return (
      lowerKey.includes('date') ||
      lowerKey.includes('time') ||
      lowerKey.includes('created') ||
      lowerKey.includes('updated') ||
      lowerKey.endsWith('_at')
    );
  }

  // -------------------Copy details-------------------
  const handleCopy = () => {
    const textToCopy = fieldsToShow
      .filter((f) => !f.hidden)
      .map((f) => `${f.label}: ${data[f.key] ?? 'Not provided'}`)
      .join('\n');

    navigator.clipboard.writeText(textToCopy);
    toast.success('Successfully copied to clipboard!');
  };

  const progressPercent = (countdown / countdownSeconds) * 100;

  // -------------------Render-------------------
  return (
    <div className="fixed inset-0 bg-base-200 bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sticky top-0 bg-white rounded-t-2xl border-b border-gray-200 shadow-sm">
          <h2 className="text-xl font-bold">{title}</h2>
          <Btn_X onClick={onClose} />
        </div>

        {/* Countdown Bar */}
        <div className="h-2 bg-gray-200 w-full">
          <div
            className="h-2 bg-green-500 transition-all duration-1000 rounded-r-lg"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          <p className="text-sm text-gray-500 mb-4 text-center">
            This summary will close automatically in{' '}
            <span className="font-semibold text-gray-700">{countdown}</span>{' '}
            seconds.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fieldsToShow.map((field, index) => {
              if (field.hidden) return null;

              const value =
                field.value !== undefined ? field.value : data[field.key];

              return (
                <div
                  key={index}
                  className={`${field.fullWidth ? 'md:col-span-2' : ''}`}
                >
                  <label className="text-sm font-medium text-gray-600 block mb-1">
                    {field.label}
                  </label>
                  <div className="text-gray-900">
                    {value !== null && value !== undefined && value !== '' ? (
                      isDateField(field.key) ? (
                        formatDate(value)
                      ) : (
                        String(value)
                      )
                    ) : (
                      <span className="text-gray-400 italic">Not provided</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-col sm:flex-row justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <Button
            icon={<FaRegCopy className="mr-2" />}
            label="Copy Details"
            onClick={handleCopy}
            className="w-full sm:w-auto"
          />
        </div>
      </div>
    </div>
  );
}
