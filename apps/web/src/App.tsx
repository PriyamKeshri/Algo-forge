import { BrowserRouter, Route, Routes } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import { AlgorithmPage } from "./pages/AlgorithmPage";
import { RacePage } from "./pages/RacePage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/algorithm/:id" element={<AlgorithmPage />} />
        <Route path="/race" element={<RacePage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </BrowserRouter>
  );
}
