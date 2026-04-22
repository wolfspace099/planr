import { format, addWeeks, startOfWeek, endOfWeek, eachDayOfInterval } from "date-fns"
import { useMemo, useState } from "react"
import clsx from "clsx"

export function LessonPickerModal({
  open,
  onClose,
  lessons,
  days,
  onSelect,
}: {
  open: boolean
  onClose: () => void
  lessons: any[]
  days: Date[]
  onSelect: (lesson: any) => void
}) {
  const [weekOffset, setWeekOffset] = useState(0)

  const visibleDays = useMemo(() => {
    const baseStart = days[0]
    const start = startOfWeek(addWeeks(baseStart, weekOffset), { weekStartsOn: 1 })
    const end = endOfWeek(start, { weekStartsOn: 1 })

    return eachDayOfInterval({ start, end }).slice(0, 5)
  }, [days, weekOffset])

  const lessonsByDay = useMemo(() => {
    const map: Record<string, any[]> = {}

    for (const lesson of lessons ?? []) {
      const key = format(new Date(lesson.startTime), "yyyy-MM-dd")
      if (!map[key]) map[key] = []
      map[key].push(lesson)
    }

    return map
  }, [lessons])

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="w-[780px] max-h-[80vh] bg-[#0f0f0f] border border-white/10 rounded-xl overflow-hidden flex flex-col">

        {/* HEADER */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setWeekOffset((v) => v - 1)}
              className="text-white text-lg px-2 hover:text-white/70"
            >
              ‹
            </button>

            <p className="text-white text-sm font-medium">
              {format(visibleDays[0], "MMMM yyyy")}
            </p>

            <button
              onClick={() => setWeekOffset((v) => v + 1)}
              className="text-white text-lg px-2 hover:text-white/70"
            >
              ›
            </button>
          </div>

          <button onClick={onClose} className="text-white/60 hover:text-white">
            ×
          </button>
        </div>

        {/* GRID */}
        <div className="p-3 overflow-auto">
          <div className="grid grid-cols-5 gap-2">
            {visibleDays.map((day) => {
              const key = format(day, "yyyy-MM-dd")
              const dayLessons = lessonsByDay[key] ?? []

              return (
                <div
                  key={key}
                  className={clsx(
                    "border border-white/10 rounded-lg p-2 min-h-[150px]",
                    dayLessons.length > 0
                      ? "bg-white/[0.02] hover:bg-white/[0.05]"
                      : "opacity-60"
                  )}
                >
                  <p className="text-[10px] text-white/40 mb-2">
                    {format(day, "EEE d")}
                  </p>

                  <div className="space-y-2">
                    {dayLessons.length === 0 ? (
                      <p className="text-[10px] text-white/20">
                        No lessons
                      </p>
                    ) : (
                      dayLessons.map((lesson) => (
                        <button
                          key={lesson._id}
                          onClick={() => onSelect(lesson)}
                          className="w-full text-left px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 transition"
                        >
                          <p className="text-[11px] text-white font-medium truncate">
                            {lesson.subject}
                          </p>
                          <p className="text-[9px] text-white/40">
                            {format(new Date(lesson.startTime), "HH:mm")} –{" "}
                            {format(new Date(lesson.endTime), "HH:mm")}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}