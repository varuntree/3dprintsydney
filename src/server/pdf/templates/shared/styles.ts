export const baseStyles = `
  @page { size: A4; margin: 16mm 14mm 18mm 14mm; }
  * { box-sizing: border-box; }
  html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    margin: 0;
    font-family: "Inter", system-ui, -apple-system, "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    font-size: 12px;
    line-height: 1.5;
    color: #0f172a;
    background: #ffffff;
  }

  :root {
    --fg: #0f172a;
    --muted: #586174;
    --muted-2: #6b7280;
    --border: #dce1ec;
    --border-strong: #c0c7d6;
    --bg-soft: #f5f7fb;
    --brand: #0ea5e9; /* accent */
    --radius: 8px;
  }

  main.document { max-width: 720px; margin: 0 auto; }
  .section { margin-top: 20px; }
  .section:first-child { margin-top: 0; }
  .avoid-break, .no-break, section, .card, tbody, tr { break-inside: avoid; page-break-inside: avoid; }

  h1 { margin: 0; font-size: 28px; letter-spacing: 0.07em; text-transform: uppercase; }
  h2 { margin: 0 0 6px; font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted-2); }
  .muted { color: var(--muted); }
  .card { border: 1px solid var(--border); border-radius: var(--radius); padding: 16px 18px; background: #fff; }

  /* Header */
  .header { display: grid; grid-template-columns: 1.3fr 0.9fr; gap: 24px; align-items: start; padding-bottom: 16px; border-bottom: 1px solid var(--border); }
  .identity { display: grid; gap: 10px; }
  .identity .logo { max-width: 170px; max-height: 68px; object-fit: contain; }
  .identity .details { color: var(--muted); line-height: 1.6; }
  .identity strong { font-size: 14px; letter-spacing: 0.02em; }

  .meta { text-align: right; display: grid; gap: 6px; }
  .meta table { border-collapse: collapse; margin-left: auto; font-size: 12px; }
  .meta td { padding: 4px 0 4px 16px; white-space: nowrap; }
  .meta td.key { color: var(--muted-2); letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; padding-left: 0; }
  .doc-chip { display: inline-block; padding: 4px 10px; border-radius: 999px; background: var(--bg-soft); border: 1px solid var(--border-strong); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; }
  .status-badge { display: inline-block; margin-top: 6px; padding: 4px 12px; border-radius: 999px; border: 1px solid var(--border-strong); background: var(--bg-soft); font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; }

  /* Overview */
  .overview { margin-top: 18px; display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
  .overview .metric { margin: 3px 0; }
  .badge { display: inline-flex; align-items: center; padding: 6px 12px; border-radius: 999px; background: var(--brand); color: #fff; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; font-weight: 600; margin-top: 6px; }

  /* Items table */
  table.items { width: 100%; table-layout: fixed; border-collapse: collapse; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
  table.items col.col-name { width: 24%; }
  table.items col.col-desc { width: 38%; }
  table.items col.col-qty { width: 8%; }
  table.items col.col-unit { width: 8%; }
  table.items col.col-uprice { width: 12%; }
  table.items col.col-disc { width: 5%; }
  table.items col.col-total { width: 13%; }
  thead.items-head { display: table-header-group; }
  tfoot.items-foot { display: table-footer-group; }
  table.items thead th { background: #eef2f7; color: #475569; text-align: left; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; padding: 10px 12px; border-bottom: 1px solid var(--border); }
  table.items td { padding: 10px 12px; border-top: 1px solid var(--border); vertical-align: top; word-break: break-word; overflow-wrap: anywhere; hyphens: auto; }
  table.items tbody tr:nth-child(even) { background: var(--bg-soft); }
  table.items tr { page-break-inside: avoid; }
  .item-name { font-weight: 600; }
  .item-description { color: var(--muted); font-size: 11px; }
  .numeric { text-align: right; white-space: nowrap; }
  .unit { color: var(--muted); }

  /* Totals */
  .totals-grid { margin-top: 20px; display: grid; grid-template-columns: minmax(0, 1fr) minmax(260px, 0.6fr); gap: 16px; align-items: start; }
  .totals { border: 1px solid var(--border); border-radius: var(--radius); padding: 12px 14px; }
  .totals table { width: 100%; border-collapse: collapse; }
  .totals td { padding: 8px 0; border-bottom: 1px solid var(--border); }
  .totals tr:last-child td { border-bottom: none; font-weight: 700; font-size: 13px; }

  /* Payment / Notes */
  .payment { margin-top: 18px; display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; }
  .payment ul { margin: 6px 0 0 18px; padding: 0; }
  .payment .btn { display: inline-block; margin-top: 8px; padding: 10px 20px; border-radius: 6px; background: var(--brand); color: #fff; font-weight: 600; letter-spacing: 0.06em; text-decoration: none; }
  .notes-grid { margin-top: 18px; display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 14px; }
  .notes-grid p { margin: 4px 0; }

  /* Footer */
  footer { margin-top: 18px; padding-top: 12px; border-top: 1px solid var(--border); color: var(--muted); font-size: 11px; }
`;

