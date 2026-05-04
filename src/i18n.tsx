import React, { createContext, useContext, useState, useEffect } from "react";

export type Lang = "nl" | "en";

const NL = {
  // Nav
  today: "Vandaag",
  calendar: "Agenda",
  notebook: "Notitieboek",
  homework: "Huiswerk",
  tasks: "Taken",
  tests: "Toetsen",
  study: "Studieplan",
  plannen: "Plannen",
  habits: "Gewoonten",
  appointments: "Afspraken",
  settings: "Instellingen",
  planner: "Planner",
  school: "School",

  // General
  add: "Toevoegen",
  cancel: "Annuleren",
  save: "Opslaan",
  delete: "Verwijderen",
  close: "Sluiten",
  loading: "Laden…",
  noResults: "Geen resultaten",
  pending: "Openstaand",
  done: "Klaar",
  all: "Alles",
  high: "Hoog",
  medium: "Gemiddeld",
  low: "Laag",
  priority: "Prioriteit",
  subject: "Vak",
  title: "Titel",
  description: "Beschrijving",
  dueDate: "Inleverdatum",
  selectLesson: "Les kiezen",
  noLesson: "Geen les geselecteerd",
  lessonSelected: "Les geselecteerd",

  // Calendar
  rooster: "Rooster",
  week: "week",
  today2: "Vandaag",
  break: "pauze",
  addToCalendar: "Toevoegen aan agenda",
  addHomework: "Huiswerk toevoegen",
  addTask: "Taak toevoegen",
  addTest: "Toets toevoegen",
  addAppointment: "Afspraak toevoegen",
  pickLesson: "Kies een les",
  pickLessonHint: "Koppel aan een les uit je rooster",
  noLessons: "Geen lessen beschikbaar",
  homeworkAdded: "Huiswerk toegevoegd!",
  taskAdded: "Taak toegevoegd!",
  testAdded: "Toets toegevoegd!",

  // Today
  goodMorning: "Goedemorgen",
  goodAfternoon: "Goedemiddag",
  goodEvening: "Goedenavond",
  todayLabel: "Vandaag",
  homeworkDueToday: "Huiswerk voor vandaag",
  nothingDue: "Niets voor vandaag",
  noTasks: "Geen taken",
  testsToday: "Toetsen vandaag",
  recentNotes: "Recente notities",
  openNotebook: "Notitieboek openen →",
  noLessonsToday: "Geen lessen vandaag gepland.",
  todaysHabits: "Gewoonten van vandaag",

  // Settings
  settingsTitle: "Instellingen",
  account: "Account",
  appearance: "Weergave",
  darkMode: "Donkere modus",
  darkModeDesc: "Wissel tussen licht en donker thema",
  language: "Taal",
  languageDesc: "Kies de taal van de app",
  zermeloCalendar: "Zermelo agenda",
  zermeloDesc: "Plak je Zermelo koppelcode in het formaat",
  zermeloDescLink: "schoolnaam:koppelcode",
  saveUrl: "Code opslaan",
  saved: "Opgeslagen ✓",
  syncNow: "Nu synchroniseren",
  syncing: "Synchroniseren…",
  lastSynced: "Laatste synchronisatie",
  autoSyncNote: "Bij openen van de Agenda wordt live gesynchroniseerd voor 4 weken terug en 4 weken vooruit.",

  // Homework page
  addHomeworkBtn: "Huiswerk toevoegen",
  noHomework: "Geen huiswerk hier",
  exampleHomework: "bijv. Oefening 1, 2, 3",
  homeworkNote: "Huiswerk wordt gekoppeld aan de geselecteerde les, met het bijbehorende vak en datum.",
  clearLesson: "Geselecteerde les wissen",

  // Tasks
  addTaskBtn: "Taak toevoegen",
  noTasks2: "Geen taken",

  // Tests
  addTestBtn: "Toets toevoegen",
  noTests: "Geen toetsen",
  topic: "Onderwerp",
  date: "Datum",
};

const EN: typeof NL = {
  today: "Today",
  calendar: "Calendar",
  notebook: "Notebook",
  homework: "Homework",
  tasks: "Tasks",
  tests: "Tests",
  study: "Study Planner",
  plannen: "Planning",
  habits: "Habits",
  appointments: "Appointments",
  settings: "Settings",
  planner: "Planner",
  school: "School",

  add: "Add",
  cancel: "Cancel",
  save: "Save",
  delete: "Delete",
  close: "Close",
  loading: "Loading…",
  noResults: "No results",
  pending: "Pending",
  done: "Done",
  all: "All",
  high: "High",
  medium: "Medium",
  low: "Low",
  priority: "Priority",
  subject: "Subject",
  title: "Title",
  description: "Description",
  dueDate: "Due date",
  selectLesson: "Select lesson",
  noLesson: "No lesson selected",
  lessonSelected: "Lesson selected",

  rooster: "Schedule",
  week: "week",
  today2: "Today",
  break: "break",
  addToCalendar: "Add to calendar",
  addHomework: "Add homework",
  addTask: "Add task",
  addTest: "Add test",
  addAppointment: "Add appointment",
  pickLesson: "Pick a lesson",
  pickLessonHint: "Link to a lesson from your schedule",
  noLessons: "No lessons available",
  homeworkAdded: "Homework added!",
  taskAdded: "Task added!",
  testAdded: "Test added!",

  goodMorning: "Good morning",
  goodAfternoon: "Good afternoon",
  goodEvening: "Good evening",
  todayLabel: "Today",
  homeworkDueToday: "Homework due today",
  nothingDue: "Nothing due today",
  noTasks: "No tasks",
  testsToday: "Tests today",
  recentNotes: "Recent notes",
  openNotebook: "Open notebook →",
  noLessonsToday: "No lessons scheduled for today.",
  todaysHabits: "Today's habits",

  settingsTitle: "Settings",
  account: "Account",
  appearance: "Appearance",
  darkMode: "Dark mode",
  darkModeDesc: "Switch between light and dark theme",
  language: "Language",
  languageDesc: "Choose the app language",
  zermeloCalendar: "Zermelo calendar",
  zermeloDesc: "Paste your Zermelo connection code in this format",
  zermeloDescLink: "schoolname:connection_code",
  saveUrl: "Save code",
  saved: "Saved ✓",
  syncNow: "Sync now",
  syncing: "Syncing…",
  lastSynced: "Last synced",
  autoSyncNote: "On Calendar open, live sync runs for 4 weeks back and 4 weeks ahead.",

  addHomeworkBtn: "Add homework",
  noHomework: "No homework here",
  exampleHomework: "e.g. Exercise 1, 2, 3",
  homeworkNote: "Homework will be assigned to the selected lesson, using its subject and date.",
  clearLesson: "Clear selected lesson",

  addTaskBtn: "Add task",
  noTasks2: "No tasks",

  addTestBtn: "Add test",
  noTests: "No tests",
  topic: "Topic",
  date: "Date",
};

const TRANSLATIONS = { nl: NL, en: EN };

interface LangCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: typeof NL;
}

const LangContext = createContext<LangCtx>({
  lang: "nl",
  setLang: () => {},
  t: NL,
});

export function LangProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    return (localStorage.getItem("lang") as Lang) ?? "nl";
  });

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("lang", l);
  };

  return (
    <LangContext.Provider value={{ lang, setLang, t: TRANSLATIONS[lang] }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
