import { NextResponse } from "next/server";
import { getOpenAIClient } from "@/lib/openai";
import {
  createMockAnalysis,
  defaultSections,
} from "@/lib/planmerge/defaults";
import {
  buildPlanMergeUserPrompt,
  PLANMERGE_ANALYSIS_SYSTEM_PROMPT,
} from "@/lib/planmerge/prompts";
import { planMergeAnalysisJsonSchema } from "@/lib/planmerge/schema";
import type { AnalyzeRequest, AnalyzeResponse } from "@/lib/planmerge/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json()) as AnalyzeRequest;
  const input: AnalyzeRequest = {
    ...body,
    sections: body.sections?.length ? body.sections : defaultSections,
  };

  const openai = getOpenAIClient();

  if (!openai) {
    return NextResponse.json({
      ...createMockAnalysis(),
      usedMock: true,
      apiError: "OPENAI_API_KEY가 없어 샘플 분석 결과를 표시했습니다.",
    } satisfies AnalyzeResponse);
  }

  try {
    const response = await openai.responses.create({
      model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
      input: [
        {
          role: "system",
          content: PLANMERGE_ANALYSIS_SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: buildPlanMergeUserPrompt(input),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "planmerge_analysis",
          strict: true,
          schema: planMergeAnalysisJsonSchema,
        },
      },
    });

    const parsed = JSON.parse(response.output_text) as AnalyzeResponse;

    return NextResponse.json({
      ...parsed,
      usedMock: false,
    } satisfies AnalyzeResponse);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "AI 분석 중 알 수 없는 오류가 발생했습니다.";

    return NextResponse.json({
      ...createMockAnalysis(),
      usedMock: true,
      apiError: message,
    } satisfies AnalyzeResponse);
  }
}
