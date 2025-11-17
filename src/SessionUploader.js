import React, { useState } from "react";
import useSqlSession from "./useSqlSession";
import { execToObjects } from "./utils/SqlHelpers";

export default function SessionUploader({ onDbLoaded }) {
  const { ready, initError, parseSessionFile } = useSqlSession();
  const [status, setStatus] = useState("");

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ready) {
      alert("SQL engine is not ready yet.");
      return;
    }

    try {
      const db = await parseSessionFile(file);
      setStatus("Loaded successfully");
      onDbLoaded(db);
      console.log("Tables:", execToObjects(db, "SELECT name FROM sqlite_master"));
    } catch (err) {
      console.error(err);
      setStatus("Error loading file");
    }
  }

  return (
    <div style={{padding:10, border:"1px solid #ddd", marginBottom:20}}>
      <h3>Upload .session file</h3>
      {!ready && <div>Loading SQL engine...</div>}
      {initError && <div style={{color:"red"}}>{initError}</div>}

      <input type="file" accept=".session,.sqlite,.db" onChange={handleFile} />

      <div style={{marginTop:10}}>{status}</div>
    </div>
  );
}
