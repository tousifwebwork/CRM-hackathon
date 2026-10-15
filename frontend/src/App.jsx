import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Auth from "./Auth.jsx";
import Dashboard from "./Dashboard.jsx";
import Leads from "./Leads.jsx";
import Services from "./Services.jsx";
import Profile from "./Profile.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/leads" element={<Leads />} />
        <Route path="/services" element={<Services />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}