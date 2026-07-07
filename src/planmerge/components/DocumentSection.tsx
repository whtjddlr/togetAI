import { StatusBadge } from './StatusBadge';
import type { SectionStatus } from '../data/mergeResult';

interface DocumentSectionProps {
  number: number;
  title: string;
  content?: string;
  status?: SectionStatus;
  active?: boolean;
  onClick?: () => void;
}

export function DocumentSection({ number, title, content, status, active, onClick }: DocumentSectionProps) {
  const getStatusText = () => {
    if (content) return null;
    switch (status) {
      case 'pending': return '내용 없음';
      case 'review': return '검토 필요';
      case 'conflict': return '충돌 있음';
      default: return null;
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'review':
        return <StatusBadge variant="warning">검토 필요</StatusBadge>;
      case 'conflict':
        return <StatusBadge variant="warning">충돌 있음</StatusBadge>;
      case 'pending':
        return <StatusBadge variant="default">내용 없음</StatusBadge>;
      default:
        return null;
    }
  };

  return (
    <div
      data-testid={`document-section-${number}`}
      onClick={onClick}
      className={`cursor-pointer border-l px-4 py-5 transition-all sm:px-8 sm:py-6 ${
        active
          ? 'border-l-blue-600 bg-gray-50/50'
        : 'border-l-transparent hover:bg-gray-50/30'
      }`}
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <h3 className="text-base text-gray-900">
          {number}. {title}
        </h3>
        {getStatusBadge()}
      </div>
      {content ? (
        <p className="text-sm text-gray-700 leading-relaxed">{content}</p>
      ) : (
        <p className="text-sm text-gray-400 italic">{getStatusText()}</p>
      )}
    </div>
  );
}
