import { type FormEvent, useState } from 'react';
import type { ProjectSettings } from '../../lib/localWorkspace';

type ProjectSetupPageProps = {
  project: ProjectSettings;
  onLoadSample: () => void;
  onSave: (project: ProjectSettings) => void;
};

export function ProjectSetupPage({ project, onLoadSample, onSave }: ProjectSetupPageProps) {
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
          <h2 className="text-2xl text-gray-900">새 병합 프로젝트 만들기</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            여러 AI 초안을 넣기 전에 목표, 기준, 제외 범위를 먼저 고정합니다.
          </p>
        </div>

        <form className="space-y-6" onSubmit={submitProject}>
          <label className="block">
            <span className="mb-2 block text-sm text-gray-700">프로젝트명</span>
            <input
              value={form.title}
              onChange={(event) => updateForm('title', event.target.value)}
              placeholder="예: AI 공동 기획서 병합 도구"
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
              placeholder="예: 여러 사람이 각자 AI로 만든 기획서 초안을 하나의 문서로 병합한다."
              className="min-h-24 w-full rounded-md border border-gray-200 px-3 py-2 text-sm leading-relaxed outline-none focus:border-blue-500"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-gray-700">공통 기준</span>
            <textarea
              value={form.contextPack}
              onChange={(event) => updateForm('contextPack', event.target.value)}
              placeholder="예: MVP는 2주 안에 만들 수 있어야 한다. 초기에는 텍스트 붙여넣기 기반으로 한다."
              className="min-h-24 w-full rounded-md border border-gray-200 px-3 py-2 text-sm leading-relaxed outline-none focus:border-blue-500"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-gray-700">금지할 방향</span>
            <input
              value={form.forbiddenDirection}
              onChange={(event) => updateForm('forbiddenDirection', event.target.value)}
              placeholder="예: 초기 MVP에 실시간 공동 편집, 외부 문서 연동, 팀 초대를 포함하지 않는다."
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-gray-700">원하는 출력 스타일</span>
            <input
              value={form.outputStyle}
              onChange={(event) => updateForm('outputStyle', event.target.value)}
              placeholder="예: 노션처럼 간결하고 읽기 쉬운 서비스 기획서 톤"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
            />
          </label>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="submit"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            >
              설정 저장 후 초안 입력
            </button>
            <button
              type="button"
              className="rounded-md border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              onClick={onLoadSample}
            >
              샘플 워크스페이스 둘러보기
            </button>
            {savedAt && <span className="text-xs text-gray-500">{savedAt} 저장됨</span>}
          </div>
        </form>
      </div>
    </main>
  );
}
