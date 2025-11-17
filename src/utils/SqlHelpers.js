// src/utils/sqlHelpers.js

export function execToObjects(db, sql) {
  const res = db.exec(sql);
  if (!res || res.length === 0) return [];
  
  const r = res[0];
  const cols = r.columns;
  
  return r.values.map(row => {
    const obj = {};
    cols.forEach((c, i) => obj[c] = row[i]);
    return obj;
  });
}
