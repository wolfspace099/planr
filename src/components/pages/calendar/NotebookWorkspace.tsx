import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { format } from "date-fns";
import clsx from "clsx";
import { useSearchParams } from "react-router-dom";
import Fuse from "fuse.js";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  FilePlus2,
  FileText,
  Folder,
  FolderOpen,
  Save,
  Search,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import NoteEditor from "../../editor/NoteEditor";

type ContextMenuState = {
  pageId: Id<"notebookPages">;
  x: number;
  y: number;
} | null;

type InspectorMode = "meta" | "homework" | "test";

type InspectorState = {
  open: boolean;
  mode: InspectorMode;
};

export function NotebookWorkspace() {
  const [searchParams] = useSearchParams();
  const requestedSubject = searchParams.get("subject") ?? "";

  const subjects = useQuery(api.lessons.getSubjects) ?? [];
  const [subject, setSubject] = useState("");
  const [search, setSearch] = useState("");

  const pages = useQuery(
    api.notebook.listPagesBySubject,
    subject ? { subject } : "skip",
  );

  const [pageId, setPageId] = useState<Id<"notebookPages"> | null>(null);

  const pageBundle = useQuery(
    api.notebook.getPageBundle,
    pageId ? { pageId } : "skip",
  );

  const linkables = useQuery(
    api.notebook.listLinkablesBySubject,
    subject ? { subject } : "skip",
  );

  const createPage = useMutation(api.notebook.createPage);
  const updatePageMeta = useMutation(api.notebook.updatePageMeta);
  const updateTypedContent = useMutation(api.notebook.updateTypedContent);
  const deletePage = useMutation(api.notebook.deletePage);
  const upsertLink = useMutation(api.notebook.upsertLink);
  const removeLink = useMutation(api.notebook.removeLink);

  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [inspector, setInspector] = useState<InspectorState>({ open: false, mode: "meta" });

  const [saveState, setSaveState] = useState<"saved" | "saving" | "idle">("idle");

  const [subjectCollapsed, setSubjectCollapsed] = useState<Record<string, boolean>>({});
  const [chapterCollapsed, setChapterCollapsed] = useState<Record<string, boolean>>({});

  const [metaTitle, setMetaTitle] = useState("");
  const [metaChapter, setMetaChapter] = useState("");
  const [metaTags, setMetaTags] = useState("");
  const [metaDate, setMetaDate] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);

  const [selectedHomeworkId, setSelectedHomeworkId] = useState("");
  const [selectedTestId, setSelectedTestId] = useState("");

  const activePage = pageBundle?.page ?? null;

  useEffect(() => {
    if (subject || subjects.length === 0) return;
    if (requestedSubject && subjects.includes(requestedSubject)) {
      setSubject(requestedSubject);
      return;
    }
    setSubject(subjects[0]);
  }, [requestedSubject, subject, subjects]);

  useEffect(() => {
    if (!pages) return;
    if (pages.length === 0) {
      setPageId(null);
      return;
    }
    if (!pageId || !pages.some((p) => p._id === pageId)) {
      setPageId(pages[0]._id);
    }
  }, [pageId, pages]);

  useEffect(() => {
    if (!activePage) return;
    setMetaTitle(activePage.title ?? "");
    setMetaChapter(activePage.chapter ?? "");
    setMetaTags((activePage.tags ?? []).join(", "));
    setMetaDate(activePage.noteDate ? format(new Date(activePage.noteDate), "yyyy-MM-dd") : "");
  }, [activePage]);

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
  }, []);

  const filteredPages = useMemo(() => {
    const source = pages ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return source;
    const fuseItems = source.map((p) => ({
      ...p,
      contentText: htmlToText(p.typedContent),
      tagsText: (p.tags ?? []).join(" "),
    }));

    const fuse = new Fuse(fuseItems, {
      includeScore: true,
      threshold: 0.35,
      ignoreLocation: true,
      minMatchCharLength: 2,
      keys: [
        { name: "title", weight: 0.35 },
        { name: "chapter", weight: 0.2 },
        { name: "tagsText", weight: 0.2 },
        { name: "contentText", weight: 0.25 },
      ],
    });

    return fuse.search(q).map((result) => result.item);
  }, [pages, search]);

  const groupedPages = useMemo(() => {
    const map = new Map<string, typeof filteredPages>();
    for (const page of filteredPages) {
      const chapter = (page.chapter ?? "No chapter").trim() || "No chapter";
      const bucket = map.get(chapter);
      if (bucket) bucket.push(page);
      else map.set(chapter, [page]);
    }

    for (const [, bucket] of map) {
      bucket.sort((a, b) => b.updatedAt - a.updatedAt);
    }

    return Array.from(map.entries()).sort(([a], [b]) => {
      if (a === "No chapter") return 1;
      if (b === "No chapter") return -1;
      return a.localeCompare(b);
    });
  }, [filteredPages]);

  const createNewPage = async () => {
    if (!subject) return;
    const id = await createPage({ subject, title: "untitled" });
    setPageId(id);
  };

  const removePage = async (targetPageId: Id<"notebookPages">) => {
    await deletePage({ pageId: targetPageId });
    setContextMenu(null);
  };

  const openInspector = (nextMode: InspectorMode, id?: Id<"notebookPages">) => {
    if (id) setPageId(id);
    setContextMenu(null);
    setInspector({ open: true, mode: nextMode });
  };

  const saveMetadata = async () => {
    if (!pageId) return;
    setSavingMeta(true);
    try {
      await updatePageMeta({
        pageId,
        title: metaTitle,
        chapter: metaChapter,
        tags: metaTags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        noteDate: metaDate ? new Date(`${metaDate}T00:00:00`).getTime() : undefined,
        clearNoteDate: !metaDate,
      });
      setInspector((prev) => ({ ...prev, open: false }));
    } finally {
      setSavingMeta(false);
    }
  };

  const linkedHomeworkIds = new Set(
    (pageBundle?.links ?? [])
      .filter((link) => link.kind === "homework" && link.homeworkId)
      .map((link) => String(link.homeworkId)),
  );

  const linkedTestIds = new Set(
    (pageBundle?.links ?? [])
      .filter((link) => link.kind === "test" && link.testId)
      .map((link) => String(link.testId)),
  );

  const addHomeworkLink = async () => {
    if (!pageId || !selectedHomeworkId) return;
    await upsertLink({
      pageId,
      kind: "homework",
      homeworkId: selectedHomeworkId as Id<"homework">,
    });
    setSelectedHomeworkId("");
  };

  const addTestLink = async () => {
    if (!pageId || !selectedTestId) return;
    await upsertLink({
      pageId,
      kind: "test",
      testId: selectedTestId as Id<"tests">,
    });
    setSelectedTestId("");
  };

  const handleEditorChange = async (html: string) => {
    if (!pageId) return;
    setSaveState("saving");
    await updateTypedContent({ pageId, typedContent: html });
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 900);
  };

  return (
    <div className="flex-1 min-h-0 flex bg-[#f5f5f5] text-[#333333]">
      <aside className="w-[340px] border-r border-[#d6d6d6] bg-[#f0f0f0] flex flex-col">
        <div className="h-[35px] px-3 border-b border-[#d6d6d6] flex items-center justify-between">
          <div className="text-[11px] uppercase tracking-wide text-[#6b6b6b] flex items-center gap-1.5">
            <BookOpen size={12} className="text-[#7c3aed]" />
            Explorer
          </div>
          <button
            type="button"
            onClick={createNewPage}
            className="h-5 px-1.5 text-[10px] bg-[#ffffff] hover:bg-[#ececec] border border-[#d0d0d0] text-[#333333] flex items-center gap-1"
          >
            <FilePlus2 size={10} />
            New
          </button>
        </div>

        <div className="px-3 py-2 border-b border-[#d6d6d6]">
          <div className="h-8 px-2 bg-white border border-[#d0d0d0] flex items-center gap-1.5">
            <Search size={12} className="text-[#7b7b7b]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tags, title, chapter, content"
              className="flex-1 bg-transparent text-[12px] text-[#333333] placeholder:text-[#8b8b8b] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-1">
          {subjects.map((subjectName) => {
            const sCollapsed = subjectCollapsed[subjectName] ?? true;
            const isActiveSubject = subject === subjectName;
            return (
              <div key={subjectName}>
                <button
                  type="button"
                  onClick={() => {
                    setSubject(subjectName);
                    setSubjectCollapsed((prev) => ({ ...prev, [subjectName]: !isActiveSubject ? false : !prev[subjectName] }));
                  }}
                  className={clsx(
                    "w-full h-8 px-2 text-left text-[12px] flex items-center gap-1.5",
                    isActiveSubject ? "bg-[#e7e7e7] text-[#111111]" : "text-[#444444] hover:bg-[#eaeaea]",
                  )}
                >
                  {sCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                  {sCollapsed ? <Folder size={13} /> : <FolderOpen size={13} />}
                  <span className="truncate">{subjectName}</span>
                  <span className="ml-auto text-[10px] text-[#8b8b8b]">
                    {subjectName === subject ? (filteredPages?.length ?? 0) : ""}
                  </span>
                </button>

                {isActiveSubject && !sCollapsed && (
                  <div>
                    {groupedPages.map(([chapterName, chapterPages]) => {
                      const chapterKey = `${subjectName}::${chapterName}`;
                      const cCollapsed = chapterCollapsed[chapterKey] ?? true;
                      return (
                        <div key={chapterKey}>
                          <button
                            type="button"
                            onClick={() => setChapterCollapsed((prev) => ({ ...prev, [chapterKey]: !prev[chapterKey] }))}
                            className="w-full h-7 pl-7 pr-2 text-left text-[11px] uppercase tracking-wide text-[#747474] hover:bg-[#eaeaea] flex items-center gap-1"
                          >
                            {cCollapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
                            {cCollapsed ? <Folder size={12} /> : <FolderOpen size={12} />}
                            <span className="truncate">{chapterName}</span>
                          </button>

                          {!cCollapsed && chapterPages.map((p) => (
                            <button
                              key={p._id}
                              type="button"
                              onClick={() => setPageId(p._id)}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setContextMenu({ pageId: p._id, x: e.clientX, y: e.clientY });
                              }}
                              className={clsx(
                                "w-full text-left h-7 pl-12 pr-2 text-[12px] flex items-center gap-1.5",
                                pageId === p._id ? "bg-[#dfe8fb] text-[#11316b]" : "text-[#333333] hover:bg-[#ececec]",
                              )}
                            >
                              <FileText size={11} className="text-[#7b7b7b]" />
                              <span className="truncate">{p.title || "untitled"}</span>
                            </button>
                          ))}
                        </div>
                      );
                    })}

                    {groupedPages.length === 0 && (
                      <div className="pl-12 pr-3 py-2 text-[11px] text-[#8b8b8b]">No pages found.</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {subjects.length === 0 && (
            <div className="px-3 py-3 text-[12px] text-[#8b8b8b]">No subjects available.</div>
          )}
        </div>
      </aside>

      <section className="flex-1 min-w-0 flex flex-col bg-[#ffffff]">
        {!activePage ? (
          <div className="flex-1 flex items-center justify-center text-[#7b7b7b] text-[13px]">
            Select or create a notebook page.
          </div>
        ) : (
          <>
            <div className="h-[35px] border-b border-[#d6d6d6] bg-[#f3f3f3] flex items-end">
              <div className="h-[34px] px-3 bg-[#ffffff] border-r border-[#d6d6d6] text-[12px] text-[#333333] flex items-center gap-1.5">
                <FileText size={12} className="text-[#7b7b7b]" />
                {activePage.title || "untitled"}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <NoteEditor
                content={activePage.typedContent}
                onChange={handleEditorChange}
                placeholder="Write notes here. Use the toolbar for bold, highlights, lists, tables, and more."
              />
            </div>

            <div className="h-[22px] bg-[#efefef] border-t border-[#d6d6d6] text-[#444444] text-[10px] font-medium flex items-center px-2">
              <span>{subject || "Notebook"}</span>
              <span className="mx-2 opacity-70">|</span>
              <span>{activePage.chapter || "No chapter"}</span>
              <div className="flex-1" />
              <span className="inline-flex items-center gap-1">
                <Save size={10} />
                {saveState === "saving" ? "Saving..." : saveState === "saved" ? "Saved" : "Ready"}
              </span>
            </div>
          </>
        )}
      </section>

      {contextMenu && (
        <div
          className="fixed z-50 min-w-[190px] bg-white border border-[#d0d0d0] shadow-[0_8px_30px_rgba(0,0,0,0.18)]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <MenuItem label="Open" onClick={() => { setPageId(contextMenu.pageId); setContextMenu(null); }} />
          <MenuItem label="Edit metadata" onClick={() => openInspector("meta", contextMenu.pageId)} />
          <MenuItem label="Link homework" onClick={() => openInspector("homework", contextMenu.pageId)} />
          <MenuItem label="Link test" onClick={() => openInspector("test", contextMenu.pageId)} />
          <MenuItem label="Delete page" danger onClick={() => removePage(contextMenu.pageId)} />
        </div>
      )}

      {inspector.open && activePage && (
        <div className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center p-4" onClick={() => setInspector((prev) => ({ ...prev, open: false }))}>
          <div
            className="w-full max-w-[720px] bg-white border border-[#d0d0d0]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-[34px] px-3 border-b border-[#e0e0e0] flex items-center justify-between">
              <div className="text-[11px] uppercase tracking-wide text-[#6b6b6b] flex items-center gap-1">
                <Tag size={11} />
                {inspector.mode === "meta" ? "Metadata" : inspector.mode === "homework" ? "Link Homework" : "Link Test"}
              </div>
              <button
                type="button"
                onClick={() => setInspector((prev) => ({ ...prev, open: false }))}
                className="text-[#7b7b7b] hover:text-[#333333]"
              >
                <X size={14} />
              </button>
            </div>

            <div className="p-4">
              {inspector.mode === "meta" && (
                <div className="space-y-3">
                  <InputField label="Page Name" value={metaTitle} onChange={setMetaTitle} />
                  <InputField label="Chapter Folder" value={metaChapter} onChange={setMetaChapter} />
                  <InputField label="Tags (comma separated)" value={metaTags} onChange={setMetaTags} />
                  <label className="block">
                    <span className="text-[11px] text-[#6b6b6b]">Date</span>
                    <input
                      type="date"
                      value={metaDate}
                      onChange={(e) => setMetaDate(e.target.value)}
                      className="mt-1 w-full h-8 px-2 text-[12px] bg-white border border-[#d0d0d0] text-[#333333]"
                    />
                  </label>

                  <div className="pt-1 flex justify-end">
                    <button
                      type="button"
                      onClick={saveMetadata}
                      disabled={savingMeta}
                      className="h-8 px-3 text-[12px] bg-[#ededed] hover:bg-[#e3e3e3] border border-[#cfcfcf] disabled:opacity-50 text-[#333333]"
                    >
                      {savingMeta ? "Saving..." : "Save Metadata"}
                    </button>
                  </div>
                </div>
              )}

              {inspector.mode === "homework" && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <select
                      value={selectedHomeworkId}
                      onChange={(e) => setSelectedHomeworkId(e.target.value)}
                      className="flex-1 h-8 px-2 text-[12px] bg-white border border-[#d0d0d0] text-[#333333]"
                    >
                      <option value="">Select homework...</option>
                      {(linkables?.homework ?? [])
                        .filter((item) => !linkedHomeworkIds.has(String(item._id)))
                        .map((item) => (
                          <option key={item._id} value={item._id}>
                            {item.title} ({format(new Date(item.dueDate), "dd/MM")})
                          </option>
                        ))}
                    </select>
                    <button type="button" onClick={addHomeworkLink} className="h-8 px-3 border border-[#cfcfcf] bg-[#ededed] hover:bg-[#e3e3e3] text-[#333333] text-[12px]">
                      Add
                    </button>
                  </div>

                  <div className="space-y-1">
                    {(pageBundle?.links ?? [])
                      .filter((link) => link.kind === "homework" && link.homeworkId)
                      .map((link) => {
                        const item = (linkables?.homework ?? []).find((h) => h._id === link.homeworkId);
                        return (
                          <LinkedItem
                            key={link._id}
                            label={item ? `${item.title} · ${format(new Date(item.dueDate), "dd/MM/yyyy")}` : "Homework"}
                            onRemove={() => removeLink({ linkId: link._id })}
                          />
                        );
                      })}
                  </div>
                </div>
              )}

              {inspector.mode === "test" && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <select
                      value={selectedTestId}
                      onChange={(e) => setSelectedTestId(e.target.value)}
                      className="flex-1 h-8 px-2 text-[12px] bg-white border border-[#d0d0d0] text-[#333333]"
                    >
                      <option value="">Select test...</option>
                      {(linkables?.tests ?? [])
                        .filter((item) => !linkedTestIds.has(String(item._id)))
                        .map((item) => (
                          <option key={item._id} value={item._id}>
                            {item.topic} ({format(new Date(item.date), "dd/MM")})
                          </option>
                        ))}
                    </select>
                    <button type="button" onClick={addTestLink} className="h-8 px-3 border border-[#cfcfcf] bg-[#ededed] hover:bg-[#e3e3e3] text-[#333333] text-[12px]">
                      Add
                    </button>
                  </div>

                  <div className="space-y-1">
                    {(pageBundle?.links ?? [])
                      .filter((link) => link.kind === "test" && link.testId)
                      .map((link) => {
                        const item = (linkables?.tests ?? []).find((t) => t._id === link.testId);
                        return (
                          <LinkedItem
                            key={link._id}
                            label={item ? `${item.topic} · ${format(new Date(item.date), "dd/MM/yyyy")}` : "Test"}
                            onRemove={() => removeLink({ linkId: link._id })}
                          />
                        );
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  label,
  onClick,
  danger,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "w-full h-8 px-2 text-left text-[12px] hover:bg-[#f2f2f2]",
        danger ? "text-[#b42318]" : "text-[#333333]",
      )}
    >
      {label}
    </button>
  );
}

function InputField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] text-[#6b6b6b]">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full h-8 px-2 text-[12px] bg-white border border-[#d0d0d0] text-[#333333]"
      />
    </label>
  );
}

function LinkedItem({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <div className="h-8 px-2 bg-white border border-[#d0d0d0] text-[12px] flex items-center justify-between gap-2">
      <span className="truncate text-[#333333]">{label}</span>
      <button type="button" onClick={onRemove} className="text-[#b42318] hover:text-[#8f1d14]" title="Remove link">
        <Trash2 size={12} />
      </button>
    </div>
  );
}

function htmlToText(input: string) {
  const value = input ?? "";
  if (!value.includes("<")) return value;
  if (typeof window === "undefined") return value;
  const el = window.document.createElement("div");
  el.innerHTML = value;
  return el.textContent ?? "";
}
