import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { BookOpen, ChevronRight } from "lucide-react";
import { PageHeader, Button, EmptyState } from "../components/ui/primitives";

export default function NotebookPage() {
  const navigate = useNavigate();
  const subjects = useQuery(api.lessons.getSubjects);

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="Notebook"
        subtitle="One notebook per subject — ink-first, with typed notes when you need them"
      />

      {(subjects?.length ?? 0) === 0 ? (
        <EmptyState
          icon={<BookOpen size={32} />}
          title="No subjects yet"
          description="Sync your Zermelo calendar in Settings to import your lessons."
          action={<Button onClick={() => navigate("/settings")}>Go to Settings</Button>}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {subjects?.map((subject) => (
            <Link key={subject} to={`/notebook/${encodeURIComponent(subject)}`}>
              <div className="p-4 bg-surface border border-border rounded-lg hover:border-border-strong hover:shadow-card transition-all group cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-2 bg-accent-light rounded">
                    <BookOpen size={16} className="text-accent" />
                  </div>
                  <ChevronRight size={14} className="text-ink-light group-hover:text-ink transition-colors" />
                </div>
                <p className="font-semibold text-ink text-sm mt-2">{subject}</p>
                <p className="text-xs text-ink-muted mt-0.5">Open notebook →</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
