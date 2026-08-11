import { z } from 'zod'

export const qualifyDealOutputSchema = z.object({
  overallAssessment: z.string(),
  criteria: z.array(
    z.object({
      key: z.enum(['fit_icp', 'need', 'authority', 'budget', 'timing', 'engagement']),
      suggestedScore: z.number().int().min(0).max(5),
      confidence: z.enum(['low', 'medium', 'high']),
      reasoning: z.string(),
    }),
  ),
  missingInformation: z.array(z.string()),
  risks: z.array(z.string()),
})

export type QualifyDealOutput = z.infer<typeof qualifyDealOutputSchema>

export const summarizeDealOutputSchema = z.object({
  summary: z.string(),
  keyPoints: z.array(z.string()),
  suggestedNextStep: z.string(),
})

export type SummarizeDealOutput = z.infer<typeof summarizeDealOutputSchema>

export const draftFollowupEmailOutputSchema = z.object({
  subject: z.string(),
  body: z.string(),
})

export type DraftFollowupEmailOutput = z.infer<typeof draftFollowupEmailOutputSchema>
