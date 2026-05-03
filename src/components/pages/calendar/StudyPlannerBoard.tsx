import {
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  getISOWeek,
  startOfWeek,
} from "date-fns"
import { nl } from "date-fns/locale"
import clsx from "clsx"
import { useMemo, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { AlertTriangle, ChevronDown, ChevronUp, Filter, Sparkles, X } from "lucide-react"
import { LessonPickerModal } from "./LessonPickerModal"

export type PlannerBlock = {
  id: string
  title: string
  subtitle?: string
  tone: "test" | "homework" | "study" | "task"
  warning?: boolean
}

export function StudyPlannerBoard({
  weekStart,
  visibleWeeks = 5,
}: {
  weekStart: Date
  visibleWeeks?: number
}) {
  const homework = useQuery(api.homework.getAll)
  const tests = useQuery(api.misc.getTests)
  const lessons = useQuery(api.lessons.getAll)

  const create = useMutation(api.homework.create)

  const [activeWeekStart, setActiveWeekStart] = useState<Date>(() => startOfWeek(weekStart, { weekStartsOn: 1 }))
  const [modal, setModal] = useState(false)
  const [lessonModal, setLessonModal] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState<any>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  const dayBlocks: Record<string, PlannerBlock[]> = useMemo(() => {
    const map: Record<string, PlannerBlock[]> = {}

    for (const h of homework ?? []) {
      const key = format(new Date(h.dueDate), "yyyy-MM-dd")
      if (!map[key]) map[key] = []
      map[key].push({
        id: String(h._id),
        title: (h.subject ?? h.title ?? "").toLowerCase(),
        subtitle: h.title,
        tone: "homework",
      })
    }

    for (const t of tests ?? []) {
      const key = format(new Date(t.date), "yyyy-MM-dd")
      if (!map[key]) map[key] = []
      map[key].push({
        id: String(t._id),
        title: (t.subject ?? "").toLowerCase(),
        subtitle: t.topic,
        tone: "test",
        warning: true,
      })
    }

    return map
  }, [homework, tests])

  const weeks = useMemo(() => {
    return Array.from({ length: visibleWeeks }, (_, index) => {
      const start = startOfWeek(addWeeks(activeWeekStart, index), { weekStartsOn: 1 })
      const end = endOfWeek(start, { weekStartsOn: 1 })
      return eachDayOfInterval({ start, end }).slice(0, 5)
    })
  }, [visibleWeeks, activeWeekStart])

  const monthLabel = format(activeWeekStart, "MMMM", { locale: nl })
  const monthLabelCap = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1)

  const submit = async () => {
    if (!title.trim() || !selectedLesson) return

    await create({
      lessonId: selectedLesson._id,
      title,
      description: description || undefined,
      subject: selectedLesson.subject,
      dueDate: selectedLesson.startTime,
    })

    setTitle("")
    setDescription("")
    setSelectedLesson(null)
    setModal(false)
  }

  const dayHeaders = ["Maandag", "Dinsdag", "Woensdag", "Donderdag", "Vrijdag"]

  return (
    <div className="h-full overflow-hidden flex flex-col bg-[#f6f3fb] dark:bg-[#0d0a14] text-[#1a1a1a] dark:text-[#f6f3fb] relative">
      <div className="flex-shrink-0 flex items-center justify-between px-6 py-3 border-b border-[#e3dbef] dark:border-[#2a2138]">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] font-bold leading-none">{monthLabelCap}</h1>
          <div className="flex flex-col">
            <button
              onClick={() => setActiveWeekStart((d) => addWeeks(d, -1))}
              className="h-4 w-6 flex items-center justify-center text-[#1a1a1a]/45 dark:text-[#f6f3fb]/45 hover:text-[#1a1a1a] dark:hover:text-[#f6f3fb] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
              aria-label="Vorige week"
            >
              <ChevronUp size={12} />
            </button>
            <button
              onClick={() => setActiveWeekStart((d) => addWeeks(d, 1))}
              className="h-4 w-6 flex items-center justify-center text-[#1a1a1a]/45 dark:text-[#f6f3fb]/45 hover:text-[#1a1a1a] dark:hover:text-[#f6f3fb] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
              aria-label="Volgende week"
            >
              <ChevronDown size={12} />
            </button>
          </div>
          <button
            onClick={() => setActiveWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="h-7 px-3 border border-[#cfc4e0] dark:border-[#3a2f50] text-[12px] font-medium text-[#1a1a1a]/75 dark:text-[#f6f3fb]/75 hover:text-[#1a1a1a] dark:hover:text-[#f6f3fb] hover:border-[#a896c4] dark:hover:border-[#5a4a7c] hover:bg-white dark:hover:bg-[#221833] transition-colors"
          >
            Vandaag
          </button>
          <button className="h-7 px-2.5 border border-[#cfc4e0] dark:border-[#3a2f50] text-[12px] font-medium text-[#1a1a1a]/70 dark:text-[#f6f3fb]/70 hover:bg-white dark:hover:bg-[#221833] hover:border-[#a896c4] dark:hover:border-[#5a4a7c] transition-colors flex items-center gap-1.5">
            <Filter size={12} />
            Filters
            <ChevronDown size={11} className="opacity-60" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button className="h-7 px-3 border border-[#cfc4e0] dark:border-[#3a2f50] text-[12px] font-medium text-[#1a1a1a]/75 dark:text-[#f6f3fb]/75 hover:bg-white dark:hover:bg-[#221833] hover:border-[#a896c4] dark:hover:border-[#5a4a7c] transition-colors flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Inleveren
          </button>
          <button
            onClick={() => setModal(true)}
            className="h-7 px-3 border border-[#cfc4e0] dark:border-[#3a2f50] text-[12px] font-medium text-[#1a1a1a]/75 dark:text-[#f6f3fb]/75 hover:bg-white dark:hover:bg-[#221833] hover:border-[#a896c4] dark:hover:border-[#5a4a7c] transition-colors flex items-center gap-1.5"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            Materiaal
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="min-w-[1100px]">
          <div
            className="sticky top-0 z-10 bg-[#f6f3fb] dark:bg-[#0d0a14] grid border-b border-[#e3dbef] dark:border-[#2a2138]"
            style={{ gridTemplateColumns: "240px repeat(5, minmax(0, 1fr))" }}
          >
            <div className="px-4 py-3" />
            {dayHeaders.map((label) => (
              <div key={label} className="px-4 py-3 text-[12px] font-semibold text-[#1a1a1a]/55 dark:text-[#f6f3fb]/55">
                {label}
              </div>
            ))}
          </div>

          {weeks.map((weekDays) => {
            const weekNumber = getISOWeek(weekDays[0])
            const weekItems = weekDays.flatMap((day) => {
              const dayKey = format(day, "yyyy-MM-dd")
              return (dayBlocks[dayKey] ?? []).map((item) => ({
                ...item,
                dueDate: day,
              }))
            })

            return (
              <div
                key={weekDays[0].toISOString()}
                className="grid border-b border-[#e3dbef] dark:border-[#2a2138]"
                style={{ gridTemplateColumns: "240px repeat(5, minmax(0, 1fr))" }}
              >
                <div className="border-r border-[#e3dbef] dark:border-[#2a2138] px-4 py-3 min-h-[180px]">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="text-[13px] font-semibold text-[#1a1a1a]/85 dark:text-[#f6f3fb]/85">Weektaken</p>
                    <p className="text-[11px] text-[#1a1a1a]/40 dark:text-[#f6f3fb]/40 tabular-nums">w{String(weekNumber).padStart(2, "0")}</p>
                  </div>

                  <div className="mt-3 space-y-1.5">
                    {weekItems.length === 0 ? null : (
                      weekItems.map((item) => (
                        <TaskCard
                          key={`${item.id}-${item.dueDate.toISOString()}`}
                          title={item.title}
                          subtitle={item.subtitle}
                          warning={item.warning}
                        />
                      ))
                    )}
                  </div>
                </div>

                {weekDays.map((day) => {
                  const key = format(day, "yyyy-MM-dd")
                  const items = dayBlocks[key] ?? []

                  return (
                    <div
                      key={key}
                      className="border-r last:border-r-0 border-[#e3dbef] dark:border-[#2a2138] px-3 py-3 min-h-[180px]"
                    >
                      <p className="text-[12px] font-medium text-[#1a1a1a]/45 dark:text-[#f6f3fb]/45 tabular-nums">
                        {format(day, "dd")}
                      </p>

                      <div className="mt-2 space-y-1.5">
                        {items.map((item) => (
                          <TaskCard
                            key={item.id}
                            title={item.title}
                            subtitle={item.subtitle}
                            warning={item.warning}
                          />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>

      <button className="absolute bottom-5 right-5 h-9 px-4 bg-white dark:bg-[#181225] border border-[#cfc4e0] dark:border-[#3a2f50] shadow-sm text-[12.5px] font-medium text-[#1a1a1a] dark:text-[#f6f3fb] hover:border-[#a896c4] dark:hover:border-[#5a4a7c] transition-colors flex items-center gap-1.5">
        <Sparkles size={13} className="text-[#7c3aed]" />
        Studiehulp
      </button>

      {modal && (
        <div className="fixed inset-0 bg-black/30 dark:bg-black/60 z-40 flex items-center justify-center">
          <div className="bg-white dark:bg-[#181225] border border-[#e3dbef] dark:border-[#2a2138] p-4 w-[380px] space-y-3 shadow-xl">
            <div className="flex justify-between items-center text-[#1a1a1a] dark:text-[#f6f3fb]">
              <span className="text-[14px] font-semibold">Add homework</span>
              <button onClick={() => setModal(false)} className="text-[#1a1a1a]/55 dark:text-[#f6f3fb]/55 hover:text-[#1a1a1a] dark:hover:text-[#f6f3fb]">
                <X size={14} />
              </button>
            </div>

            <input
              className="w-full p-2 bg-[#f6f3fb] dark:bg-[#0d0a14] border border-[#e3dbef] dark:border-[#2a2138] text-[#1a1a1a] dark:text-[#f6f3fb] text-sm focus:outline-none focus:border-[#7c3aed]"
              placeholder="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />

            <textarea
              className="w-full p-2 bg-[#f6f3fb] dark:bg-[#0d0a14] border border-[#e3dbef] dark:border-[#2a2138] text-[#1a1a1a] dark:text-[#f6f3fb] text-sm focus:outline-none focus:border-[#7c3aed]"
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div className="space-y-2">
              <div className="text-xs text-[#1a1a1a]/55 dark:text-[#f6f3fb]/55">
                {selectedLesson
                  ? `${selectedLesson.subject} | ${format(
                      new Date(selectedLesson.startTime),
                      "EEEE d MMM | HH:mm"
                    )}`
                  : "No lesson selected"}
              </div>

              <button
                onClick={() => setLessonModal(true)}
                className="w-full border border-[#cfc4e0] dark:border-[#3a2f50] text-[#1a1a1a] dark:text-[#f6f3fb] text-sm py-2 hover:bg-[#f6f3fb] dark:bg-[#0d0a14]"
              >
                Select lesson
              </button>

              {selectedLesson && (
                <button
                  onClick={() => setSelectedLesson(null)}
                  className="text-xs text-red-500"
                >
                  Clear lesson
                </button>
              )}
            </div>

            <button
              onClick={submit}
              disabled={!selectedLesson || !title.trim()}
              className="w-full bg-[#7c3aed] text-white text-sm py-2 disabled:opacity-40 hover:bg-[#6d28d9]"
            >
              Create
            </button>

            <LessonPickerModal
              open={lessonModal}
              onClose={() => setLessonModal(false)}
              lessons={lessons ?? []}
              days={weeks.flat()}
              onSelect={(lesson) => {
                setSelectedLesson(lesson)
                setLessonModal(false)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function TaskCard({
  title,
  subtitle,
  warning,
}: {
  title: string
  subtitle?: string
  warning?: boolean
}) {
  return (
    <div
      className={clsx(
        "border px-2.5 py-1.5 transition-colors cursor-pointer",
        warning
          ? "bg-[#fdeeee] dark:bg-[#3a1414] border-[#e6b8b8] dark:border-[#5c2222] hover:bg-[#fce5e5] dark:hover:bg-[#481818]"
          : "bg-white dark:bg-[#181225] border-[#e3dbef] dark:border-[#2a2138] hover:border-[#cfc4e0] dark:hover:border-[#3a2f50] dark:border-[#3a2f50]"
      )}
    >
      <div className="flex items-center gap-1.5">
        {warning ? (
          <AlertTriangle size={11} className="text-[#c44545] flex-shrink-0" />
        ) : (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" className="text-[#1a1a1a]/45 dark:text-[#f6f3fb]/45 flex-shrink-0">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        )}
        <p className="text-[12px] font-semibold text-[#1a1a1a] dark:text-[#f6f3fb] leading-tight truncate">{title}</p>
      </div>
      {subtitle && (
        <p className="mt-0.5 ml-[18px] text-[11px] text-[#1a1a1a]/55 dark:text-[#f6f3fb]/55 leading-tight truncate">{subtitle}</p>
      )}
    </div>
  )
}
