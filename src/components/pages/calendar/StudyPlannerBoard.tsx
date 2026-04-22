import { format } from "date-fns"
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
  days,
  startWeek = 0,
  visibleWeeks = 4,
}: {
  days: Date[]
  startWeek?: number
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
    test: "border-purple-500/30 bg-purple-500/10 text-purple-300",
    homework: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    study: "border-blue-500/30 bg-blue-500/10 text-blue-300",
    task: "border-amber-500/30 bg-amber-500/10 text-amber-300",
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

  const lessonsByDay = useMemo(() => {
    return (lessons ?? [])
      .slice()
      .sort((a: any, b: any) => a.startTime - b.startTime)
      .reduce((acc: Record<string, any[]>, lesson: any) => {
        const day = format(new Date(lesson.startTime), "EEEE d MMM")
        if (!acc[day]) acc[day] = []
        acc[day].push(lesson)
        return acc
      }, {})
  }, [lessons])

  const allWeeks: Date[][] = []
  for (let i = 0; i < days.length; i += 5) {
    allWeeks.push(days.slice(i, i + 5))
  }

  const weeks = allWeeks.slice(startWeek, startWeek + visibleWeeks)

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
      <div className="min-w-[1100px]">
        <div className="sticky top-0 z-20 bg-black/80 backdrop-blur border-b border-white/[0.08] flex justify-between px-4 py-3">
          <div className="text-white font-semibold">
            {weeks[0]?.[0] ? format(weeks[0][0], "MMMM yyyy") : ""}
          </div>

          <button
            onClick={() => setModal(true)}
            className="text-white text-sm flex items-center gap-1"
          >
            <Plus size={14} /> Add homework
          </button>
        </div>

        <div
          className="grid gap-4 p-4"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          }}
        >
          {weeks.map((weekDays, weekIndex) => (
            <div
              key={weekIndex}
              className="border border-white/[0.08] rounded-lg overflow-hidden"
            >
              <div className="px-3 py-2 border-b border-white/[0.06] text-sm font-semibold text-white">
                Week {startWeek + weekIndex + 1}
              </div>

              <div className="grid grid-cols-5">
                {weekDays.map((day) => {
                  const key = format(day, "yyyy-MM-dd")
                  const items = dayBlocks[key] ?? []

                  return (
                    <div
                      key={key}
                      className="p-2 border-l first:border-l-0 border-white/[0.06] min-h-[140px]"
                    >
                      <p className="text-xs text-white/40 mb-2">
                        {format(day, "d")}
                      </p>

                      <div className="space-y-2">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className={clsx(
                              "rounded-lg border p-2",
                              toneClasses[item.tone]
                            )}
                          >
                            <p className="text-xs font-semibold">
                              {item.title}
                            </p>
                            <p className="text-[10px] opacity-70">
                              {item.subtitle}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
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