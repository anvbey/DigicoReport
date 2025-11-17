// src/App.js
import React, { useState } from "react";
import SessionUploader from "./SessionUploader";
import ChannelList from "./ChannelList";

function App(){
  const [db, setDb] = useState(null);
  return (
    <div style={{padding:20}}>
      <h1>DiGiCo Session Viewer</h1>
      <SessionUploader onDbLoaded={setDb} />
      {db ? <ChannelList db={db} /> : <div>Load a .session file to view channels.</div>}
    </div>
  );
}
export default App;
