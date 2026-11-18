import { createRoot } from "react-dom/client";
import { App } from "./App";
import { initEditor } from "./editor/editor";
import "./App.css";

initEditor();
createRoot(document.getElementById("root")!).render(<App />);
