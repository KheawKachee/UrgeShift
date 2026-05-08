import { actions, buddyDraft, crumbSteps, harmReductionOptions } from "./actions.js";
import { buildHumanCareResponse, detectSafetyRisk } from "./safety.js";

const fallbackContext = {
  urge: "unknown",
  energy: "unknown",
  blocker: "none",
  readiness: "mixed",
  triggerLabel: "urge moment",
  locationCue: "unknown",
  timeContext: "unknown",
  socialState: "unknown",
};

function normalize(value, fallback = "unknown") {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim().toLowerCase();
  return normalized || fallback;
}

function canonicalizeUrge(value) {
  const normalized = normalize(value);
  if (normalized.includes("drink")) return "drink";
  if (normalized.includes("vape")) return "vape";
  if (normalized.includes("scroll")) return "scroll";
  if (normalized.includes("gamble")) return "gamble";
  return normalized;
}

function canonicalizeEnergy(value) {
  const normalized = normalize(value);
  if (normalized.includes("no talking")) return "no talking";
  if (normalized.includes("tiny action")) return "tiny action";
  if (normalized.includes("can talk")) return "can talk";
  return normalized;
}

function canonicalizeBlocker(value) {
  const normalized = normalize(value, "none");
  if (normalized.includes("too hard")) return "too hard";
  if (normalized.includes("wrong vibe")) return "wrong vibe";
  if (normalized.includes("still want it")) return "still want it";
  if (normalized.includes("need person")) return "need person";
  if (normalized.includes("harm reduction")) return "harm reduction";
  return normalized;
}

function normalizeContext(rawContext = {}) {
  const context = {
    ...fallbackContext,
    ...rawContext,
    urge: canonicalizeUrge(rawContext.urge || fallbackContext.urge),
    energy: canonicalizeEnergy(rawContext.energy || fallbackContext.energy),
    blocker: canonicalizeBlocker(rawContext.blocker || fallbackContext.blocker),
    readiness: normalize(rawContext.readiness, fallbackContext.readiness),
    triggerLabel: normalize(rawContext.triggerLabel, fallbackContext.triggerLabel),
    locationCue: normalize(rawContext.locationCue, fallbackContext.locationCue),
    timeContext: normalize(rawContext.timeContext, fallbackContext.timeContext),
    socialState: normalize(rawContext.socialState, fallbackContext.socialState),
  };

  if (context.blocker === "still want it") {
    context.readiness = "low";
  }

  if (context.energy === "no talking") {
    context.effort = "very-low";
  } else if (context.energy === "tiny action") {
    context.effort = "low";
  } else {
    context.effort = "standard";
  }

  return context;
}

