import { useLayoutEffect, useRef } from 'react';
import { DocumentSection } from './DocumentSection';
import { StatusBadge } from './StatusBadge';
import { sections as defaultSections, type DocumentSectionData } from '../data/mergeResult';
import type { ProjectSettings } from '../lib/localWorkspace';
import type { PlanMergeAnalysisResult } from '../lib/ai/planmergeProtocol';

type DocumentContentProps = {
  activeSection: number;
  analysisResult?: PlanMergeAnalysisResult;
  documentSections?: DocumentSectionData[];
  onSectionSelect: (sectionNumber: number) => void;
  project: ProjectSettings;
};

const documentTypeLabels: Record<ProjectSettings['documentType'], string> = {
  service_plan: '서비스 기획서',
  prd: 'PRD',
  business_plan: '사업 계획서',
  feature_spec: '기능 명세서',
};

export function DocumentContent({
  activeSection,
  analysisResult,
  documentSections = defaultSections,
  onSectionSelect,
  project,
}: DocumentContentProps) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const activeSectionRef = useRef<HTMLDivElement | null>(null);
  const conflictCount = analysisResult
    ? analysisResult.decisionBlocks.filter((block) => block.conflictLevel !== 'none').length
    : documentSections.filter((section) => section.status === 'conflict').length;
  const reviewCount = analysisResult
    ? analysisResult.decisionBlocks.filter((block) => block.needsHumanReview).length
    : documentSections.filter((section) => section.status === 'review').length;

  useLayoutEffect(() => {
    const container = scrollContainerRef.current;
    const activeNode = activeSectionRef.current;

    if (!container || !activeNode) {
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const activeRect = activeNode.getBoundingClientRect();
    const targetScrollTop =
      container.scrollTop +
      activeRect.top -
      containerRect.top -
      (container.clientHeight - activeRect.height) / 2;

    container.scrollTop = Math.max(targetScrollTop, 0);
  }, [activeSection]);

  return (
    <div ref={scrollContainerRef} className="flex-1 min-w-0 bg-white xl:h-full xl:min-h-0 xl:overflow-y-auto">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-8">
        <div className="mb-8">
          <h1 className="text-2xl text-gray-900 mb-4">{project.title} 기획서</h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600 sm:gap-4">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">문서 타입:</span>
              <span>{documentTypeLabels[project.documentType]}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">기준:</span>
              <span>{summarizeCriteria(project.contextPack)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">충돌:</span>
              <StatusBadge variant={conflictCount > 0 ? 'danger' : 'default'}>{conflictCount}개</StatusBadge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">검토 필요:</span>
              <StatusBadge variant={reviewCount > 0 ? 'warning' : 'default'}>{reviewCount}개</StatusBadge>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200">
          {documentSections.map((section) => (
            <div
              key={section.number}
              ref={activeSection === section.number ? activeSectionRef : null}
              className="border-b border-gray-100"
            >
              <DocumentSection
                number={section.number}
                title={section.title}
                content={section.content}
                status={section.status}
                active={activeSection === section.number}
                onClick={() => onSectionSelect(section.number)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function summarizeCriteria(contextPack: string) {
  const firstLine = contextPack
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) {
    return '기준 없음';
  }

  return firstLine.length > 34 ? `${firstLine.slice(0, 34)}...` : firstLine;
}
