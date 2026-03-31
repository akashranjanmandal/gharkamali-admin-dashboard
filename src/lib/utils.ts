/**
 * Export data to a CSV file.
 * @param data Array of objects to export.
 * @param filename Name of the CSV file.
 * @param columns Array of column names to include (optional).
 */
export function exportToCSV(data: any[], filename: string, columns?: string[]) {
  if (!data || data.length === 0) return;

  const keys = columns || Object.keys(data[0]);
  const csvContent = [
    keys.join(','), // Header row
    ...data.map(row => 
      keys.map(key => {
        let val = row[key];
        if (val === null || val === undefined) val = '';
        if (typeof val === 'object') val = JSON.stringify(val);
        // Escape quotes and wrap in quotes if there's a comma
        const stringVal = String(val).replace(/"/g, '""');
        return stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n') ? `"${stringVal}"` : stringVal;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
