import { type FormEvent, useState } from 'react';
import type { ProjectSettings } from '../../lib/localWorkspace';

type ProjectSetupPageProps = {
  project: ProjectSettings;
  onSave: (project: ProjectSettings) => void;
};

export function ProjectSetupPage({ project, onSave }: ProjectSetupPageProps) {
  const [form, setForm] = useState(project);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const updateForm = (field: keyof ProjectSettings, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const saveProject = () => {
    onSave(form);
    setSavedAt(new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }));
  };

  const submitProject = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    saveProject();
  };

  return (
    <main className="h-full min-h-0 flex-1 overflow-y-auto bg-white">
      <div className="mx-auto max-w-3xl px-8 py-10">
        <div className="mb-8">
          <h2 className="text-2xl text-gray-900">AI 공동 기획서 병합 도구</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            병합 기준이 흔들리면 AI 판단도 흔들립니다. 목표, 기준, 제외 범위를 먼저 고정합니다.
          </p>
        </div>

        <form className="space-y-6" onSubmit={submitProject}>
          <label className="block">
            <span className="mb-2 block text-sm text-gray-700">프로젝트명</span>
            <input
              value={form.title}
              onChange={(event) => updateForm('title', event.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-gray-700">기획서 타입</span>
            <select
              value={form.documentType}
              onChange={(event) => updateForm('documentType', event.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            >
              <option value="service_plan">서비스 기획서</option>
              <option value="prd">PRD</option>
              <option value="business_plan">사업 계획서</option>
              <option value="feature_spec">기능 명세서</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-gray-700">기획서 목표</span>
            <textarea
              value={form.goal}
              onChange={(event) => updateForm('goal', event.target.value)}
              className="min-h-24 w-full rounded-md border border-gray-200 px-3 py-2 text-sm leading-relaxed outline-none focus:border-blue-500"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-gray-700">공통 기준</span>
            <textarea
              value={form.contextPack}
              onChange={(event) => updateForm('contextPack', event.target.value)}
              className="min-h-24 w-full rounded-md border border-gray-200 px-3 py-2 text-sm leading-relaxed outline-none focus:border-blue-500"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-gray-700">금지할 방향</span>
            <input
              value={form.forbiddenDirection}
              onChange={(event) => updateForm('forbiddenDirection', event.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-gray-700">원하는 출력 스타일</span>
            <input
              value={form.outputStyle}
              onChange={(event) => updateForm('outputStyle', event.target.value)}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              설정 저장
            </button>
            {savedAt && <span className="text-xs text-gray-500">{savedAt} 저장됨</span>}
          </div>
        </form>
      </div>
    </main>
  );
}
