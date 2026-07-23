export type VisualVerificationStatus = "passed" | "failed" | "not_available";

export interface ImageCandidate {
  id: string;
  url: string;
  thumbnailUrl: string;
  metadataScore: number;
  visualScore?: number;
  commerceSuitabilityScore?: number;
  reason?: string;
  photographer?: string;
  sourcePageUrl?: string;
}

export type ImageGenerationResult =
  | {
      status: "auto_selected";
      url: string;
      visualScore: number;
      metadataScore: number;
      verificationStatus: "passed";
    }
  | {
      status: "manual_selection_required";
      candidateSessionId: string;
      candidates: ImageCandidate[];
      verificationStatus: VisualVerificationStatus;
      reason: string;
    }
  | {
      status: "not_found";
      candidates: [];
      verificationStatus: VisualVerificationStatus;
      reason: string;
    }
  | {
      status: "error";
      message: string;
    };

export interface VisualEvaluationInput {
  productName: string;
  normalizedName: string;
  aliases: string[];
  category?: string;
  candidates: {
    id: string;
    url: string;
  }[];
}

export interface VisualEvaluationResult {
  candidateId: string;
  isCorrectProduct: boolean;
  visualScore: number;
  commerceSuitabilityScore: number;
  reason: string;
}

export interface ImageVisionProvider {
  evaluateCandidates(input: VisualEvaluationInput): Promise<VisualEvaluationResult[]>;
}

export class NoVisionProvider implements ImageVisionProvider {
  async evaluateCandidates(_input?: VisualEvaluationInput): Promise<VisualEvaluationResult[]> {
    return [];
  }
}

// Configurable Timeouts
export const IMAGE_SEARCH_TIMEOUT_MS = 10000;
export const IMAGE_VALIDATION_TIMEOUT_MS = 5000;
export const IMAGE_VISION_TIMEOUT_MS = 10000;
