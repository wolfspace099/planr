import { Routes, Route, Navigate, useParams } from "react-router-dom";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import AppLayout from "./components/layout/AppLayout";
import TodayPage from "./pages/TodayPage";
import HomePage from "./pages/HomePage";
import LessonDetailPage from "./pages/LessonDetailPage";
import TasksPage from "./pages/TasksPage";
import HomeworkPage from "./pages/HomeworkPage";
import CalendarPage from "./pages/CalendarPage";
import LandingPage from "./pages/LandingPage";
import { AIPanel } from "./components/ai/AIPanel";
import { AIPanelProvider } from "./components/ai/AIPanelProvider";

function NotebookSubjectRedirect() {
  const { subject } = useParams();
  const suffix = subject ? `&subject=${encodeURIComponent(subject)}` : "";
  return <Navigate to={`/calendar?tab=notebook${suffix}`} replace />;
}

export default function App() {
  return (
    <>
      <SignedIn>
        <AIPanelProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/today" element={<TodayPage />} />
              <Route path="/home" element={<LandingPage />} />
              <Route path="/calendar" element={<CalendarPage />} />
              <Route path="/notebook" element={<Navigate to="/calendar?tab=notebook" replace />} />
              <Route path="/notebook/:subject" element={<NotebookSubjectRedirect />} />
              <Route path="/lesson/:id" element={<LessonDetailPage />} />
              <Route path="/homework" element={<HomeworkPage />} />
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/plannen" element={<Navigate to="/calendar?tab=plannen" replace />} />
              <Route path="/settings" element={<Navigate to="/calendar?tab=settings" replace />} />
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/ink/:subject" element={<NotebookSubjectRedirect />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
          <AIPanel />
        </AIPanelProvider>
      </SignedIn>
      <SignedOut>
        <LandingPage />
      </SignedOut>
    </>
  );
}
