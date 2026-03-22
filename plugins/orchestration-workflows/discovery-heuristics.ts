import type { Intent } from "./types";

const DISCOVERY_INTENT = "research" satisfies Intent;

export const DISCOVERY_CUE_REGEX = /\b(research|explore|scope|define|identify|assess|evaluate|compare|analy[sz]e|synthesize|recommend|benchmark|summari[sz]e|summary|findings|map|size|shortlist|options?|decision memo|audience|persona|icp|competitor|mvp|brief|prd|requirements?|recommendation)\b/i;

export const hasDiscoveryCue = (goalText: string): boolean => DISCOVERY_CUE_REGEX.test(goalText);

export const isDiscoveryStyleGoal = (goalText: string, intent: Intent | string): boolean => {
  return intent === DISCOVERY_INTENT || hasDiscoveryCue(goalText);
};