function createSessionId() {
  return `shift_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function getSession(input = {}, status = "active") {
  return {
    id: input.sessionId || createSessionId(),
    status,
    privacy: "ephemeral",
    seconds: 90,
  };
}

function actionForUrge(urge) {
  if (urge === "drink") return actions.water;
  if (urge === "vape") return actions.vape;
  if (urge === "scroll") return actions.scroll;
  if (urge === "gamble") return actions.gamble;
  return actions.different;
}

function actionCandidates() {
  return [
    actions.downshift,
    actions.water,
    actions.vape,
    actions.scroll,
    actions.gamble,
    actions.different,
    actions.buddy,
  ];
}

function triggerMatch(context, action) {
  if (context.urge === "drink" && action.category === "delay") return 1;
  if (context.urge === "vape" && action.category === "distance") return 1;
  if (context.urge === "scroll" && action.category === "reduce-stimulation") return 1;
  if (context.urge === "gamble" && action.category === "money-friction") return 1;
  if (context.blocker === "need person" && action.category === "support") return 1;
  if (context.blocker === "too hard" && action.category === "downshift") return 1;
  if (context.blocker === "wrong vibe" && action.category === "friction") return 1;
  return context.urge === "unknown" ? 0.4 : 0;
}

function effortScore(context, action) {
  if (action.category === "downshift") return 1;
  if (context.effort === "very-low") {
    return ["delay", "distance", "reduce-stimulation", "friction"].includes(action.category) ? 0.7 : 0.35;
  }
  if (context.effort === "low") return action.category === "support" ? 0.55 : 0.85;
  return 0.8;
}

function socialExposureRisk(action) {
  return action.category === "support" ? 1 : 0;
}

function contextRequiredRisk(action) {
  return action.category === "support" ? 0.4 : 0.1;
}

function scoreAction(context, action) {
  const score =
    0.25 * 1 +
    0.2 * 1 +
    0.2 * effortScore(context, action) +
    0.15 * triggerMatch(context, action) +
    0.1 * 0.5 +
    0.1 * 1 -
    0.25 * contextRequiredRisk(action) -
    0.2 * 0 -
    0.15 * socialExposureRisk(action);

  return Number(score.toFixed(3));
}

function rankActions(context) {
  return actionCandidates()
    .map((action) => ({
      action,
      score: scoreAction(context, action),
      reasonCodes: reasonCodesFor(context, action),
    }))
    .sort((a, b) => b.score - a.score);
}

function selectNextAction(context) {
  if (context.blocker === "need person") return actions.buddy;
  if (context.blocker === "still want it" || context.readiness === "low") return actions.harm;
  if (context.blocker === "too hard" || context.energy === "no talking") return actions.downshift;
  if (context.blocker === "wrong vibe") return actions.different;

  const ranked = rankActions(context);
  return ranked[0]?.action || actionForUrge(context.urge);
}

function optionForLabel(label) {
  const normalized = normalize(label, "");
  return harmReductionOptions.find((option) => {
    const optionLabel = normalize(option.label, "");
    return normalized === optionLabel || normalized.includes(optionLabel);
  });
}

function compactCondition(value, fallback) {
  const normalized = normalize(value, fallback);
  if (normalized === "unknown" || normalized === "none") return fallback || null;
  return normalized;
}

function categorizeLocation(value) {
  const normalized = normalize(value, "unknown");
  if (normalized.includes("store") || normalized.includes("shop") || normalized.includes("ร้าน")) {
    return "near store";
  }
  if (normalized.includes("home") || normalized.includes("บ้าน")) return "at home";
  if (normalized.includes("work") || normalized.includes("office") || normalized.includes("งาน")) return "after work";
  if (normalized.includes("bar") || normalized.includes("pub")) return "near alcohol cue";
  if (normalized === "unknown" || normalized === "none") return "unknown";
  return "other place";
}

function safePlanContext(context) {
  return {
    urge: context.urge,
    energy: context.energy,
    blocker: context.blocker,
    readiness: context.readiness,
    effort: context.effort,
    triggerLabel: context.triggerLabel,
    timeContext: context.timeContext,
    locationCategory: categorizeLocation(context.locationCue),
    socialState: context.socialState,
  };
}

function planStepFromInput(input = {}, action = actions.first) {
  const selected = optionForLabel(input.selectedOption || input.helpedAction);
  if (selected) return selected.planStep;

  if (typeof input.helpedActionPlanStep === "string" && input.helpedActionPlanStep.trim()) {
    return input.helpedActionPlanStep.trim().toLowerCase();
  }

  if (action?.planStep) return action.planStep;

  if (typeof input.helpedAction === "string" && input.helpedAction.trim()) {
    return input.helpedAction.trim().toLowerCase();
  }

  return actions.first.planStep;
}

export function createPlan(input = {}) {
  const safety = detectSafetyRisk(input);
  if (safety.crisis) {
    return {
      saveAllowed: false,
      safety,
      action: actions.crisis,
      humanCare: buildHumanCareResponse(safety),
      plan: null,
      note: "Crisis disclosures are not turned into saved plans.",
    };
  }

  const context = normalizeContext(input.context || {});
  const action = input.action || selectNextAction(context);
  const firstStep = planStepFromInput(input, action);
  const conditions = [
    compactCondition(context.triggerLabel, "urge moment"),
    compactCondition(context.timeContext, null),
    compactCondition(categorizeLocation(context.locationCue), null),
  ].filter(Boolean);
  const steps = [firstStep, "wait 10 minutes"];

  if (context.blocker === "need person" || action.category === "support") {
    steps.push("message someone safe");
  }

  const uniqueConditions = [...new Set(conditions)];
  const uniqueSteps = [...new Set(steps.filter(Boolean))];

  return {
    saveAllowed: true,
    safety,
    context: safePlanContext(context),
    plan: {
      title: "Personal 10-minute plan",
      if: uniqueConditions,
      then: uniqueSteps,
      text: `IF ${uniqueConditions.join(" + ")}, THEN ${uniqueSteps.join(" + ")}.`,
      storageNote: "Saved labels only. Raw typed signals are not stored by this API.",
      sourceContext: safePlanContext(context),
    },
  };
}

export function createShiftSession(input = {}) {
  const safety = detectSafetyRisk(input);
  const context = normalizeContext(input.context || {});

  if (safety.crisis) {
    return {
      session: getSession(input, "crisis gate"),
      context,
      action: actions.crisis,
      safety,
      humanCare: buildHumanCareResponse(safety),
      saveAllowed: false,
      crumbSteps,
      harmReductionOptions,
    };
  }

  return {
    session: getSession(input),
    context,
    action: actions.first,
    safety,
    saveAllowed: false,
    crumbSteps,
    harmReductionOptions,
    ranking: rankActions(context).slice(0, 3),
  };
}

export function respondToShift(input = {}) {
  const safety = detectSafetyRisk(input);
  const context = normalizeContext(input.context || {});

  if (safety.crisis) {
    return {
      session: getSession(input, "crisis gate"),
      context,
      action: actions.crisis,
      safety,
      humanCare: buildHumanCareResponse(safety),
      saveAllowed: false,
      buddyDraft: null,
      harmReductionOptions,
    };
  }

  const response = normalize(input.response || input.action, "next");
  const selectedOption = optionForLabel(input.selectedOption);
  let action = selectNextAction(context);
  let status = "active";
  let saveAllowed = false;
  let plan = null;
  let buddy = null;

  if (response === "done" || response === "helped") {
    saveAllowed = true;
    const planResponse = createPlan({
      ...input,
      context,
      helpedAction: input.helpedAction || input.lastAction,
      action,
    });
    plan = planResponse.plan;
    action = input.lastActionObject || action;
  }

  if (response === "too-hard") {
    context.blocker = "too hard";
    action = actions.downshift;
  }

  if (response === "different") {
    context.blocker = "wrong vibe";
    action = actions.different;
  }

  if (response === "person" || context.blocker === "need person") {
    context.blocker = "need person";
    action = actions.buddy;
    buddy = buddyDraft;
  }

  if (response === "anyway" || context.blocker === "still want it") {
    context.blocker = "still want it";
    context.readiness = "low";
    action = actions.harm;
  }

  if (selectedOption) {
    context.blocker = "harm reduction";
    action = selectedOption.action;
    saveAllowed = true;
    const planResponse = createPlan({
      ...input,
      context,
      selectedOption: selectedOption.label,
      action,
    });
    plan = planResponse.plan;
  }

  if (response === "stop") {
    status = "stopped";
    action = actions.stopped;
  }

  return {
    session: getSession(input, status),
    context,
    action,
    safety,
    saveAllowed,
    plan,
    buddyDraft: buddy,
    crumbSteps,
    harmReductionOptions,
    ranking: rankActions(context).slice(0, 3),
    reasonCodes: reasonCodesFor(context, action),
  };
}

function reasonCodesFor(context, action) {
  const reasons = ["safety-first", "low-effort-first"];

  if (context.energy === "no talking") reasons.push("no-talking");
  if (context.blocker === "too hard") reasons.push("downshift");
  if (context.blocker === "still want it") reasons.push("low-readiness");
  if (context.blocker === "need person") reasons.push("human-support");
  if (context.urge !== "unknown") reasons.push(`urge-${context.urge}`);
  if (action.category) reasons.push(`action-${action.category}`);

  return [...new Set(reasons)];
}
