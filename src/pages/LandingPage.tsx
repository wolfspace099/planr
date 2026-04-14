import { SignInButton } from "@clerk/clerk-react";
import { Button, Badge } from "../components/ui/primitives";
import {
  CalendarClock,
  ClipboardList,
  CheckSquare,
  FlaskConical,
  LayoutDashboard,
  BookOpen,
} from "lucide-react";

const features = [
  {
    icon: <CalendarClock size={18} />,
    title: "Always visible school events",
    description:
      "Lessons and appointments share the same calendar, so you never lose track of where your day goes.",
  },
  {
    icon: <ClipboardList size={18} />,
    title: "Homework with deadlines",
    description:
      "Keep every assignment in one place and see due dates where they matter most.",
  },
  {
    icon: <FlaskConical size={18} />,
    title: "Smart test prep",
    description:
      "Plan review sessions automatically so studying happens ahead of exams, not at the last minute.",
  },
  {
    icon: <CheckSquare size={18} />,
    title: "Tasks that fit your day",
    description:
      "Schedule tasks with times and keep them visible with lessons and events.",
  },
];

const steps = [
  {
    title: "Put your classes in place",
    description:
      "Import lessons or add classes manually to create a school-first timetable.",
    icon: <LayoutDashboard size={18} />,
  },
  {
    title: "Add tests and homework",
    description:
      "Plan tests, homework and tasks in one view so nothing slips through the cracks.",
    icon: <BookOpen size={18} />,
  },
  {
    title: "Watch your day stay balanced",
    description:
      "See prep work, lessons and appointments together with a clear, calm layout.",
    icon: <CheckSquare size={18} />,
  },
];

const quotes = [
  {
    text: "I finally stopped missing homework because everything is in one place.",
    author: "Mia, 11th grade",
  },
  {
    text: "The planner view feels calm and easy to use during busy school weeks.",
    author: "Alex, 10th grade",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <div className="max-w-6xl mx-auto px-6 py-6 lg:px-8">
        <div className="flex items-center justify-between mb-10">
          <div className="text-2xl font-semibold text-ink">planr</div>
          <SignInButton mode="modal">
            <Button variant="secondary" size="sm">Login</Button>
          </SignInButton>
        </div>

        <div className="grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-start">
          <div>
            <Badge color="purple">School planner for students</Badge>
            <h1 className="mt-6 text-5xl font-semibold tracking-tight text-ink sm:text-6xl leading-tight">
              The planner that keeps school, study and life in sync.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-ink-muted">
              planr brings lessons, homework, tests, and appointments into one calm school planner so you can focus on learning instead of chasing dates.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <SignInButton mode="modal">
                <Button variant="primary" size="md">Login</Button>
              </SignInButton>
              <a href="#features">
                <Button variant="secondary" size="md">See the features</Button>
              </a>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              <div className="rounded-3xl border border-border bg-surface p-4 text-sm text-ink-light">
                <p className="font-semibold text-ink">Lesson-first calendar</p>
                <p className="mt-3">Study sessions and appointments appear where school happens.</p>
              </div>
              <div className="rounded-3xl border border-border bg-surface p-4 text-sm text-ink-light">
                <p className="font-semibold text-ink">Timely task planning</p>
                <p className="mt-3">Due dates, times, and tasks stay visible in one list.</p>
              </div>
              <div className="rounded-3xl border border-border bg-surface p-4 text-sm text-ink-light">
                <p className="font-semibold text-ink">Test prep built in</p>
                <p className="mt-3">Let planr schedule review sessions before exam week.</p>
              </div>
            </div>
          </div>

          <div className="rounded-[36px] border border-border bg-gradient-to-br from-[#eff2ff] to-[#f9f7ff] p-8 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-ink-muted">Built for school</p>
            <h2 className="mt-4 text-3xl font-semibold text-ink">A planner with a calm, class-ready feel</h2>
            <p className="mt-4 text-sm leading-7 text-ink-light">
              planr is designed to make your day easier — not busier. Keep lessons visible, appointments clear, and study time ready when you need it.
            </p>

            <div className="mt-6 space-y-4">
              <div className="rounded-3xl border border-border bg-white p-5">
                <p className="text-sm font-semibold text-ink">Always see school and life together</p>
                <p className="mt-2 text-sm text-ink-light">Lessons, appointments, and prep blocks share the same calendar so nothing slips away.</p>
              </div>
              <div className="rounded-3xl border border-border bg-white p-5">
                <p className="text-sm font-semibold text-ink">No extra apps needed</p>
                <p className="mt-2 text-sm text-ink-light">Homework, tests, tasks and habits all live in one easy-to-use school planner.</p>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-20" id="features">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-ink-muted">Features</p>
              <h2 className="mt-3 text-3xl font-semibold text-ink">Everything you need for a sharper school day</h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-ink-light">
              planr is built around student routines — classes, exams, homework and appointments all in one place.
            </p>
          </div>

          <div className="grid gap-4 mt-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-3xl border border-border bg-surface p-6 shadow-sm transition hover:border-accent/30">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  {feature.icon}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-ink">{feature.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-light">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 rounded-3xl border border-border bg-white/70 p-8 shadow-sm">
          <div className="grid gap-6 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-ink-muted">How it works</p>
              <h2 className="mt-3 text-3xl font-semibold text-ink">A planner for busy students</h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-ink-light">
              Add your lessons, schedule your tests, and let planr help you balance deadlines, tasks and appointments in a single view.
            </p>
          </div>

          <div className="grid gap-4 mt-8 sm:grid-cols-2 lg:grid-cols-3">
            {steps.map((step) => (
              <div key={step.title} className="rounded-3xl border border-border bg-surface p-6 shadow-sm transition hover:border-accent/30">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 text-accent">
                  {step.icon}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-ink">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-ink-light">{step.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 rounded-3xl border border-border bg-surface p-8 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-ink-muted">Student feedback</p>
              <h2 className="mt-3 text-3xl font-semibold text-ink">Loved by learners</h2>
            </div>
            <SignInButton mode="modal">
              <Button variant="primary" size="md">Try it now</Button>
            </SignInButton>
          </div>

          <div className="grid gap-4 mt-8 sm:grid-cols-2">
            {quotes.map((quote) => (
              <div key={quote.author} className="rounded-3xl border border-border bg-white p-6 shadow-sm">
                <p className="text-sm leading-7 text-ink-light">“{quote.text}”</p>
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.2em] text-ink-muted">{quote.author}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-20 rounded-3xl border border-border bg-surface p-8 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-ink-muted">Ready for less stress?</p>
          <h2 className="mt-3 text-3xl font-semibold text-ink">Make your school day feel easier</h2>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-ink-light">
            Login with one click, add your first lesson, and let planr take care of the rest.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <SignInButton mode="modal">
              <Button variant="primary" size="md">Login</Button>
            </SignInButton>
            <a href="#features">
              <Button variant="secondary" size="md">See features</Button>
            </a>
          </div>
        </section>
      </div>
    </div>
  );
}
