import { useEffect, useRef, useState } from "react";
import initSqlJs from "sql.js";

export default function useSqlSession() {
  const SQLRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const SQL = await initSqlJs({
          locateFile: file => "/DigicoReport/sql-wasm.wasm"
        });
        SQLRef.current = SQL;
        setReady(true);
      } catch (err) {
        setInitError(err.message || String(err));
      }
    })();
  }, []);

  async function parseSessionFile(file) {
    if (!SQLRef.current) throw new Error("SQL engine not ready");
    const buffer = await file.arrayBuffer();
    const u8 = new Uint8Array(buffer);
    const db = new SQLRef.current.Database(u8);
    return db;
  }

  return { ready, initError, parseSessionFile };
}
