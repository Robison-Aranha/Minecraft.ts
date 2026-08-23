import { Route, Routes } from "react-router-dom";
import { Protected } from "./redirect/Protected";
import "./App.css";
import { ConfigGame } from "./components/components";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<ConfigGame />} />
        <Route path="*" element={<Protected />} />
      </Routes>
    </>
  );
}

export default App;
