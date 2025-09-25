import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";

const el = document.getElementById("root");
if (!el) {
  document.body.innerHTML = "<pre> No #root div found in index.html</pre>";
} else {
  createRoot(el).render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
}
