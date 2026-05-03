import {
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  getISOWeek,
  isSameDay,
  startOfWeek,
} from "date-fns"
import { nl } from "date-fns/locale"
import clsx from "clsx"
import { useMemo, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { AlertTriangle, ChevronDown, ChevronUp, Filter, Plus, X } from "lucide-react"
import { LessonPickerModal } from "./LessonPickerModal"
import type { DetailPanelState } from "../../../pages/CalendarPage"

export type PlannerBlock = {
  id: string
  itemId: string
  itemKind: "homework" | "test"
  title: string
  subtitle?: string
  tone: "test" | "homework" | "study" | "task"
  warning?: boolean
}

export function StudyPlannerBoard({
  weekStart,
  visibleWeeks = 5,
  onSelect,
  onQuickAdd,
}: {
  weekStart: Date
  visibleWeeks?: number
  onSelect?: (s: DetailPanelState) => void
  onQuickAdd?: () => void
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
        itemId: String(h._id),
        itemKind: "homework",
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
        itemId: String(t._id),
        itemKind: "test",
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
    <div className="h-full overflow-hidden flex flex-col bg-white dark:bg-[#1e1e1e] text-[#333333] dark:text-[#cccccc] relative">
      <div className="flex-shrink-0 flex items-center justify-between h-[28px] px-2 border-b border-[#e7e7e7] dark:border-[#252526] bg-[#f3f3f3] dark:bg-[#252526] select-none">
        <div className="flex items-center gap-1">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-[#6c6c6c] dark:text-[#969696] px-2">{monthLabelCap}</span>
          <div className="flex flex-col">
            <button
              onClick={() => setActiveWeekStart((d) => addWeeks(d, -1))}
              className="h-3 w-5 flex items-center justify-center text-[#6c6c6c] dark:text-[#969696] hover:text-[#333333] dark:hover:text-[#cccccc] hover:bg-[#e8e8e8] dark:hover:bg-[#2a2d2e] focus:outline-none"
              aria-label="Vorige week"
            >
              <ChevronUp size={11} strokeWidth={2} />
            </button>
            <button
              onClick={() => setActiveWeekStart((d) => addWeeks(d, 1))}
              className="h-3 w-5 flex items-center justify-center text-[#6c6c6c] dark:text-[#969696] hover:text-[#333333] dark:hover:text-[#cccccc] hover:bg-[#e8e8e8] dark:hover:bg-[#2a2d2e] focus:outline-none"
              aria-label="Volgende week"
            >
              <ChevronDown size={11} strokeWidth={2} />
            </button>
          </div>
          <button
            onClick={() => setActiveWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            className="h-[22px] px-2 ml-1 text-[11px] text-[#333333] dark:text-[#cccccc] hover:bg-[#e8e8e8] dark:hover:bg-[#2a2d2e] focus:outline-none"
          >
            Vandaag
          </button>
          <button className="h-[22px] px-2 text-[11px] text-[#333333] dark:text-[#cccccc] hover:bg-[#e8e8e8] dark:hover:bg-[#2a2d2e] focus:outline-none flex items-center gap-1">
            <Filter size={11} strokeWidth={2} />
            Filters
            <ChevronDown size={10} className="opacity-60" strokeWidth={2} />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button className="h-[22px] px-2 text-[11px] text-[#333333] dark:text-[#cccccc] hover:bg-[#e8e8e8] dark:hover:bg-[#2a2d2e] focus:outline-none flex items-center gap-1">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Inleveren
          </button>
          {onQuickAdd && (
            <button
              onClick={onQuickAdd}
              className="h-[22px] px-2 text-[11px] text-white bg-[#7c3aed] hover:bg-[#6d28d9] focus:outline-none flex items-center gap-1"
            >
              <Plus size={12} strokeWidth={2.25} />
              Toevoegen
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto [scrollbar-width:thin]">
        <div className="min-w-[1100px]">
          <div
            className="sticky top-0 z-10 bg-[#f3f3f3] dark:bg-[#252526] grid border-b border-[#e7e7e7] dark:border-[#1e1e1e]"
            style={{ gridTemplateColumns: "240px repeat(5, minmax(0, 1fr))" }}
          >
            <div className="px-3 py-2 border-r border-[#e7e7e7] dark:border-[#1e1e1e]" />
            {dayHeaders.map((label, idx) => (
              <div key={label} className={clsx(
                "px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-[#6c6c6c] dark:text-[#969696]",
                idx !== 4 && "border-r border-[#e7e7e7] dark:border-[#1e1e1e]"
              )}>
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
                className="grid border-b border-[#e7e7e7] dark:border-[#252526]"
                style={{ gridTemplateColumns: "240px repeat(5, minmax(0, 1fr))" }}
              >
                <div className="border-r border-[#e7e7e7] dark:border-[#252526] px-3 py-2.5 min-h-[180px] bg-[#f8f8f8] dark:bg-[#1e1e1e]">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#6c6c6c] dark:text-[#969696]">Weektaken</p>
                    <p className="text-[10px] text-[#969696] dark:text-[#858585] tabular-nums font-mono">w{String(weekNumber).padStart(2, "0")}</p>
                  </div>

                  <div className="mt-2 space-y-1">
                    {weekItems.length === 0 ? null : (
                      weekItems.map((item) => (
                        <TaskCard
                          key={`${item.id}-${item.dueDate.toISOString()}`}
                          title={item.title}
                          subtitle={item.subtitle}
                          warning={item.warning}
                          onClick={() => onSelect?.({ kind: item.itemKind, id: item.itemId })}
                        />
                      ))
                    )}
                  </div>
                </div>

                {weekDays.map((day, idx) => {
                  const key = format(day, "yyyy-MM-dd")
                  const items = dayBlocks[key] ?? []
                  const today = isSameDay(day, new Date())

                  return (
                    <div
                      key={key}
                      className={clsx(
                        "px-2.5 py-2.5 min-h-[180px]",
                        idx !== 4 && "border-r border-[#e7e7e7] dark:border-[#252526]"
                      )}
                    >
                      <p className={clsx(
                        "text-[11px] tabular-nums font-mono",
                        today ? "text-[#7c3aed] font-semibold" : "text-[#969696] dark:text-[#858585]"
                      )}>
                        {format(day, "dd")}
                      </p>

                      <div className="mt-1.5 space-y-1">
                        {items.map((item) => (
                          <TaskCard
                            key={item.id}
                            title={item.title}
                            subtitle={item.subtitle}
                            warning={item.warning}
                            onClick={() => onSelect?.({ kind: item.itemKind, id: item.itemId })}
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

      {modal && (
        <div className="fixed inset-0 bg-black/40 dark:bg-black/70 z-40 flex items-center justify-center">
          <div className="bg-white dark:bg-[#252526] border border-[#cccccc] dark:border-[#454545] w-[400px] shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
            <div className="flex justify-between items-center px-3 py-2 bg-[#f3f3f3] dark:bg-[#2d2d30] border-b border-[#e7e7e7] dark:border-[#1e1e1e]">
              <span className="text-[12px] font-medium text-[#333333] dark:text-[#cccccc] uppercase tracking-wide">Add homework</span>
              <button onClick={() => setModal(false)} className="h-5 w-5 flex items-center justify-center text-[#6c6c6c] dark:text-[#969696] hover:text-[#333333] dark:hover:text-[#cccccc] hover:bg-[#e8e8e8] dark:hover:bg-[#2a2d2e] focus:outline-none">
                <X size={13} strokeWidth={2} />
              </button>
            </div>

            <div className="p-3 space-y-2.5">
              <input
                className="w-full px-2 py-1.5 bg-white dark:bg-[#1e1e1e] border border-[#cccccc] dark:border-[#3c3c3c] text-[#333333] dark:text-[#cccccc] text-[13px] focus:outline-none focus:border-[#7c3aed]"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <textarea
                className="w-full px-2 py-1.5 bg-white dark:bg-[#1e1e1e] border border-[#cccccc] dark:border-[#3c3c3c] text-[#333333] dark:text-[#cccccc] text-[13px] focus:outline-none focus:border-[#7c3aed] resize-none font-mono"
                placeholder="Description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <div className="text-[11px] text-[#6c6c6c] dark:text-[#969696] font-mono">
                {selectedLesson
                  ? `${selectedLesson.subject} | ${format(
                      new Date(selectedLesson.startTime),
                      "EEEE d MMM | HH:mm"
                    )}`
                  : "No lesson selected"}
              </div>

              <button
                onClick={() => setLessonModal(true)}
                className="w-full border border-[#cccccc] dark:border-[#3c3c3c] text-[#333333] dark:text-[#cccccc] text-[12px] py-1.5 hover:bg-[#f3f3f3] dark:hover:bg-[#2a2d2e] focus:outline-none"
              >
                Select lesson
              </button>

              {selectedLesson && (
                <button
                  onClick={() => setSelectedLesson(null)}
                  className="text-[11px] text-[#f48771] hover:text-[#ff6b58] transition-colors"
                >
                  Clear lesson
                </button>
              )}

              <button
                onClick={submit}
                disabled={!selectedLesson || !title.trim()}
                className="w-full bg-[#7c3aed] text-white text-[12px] font-medium py-1.5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#6d28d9] transition-colors focus:outline-none"
              >
                Create
              </button>
            </div>

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
  onClick,
}: {
  title: string
  subtitle?: string
  warning?: boolean
  onClick?: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "w-full text-left border-l-2 px-2 py-1 transition-colors cursor-pointer focus:outline-none",
        warning
          ? "bg-[#fdeeee] dark:bg-[#3a1d1d]/40 border-l-[#f48771] hover:bg-[#fce5e5] dark:hover:bg-[#3a1d1d]/60"
          : "bg-[#f8f8f8] dark:bg-[#2d2d30] border-l-[#7c3aed] hover:bg-[#eeeeee] dark:hover:bg-[#37373d]"
      )}
    >
      <div className="flex items-center gap-1.5">
        {warning ? (
          <AlertTriangle size={10} className="text-[#f48771] flex-shrink-0" strokeWidth={2.25} />
        ) : (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#969696] flex-shrink-0">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        )}
        <p className="text-[11.5px] font-medium text-[#333333] dark:text-[#cccccc] leading-tight truncate">{title}</p>
      </div>
      {subtitle && (
        <p className="mt-0.5 ml-[16px] text-[10.5px] text-[#6c6c6c] dark:text-[#969696] leading-tight truncate font-mono">{subtitle}</p>
      )}
    </button>
  )
}
