import { createRoot } from "react-dom/client";
import { App } from "./app/App";
// glide-data-grid v6 compiles its layout styles (@linaria) to static CSS that
// is NOT injected at runtime. Without this import the grid container has zero
// height and the canvas never mounts (blank/black editor).
import "@glideapps/glide-data-grid/dist/index.css";
import "./styles/app.css";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element missing");

createRoot(rootEl).render(<App />);
