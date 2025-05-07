import { Route, Routes } from "react-router-dom";
import { Home } from "./components/components";
import { Protected } from "./redirect/Protected";
import "./App.css";

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="*" element={<Protected />} />
      </Routes>
    </>
  );
}

export default App;
