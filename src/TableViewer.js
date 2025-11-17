import React, { useEffect, useState } from "react";
import { execToObjects } from "./utils/SqlHelpers";

export default function TableViewer({ db }) {
  const [table, setTable] = useState("Channel");
  const [rows, setRows] = useState([]);

  // FIXED 4 TABLES ONLY
  const allowedTables = [
    "Channel",
    "EqualiserBand",
    "DynamicProcessor",
    "Passband"
  ];

  useEffect(() => {
    if (!db) return;
    loadTable("Channel"); // default table
  }, [db]);

  function loadTable(tbl) {
    if (!db) return;
    const data = execToObjects(db, `SELECT * FROM ${tbl} WHERE channelNumber = 1 AND snapShotId = 10000;`);
    setRows(data);
  }

  return (
    <div>
      <h3>Database Tables</h3>

      <select
        value={table}
        onChange={e => {
          setTable(e.target.value);
          loadTable(e.target.value);
        }}
      >
        {allowedTables.map(t => (
          <option key={t} value={t}>{t}</option>
        ))}
      </select>

      <table border="1" cellPadding="4" style={{ marginTop: 10 }}>
        <thead>
          <tr>
            {rows.length > 0 &&
              Object.keys(rows[0]).map(col => (
                <th key={col}>{col}</th>
              ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {Object.values(row).map((v, j) => (
                <td key={j}>{String(v)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
