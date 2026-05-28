"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  FileText,
  GitCompare,
  Layers3,
  Loader2,
  Plus,
  Send,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  createMockAnalysis,
  defaultDrafts,
  defaultProject,
  defaultSections,
} from "@/lib/planmerge/defaults";
import type {
  AnalyzeResponse,
  ComparisonGroup,
  ComparisonOption,
  DraftSubmissionInput,
  FinalDocumentSection,
  PlanMergeProject,
} from "@/lib/planmerge/types";

type TabId = "basis" | "compare" | "conflicts" | "sources";

const riskLabel: Record<string, string> = {
  none: "없음",
  low: "낮음",
  medium: "중간",
  high: "높음",
};

const statusLabel: Record<string, string> = {
  auto_selected: "AI 선택",
  needs_review: "검토 필요",
  approved: "승인됨",
  overridden: "변경됨",
};

const recommendationLabel: Record<string, string> = {
  select: "선택",
  keep_as_alternative: "대안 유지",
  defer: "후순위",
  reject_for_mvp: "MVP 제외",
  needs_human_decision: "사람 결정",
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function riskTone(level: string) {
  if (level === "high") {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (level === "medium") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (level === "low") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  return "border-zinc-200 bg-zinc-50 text-zinc-600";
}

function optionTone(option: ComparisonOption) {
  if (option.optionType === "selected") {
    return "border-emerald-300 bg-emerald-50";
  }

  if (option.optionType === "direct_conflict") {
    return "border-red-300 bg-red-50";
  }

  if (option.optionType === "tradeoff") {
    return "border-amber-300 bg-amber-50";
  }

  return "border-zinc-200 bg-white";
}

function nextDraftId() {
  return `draft_${Math.random().toString(36).slice(2, 8)}`;
}

export function PlanMergeWorkbench() {
  const [project, setProject] = useState<PlanMergeProject>(defaultProject);
  const [drafts, setDrafts] = useState<DraftSubmissionInput[]>(defaultDrafts);
  const [result, setResult] = useState<AnalyzeResponse>(() => createMockAnalysis());
  const [selectedSectionKey, setSelectedSectionKey] = useState("mvp_scope");
  const [hoveredSectionKey, setHoveredSectionKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("basis");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const groupsBySection = useMemo(() => {
    return new Map(result.comparisonGroups.map((group) => [group.sectionKey, group]));
  }, [result.comparisonGroups]);

  const selectedGroup =
    groupsBySection.get(selectedSectionKey) ?? result.comparisonGroups[0] ?? null;

  async function analyzeDrafts() {
    setIsAnalyzing(true);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          project,
          sections: defaultSections,
          drafts,
        }),
      });

      const data = (await response.json()) as AnalyzeResponse;
      setResult(data);
      setSelectedSectionKey(data.finalDocument.sections[0]?.sectionKey ?? "mvp_scope");
      setActiveTab("basis");
    } finally {
      setIsAnalyzing(false);
    }
  }

  function updateProject<Key extends keyof PlanMergeProject>(
    key: Key,
    value: PlanMergeProject[Key],
  ) {
    setProject((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateDraft(index: number, patch: Partial<DraftSubmissionInput>) {
    setDrafts((current) =>
      current.map((draft, draftIndex) =>
        draftIndex === index ? { ...draft, ...patch } : draft,
      ),
    );
  }

  function addDraft() {
    setDrafts((current) => [
      ...current,
      {
        draftId: nextDraftId(),
        authorName: "",
        authorRole: "",
        aiModel: "Other",
        taskTitle: "",
        rawText: "",
      },
    ]);
  }

  return (
    <div className="min-h-screen bg-[#f5f5ef] text-zinc-950">
      <header className="border-b border-zinc-200 bg-white/90">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-4 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-lg bg-zinc-950 text-white">
              <Layers3 size={20} aria-hidden="true" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">PlanMerge</h1>
              <p className="text-sm text-zinc-600">AI 선택안과 다른 의견을 함께 보는 병합 워크벤치</p>
            </div>
          </div>
          <button
            type="button"
            onClick={analyzeDrafts}
            disabled={isAnalyzing}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {isAnalyzing ? (
              <Loader2 className="animate-spin" size={16} aria-hidden="true" />
            ) : (
              <Sparkles size={16} aria-hidden="true" />
            )}
            AI 분석 실행
          </button>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1500px] gap-4 px-4 py-4 xl:grid-cols-[380px_minmax(0,1fr)]">
        <aside className="space-y-4">
          <ProjectSetup project={project} onChange={updateProject} />
          <DraftSubmit drafts={drafts} onDraftChange={updateDraft} onAddDraft={addDraft} />
        </aside>

        <section className="space-y-4">
          <SummaryBar result={result} />
          {result.apiError ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {result.apiError}
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.03fr)_minmax(390px,0.97fr)]">
            <FinalDocumentPanel
              result={result}
              groupsBySection={groupsBySection}
              selectedSectionKey={selectedSectionKey}
              hoveredSectionKey={hoveredSectionKey}
              onHover={setHoveredSectionKey}
              onSelect={(sectionKey) => {
                setSelectedSectionKey(sectionKey);
                setActiveTab("basis");
              }}
              onOpenCompare={(sectionKey) => {
                setSelectedSectionKey(sectionKey);
                setActiveTab("compare");
              }}
            />
            <ComparisonPanel
              group={selectedGroup}
              activeTab={activeTab}
              onTabChange={setActiveTab}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

function ProjectSetup({
  project,
  onChange,
}: {
  project: PlanMergeProject;
  onChange: <Key extends keyof PlanMergeProject>(
    key: Key,
    value: PlanMergeProject[Key],
  ) => void;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="mb-4 flex items-center gap-2">
        <FileText size={18} aria-hidden="true" />
        <h2 className="font-semibold">Project Setup</h2>
      </div>
      <div className="space-y-3">
        <Field label="프로젝트명">
          <input
            value={project.title}
            onChange={(event) => onChange("title", event.target.value)}
            className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm outline-none focus:border-zinc-500"
          />
        </Field>
        <Field label="기획서 목표">
          <textarea
            value={project.goal}
            onChange={(event) => onChange("goal", event.target.value)}
            rows={3}
            className="w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
          />
        </Field>
        <Field label="공통 기준">
          <textarea
            value={project.contextPack}
            onChange={(event) => onChange("contextPack", event.target.value)}
            rows={4}
            className="w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
          />
        </Field>
        <Field label="금지할 방향">
          <textarea
            value={project.forbiddenDirections}
            onChange={(event) => onChange("forbiddenDirections", event.target.value)}
            rows={3}
            className="w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-500"
          />
        </Field>
      </div>
    </section>
  );
}

function DraftSubmit({
  drafts,
  onDraftChange,
  onAddDraft,
}: {
  drafts: DraftSubmissionInput[];
  onDraftChange: (index: number, patch: Partial<DraftSubmissionInput>) => void;
  onAddDraft: () => void;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Send size={18} aria-hidden="true" />
          <h2 className="font-semibold">Draft Submit</h2>
        </div>
        <button
          type="button"
          onClick={onAddDraft}
          className="inline-flex size-8 items-center justify-center rounded-md border border-zinc-200 text-zinc-700 transition hover:bg-zinc-50"
          title="초안 추가"
          aria-label="초안 추가"
        >
          <Plus size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="space-y-4">
        {drafts.map((draft, index) => (
          <div key={draft.draftId} className="rounded-lg border border-zinc-200 p-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                value={draft.authorName}
                onChange={(event) => onDraftChange(index, { authorName: event.target.value })}
                placeholder="작성자"
                className="h-9 rounded-md border border-zinc-200 px-2 text-sm outline-none focus:border-zinc-500"
              />
              <input
                value={draft.authorRole}
                onChange={(event) => onDraftChange(index, { authorRole: event.target.value })}
                placeholder="역할"
                className="h-9 rounded-md border border-zinc-200 px-2 text-sm outline-none focus:border-zinc-500"
              />
              <input
                value={draft.aiModel}
                onChange={(event) => onDraftChange(index, { aiModel: event.target.value })}
                placeholder="사용 AI"
                className="h-9 rounded-md border border-zinc-200 px-2 text-sm outline-none focus:border-zinc-500"
              />
              <input
                value={draft.taskTitle}
                onChange={(event) => onDraftChange(index, { taskTitle: event.target.value })}
                placeholder="작업 주제"
                className="h-9 rounded-md border border-zinc-200 px-2 text-sm outline-none focus:border-zinc-500"
              />
            </div>
            <textarea
              value={draft.rawText}
              onChange={(event) => onDraftChange(index, { rawText: event.target.value })}
              rows={5}
              placeholder="AI 초안 원문"
              className="mt-2 w-full resize-none rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-500"
            />
          </div>
        ))}
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-zinc-600">{label}</span>
      {children}
    </label>
  );
}

function SummaryBar({ result }: { result: AnalyzeResponse }) {
  const metrics = [
    ["섹션", result.summary.sectionCount],
    ["AI 선택", result.summary.autoSelectedCount],
    ["검토 필요", result.summary.needsReviewCount],
    ["충돌", result.summary.conflictCount],
  ];

  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <Sparkles size={18} aria-hidden="true" />
            <h2 className="font-semibold">Merge Result</h2>
            {result.usedMock ? (
              <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-600">
                Sample
              </span>
            ) : (
              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                OpenAI
              </span>
            )}
          </div>
          <p className="max-w-3xl text-sm leading-6 text-zinc-700">{result.summary.text}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {metrics.map(([label, value]) => (
            <div key={label} className="rounded-lg border border-zinc-200 px-3 py-2">
              <div className="text-xs text-zinc-500">{label}</div>
              <div className="text-lg font-semibold">{value}</div>
            </div>
          ))}
          <div className={cn("rounded-lg border px-3 py-2", riskTone(result.summary.overallRiskLevel))}>
            <div className="text-xs">위험도</div>
            <div className="text-lg font-semibold">{riskLabel[result.summary.overallRiskLevel]}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalDocumentPanel({
  result,
  groupsBySection,
  selectedSectionKey,
  hoveredSectionKey,
  onHover,
  onSelect,
  onOpenCompare,
}: {
  result: AnalyzeResponse;
  groupsBySection: Map<string, ComparisonGroup>;
  selectedSectionKey: string;
  hoveredSectionKey: string | null;
  onHover: (sectionKey: string | null) => void;
  onSelect: (sectionKey: string) => void;
  onOpenCompare: (sectionKey: string) => void;
}) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 px-4 py-3">
        <div className="flex items-center gap-2">
          <FileText size={18} aria-hidden="true" />
          <h2 className="font-semibold">{result.finalDocument.title}</h2>
        </div>
      </div>
      <div className="space-y-3 p-4">
        {result.finalDocument.sections
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((section) => {
            const group = groupsBySection.get(section.sectionKey);
            const isSelected = selectedSectionKey === section.sectionKey;
            const isHovered = hoveredSectionKey === section.sectionKey;

            return (
              <FinalSection
                key={section.sectionKey}
                section={section}
                group={group}
                isSelected={isSelected}
                isHovered={isHovered}
                onHover={onHover}
                onSelect={onSelect}
                onOpenCompare={onOpenCompare}
              />
            );
          })}
      </div>
    </section>
  );
}

function FinalSection({
  section,
  group,
  isSelected,
  isHovered,
  onHover,
  onSelect,
  onOpenCompare,
}: {
  section: FinalDocumentSection;
  group?: ComparisonGroup;
  isSelected: boolean;
  isHovered: boolean;
  onHover: (sectionKey: string | null) => void;
  onSelect: (sectionKey: string) => void;
  onOpenCompare: (sectionKey: string) => void;
}) {
  return (
    <article
      data-section-key={section.sectionKey}
      className={cn(
        "relative rounded-lg border bg-white p-4 transition",
        isSelected ? "border-zinc-900 shadow-sm" : "border-zinc-200 hover:border-zinc-400",
      )}
      onMouseEnter={() => onHover(section.sectionKey)}
      onMouseLeave={() => onHover(null)}
      onFocus={() => onHover(section.sectionKey)}
      onBlur={() => onHover(null)}
    >
      <button
        type="button"
        onClick={() => onSelect(section.sectionKey)}
        className="block w-full text-left"
      >
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="font-semibold">
            {section.sortOrder}. {section.title}
          </span>
          <Badge tone={section.status === "needs_review" ? "amber" : "zinc"}>
            {statusLabel[section.status]}
          </Badge>
          <Badge tone={section.conflictLevel === "high" ? "red" : "zinc"}>
            충돌 {riskLabel[section.conflictLevel]}
          </Badge>
          <span className="ml-auto text-xs text-zinc-500">
            {Math.round(section.confidence * 100)}%
          </span>
        </div>
        <p className="text-sm leading-6 text-zinc-700">
          <span className="decoration-amber-500 decoration-dotted underline underline-offset-4">
            {section.content}
          </span>
        </p>
      </button>

      {group && isHovered ? (
        <HoverPreview group={group} onOpenCompare={() => onOpenCompare(section.sectionKey)} />
      ) : null}
    </article>
  );
}

function HoverPreview({
  group,
  onOpenCompare,
}: {
  group: ComparisonGroup;
  onOpenCompare: () => void;
}) {
  const alternatives = group.options.filter((option) =>
    ["compatible_alternative", "tradeoff", "out_of_scope", "same_direction"].includes(
      option.optionType,
    ),
  );
  const conflicts = group.options.filter((option) => option.optionType === "direct_conflict");

  return (
    <div
      data-testid="hover-preview"
      className="absolute left-4 right-4 top-12 z-30 max-h-[72vh] overflow-auto rounded-lg border border-zinc-200 bg-white p-4 shadow-xl max-sm:fixed max-sm:inset-x-4 max-sm:bottom-4 max-sm:top-auto"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 text-xs font-medium text-zinc-500">판단 질문</div>
          <p className="text-sm font-semibold leading-5">{group.decisionQuestion}</p>
        </div>
        {group.needsHumanReview ? <Badge tone="amber">검토 필요</Badge> : <Badge tone="green">안정</Badge>}
      </div>

      <div className="space-y-3 text-sm">
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
          <div className="mb-1 flex items-center gap-2 font-medium text-emerald-900">
            <CheckCircle2 size={15} aria-hidden="true" />
            AI 선택
          </div>
          <p className="leading-5 text-emerald-900">{group.aiConclusion}</p>
        </div>

        <p className="leading-5 text-zinc-700">{group.keyDifferenceSummary}</p>

        {alternatives.length ? (
          <div>
            <div className="mb-1 text-xs font-medium text-zinc-500">
              다른 의견 {alternatives.length}개
            </div>
            <ul className="space-y-1">
              {alternatives.slice(0, 2).map((option) => (
                <li key={option.id} className="flex gap-2 text-zinc-700">
                  <ChevronRight className="mt-0.5 shrink-0" size={14} aria-hidden="true" />
                  <span>{option.summary}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {conflicts.length ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <div className="mb-1 flex items-center gap-2 font-medium text-red-900">
              <AlertTriangle size={15} aria-hidden="true" />
              충돌
            </div>
            <p className="leading-5 text-red-900">{conflicts[0].summary}</p>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        onClick={onOpenCompare}
        className="mt-3 inline-flex h-9 items-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-medium text-white transition hover:bg-zinc-800"
      >
        <GitCompare size={15} aria-hidden="true" />
        자세히 보기
      </button>
    </div>
  );
}

function ComparisonPanel({
  group,
  activeTab,
  onTabChange,
}: {
  group: ComparisonGroup | null;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}) {
  if (!group) {
    return (
      <section className="rounded-lg border border-zinc-200 bg-white p-4">
        <p className="text-sm text-zinc-600">분석할 섹션이 없습니다.</p>
      </section>
    );
  }

  const selected = group.options.find((option) => option.id === group.selectedOptionId);
  const alternatives = group.options.filter((option) => option.optionType !== "selected");
  const conflicts = group.options.filter((option) => option.optionType === "direct_conflict");

  return (
    <section className="rounded-lg border border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 px-4 py-3">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h2 className="font-semibold">{group.sectionTitle}</h2>
          <Badge tone={group.needsHumanReview ? "amber" : "green"}>
            {group.needsHumanReview ? "검토 필요" : "AI 선택"}
          </Badge>
          <Badge tone={group.conflictLevel === "high" ? "red" : "zinc"}>
            충돌 {riskLabel[group.conflictLevel]}
          </Badge>
        </div>
        <p className="text-sm leading-6 text-zinc-700">{group.decisionQuestion}</p>
      </div>

      <div className="grid grid-cols-4 gap-1 border-b border-zinc-200 p-2">
        {[
          ["basis", "선택 근거"],
          ["compare", "대안 비교"],
          ["conflicts", "충돌"],
          ["sources", "출처"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id as TabId)}
            className={cn(
              "h-9 rounded-md px-2 text-sm font-medium transition",
              activeTab === id
                ? "bg-zinc-950 text-white"
                : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-950",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {activeTab === "basis" && selected ? (
          <BasisTab group={group} selected={selected} />
        ) : null}
        {activeTab === "compare" ? (
          <CompareTab selected={selected} options={group.options} alternatives={alternatives} />
        ) : null}
        {activeTab === "conflicts" ? <ConflictsTab conflicts={conflicts} group={group} /> : null}
        {activeTab === "sources" ? <SourcesTab group={group} /> : null}
      </div>
    </section>
  );
}

function BasisTab({
  group,
  selected,
}: {
  group: ComparisonGroup;
  selected: ComparisonOption;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
        <div className="mb-2 flex items-center gap-2 font-semibold text-emerald-900">
          <CheckCircle2 size={17} aria-hidden="true" />
          AI 선택안
        </div>
        <p className="text-sm leading-6 text-emerald-950">{selected.content}</p>
      </div>

      <div>
        <div className="mb-1 text-xs font-medium text-zinc-500">선택 이유</div>
        <p className="text-sm leading-6 text-zinc-700">{group.aiConclusion}</p>
      </div>

      <div>
        <div className="mb-1 text-xs font-medium text-zinc-500">핵심 차이</div>
        <p className="text-sm leading-6 text-zinc-700">{group.keyDifferenceSummary}</p>
      </div>

      <ScoreGrid scores={selected.scores} />

      <div className="rounded-lg border border-zinc-200 p-3">
        <div className="mb-1 text-xs font-medium text-zinc-500">사람이 결정할 질문</div>
        <p className="text-sm leading-6 text-zinc-800">{group.humanDecisionQuestion}</p>
      </div>
    </div>
  );
}

function CompareTab({
  selected,
  options,
  alternatives,
}: {
  selected?: ComparisonOption;
  options: ComparisonOption[];
  alternatives: ComparisonOption[];
}) {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-xs text-zinc-500">
              <th className="px-2 py-2 font-medium">플랜</th>
              <th className="px-2 py-2 font-medium">요약</th>
              <th className="px-2 py-2 font-medium">목표</th>
              <th className="px-2 py-2 font-medium">가치</th>
              <th className="px-2 py-2 font-medium">MVP</th>
              <th className="px-2 py-2 font-medium">범위</th>
              <th className="px-2 py-2 font-medium">총점</th>
              <th className="px-2 py-2 font-medium">판단</th>
            </tr>
          </thead>
          <tbody>
            {options.map((option) => (
              <tr key={option.id} className="border-b border-zinc-100">
                <td className="px-2 py-3 font-medium">{option.label}</td>
                <td className="px-2 py-3 text-zinc-700">{option.summary}</td>
                <td className="px-2 py-3">{option.scores.goalFit}</td>
                <td className="px-2 py-3">{option.scores.userValue}</td>
                <td className="px-2 py-3">{option.scores.mvpFeasibility}</td>
                <td className="px-2 py-3">{option.scores.scopeControl}</td>
                <td className="px-2 py-3 font-semibold">{option.scores.total}</td>
                <td className="px-2 py-3">
                  <span className={cn("rounded-md border px-2 py-1 text-xs", riskTone(option.riskLevel))}>
                    {recommendationLabel[option.aiRecommendation]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected ? <OptionCard option={selected} /> : null}

      <div className="space-y-3">
        {alternatives.map((option) => (
          <OptionCard key={option.id} option={option} />
        ))}
      </div>
    </div>
  );
}

function ConflictsTab({
  conflicts,
  group,
}: {
  conflicts: ComparisonOption[];
  group: ComparisonGroup;
}) {
  if (!conflicts.length) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        이 판단 질문에는 직접 충돌 의견이 없습니다.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {conflicts.map((conflict) => (
        <div key={conflict.id} className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="mb-2 flex items-center gap-2 font-semibold text-red-950">
            <AlertTriangle size={17} aria-hidden="true" />
            {conflict.summary}
          </div>
          <InfoRows
            rows={[
              ["충돌 대상", conflict.conflictsWith || group.aiConclusion],
              ["충돌 이유", conflict.conflictReason],
              ["채택 시 영향", conflict.scopeImpact.join(", ")],
              ["결정 질문", conflict.decisionQuestion],
            ]}
          />
        </div>
      ))}
    </div>
  );
}

function SourcesTab({ group }: { group: ComparisonGroup }) {
  const rows = group.options.flatMap((option) =>
    option.sourceExcerpts.map((excerpt, index) => ({
      key: `${option.id}_${index}`,
      label: option.label,
      summary: option.summary,
      excerpt,
    })),
  );

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <div key={row.key} className="rounded-lg border border-zinc-200 p-3">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{row.label}</span>
            <span className="text-xs text-zinc-500">{row.summary}</span>
          </div>
          <p className="text-sm leading-6 text-zinc-700">&ldquo;{row.excerpt}&rdquo;</p>
        </div>
      ))}
    </div>
  );
}

function OptionCard({ option }: { option: ComparisonOption }) {
  return (
    <div className={cn("rounded-lg border p-4", optionTone(option))}>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="font-semibold">{option.label}</span>
        <span className="text-sm text-zinc-600">{option.summary}</span>
        <span className={cn("ml-auto rounded-md border px-2 py-1 text-xs", riskTone(option.riskLevel))}>
          리스크 {riskLabel[option.riskLevel]}
        </span>
      </div>
      <p className="text-sm leading-6 text-zinc-700">{option.content}</p>
      <InfoRows
        rows={[
          ["차이점", option.differenceFromSelected],
          ["좋은 점", option.strengths.join(", ")],
          ["아쉬운 점", option.weaknesses.join(", ")],
          ["범위 영향", option.scopeImpact.join(", ")],
        ]}
      />
    </div>
  );
}

function ScoreGrid({ scores }: { scores: ComparisonOption["scores"] }) {
  const items = [
    ["목표", scores.goalFit],
    ["사용자 가치", scores.userValue],
    ["MVP", scores.mvpFeasibility],
    ["범위 통제", scores.scopeControl],
    ["리스크", scores.riskReduction],
    ["검증 속도", scores.validationSpeed],
  ];

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-medium text-zinc-500">점수</span>
        <span className="text-lg font-semibold">{scores.total}/100</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-zinc-200 px-3 py-2">
            <div className="text-xs text-zinc-500">{label}</div>
            <div className="font-semibold">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InfoRows({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="mt-3 space-y-2">
      {rows
        .filter(([, value]) => value)
        .map(([label, value]) => (
          <div key={label} className="grid gap-1 text-sm sm:grid-cols-[90px_minmax(0,1fr)]">
            <dt className="text-xs font-medium text-zinc-500">{label}</dt>
            <dd className="leading-6 text-zinc-700">{value}</dd>
          </div>
        ))}
    </dl>
  );
}

function Badge({
  tone,
  children,
}: {
  tone: "zinc" | "green" | "amber" | "red";
  children: React.ReactNode;
}) {
  const toneClass = {
    zinc: "border-zinc-200 bg-zinc-50 text-zinc-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-800",
    amber: "border-amber-200 bg-amber-50 text-amber-800",
    red: "border-red-200 bg-red-50 text-red-800",
  }[tone];

  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs", toneClass)}>
      {children}
    </span>
  );
}
