# PlanMerge OpenAI JSON Schema v0.1

OpenAI Structured Outputs에 넣을 JSON Schema 초안이다.

## Extract Ideas Schema

```ts
export const extractIdeasJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["ideas", "extractionWarnings"],
  properties: {
    ideas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "ideaId",
          "draftId",
          "sectionKey",
          "sectionTitle",
          "topic",
          "ideaType",
          "normalizedText",
          "sourceExcerpt",
          "confidence"
        ],
        properties: {
          ideaId: { type: "string" },
          draftId: { type: "string" },
          sectionKey: { type: "string" },
          sectionTitle: { type: "string" },
          topic: { type: "string" },
          ideaType: {
            type: "string",
            enum: [
              "problem",
              "target_user",
              "pain_point",
              "solution",
              "feature",
              "scope",
              "flow",
              "requirement",
              "metric",
              "risk",
              "open_question"
            ]
          },
          normalizedText: { type: "string" },
          sourceExcerpt: { type: "string" },
          confidence: { type: "number", minimum: 0, maximum: 1 }
        }
      }
    },
    extractionWarnings: {
      type: "array",
      items: { type: "string" }
    }
  }
} as const;
```

## Merge Decisions Schema

```ts
export const mergeDecisionsJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "summary",
    "missingSections",
    "overallRiskLevel",
    "finalDocument",
    "decisionBlocks"
  ],
  properties: {
    summary: { type: "string" },
    missingSections: {
      type: "array",
      items: { type: "string" }
    },
    overallRiskLevel: {
      type: "string",
      enum: ["low", "medium", "high"]
    },
    finalDocument: {
      type: "object",
      additionalProperties: false,
      required: ["title", "sections"],
      properties: {
        title: { type: "string" },
        sections: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["sectionKey", "title", "content", "sortOrder"],
            properties: {
              sectionKey: { type: "string" },
              title: { type: "string" },
              content: { type: "string" },
              sortOrder: { type: "integer" }
            }
          }
        }
      }
    },
    decisionBlocks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "sectionKey",
          "sectionTitle",
          "topic",
          "selectedSummary",
          "selectionReason",
          "score",
          "confidence",
          "conflictLevel",
          "needsHumanReview",
          "options"
        ],
        properties: {
          sectionKey: { type: "string" },
          sectionTitle: { type: "string" },
          topic: { type: "string" },
          selectedSummary: { type: "string" },
          selectionReason: { type: "string" },
          score: {
            type: "object",
            additionalProperties: false,
            required: [
              "goalFit",
              "mvpFeasibility",
              "userProblemFit",
              "specificity",
              "supportAcrossDrafts",
              "riskReduction",
              "total"
            ],
            properties: {
              goalFit: { type: "integer", minimum: 0, maximum: 25 },
              mvpFeasibility: { type: "integer", minimum: 0, maximum: 20 },
              userProblemFit: { type: "integer", minimum: 0, maximum: 20 },
              specificity: { type: "integer", minimum: 0, maximum: 15 },
              supportAcrossDrafts: { type: "integer", minimum: 0, maximum: 10 },
              riskReduction: { type: "integer", minimum: 0, maximum: 10 },
              total: { type: "integer", minimum: 0, maximum: 100 }
            }
          },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          conflictLevel: {
            type: "string",
            enum: ["none", "low", "medium", "high"]
          },
          needsHumanReview: { type: "boolean" },
          options: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: [
                "optionType",
                "content",
                "differenceFromSelected",
                "rationale",
                "strengths",
                "weaknesses",
                "risk",
                "severity",
                "conflictsWith",
                "conflictReason",
                "scopeImpact",
                "decisionQuestion",
                "sourceIdeaIds",
                "sourceExcerpts"
              ],
              properties: {
                optionType: {
                  type: "string",
                  enum: ["selected", "alternative", "conflict", "rejected"]
                },
                content: { type: "string" },
                differenceFromSelected: { type: "string" },
                rationale: { type: "string" },
                strengths: {
                  type: "array",
                  items: { type: "string" }
                },
                weaknesses: {
                  type: "array",
                  items: { type: "string" }
                },
                risk: {
                  type: "string",
                  enum: ["low", "medium", "high"]
                },
                severity: {
                  type: "string",
                  enum: ["low", "medium", "high"]
                },
                conflictsWith: { type: "string" },
                conflictReason: { type: "string" },
                scopeImpact: {
                  type: "array",
                  items: { type: "string" }
                },
                decisionQuestion: { type: "string" },
                sourceIdeaIds: {
                  type: "array",
                  items: { type: "string" }
                },
                sourceExcerpts: {
                  type: "array",
                  items: { type: "string" }
                }
              }
            }
          }
        }
      }
    }
  }
} as const;
```

## 주의 사항

Structured Outputs strict 모드에서는 모든 필드를 명확히 required로 두는 편이 좋다. 선택값처럼 보이는 필드도 빈 문자열, 빈 배열, 기본 enum 값으로 반환하게 설계하면 프론트와 DB 저장 코드가 단순해진다.
