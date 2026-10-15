import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Auth from "./Auth.jsx";
import Dashboard from "./Dashboard.jsx";
import Leads from "./Leads.jsx";
import Services from "./Services.jsx";
import Profile from "./Profile.jsx";
import Chatbot from "../Chatbot/chatbot.jsx";

// Shows the chatbot on every page except the login/signup page
function ChatbotGate() {
  const { pathname } = useLocation();
  if (pathname === "/login") return null;
  return <Chatbot />;
}

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
      <ChatbotGate />
    </BrowserRouter>
  );
}