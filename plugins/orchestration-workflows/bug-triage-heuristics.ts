export type BugTriageAssessment = {
  isBugTriageGoal: boolean;
  isBoundedBugTriageGoal: boolean;
  isBroadBugHunt: boolean;
};

const BUG_SIGNAL_REGEX = /\b(bug|bugs|issue|issues|error|errors|regression|regressions|crash|crashes|incident|incidents|failure|failures|defect|defects|flaky)\b/i;
const TRIAGE_ACTION_REGEX = /\b(triage|debug|diagnose|investigate|trace|reproduce|isolate|root cause|fix|stabilize)\b/i;

const BROAD_BUG_HUNT_REGEX = /\b(all|every|any|entire|whole|app-wide|system-wide|codebase-wide|global|across|throughout)\b[\s\S]{0,36}\b(bugs?|issues?|errors?|regressions?|defects?)\b|\b(bugs?|issues?|errors?|regressions?|defects?)\b[\s\S]{0,36}\b(across|throughout)\b[\s\S]{0,24}\b(app|application|product|platform|system|codebase)\b|\b(bug\s*hunt|hunt\s+for\s+bugs?|find\s+bugs?|scan\s+for\s+bugs?)\b/i;

const ISSUE_REFERENCE_REGEX = /\b([A-Z][A-Z0-9]{1,15}-\d{1,7}|sc-\d{1,7}|issue\s*#?\d{1,7}|ticket\s*#?\d{1,7}|incident\s*#?\d{1,7}|https?:\/\/[^\s]*sentry\.io\/issues\/[^\s]+)\b/i;

const TARGET_SCOPE_REGEX = /\b(in|on|for|within)\s+(?:the\s+)?(?:[a-z0-9_-]+\s+){0,3}(auth|login|signup|checkout|billing|payment|search|profile|settings|dashboard|api|endpoint|service|worker|queue|module|component|flow|screen|page|job|pipeline)\b/i;

const hasBugLanguage = (goalText: string): boolean => BUG_SIGNAL_REGEX.test(goalText) && TRIAGE_ACTION_REGEX.test(goalText);

export const assessBugTriageGoal = (goalText: string): BugTriageAssessment => {
  const isBugTriageGoal = hasBugLanguage(goalText);
  if (!isBugTriageGoal) {
    return {
      isBugTriageGoal: false,
      isBoundedBugTriageGoal: false,
      isBroadBugHunt: false
    };
  }

  const hasSpecificReference = ISSUE_REFERENCE_REGEX.test(goalText);
  const hasScopedTarget = TARGET_SCOPE_REGEX.test(goalText);
  const isBroadBugHunt = BROAD_BUG_HUNT_REGEX.test(goalText) && !hasSpecificReference;

  return {
    isBugTriageGoal,
    isBoundedBugTriageGoal: !isBroadBugHunt && (hasSpecificReference || hasScopedTarget),
    isBroadBugHunt
  };
};

export const isBoundedBugTriageGoal = (goalText: string): boolean =>
  assessBugTriageGoal(goalText).isBoundedBugTriageGoal;
