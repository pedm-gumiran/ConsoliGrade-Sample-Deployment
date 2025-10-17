import React, { useState, useEffect } from 'react';
import Button from '../../Buttons/Button';
import Input_Text from '../../InputFields/Input_Text';
import Dropdown from '../../InputFields/Dropdown';
import Input_Password from '../../InputFields/Input_Password';
import Role_CheckBox from '../../InputFields/Role_CheckBox';
import { FaBox, FaChevronDown, FaChevronUp } from 'react-icons/fa';

export default function BulkEditModal({
  isOpen,
  onClose,
  data,
  selectedIds,
  onSave,
  config,
}) {
  const [formData, setFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [openSections, setOpenSections] = useState({});

  // Initialize form data
  useEffect(() => {
    if (!config?.fields) return;

    const initialData = {};
    const collapseState = {};
    selectedIds.forEach((id) => {
      const item = data.find((s) => s[config.keyField] === id);
      if (item) {
        const itemData = {};
        config.fields.forEach((field) => {
          itemData[field.name] = item[field.name] || field.defaultValue || '';
        });
        initialData[id] = itemData;
        collapseState[id] = false; // Default: all collapsed
      }
    });
    setFormData(initialData);
    setOpenSections(collapseState);
  }, [selectedIds, data, config]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => (document.body.style.overflow = '');
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleSection = (id) => {
    setOpenSections((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleChange = (id, field, value) => {
    const normalizedValue = value ?? '';
    setFormData((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: normalizedValue,
      },
    }));
  };

  const renderField = (field, id, value) => {
    const commonProps = {
      label: field.label,
      name: field.name,
      value,
      placeholder: field.placeholder || `Enter ${field.label}`,
      onChange: (e) => {
        const newValue = e?.target ? e.target.value : e;
        handleChange(id, field.name, newValue);
      },
      disabled: field.disabled || false,
    };

    switch (field.type) {
      case 'text':
      case 'email':
      case 'number':
        return (
          <Input_Text key={field.name} {...commonProps} type={field.type} />
        );
      case 'password':
        return (
          <Input_Password key={field.name} {...commonProps} type={field.type} />
        );
      case 'dropdown':
        return (
          <Dropdown
            key={field.name}
            {...commonProps}
            options={field.options || []}
          />
        );
      case 'checkbox':
        return (
          <Role_CheckBox
            key={field.name}
            label={field.label}
            id={`${id}-${field.name}`}
            name={field.name}
            checked={!!value}
            onChange={(e) => handleChange(id, field.name, e.target.checked)}
          />
        );
      default:
        return <Input_Text key={field.name} {...commonProps} />;
    }
  };

  const isFormValid = Object.keys(formData).length > 0;

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const success = await onSave(formData);
      if (success) onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-base-200 flex justify-center items-center z-50">
      <form
        onSubmit={handleSave}
        className="bg-white rounded-2xl shadow-lg w-full max-w-5xl max-h-[90vh] flex flex-col m-4"
      >
        {/* Header */}
        <div className="p-6 sticky top-0 bg-white rounded-t-2xl border-b border-gray-200 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-gray-800">{config.title}</h2>
            {config.subtitle && (
              <p className="text-sm text-gray-600">{config.subtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200 px-4 py-2 rounded-full text-sm font-medium shadow-sm">
            <FaBox className="text-blue-600 text-base" />
            <span>
              {selectedIds.length}{' '}
              {selectedIds.length === 1
                ? config.itemLabel || 'item'
                : config.itemLabelPlural || 'items'}{' '}
              selected
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {selectedIds.map((id) => {
            const itemData = formData[id];
            if (!itemData) return null;

            const item = data.find((d) => d[config.keyField] === id);
            const displayName = config.getDisplayName
              ? config.getDisplayName(item)
              : `${config.keyField}: ${id}`;

            const isOpen = openSections[id];

            return (
              <div
                key={id}
                className="border border-gray-200 rounded-xl shadow-sm transition-all duration-300"
              >
                {/* Collapsible Header */}
                <button
                  type="button"
                  className="w-full flex justify-between items-center p-4 font-medium text-gray-700 hover:bg-gray-50 transition"
                  onClick={() => toggleSection(id)}
                >
                  <span>{displayName}</span>
                  {isOpen ? (
                    <FaChevronUp className="text-gray-500" />
                  ) : (
                    <FaChevronDown className="text-gray-500" />
                  )}
                </button>

                {/* Smooth Collapsible Content */}
                <div
                  className={`grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 rounded-b-xl overflow-hidden transition-all duration-500 ease-in-out ${
                    isOpen
                      ? 'max-h-[1000px] opacity-100 p-4 border-t border-gray-100'
                      : 'max-h-0 opacity-0 p-0'
                  }`}
                >
                  {config.fields.map((field) =>
                    renderField(field, id, itemData[field.name]),
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-100">
          <Button
            className="border border-gray-300 hover:bg-gray-100 bg-transparent text-gray-600"
            label="Cancel"
            onClick={onClose}
            type="button"
          />
          <Button
            label={'Save'}
            type="submit"
            isLoading={isSaving}
            loadingText="Saving..."
            className="btn-primary text-white"
            disabled={!isFormValid || isSaving}
          />
        </div>
      </form>
    </div>
  );
}
