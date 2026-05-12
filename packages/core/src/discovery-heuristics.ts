import type { Intent } from "./types.ts";

const DISCOVERY_INTENT = "research" satisfies Intent;

const STRONG_DISCOVERY_CUE_REGEX = /\b(research|explore|scope|define|identify|assess|evaluate|compare|analy[sz]e|synthesize|recommend|benchmark|summari[sz]e|summary|findings|map|size|shortlist|options?|decision memo|competitor|recommendation)\b/i;
const BROAD_DISCOVERY_ARTIFACT_MATCH_REGEX = /\b(audience|persona|icp|mvp|brief|prd|requirements?)\b/gi;

export const DISCOVERY_CUE_REGEX = /\b(research|explore|scope|define|identify|assess|evaluate|compare|analy[sz]e|synthesize|recommend|benchmark|summari[sz]e|summary|findings|map|size|shortlist|options?|decision memo|audience|persona|icp|competitor|mvp|brief|prd|requirements?|recommendation)\b/i;

export const hasDiscoveryCue = (goalText: string): boolean => DISCOVERY_CUE_REGEX.test(goalText);

export const isDiscoveryStyleGoal = (goalText: string, intent: Intent | string): boolean => {
  if (intent === DISCOVERY_INTENT) {
    return true;
  }

  if (STRONG_DISCOVERY_CUE_REGEX.test(goalText)) {
    return true;
  }

  const broadArtifactMatches = goalText.match(BROAD_DISCOVERY_ARTIFACT_MATCH_REGEX) ?? [];
  return broadArtifactMatches.length >= 2 || (broadArtifactMatches.length >= 1 && /\b(options?|tradeoffs?|assumptions|constraints|goals?)\b/i.test(goalText));
};
