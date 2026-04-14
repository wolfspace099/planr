import { Link } from "react-router-dom";
import { SignInButton } from "@clerk/clerk-react";
import { Button, Badge } from "../components/ui/primitives";
import {
  CalendarClock,
  ClipboardList,
  BookOpen,
  CheckSquare,
  FlaskConical,
  Repeat2,
  LayoutDashboard,
} from "lucide-react";

const benefits = [
  {
    icon: <CalendarClock size={18} />,
    title: "See every school event",
    description:
      "Lessons, appointments, and study sessions live together in one clean school calendar.",
  },
  {
    icon: <ClipboardList size={18} />,
    title: "Homework and deadlines",
    description:
      "Track assignments and due dates without switching apps or losing overview.",
  },
  {
    icon: <FlaskConical size={18} />,
    title: "Study plans for tests",
    description:
      "Automatically schedule test prep so your review shows up when you need it.",
  },
  {
    icon: <CheckSquare size={18} />,
    title: "Tasks with timing",
    description:
      "Set tasks at the right time and keep them visible alongside your day.",
  },
  {
    icon: <BookOpen size={18} />,
    title: "Lesson-focused flow",
    description:
      "Open lessons, notes, homework and tests from the same school-friendly workspace.",
  },
  {
    icon: <Repeat2 size={18} />,
    title: "Daily routines made simple",
    description:
      "Stay on top of habits and morning routines without extra clutter.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="max-w-6xl mx-auto px-6 py-16 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center">
          <div>
            <Badge color="purple">School planner for students</Badge>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
              Keep lessons, tests, homework and appointments in one calm planner.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-ink-muted">
              planr is built for school routines: it blends your timetable with assignments, schedules study sessions automatically, and keeps appointments visible day and night.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <SignInButton mode="modal">
                <Button variant="primary" size="md">Login</Button>
              </SignInButton>
              <Link to="/landing">
                <Button variant="secondary" size="md">Learn more</Button>
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-surface p-7 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-ink-muted">Why it works</p>
            <h2 className="mt-4 text-2xl font-semibold text-ink">Designed for modern school life</h2>
            <p className="mt-3 text-sm leading-7 text-ink-light">
              planr combines the clarity of a timetable with the power of a task manager, so you can stay ahead of tests without juggling different tools.
            </p>

            <div className="mt-6 space-y-4">
              <div className="rounded-2xl border border-border bg-white/80 p-4 shadow-sm">
                <p className="text-sm font-semibold text-ink">Automatic study sessions</p>
                <p className="mt-1 text-xs text-ink-light">
                  Create test review blocks that appear before exam dates, just like a smart calendar assistant.
                </p>
              </div>
              <div className="rounded-2xl border border-border bg-white/80 p-4 shadow-sm">
                <p className="text-sm font-semibold text-ink">School-friendly layout</p>
                <p className="mt-1 text-xs text-ink-light">
                  Lessons stay visible in your day view, and appointments always sit on top of your schedule.
                </p>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-16">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-ink-muted">Highlights</p>
              <h2 className="mt-3 text-3xl font-semibold text-ink">Everything you need for a better school day</h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-ink-light">
              planr keeps your classes, appointments and study time together, so you can stop switching tabs and start staying on top of work.
            </p>
          </div>

          <div className="grid gap-4 mt-8 sm:grid-cols-2 lg:grid-cols-3">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="rounded-3xl border border-border bg-surface p-6 shadow-sm transition hover:border-accent/30">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  {benefit.icon}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-ink">{benefit.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-light">{benefit.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-16 rounded-3xl border border-border bg-white/70 p-8 shadow-sm">
          <div className="grid gap-6 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-ink-muted">Why students love it</p>
              <h2 className="mt-3 text-3xl font-semibold text-ink">Less friction, more focus</h2>
              <p className="mt-4 text-sm leading-7 text-ink-light">
                planr cuts down the noise from multiple apps. One schedule, one task list, one test planner — all tuned for school days and study time.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-3xl border border-border bg-surface p-5">
                <p className="text-sm font-semibold text-ink">Fewer missed deadlines</p>
                <p className="mt-2 text-xs text-ink-light">Tasks and homework show up where you need them, with clear due times.</p>
              </div>
              <div className="rounded-3xl border border-border bg-surface p-5">
                <p className="text-sm font-semibold text-ink">Smarter exam prep</p>
                <p className="mt-2 text-xs text-ink-light">Schedule learning sessions for tests automatically so your review is built into your calendar.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
