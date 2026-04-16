// Shim until `npx convex dev` regenerates convex/_generated/api.d.ts
import { api } from "../convex/_generated/api";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const studyApi = (api as any).study as {
  // subtasks
  getSubtasksByTest: any;
  createSubtask: any;
  toggleSubtask: any;
  deleteSubtask: any;
  // study sessions (tests)
  getStudySessions: any;
  getStudySessionsInRange: any;
  toggleStudySession: any;
  deleteStudySession: any;
  scheduleStudySessions: any;
  // homework sessions
  getHomeworkSessions: any;
  getHomeworkSessionsInRange: any;
  toggleHomeworkSession: any;
  deleteHomeworkSession: any;
  scheduleHomeworkSession: any;
  // rehearsal sessions
  getRehearsalSessions: any;
  getRehearsalSessionsInRange: any;
  createRehearsalSession: any;
  toggleRehearsalSession: any;
  deleteRehearsalSession: any;
  // reschedule (drag-and-drop)
  rescheduleStudySession: any;
  rescheduleHomeworkSession: any;
  rescheduleRehearsalSession: any;
};