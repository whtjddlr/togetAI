import { StatusBadge } from './StatusBadge';
import type { AppView } from '../types/navigation';

type SidebarProps = {
  activeView: AppView;
  analysisStatus: 'idle' | 'analyzing' | 'completed';
  onViewChange: (view: AppView) => void;
};

export function Sidebar({ activeView, analysisStatus, onViewChange }: SidebarProps) {
  const navItems = [
    { label: '프로젝트 설정', view: 'setup' as const },
    { label: '초안 입력', view: 'drafts' as const },
    { label: '병합 결과', view: 'merge' as const },
    { label: '분석 Inspector', view: 'inspector' as const },
    { label: 'Review Queue', view: 'openQuestions' as const },
  ];

  return (
    <div className="flex w-full flex-shrink-0 flex-col border-b border-gray-200 bg-gray-50 md:h-dvh md:w-60 md:border-b-0 md:border-r">
      <div className="border-b border-gray-200 p-4 md:p-5">
        <div className="text-sm mb-1 text-gray-900">PlanMerge</div>
        <div className="text-xs text-gray-600">AI 공동 기획서 병합 도구</div>
      </div>

      <nav className="grid gap-3 p-3 md:block md:flex-1">
        <ul className="grid grid-cols-2 gap-1 sm:grid-cols-3 md:block md:space-y-0.5">
          {navItems.map((item, index) => (
            <li key={index} className="min-w-0 md:block">
              <button
                type="button"
                onClick={() => onViewChange(item.view)}
                aria-current={activeView === item.view ? 'page' : undefined}
                className={`min-h-10 w-full rounded-md px-3 py-2 text-left text-sm leading-5 transition-colors md:min-h-0 md:whitespace-nowrap ${
                  activeView === item.view
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>

        <div className="justify-self-start px-1 md:mt-6 md:px-3">
          <StatusBadge variant={getAnalysisStatusVariant(analysisStatus)}>
            {getAnalysisStatusLabel(analysisStatus)}
          </StatusBadge>
        </div>
      </nav>

      <div className="hidden border-t border-gray-200 p-5 md:block">
        <div className="text-xs text-gray-500">MVP v0.1</div>
      </div>
    </div>
  );
}

function getAnalysisStatusLabel(status: SidebarProps['analysisStatus']) {
  if (status === 'analyzing') return '분석 중';
  if (status === 'completed') return '분석 완료';
  return '분석 대기';
}

function getAnalysisStatusVariant(status: SidebarProps['analysisStatus']) {
  if (status === 'analyzing') return 'warning';
  if (status === 'completed') return 'success';
  return 'default';
}
