import { useState, useRef } from 'react';

export default function ResizableTable({ headers, children, className = '', defaultWidths = {} }) {
  const [columnWidths, setColumnWidths] = useState(() => {
    const initialWidth = 100 / headers.length;
    return headers.reduce((acc, _, i) => ({ ...acc, [i]: defaultWidths[i] ?? initialWidth }), {});
  });

  const [isResizing, setIsResizing] = useState(null);
  const tableRef = useRef(null);

  const handleResizeStart = (e, colIndex) => {
    e.preventDefault();
    setIsResizing({ colIndex, startX: e.clientX, startWidths: { ...columnWidths } });
  };

  const handleMouseMove = (e) => {
    if (!isResizing) return;

    const deltaX = e.clientX - isResizing.startX;
    const tableWidth = tableRef.current?.offsetWidth || 1;
    const deltaPercent = (deltaX / tableWidth) * 100;

    const newWidths = { ...isResizing.startWidths };
    newWidths[isResizing.colIndex] = Math.max(50, newWidths[isResizing.colIndex] + deltaPercent);
    newWidths[isResizing.colIndex + 1] = Math.max(50, newWidths[isResizing.colIndex + 1] - deltaPercent);

    setColumnWidths(newWidths);
  };

  const handleMouseUp = () => {
    setIsResizing(null);
  };

  return (
    <div
      ref={tableRef}
      className={`overflow-x-auto border border-slate-200 rounded-xl ${className}`}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <table className="w-full text-sm" style={{ userSelect: isResizing ? 'none' : 'auto' }}>
        <thead className="bg-slate-800 text-white sticky top-0">
          <tr>
            {headers.map((header, i) => (
              <th
                key={i}
                className="px-3 py-3 text-left font-semibold text-xs uppercase tracking-wide relative"
                style={{ width: `${columnWidths[i]}%` }}
              >
                <div className="flex items-center justify-between">
                  <span>{header}</span>
                  {i < headers.length - 1 && (
                    <div
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-amber-400 hover:w-1.5 transition-all group"
                      onMouseDown={(e) => handleResizeStart(e, i)}
                      title="Drag to resize column"
                    />
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
