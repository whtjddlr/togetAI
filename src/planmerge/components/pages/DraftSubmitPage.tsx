import { type FormEvent, useState } from 'react';
import { StatusBadge } from '../StatusBadge';
import type { DraftFormInput, LocalDraftSubmission } from '../../lib/localWorkspace';

type DraftSubmitPageProps = {
  analysisStatus: 'idle' | 'analyzing' | 'completed';
  drafts: LocalDraftSubmission[];
  onDeleteDraft: (draftId: string) => void;
  onRunAnalysis: () => void;
  onSubmitDraft: (draft: DraftFormInput) => void;
};

const initialForm: DraftFormInput = {
  authorName: '',
  authorRole: '',
  aiModel: 'ChatGPT',
  taskTitle: '',
  rawText: '',
};

export function DraftSubmitPage({
  analysisStatus,
  drafts,
  onDeleteDraft,
  onRunAnalysis,
  onSubmitDraft,
}: DraftSubmitPageProps) {
  const [form, setForm] = useState<DraftFormInput>(initialForm);
  const canAnalyze = drafts.length > 0 && analysisStatus !== 'analyzing';

  const updateForm = (field: keyof DraftFormInput, value: string) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const submitDraft = () => {
    if (!form.rawText.trim()) {
      return;
    }

    onSubmitDraft(form);
    setForm(initialForm);
  };

  const submitDraftForm = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitDraft();
  };

  return (
    <main className="h-full min-h-0 flex-1 overflow-y-auto bg-white">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 sm:px-8 lg:grid-cols-[1fr_320px] lg:py-10">
        <section>
          <h2 className="text-2xl text-gray-900">새 초안 입력</h2>
          <p className="mt-2 text-sm text-gray-600">
            작성자와 원문을 넣으면 병합 분석 대상 초안 목록에 추가됩니다.
          </p>

          <form className="mt-8 space-y-5" onSubmit={submitDraftForm}>
            <label className="block">
              <span className="mb-2 block text-sm text-gray-700">초안 작성자</span>
              <input
                value={form.authorName}
                onChange={(event) => updateForm('authorName', event.target.value)}
                placeholder="예: 수진"
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="mb-2 block text-sm text-gray-700">작성자 역할</span>
                <input
                  value={form.authorRole}
                  onChange={(event) => updateForm('authorRole', event.target.value)}
                  placeholder="예: PM"
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-gray-700">사용한 AI</span>
                <select
                  value={form.aiModel}
                  onChange={(event) => updateForm('aiModel', event.target.value)}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                >
                  <option value="ChatGPT">ChatGPT</option>
                  <option value="Claude">Claude</option>
                  <option value="Gemini">Gemini</option>
                  <option value="Cursor">Cursor</option>
                  <option value="Other">Other</option>
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-gray-700">작업 주제</span>
                <input
                  value={form.taskTitle}
                  onChange={(event) => updateForm('taskTitle', event.target.value)}
                  placeholder="예: MVP 범위"
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-2 block text-sm text-gray-700">AI 초안 원문</span>
              <textarea
                value={form.rawText}
                onChange={(event) => updateForm('rawText', event.target.value)}
                placeholder="AI로 생성한 기획서 초안을 붙여넣기"
                className="min-h-64 w-full rounded-md border border-gray-200 px-3 py-2 text-sm leading-relaxed outline-none focus:border-blue-500"
              />
            </label>

            <button
              type="submit"
              className={`rounded-md px-4 py-2 text-sm text-white ${
                form.rawText.trim()
                  ? 'bg-blue-600 hover:bg-blue-700'
                  : 'cursor-not-allowed bg-gray-300'
              }`}
              disabled={!form.rawText.trim()}
            >
              초안 저장
            </button>
          </form>
        </section>

        <aside>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="text-sm text-gray-900">제출된 초안</div>
            <div className="text-xs text-gray-500">{drafts.length}개</div>
          </div>
          <div className="space-y-3">
            {drafts.length > 0 ? (
              drafts.map((draft) => (
                <div key={draft.id} className="rounded-md border border-gray-200 p-3">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm text-gray-900">{draft.taskTitle}</div>
                      <div className="mt-1 text-xs text-gray-600">
                        {draft.authorName} / {draft.aiModel}
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={`${draft.taskTitle} 초안 삭제`}
                      className="rounded px-2 py-1 text-xs text-gray-500 hover:bg-red-50 hover:text-red-600"
                      onClick={() => onDeleteDraft(draft.id)}
                    >
                      삭제
                    </button>
                  </div>
                  <StatusBadge variant={draft.status === 'parsed' ? 'success' : 'default'}>
                    {draft.status === 'parsed' ? '분석 완료' : '제출됨'}
                  </StatusBadge>
                  <div className="mt-2 text-xs text-gray-400">{draft.createdAtLabel}</div>
                </div>
              ))
            ) : (
              <div className="rounded-md border border-dashed border-gray-200 p-4 text-sm leading-relaxed text-gray-500">
                아직 제출된 초안이 없습니다. 왼쪽 입력 영역에 AI가 작성한 기획서 초안을 붙여넣어 주세요.
              </div>
            )}
          </div>

          <button
            type="button"
            className={`mt-4 w-full rounded-md px-4 py-2 text-sm transition-colors ${
              canAnalyze
                ? 'bg-gray-900 text-white hover:bg-gray-800'
                : 'cursor-not-allowed bg-gray-100 text-gray-400'
            }`}
            disabled={!canAnalyze}
            onClick={onRunAnalysis}
          >
            {analysisStatus === 'analyzing' ? '분석 중' : '병합 분석 실행'}
          </button>
        </aside>
      </div>
    </main>
  );
}
