// import { useState } from 'react'
// import reactLogo from './assets/react.svg'
// import viteLogo from '/vite.svg'
// import './App.css'

// function App() {
//   const [count, setCount] = useState(0)

//   return (
//     <>
//       <div>
//         <a href="https://vite.dev" target="_blank">
//           <img src={viteLogo} className="logo" alt="Vite logo" />
//         </a>
//         <a href="https://react.dev" target="_blank">
//           <img src={reactLogo} className="logo react" alt="React logo" />
//         </a>
//       </div>
//       <h1>Vite + React</h1>
//       <div className="card">
//         <button onClick={() => setCount((count) => count + 1)}>
//           count is {count}
//         </button>
//         <p>
//           Edit <code>src/App.jsx</code> and save to test HMR
//         </p>
//       </div>
//       <p className="read-the-docs">
//         Click on the Vite and React logos to learn more
//       </p>
//     </>
//   )
// }

// export default App

// import { useEffect, useState } from "react";
// import api from "./api";

// export default function App() {
//   const [msg, setMsg] = useState("loading...");
//   useEffect(() => {
//     api.get("/ping/").then(r => setMsg(r.data.message)).catch(() => setMsg("error"));
//   }, []);
//   return (
//     <div style={{ padding: 24 }}>
//       <h1>React + Django</h1>
//       <p>API says: {msg}</p>
//     </div>
//   );
// }

import { Routes, Route, Navigate } from "react-router-dom";
import "./styles/auth.css";

import Login from "./pages/Login.jsx";
import Signup from "./pages/Signup.jsx";

// Example protected area placeholder:
function AppHome() {
  return (
    <div style={{ padding: 24 }}>
      <h2>App Home</h2>
      <p>You’re logged in (placeholder). Replace with your dashboard.</p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* Default to login */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/app" element={<AppHome />} />
      {/* Catch-all → login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}


