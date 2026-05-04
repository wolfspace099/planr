import { Routes, Route, Navigate } from "react-router-dom";
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import AppLayout from "./components/layout/AppLayout";
import TodayPage from "./pages/TodayPage";
import HomePage from "./pages/HomePage";
import NotebookPage from "./pages/NotebookPage";
import LessonDetailPage from "./pages/LessonDetailPage";
import TasksPage from "./pages/TasksPage";
import HomeworkPage from "./pages/HomeworkPage";
import CalendarPage from "./pages/CalendarPage";
import HabitsPage from "./pages/HabitsPage";
import AppointmentsPage from "./pages/AppointmentsPage";
import TestsPage from "./pages/TestsPage";
import StudyPlannerPage from "./pages/StudyPlannerPage";
import SettingsPage from "./pages/SettingsPage";
import LandingPage from "./pages/LandingPage";
import InkNotebookPage from "./pages/InkNotebookPage";

export default function App() {
  return (
    <>
      <SignedIn>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/today" element={<TodayPage />} />
            <Route path="/home" element={<LandingPage />} />
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/notebook" element={<NotebookPage />} />
            <Route path="/notebook/:subject" element={<InkNotebookPage />} />
            <Route path="/lesson/:id" element={<LessonDetailPage />} />
            <Route path="/homework" element={<HomeworkPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/tests" element={<TestsPage />} />
            <Route path="/study" element={<StudyPlannerPage />} />
            <Route path="/habits" element={<HabitsPage />} />
            <Route path="/appointments" element={<AppointmentsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/ink/:subject" element={<InkNotebookPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </SignedIn>
      <SignedOut>
        <LandingPage />
      </SignedOut>
    </>
  );
}
