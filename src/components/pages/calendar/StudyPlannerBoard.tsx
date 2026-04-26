import {
  addWeeks,
  eachDayOfInterval,
  endOfWeek,
  format,
  getISOWeek,
  startOfWeek,
} from "date-fns"
import clsx from "clsx"
import { useMemo, useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "../../../../convex/_generated/api"
import { Plus, X } from "lucide-react"
import { LessonPickerModal } from "./LessonPickerModal"

export type PlannerBlock = {
  id: string
  title: string
  subtitle: string
  tone: "test" | "homework" | "study" | "task"
}

export function StudyPlannerBoard({
  weekStart,
  visibleWeeks = 4,
}: {
  weekStart: Date
  visibleWeeks?: number
}) {
  const homework = useQuery(api.homework.getAll)
  const lessons = useQuery(api.lessons.getAll)

  const create = useMutation(api.homework.create)

  const [modal, setModal] = useState(false)
  const [lessonModal, setLessonModal] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState<any>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")

  const toneClasses: Record<PlannerBlock["tone"], string> = {
    test: "border-l-orange-400/90",
    homework: "border-l-blue-400/90",
    study: "border-l-emerald-400/90",
    task: "border-l-violet-400/90",
  }

  const dayBlocks: Record<string, PlannerBlock[]> = useMemo(() => {
    const map: Record<string, PlannerBlock[]> = {}

    for (const h of homework ?? []) {
      const key = format(new Date(h.dueDate), "yyyy-MM-dd")

      if (!map[key]) map[key] = []

      map[key].push({
        id: h._id,
        title: h.title,
        subtitle: h.subject,
        tone: "homework",
      })
    }

    return map
  }, [homework])

  const weeks = useMemo(() => {
    return Array.from({ length: visibleWeeks }, (_, index) => {
      const start = startOfWeek(addWeeks(weekStart, index), { weekStartsOn: 1 })
      const end = endOfWeek(start, { weekStartsOn: 1 })
      return eachDayOfInterval({ start, end }).slice(0, 5)
    })
  }, [visibleWeeks, weekStart])

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

  return (
    <div className="h-full overflow-y-auto">
      <div className="min-w-[1200px]">
        <div className="sticky top-0 z-20 bg-black/80 backdrop-blur border-b border-white/[0.08] flex justify-between px-4 py-3">
          <div className="text-white font-semibold">
            {format(weekStart, "MMMM yyyy")}
          </div>

          <button
            onClick={() => setModal(true)}
            className="text-white text-sm flex items-center gap-1"
          >
            <Plus size={14} /> Add homework
          </button>
        </div>

        <div className="border-t border-white/[0.08]">
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
                className="grid border-b border-white/[0.08]"
                style={{ gridTemplateColumns: "260px repeat(5, minmax(0, 1fr))" }}
              >
                <div className="border-r border-white/[0.08] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[24px] font-semibold text-white/75 leading-none">
                      Weektaken
                    </p>
                    <p className="text-[14px] text-white/35 whitespace-nowrap">
                      Week {weekNumber}
                    </p>
                  </div>

                  <div className="mt-4 space-y-1.5">
                    {weekItems.length === 0 ? (
                      <p className="text-xs text-white/25">Geen weektaken</p>
                    ) : (
                      weekItems.map((item) => (
                        <div
                          key={`${item.id}-${item.dueDate.toISOString()}`}
                          className={clsx(
                            "rounded-md border border-white/[0.14] bg-[#28313a]/70 border-l-[3px] px-3 py-2",
                            toneClasses[item.tone]
                          )}
                        >
                          <p className="text-[12px] font-semibold text-white leading-tight truncate">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-white/65 truncate">
                            {item.subtitle} | {format(item.dueDate, "EEE d")}
                          </p>
                        </div>
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
                      className="border-r last:border-r-0 border-white/[0.08] px-3 py-3 min-h-[230px] bg-[#111821]"
                    >
                      <p className="text-sm font-semibold text-white/80">
                        {format(day, "d")}
                      </p>

                      <div className="mt-2 space-y-1.5">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className={clsx(
                              "rounded-md border border-white/[0.14] bg-[#28313a]/85 border-l-[3px] px-3 py-2",
                              toneClasses[item.tone]
                            )}
                          >
                            <p className="text-[12px] font-semibold text-white leading-tight truncate">
                              {item.title}
                            </p>
                            <p className="text-[11px] text-white/65 truncate">
                              {item.subtitle}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>

        {modal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
            <div className="bg-black border border-white/10 p-4 rounded-lg w-[380px] space-y-3">
              <div className="flex justify-between text-white">
                <span>Add homework</span>
                <button onClick={() => setModal(false)}>
                  <X size={14} />
                </button>
              </div>

              <input
                className="w-full p-2 bg-white/5 text-white text-sm"
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />

              <textarea
                className="w-full p-2 bg-white/5 text-white text-sm"
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <div className="space-y-2">
                <div className="text-xs text-white/60">
                  {selectedLesson
                    ? `${selectedLesson.subject} · ${format(
                        new Date(selectedLesson.startTime),
                        "EEEE d MMM · HH:mm"
                      )}`
                    : "No lesson selected"}
                </div>

                <button
                  onClick={() => setLessonModal(true)}
                  className="w-full border border-white/10 text-white text-sm py-2 rounded"
                >
                  Select lesson
                </button>

                {selectedLesson && (
                  <button
                    onClick={() => setSelectedLesson(null)}
                    className="text-xs text-red-400"
                  >
                    Clear lesson
                  </button>
                )}
              </div>

              <button
                onClick={submit}
                disabled={!selectedLesson || !title.trim()}
                className="w-full bg-white text-black text-sm py-2 rounded disabled:opacity-40"
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
    </div>
  )
}
