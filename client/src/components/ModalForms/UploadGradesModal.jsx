import React, { useState } from 'react';
import { FaInfoCircle, FaUpload } from 'react-icons/fa';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import Dropdown from '../InputFields/Dropdown';
import Button from '../Buttons/Button';
import DataTable from '../Tables/DataTable';
import { toast } from 'react-toastify';
import ExcelJS from 'exceljs';
import { supabase } from '../../supabaseClient';

export default function UploadGradesModal({
  isOpen,
  onClose,
  onSubmit,
  handledSubjects = [],
  schoolYear,
}) {
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [selectedQuarter, setSelectedQuarter] = useState('');
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [previewData, setPreviewData] = useState([]);
  const [error, setError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [hasInvalidStudents, setHasInvalidStudents] = useState(false);

  const requiredColumns = ['LRN', 'Grade'];

  const validateColumns = (headers) => {
    const normalizedHeaders = headers.map((h) => h.toLowerCase());
    const missing = requiredColumns.filter(
      (col) => !normalizedHeaders.includes(col.toLowerCase()),
    );
    if (missing.length > 0) {
      setError(
        `The uploaded file is missing the following required columns: ${missing.join(
          ', ',
        )}`,
      );
      setPreviewData([]);
      return false;
    }
    setError('');
    return true;
  };

  const handleFileUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setFileName(uploadedFile.name);
    setHasInvalidStudents(false); // Reset invalid students flag
    setError(''); // Clear any previous errors

    // Parse Excel file
    try {
      const workbook = new ExcelJS.Workbook();
      const buffer = await uploadedFile.arrayBuffer();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.getWorksheet(1);

      // Get headers from first row
      const headers = worksheet
        .getRow(1)
        .values.slice(1)
        .map((cell) => String(cell || '').trim());

      // Validate columns
      if (!validateColumns(headers)) return;

      const jsonData = [];
      worksheet.eachRow((row, rowIndex) => {
        if (rowIndex > 1) {
          // Skip header row
          const rowData = {};
          headers.forEach((header, idx) => {
            const key =
              header === 'LRN'
                ? header
                : header.charAt(0).toUpperCase() +
                  header.slice(1).toLowerCase();
            const cellValue = row.getCell(idx + 1).value;
            rowData[key] =
              key === 'LRN' ? String(cellValue || '').trim() : cellValue;
          });
          jsonData.push(rowData);
        }
      });

      // Validate that LRN is not empty (primary key validation)
      const invalidRows = jsonData.filter((row) => !row.LRN);
      if (invalidRows.length > 0) {
        setError(
          `Found ${invalidRows.length} row(s) with missing LRN. LRN is required as it is the primary key.`,
        );
        setPreviewData([]);
        return;
      }

      // Fetch student names based on LRN
      const lrns = jsonData
        .map((row) => String(row.LRN || '').trim())
        .filter(Boolean);
      if (lrns.length > 0) {
        const { data: students, error: fetchError } = await supabase
          .from('student_info')
          .select('lrn, first_name, last_name, middle_name, suffix')
          .in('lrn', lrns);

        if (fetchError) {
          setError('Error fetching student data.');
          setPreviewData([]);
          return;
        }

        const studentMap = new Map(
          students.map((s) => [String(s.lrn || '').trim(), s]),
        );

        // Fill names
        jsonData.forEach((row) => {
          const lrnKey = String(row.LRN || '').trim();
          if (lrnKey && studentMap.has(lrnKey)) {
            const student = studentMap.get(lrnKey);
            row.Name = `${student.last_name || ''}, ${
              student.first_name || ''
            } ${student.middle_name || ''} ${student.suffix || ''}`.trim();
          } else {
            row.Name = 'Not Found';
          }
        });

        // Check for invalid students (those not found in database)
        const invalidStudents = jsonData.filter(
          (row) => row.Name === 'Not Found',
        );
        setHasInvalidStudents(invalidStudents.length > 0);

        if (invalidStudents.length > 0) {
          setError(
            `Found ${
              invalidStudents.length
            } student(s) not registered in the system. Please check LRNs: ${invalidStudents
              .map((r) => r.LRN)
              .join(', ')}`,
          );
        }
      }

      // Validate grades
      const invalidGrades = jsonData.filter((row) => {
        const grade = parseFloat(row.Grade);
        return (
          isNaN(grade) || grade < 0 || grade > 100 || !Number.isInteger(grade)
        );
      });
      if (invalidGrades.length > 0) {
        setError(
          `Found ${
            invalidGrades.length
          } row(s) with invalid grades (must be integers 0-100). LRNs: ${invalidGrades
            .map((r) => r.LRN)
            .join(', ')}`,
        );
        setPreviewData([]);
        return;
      }

      setPreviewData(jsonData);
    } catch (error) {
      console.error('Error reading file:', error);
      setError('Error reading file. Please check the format.');
    }
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!selectedSubject || !selectedQuarter || !file) {
      toast.error('Please complete all fields before submitting.');
      return;
    }

    setIsUploading(true);
    try {
      // Call the onSubmit callback with the data
      const success = await onSubmit({
        subject: selectedSubject?.subject || null,
        quarter: selectedQuarter,
        file: file,
        data: previewData,
      });

      if (success) {
        // Reset form
        setFile(null);
        setFileName('');
        setPreviewData([]);
        setSelectedSubject(null);
        setSelectedQuarter('');
        onClose();
      }
    } catch (error) {
      console.error('Error uploading grades:', error);
      setError(
        `Upload failed: ${error.response?.data?.message || error.message}`,
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Grades Template');

    // Add headers
    sheet.addRow(['LRN', 'Grade']);

    // Style headers
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true };
      cell.alignment = { horizontal: 'center' };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9EAF7' },
      };
    });

    // Auto-fit columns - dynamically calculate width for each column
    ['LRN', 'Grade'].forEach((col, index) => {
      const column = sheet.getColumn(index + 1);
      // Calculate width based on header length + padding
      column.width = Math.max(col.length + 2, 12);
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const schoolYearSuffix = schoolYear?.school_year
      ? `_${schoolYear.school_year}`
      : '';
    link.download = `Upload_Grades_Template${schoolYearSuffix}.xlsx`;
    link.click();
  };

  const handleClose = () => {
    if (!isUploading) {
      setFile(null);
      setFileName('');
      setPreviewData([]);
      setError('');
      setSelectedSubject('');
      setSelectedQuarter('');
      onClose();
    }
  };

  if (!isOpen) return null;

  // Preview columns
  const previewColumns = previewData[0]
    ? Object.keys(previewData[0]).map((key) => ({ key, label: key }))
    : [];

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-base-200 bg-opacity-50 z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl z-20 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2">
                <FaUpload className="text-blue-600" />
                Upload Grades
              </h2>
              <p className="text-gray-600 text-xs md:text-sm mt-1">
                Upload student grades using Excel/CSV file
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full text-blue-600 text-xl">
              <FaInfoCircle />
            </div>
          </div>
        </div>

        {/* Content */}
        <form
          onSubmit={handleSubmitForm}
          className="p-6 space-y-6 relative z-0"
        >
          {/* Subject & Quarter */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Dropdown
              label="Select Subject"
              value={selectedSubject?.value || ''}
              onChange={(e) => {
                const value = e.target.value;
                const subject = handledSubjects.find(
                  (item) =>
                    String(item.subject_id ?? item.teacher_subject_id ?? '') ===
                    value,
                );
                setSelectedSubject(
                  subject
                    ? {
                        value,
                        label: `${subject.subject_name} - ${subject.grade_level} ${subject.section_name}`,
                        subject,
                      }
                    : null,
                );
              }}
              placeholder="-- Choose Subject --"
              options={handledSubjects.map((item) => ({
                value: String(item.subject_id ?? item.teacher_subject_id ?? ''),
                label: `${item.subject_name} - ${item.grade_level} ${item.section_name}`,
              }))}
            />
            <Dropdown
              label="Select Quarter"
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(e.target.value)}
              placeholder="-- Choose Quarter --"
              options={[
                { value: '1st Quarter', label: '1st Quarter' },
                { value: '2nd Quarter', label: '2nd Quarter' },
                { value: '3rd Quarter', label: '3rd Quarter' },
                { value: '4th Quarter', label: '4th Quarter' },
              ]}
            />
          </div>

          {/* File Upload */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition relative">
            <p className="text-gray-600 font-medium mb-1">
              Drag & Drop your Excel file here
            </p>
            <p className="text-gray-400 text-sm">
              or click to select a file (Supports .xlsx, .xls)
            </p>
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileUpload}
              className="absolute w-full h-full opacity-0 cursor-pointer"
              disabled={!selectedSubject || !selectedQuarter}
            />
            {fileName && (
              <div className="mt-3 text-blue-600 font-medium overflow-hidden text-ellipsis whitespace-nowrap max-w-full">
                ✓ Selected: {fileName}
              </div>
            )}
          </div>

          {/* Error Alert */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Template Download */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="font-semibold text-gray-700">
                📌 Excel Template Available
              </h3>
              <p className="text-xs sm:text-sm text-gray-500">
                Download the template and fill it with student LRN and Grade.
                Name will be auto-filled based on LRN.
              </p>
            </div>
            <Button
              label="Download Template"
              onClick={handleDownloadTemplate}
              type="button"
              className="btn-outline btn-primary text-xs border-primary hover:text-white"
            />
          </div>

          {/* Preview Table */}
          {previewData.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                <DataTable
                  columns={previewColumns}
                  data={previewData}
                  keyField={previewColumns[0]?.key || 'LRN'}
                  selectable={false}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              label="Cancel"
              onClick={handleClose}
              type="button"
              className="border border-gray-300 hover:bg-gray-100 bg-transparent text-gray-600"
              disabled={isUploading}
            />
            <Button
              label={isUploading ? 'Uploading...' : 'Submit Grades'}
              type="submit"
              className="btn-primary text-white"
              icon={
                isUploading ? (
                  <AiOutlineLoading3Quarters className="animate-spin" />
                ) : null
              }
              isLoading={isUploading}
              disabled={
                isUploading ||
                !selectedSubject ||
                !selectedQuarter ||
                !file ||
                !!error ||
                hasInvalidStudents
              }
            />
          </div>
        </form>
      </div>
    </div>
  );
}
