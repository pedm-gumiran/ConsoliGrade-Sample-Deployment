// DataTable.jsx
import React, { useEffect, useRef } from 'react';

export default function DataTable({
  columns = [],
  data = [],
  selectable = false,
  selected = [],
  onSelect = () => {},
  onSelectAll = () => {},
  actions = null,
  emptyMessage = 'No records found',
  keyField = '', // default key field
  loading = false, //
}) {
  const allSelected = data.length > 0 && selected.length === data.length;
  const headerCheckboxRef = useRef();

  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = false; // disable dash state
    }
  }, [selected, allSelected]);

  const handleRowSelect = (id) => {
    if (selected.includes(id)) {
      onSelect(selected.filter((sid) => sid !== id));
    } else {
      onSelect([...selected, id]);
    }
  };

  return (
    <div className="overflow-y-auto max-h-[400px] overflow-x-auto shadow rounded-md">
      <table className="w-full text-left border-gray-300 border-1 min-w-max text-xs sm:text-sm">
        <thead className="bg-white border-b-2 border-gray-400 sticky top-0 z-10">
          <tr>
            {selectable && (
              <th className="p-3 cursor-pointer">
                <input
                  ref={headerCheckboxRef}
                  type="checkbox"
                  title="Select All"
                  checked={allSelected}
                  onChange={(e) =>
                    onSelectAll(
                      e.target.checked ? data.map((d) => d[keyField]) : [],
                    )
                  }
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className={`p-3 font-semibold text-gray-700 whitespace-nowrap ${
                  col.className || ''
                } ${col.sticky ? 'sticky right-0 sm:static ' : ''}`}
              >
                {col.label}
              </th>
            ))}
            {actions && (
              <th className="p-3 font-semibold text-gray-700 sticky right-0 bg-white shadow-[-4px_0_4px_rgba(0,0,0,0.1)] z-30 min-w-[120px]">
                Action
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td
                colSpan={
                  columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)
                }
                className="p-6 text-center text-gray-600"
              >
                <div className="flex items-center justify-center gap-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-500"></div>
                  <span>Loading...</span>
                </div>
              </td>
            </tr>
          ) : data.length > 0 ? (
            data.map((row) => {
              const rowId = row[keyField];
              const isSelected = selected.includes(rowId);

              return (
                <tr
                  key={rowId}
                  className={`transition-colors ${
                    isSelected ? 'bg-blue-100' : 'hover:bg-gray-200'
                  }`}
                >
                  {selectable && (
                    <td className="p-3 cursor-pointer">
                      <input
                        title="Select Row"
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleRowSelect(rowId)}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`p-3 ${col.className || ''} ${
                        col.sticky ? 'sticky right-0 sm:static' : ''
                      }`}
                    >
                      {col.render
                        ? col.render(row[col.key], row)
                        : row[col.key]}
                    </td>
                  ))}

                  {actions && (
                    <td className="p-3 sticky right-0 bg-white shadow-lg z-5 min-w-[120px] md:bg-gray-50">
                      {actions(row)}
                    </td>
                  )}
                </tr>
              );
            })
          ) : (
            <tr>
              <td
                colSpan={
                  columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)
                }
                className="p-4 text-center text-gray-500"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
