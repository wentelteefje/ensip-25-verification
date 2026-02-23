import { Agentation } from "agentation";
import { Route, Routes } from "react-router-dom";
import "./App.css";
import InteropAddress from "./InteropAddress";
import NewPage from "./pages/NewPage";

/**
 * Root app with client-side routing.
 * Agentation toolbar (dev only) for visual annotations synced to the agent via MCP.
 */
function App() {
  return (
    <div className="h-screen w-screen overflow-hidden">
      <Routes>
        <Route path="/" element={<InteropAddress />} />
        <Route path="/new" element={<NewPage />} />
      </Routes>
      {import.meta.env.DEV && <Agentation />}
    </div>
  );
}

export default App;
