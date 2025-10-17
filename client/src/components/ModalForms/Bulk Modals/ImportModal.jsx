import React, { useState } from 'react';
import * as ExcelJS from 'exceljs';
import Papa from 'papaparse';
import Button from '../../Buttons/Button';
import DataTable from '../../Tables/DataTable';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { FaFileImport, FaInfoCircle } from 'react-icons/fa';

export default function ImportModal({
  isOpen,
  onClose,
  onSave,
  title = 'Import Data',
  requiredColumns = [], // props for template
  sectionList = [],
}) {
  const [previewData, setPreviewData] = useState([]);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const validateColumns = (headers) => {
    const missing = requiredColumns.filter((col) => !headers.includes(col));
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
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);

    const ext = file.name.split('.').pop().toLowerCase();

    if (ext === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const headers = results.meta.fields || [];
          if (validateColumns(headers)) {
            setPreviewData(results.data);
          }
        },
      });
      return;
    }

    // Excel
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const worksheet = workbook.worksheets[0];

    const headers = worksheet.getRow(1).values.slice(1).map(String);
    if (!validateColumns(headers)) return;

    const rows = [];
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const rowData = {};
      headers.forEach((header, idx) => {
        rowData[header] = row.getCell(idx + 1).value;
      });
      rows.push(rowData);
    });

    setPreviewData(rows);
  };

  const handleDownloadTemplate = async () => {
    if (requiredColumns.length === 0) return;

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Template');

    // Add headers
    sheet.addRow(requiredColumns);

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

    // Auto-fit all columns - dynamically calculate width for each column
    requiredColumns.forEach((col, index) => {
      const column = sheet.getColumn(index + 1);
      // Calculate width based on header length + padding
      column.width = Math.max(col.length + 2, 12);
    });

    const sectionColIndex = requiredColumns.findIndex(
      (col) => col === 'grade_and_section',
    );

    if (sectionList.length > 0 && sectionColIndex !== -1) {
      // ExcelJS uses A1 notation for column indexing (1 for A, 2 for B, etc.)
      const colLetter = String.fromCharCode(65 + sectionColIndex); // 65 is 'A'

      // The section list must be comma-separated string for Data Validation
      const formulaString = sectionList.join(', ');

      // Apply the validation to rows 2 through 1000 (you can adjust the range)
      sheet.getColumn(sectionColIndex + 1).eachCell((cell, rowNumber) => {
        if (rowNumber > 1) {
          // Skip the header row
          cell.dataValidation = {
            type: 'list',
            allowBlank: true,
            errorStyle: 'stop',
            showErrorMessage: true,
            formulae: [`"${formulaString}"`], // The section list as a string
            // Set the range for the Data Validation list
            sqref: `${colLetter}${rowNumber}:${colLetter}1000`,
          };
        }
      });

      // Auto-fit the column to show all content
      sheet.getColumn(sectionColIndex + 1).width =
        Math.max(
          ...sectionList.map((s) => s.length),
          requiredColumns[sectionColIndex].length,
        ) + 2;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${title.replace(/\s+/g, '_')}.xlsx`;
    link.click();
  };

  if (!isOpen) return null;

  const columns = previewData[0]
    ? Object.keys(previewData[0]).map((key) => ({ key, label: key }))
    : [];

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-base-200 bg-opacity-50 z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 rounded-t-xl z-20 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <FaFileImport className="text-blue-600" />
                {title}
              </h2>
              <p className="text-gray-600 text-sm mt-1">
                Import data using Excel/CSV file
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full text-blue-600 text-xl">
              <FaInfoCircle />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 relative z-0">
          {/* Upload Box */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition relative">
            <p className="text-gray-600 font-medium mb-1">
              Drag & Drop your file here
            </p>
            <p className="text-gray-400 text-sm">
              or click to select a file (Supports .xlsx, .xls, .csv)
            </p>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="absolute w-full h-full opacity-0 cursor-pointer"
            />
            {fileName && (
              <p className="mt-3 text-blue-600 font-medium">
                ✓ Selected: {fileName}
              </p>
            )}
          </div>

          {/* Error Alert */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Template Download */}
          {requiredColumns.length > 0 && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="font-semibold text-gray-700">
                📌 Import Template Available
              </h3>
              <p className="text-xs sm:text-sm text-gray-500">
                Download the template and fill it with your data.
              </p>
            </div>
              <Button
                label="Download Template"
                onClick={handleDownloadTemplate}
                type="button"
                className="btn-outline btn-primary text-xs border-primary hover:text-white"
              />
            </div>
          )}

          {/* Preview Table */}
          {previewData.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                <DataTable
                  columns={columns}
                  data={previewData}
                  keyField={columns[0]?.key || 'id'}
                  selectable={false}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              label="Cancel"
              onClick={onClose}
              type="button"
              className="border border-gray-300 hover:bg-gray-100 bg-transparent text-gray-600"
              disabled={isImporting}
            />
            <Button
              label={isImporting ? 'Importing...' : 'Import'}
              type="button"
              icon={
                isImporting ? (
                  <AiOutlineLoading3Quarters className="animate-spin" />
                ) : null
              }
              onClick={async () => {
                setIsImporting(true);
                try {
                  await onSave(previewData);
                  console.log('Data Passed', previewData);
                } finally {
                  setIsImporting(false);
                }
              }}
              disabled={previewData.length === 0 || isImporting}
              isLoading={isImporting}
              className="btn-primary text-white"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
