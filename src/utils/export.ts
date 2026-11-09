/** Build the filename at export time using the user's local date and time. */
export function csvFilename(tableName: string, filters: string[] = [], now = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0');
  const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const safePart = (value: string) =>
    Array.from(value.trim(), (character) => (character.charCodeAt(0) < 32 ? '-' : character))
      .join('')
      .replace(/[\\/:*?"<>|]/g, '-');
  return (
    [tableName.replace(/\.csv$/i, ''), ...filters.map((value) => value.trim() || '全部'), timestamp]
      .map(safePart)
      .join('_') + '.csv'
  );
}

export function exportCsv(
  filename: string,
  headers: string[],
  rows: (string | number)[][],
  filters: string[] = [],
) {
  const safe = (v: string | number) => {
    let text = String(v);
    if (/^[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  const csv = '\uFEFF' + [headers, ...rows].map((row) => row.map(safe).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = csvFilename(filename, filters);
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
