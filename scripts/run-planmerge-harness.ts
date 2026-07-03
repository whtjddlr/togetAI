import {
  buildPlanMergeAnalysisPrompt,
  runLocalPlanMergeHarness,
  validatePlanMergeAnalysis,
} from '../src/planmerge/lib/ai/planmergeProtocol';
import { sampleDrafts, sampleProjectSettings } from '../src/planmerge/lib/localWorkspace';

const payload = {
  project: sampleProjectSettings,
  drafts: sampleDrafts,
};

const result = runLocalPlanMergeHarness(payload);
const validation = validatePlanMergeAnalysis(payload, result);
const prompt = buildPlanMergeAnalysisPrompt(payload);

console.log(JSON.stringify({
  valid: validation.valid,
  errors: validation.errors,
  promptPreview: prompt.slice(0, 800),
  result: {
    normalizedIdeaCount: result.normalizedIdeas.length,
    decisionBlockCount: result.decisionBlocks.length,
    finalSectionCount: result.finalDocumentSections.length,
    missingSections: result.missingSections,
    warnings: result.warnings,
  },
}, null, 2));
