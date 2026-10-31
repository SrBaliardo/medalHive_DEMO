import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { WebDemo } from "./WebDemo";
import "./medalhive/theme.css";
import "./web-demo.css";
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <HashRouter>
      <WebDemo />
    </HashRouter>
  </StrictMode>,
);
