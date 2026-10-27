export function exportCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const safe = (v: string | number) => {
    let text = String(v);
    if (/^[=+@-]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  const csv = '\uFEFF' + [headers, ...rows].map((row) => row.map(safe).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename + '.csv';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
