/**
 * Export data to a CSV file.
 * @param data Array of objects to export.
 * @param filename Name of the CSV file.
 * @param columns Array of column names to include (optional).
 */
/**
 * Fetch EVERY row of a paginated admin list endpoint by walking its pages.
 * @param fetchPage (page, limit) => API response
 * @param extract   pulls the row array out of one response
 * @param limit     page size to request (default 200)
 */
export async function fetchAllPages(
  fetchPage: (page: number, limit: number) => Promise<any>,
  extract: (res: any) => any[] | undefined,
  limit = 200,
): Promise<any[]> {
  const all: any[] = [];
  for (let page = 1; page <= 200; page++) { // hard stop at 40k rows
    const res = await fetchPage(page, limit);
    const rows = extract(res) || [];
    all.push(...rows);
    const pages = (res as any)?.pages ?? (res as any)?.data?.pages;
    if (rows.length < limit || (pages && page >= pages)) break;
  }
  return all;
}

/**
 * Export data to an Excel (.xlsx) file. Same row shape as exportToCSV.
 * Column widths are auto-sized to the longest value so the sheet opens readable.
 */
export function exportToXLSX(data: any[], filename: string, columns?: string[]) {
  if (!data || data.length === 0) return;
  // Lazy require keeps xlsx out of pages that never export.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const XLSX = require('xlsx');
  const keys = columns || Object.keys(data[0]);
  const rows = data.map((row) => {
    const out: Record<string, any> = {};
    for (const k of keys) {
      let v = row[k];
      if (v === null || v === undefined) v = '';
      if (typeof v === 'object') v = JSON.stringify(v);
      out[k] = v;
    }
    return out;
  });
  const ws = XLSX.utils.json_to_sheet(rows, { header: keys });
  ws['!cols'] = keys.map((k) => ({
    wch: Math.min(40, Math.max(k.length, ...rows.map((r) => String(r[k] ?? '').length)) + 2),
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Export several datasets as ONE Excel workbook, one sheet per dataset.
 * Empty datasets are skipped; sheet names are truncated to Excel's 31-char cap.
 */
export function exportWorkbook(sheets: { name: string; rows: any[] }[], filename: string) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const XLSX = require('xlsx');
  const wb = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const rows = (sheet.rows || []).map((row) => {
      const out: Record<string, any> = {};
      for (const k of Object.keys(row)) {
        let v = (row as any)[k];
        if (v === null || v === undefined) v = '';
        if (typeof v === 'object') v = JSON.stringify(v);
        out[k] = v;
      }
      return out;
    });
    if (!rows.length) continue;
    const keys = Object.keys(rows[0]);
    const ws = XLSX.utils.json_to_sheet(rows, { header: keys });
    ws['!cols'] = keys.map((k) => ({
      wch: Math.min(40, Math.max(k.length, ...rows.map((r) => String(r[k] ?? '').length)) + 2),
    }));
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
  }
  if (wb.SheetNames.length === 0) return false;
  XLSX.writeFile(wb, `${filename}.xlsx`);
  return true;
}

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
