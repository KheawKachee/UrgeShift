"use client";

import { useEffect, useMemo, useState } from "react";
import AppTabBar from "./components/AppTabBar";
import BrandHeader from "./components/BrandHeader";
import PhoneShell from "./components/PhoneShell";
import SessionScreen from "./components/SessionScreen";
import { recordHardcoreEvent, syncSpiritFromContext } from "./lib/hardcore";
import {
  createPlanPreview,
  fetchBuddyDraft,
  recommendShift,
  respondToShift,
  startShiftSession,
} from "./lib/shiftApi";
import { actions, buddyDraft, crumbSteps, normalize } from "./lib/urgeshift";

const defaultContext = {
  name: "Mint",
  place: "หน้าร้านสะดวกซื้อ กรุงเทพฯ",
  situation: "เลิกงานดึก เครียดมาก อยากดื่ม ไม่อยากอธิบาย",
};

function readHelperSpiritContext() {
  if (typeof window === "undefined" || typeof window.sessionStorage === "undefined") {
    return {};
  }

  try {
    const raw = window.sessionStorage.getItem("urgeshift-user-context");
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return {
      helperSpiritId: parsed?.result?.id || "unknown",
      helperSpiritTitle: parsed?.result?.title || "",
      helperSpiritOneLine: parsed?.result?.oneLine || "",
      helperSpiritLlmContext: parsed?.result?.llmContext || "",
    };
  } catch {
    return {};
  }
}

function getTimeContext(date = new Date()) {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

function includesAny(value, keywords) {
  return keywords.some((keyword) => value.includes(keyword));
}

function inferContextFromSituation(text) {
  const normalized = text.toLowerCase();
  const context = {};

  if (includesAny(normalized, ["drink", "ดื่ม"])) context.urge = "drink";
  if (includesAny(normalized, ["vape", "สูบ"])) context.urge = "vape";
  if (includesAny(normalized, ["scroll", "ไถ"])) context.urge = "scroll";
  if (includesAny(normalized, ["gamble", "พนัน"])) context.urge = "gamble";

  if (includesAny(normalized, ["stress", "เครียด"])) {
    context.triggerLabel = "stress";
  } else if (includesAny(normalized, ["after work", "work", "เลิกงาน"])) {
    context.triggerLabel = "after work";
  } else if (includesAny(normalized, ["tired", "เหนื่อย"])) {
    context.triggerLabel = "tired";
  } else if (includesAny(normalized, ["bored", "เบื่อ"])) {
    context.triggerLabel = "boredom";
  }

  if (
    normalized.includes("anyway") ||
    normalized.includes("do it") ||
    normalized.includes("still want") ||
    normalized.includes("ยังอยาก")
  ) {
    context.blocker = "still want it";
    context.readiness = "low";
  }

  return context;
}

export default function Home() {
  const [active, setActive] = useState(false);
  const [seconds, setSeconds] = useState(90);
  const [sessionId, setSessionId] = useState(null);
  const [sessionStatus, setSessionStatus] = useState("not started");
  const [currentAction, setCurrentAction] = useState(actions.first);
  const [urge, setUrge] = useState("unknown");
  const [energy, setEnergy] = useState("unknown");
  const [blocker, setBlocker] = useState("none");
  const [mode, setMode] = useState("waiting");
  const [crumbStep, setCrumbStep] = useState(null);
  const [buddyVisible, setBuddyVisible] = useState(false);
  const [buddyDraftText, setBuddyDraftText] = useState(buddyDraft);
  const [saveVisible, setSaveVisible] = useState(false);
  const [planPreview, setPlanPreview] = useState("");
  const [savedPlan, setSavedPlan] = useState("No current session plan yet.");
  const [copyText, setCopyText] = useState("Copy draft");
  const [currentContext, setCurrentContext] = useState(defaultContext);
  const [apiBusy, setApiBusy] = useState(false);

  const currentCrumb = useMemo(() => {
    if (crumbStep === null) return null;
    return crumbSteps[crumbStep] ?? null;
  }, [crumbStep]);

  useEffect(() => {
    const stored = window.sessionStorage.getItem("urgeshift-plan");
    if (stored) setSavedPlan(stored);
    syncSpiritFromContext();
  }, []);

  useEffect(() => {
    if (!active || seconds === 0) return undefined;
    const timer = window.setInterval(() => {
      setSeconds((value) => Math.max(0, value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [active, seconds]);

  useEffect(() => {
    if (active && seconds === 0) setSessionStatus("pause complete");
  }, [active, seconds]);

  function snapshotContext(overrides = {}) {
    const helperSpirit = readHelperSpiritContext();
    return {
      sessionId,
      name: currentContext.name,
      locationCue: currentContext.place || "unknown",
      timeContext: getTimeContext(),
      socialState: "unknown",
      triggerLabel: "urge moment",
      typedSignal: currentContext.situation,
      situationSummary: currentContext.situation || "unknown",
      urge,
      energy,
      blocker,
      mode,
      lastAction: currentAction.text,
      lastActionCategory: currentAction.category || "unknown",
      avoidActionTexts: currentAction?.text ? [currentAction.text] : [],
      avoidCategories: currentAction?.category ? [currentAction.category] : [],
      ...helperSpirit,
      ...inferContextFromSituation(currentContext.situation || ""),
      ...overrides,
    };
  }

  function applyAction(action) {
    if (!action?.text) return;
    setCurrentAction(action);
    setMode(action.mode.toLowerCase());
  }

  function applyBackendPayload(data, options = {}) {
    const { applyActionCard = true } = options;

    if (data?.session?.id) setSessionId(data.session.id);
    if (data?.session?.status) setSessionStatus(data.session.status);
    if (data?.buddyDraft) setBuddyDraftText(data.buddyDraft);

    if (data?.context) {
      if (data.context.urge) setUrge(data.context.urge);
      if (data.context.energy) setEnergy(data.context.energy);
      if (data.context.blocker) setBlocker(data.context.blocker);
    }

    if (data?.safety?.crisis) {
      setSessionStatus("crisis gate");
      setCrumbStep(null);
      setBuddyVisible(false);
      setSaveVisible(false);
    }

    if (applyActionCard && data?.action) {
      applyAction(data.action);
    }
  }

  function hidePanels() {
    setCrumbStep(null);
    setBuddyVisible(false);
    setSaveVisible(false);
  }

  async function startSession() {
    setActive(true);
    setSeconds(90);
    setSessionStatus("active");
    setUrge("unknown");
    setEnergy("unknown");
    setBlocker("none");
    setMode("first move");
    hidePanels();
    applyAction(actions.first);
    recordHardcoreEvent("session_started", { source: "shift" });

    setApiBusy(true);
    try {
      const data = await startShiftSession(
        {
          context: snapshotContext({
            energy: "unknown",
            blocker: "none",
            lastAction: actions.first.text,
            lastActionCategory: actions.first.category,
            avoidActionTexts: [actions.first.text],
            avoidCategories: [actions.first.category],
          }),
        },
        actions.first,
      );
      applyBackendPayload(data);
    } catch {
      setSessionStatus("local fallback");
    } finally {
      setApiBusy(false);
    }
  }

  async function requestShift(response, contextOverrides = {}, extra = {}, options = {}) {
    setApiBusy(true);

    try {
      const data = await respondToShift(
        {
          sessionId,
          response,
          context: snapshotContext(contextOverrides),
          lastAction: currentAction.text,
          lastActionObject: currentAction,
          ...extra,
        },
        currentAction,
      );
      applyBackendPayload(data, options);
      return data;
    } catch {
      setSessionStatus("local fallback");
      return null;
    } finally {
      setApiBusy(false);
    }
  }

  async function askToSavePlan(actionText = currentAction.text, contextOverrides = {}, selectedOption = null) {
    setSaveVisible(true);
    setPlanPreview("Creating a narrow save preview...");
    setApiBusy(true);

    try {
      const data = await createPlanPreview({
        sessionId,
        context: snapshotContext(contextOverrides),
        helpedAction: actionText,
        selectedOption,
        action: currentAction,
      });

      if (!data.saveAllowed) {
        setPlanPreview("This moment needs human support, so it was not saved as a plan.");
        return data;
      }

      setPlanPreview(data.plan.text);
      return data;
    } catch {
      setSessionStatus("local fallback");
      setPlanPreview(`IF urge moment, THEN ${actionText.toLowerCase()} + wait 10 minutes.`);
      return null;
    } finally {
      setApiBusy(false);
    }
  }

  function showCrumbs(step = 0) {
    setCrumbStep(step < crumbSteps.length ? step : null);
    if (step >= crumbSteps.length) applyAction(actions.water);
  }

  async function showBuddyBridge() {
    const draft = await fetchBuddyDraft(buddyDraftText || buddyDraft);
    setBuddyDraftText(draft);
    setBuddyVisible(true);
    setMode("buddy bridge");
  }

  function showHarmReduction() {
    setCrumbStep(null);
    setMode("harm-reduction mode");
  }

  async function selectCrumb(key, value) {
    const nextValue = normalize(value);
    const contextOverrides = { [key]: nextValue };
    const nextStep = (crumbStep ?? 0) + 1;
    const shouldApplyAction =
      nextStep >= crumbSteps.length ||
      value.includes("Need person") ||
      value.includes("Still want it");

    if (key === "urge") setUrge(nextValue);
    if (key === "energy") setEnergy(nextValue);
    if (key === "blocker") setBlocker(nextValue);

    const data = await requestShift(
      "crumb",
      contextOverrides,
      {
        crumbKey: key,
        crumbValue: value,
      },
      { applyActionCard: shouldApplyAction },
    );

    if (value.includes("Need person") || data?.action?.mode === "Buddy Bridge") {
      await showBuddyBridge();
      return;
    }

    if (value.includes("Still want it") || data?.action?.mode === "Harm-reduction mode") {
      setBlocker("still want it");
      showHarmReduction();
      return;
    }

    showCrumbs(nextStep);
  }

  async function handleEscape(action) {
    if (!active && action !== "stop") return;

    if (action === "done") {
      const data = await requestShift("done", {}, {}, { applyActionCard: false });
      showCrumbs(0);
      if (data?.plan?.text) {
        setPlanPreview(data.plan.text);
        setSaveVisible(true);
      } else {
        await askToSavePlan(currentAction.text);
      }
      recordHardcoreEvent("session_completed", { source: "shift", result: "done" });
    }

    if (action === "too-hard") {
      setBlocker("too hard");
      await requestShift("too-hard", { blocker: "too hard" });
      showCrumbs(0);
    }

    if (action === "different") {
      setBlocker("wrong vibe");
      await requestShift("different", { blocker: "wrong vibe" });
      showCrumbs(0);
    }

    if (action === "person") {
      await requestShift("person", { blocker: "need person" });
      await showBuddyBridge();
    }

    if (action === "anyway") {
      setBlocker("still want it");
      await requestShift("anyway", {
        blocker: "still want it",
        readiness: "low",
      });
      showHarmReduction();
      recordHardcoreEvent("session_completed", { source: "shift", result: "harm-reduction" });
    }

    if (action === "stop") {
      setActive(false);
      setSessionStatus("stopped");
      applyAction(actions.stopped);
      hidePanels();
      recordHardcoreEvent("session_stopped", { source: "shift" });
      await requestShift("stop", {}, {}, { applyActionCard: false });
    }
  }

  async function handleHarmMove(option) {
    setBlocker("harm reduction");

    const data = await requestShift(
      "harm-option",
      { blocker: "harm reduction" },
      { selectedOption: option },
    );

    if (data?.plan?.text) {
      setPlanPreview(data.plan.text);
      setSaveVisible(true);
    } else {
      await askToSavePlan(option, { blocker: "harm reduction" }, option);
    }
  }

  function savePlan() {
    const plans = JSON.parse(window.sessionStorage.getItem("urgeshift-plans") || "[]");
    const nextPlans = [
      {
        id: Date.now(),
        text: planPreview,
        cadence: "daily",
        createdAt: new Date().toISOString(),
      },
      ...plans,
    ];
    window.sessionStorage.setItem("urgeshift-plans", JSON.stringify(nextPlans));
    window.sessionStorage.setItem("urgeshift-plan", planPreview);
    setSavedPlan(planPreview);
    setSaveVisible(false);
    setSessionStatus("session plan ready");
    recordHardcoreEvent("plan_saved", { text: planPreview, cadence: "daily" });
  }

  function clearPlan() {
    window.sessionStorage.removeItem("urgeshift-plan");
    window.sessionStorage.removeItem("urgeshift-plans");
    setSavedPlan("No plan saved yet.");
  }

  function updateContext(field, value) {
    setCurrentContext((context) => ({
      ...context,
      [field]: value,
    }));
  }

  async function copyBuddy() {
    try {
      await navigator.clipboard.writeText(buddyDraftText);
      setCopyText("Copied");
    } catch {
      setCopyText("Select text");
    }
  }

  function closeBuddy() {
    setBuddyVisible(false);
    showCrumbs(crumbStep ?? 0);
  }

  function guardNavigation(href) {
    if (!active || href === "/") return true;
    return window.confirm("กำลังอยู่ในช่วงช่วยพยุงใจ\nจะออกจาก session นี้ไหม");
  }

  return (
    <main className="stage" data-state={active ? "active" : "idle"}>
      <AppTabBar beforeNavigate={guardNavigation} />

      <section className="left-pane" aria-label="UrgeShift session">
        <BrandHeader />
        <PhoneShell status={apiBusy ? "shaping move" : sessionStatus} active={active}>
          {!active ? (
            <section className="screen active">
              <div className="promise">
                <p className="tiny-label">เพื่อนที่คอยอยู่ข้างคุณเสมอ</p>
                <h2>ตอนใจเริ่มหลุด ไม่ต้องอธิบาย แค่ Shift.</h2>
              </div>
              <button className="shift-button" type="button" onClick={startSession}>
                <span>Shift Now</span>
                <small>เริ่มก้าวแรก</small>
              </button>
              <p className="privacy-note">
                ข้อมูลของผู้ใช้ จะหายไปหลังจากออกแอพโดยอัตโนมัติ
              </p>
            </section>
          ) : (
            <SessionScreen
              currentAction={currentAction}
              currentCrumb={currentCrumb}
              mode={mode}
              buddyVisible={buddyVisible}
              buddyDraft={buddyDraftText}
              saveVisible={saveVisible}
              planPreview={planPreview}
              copyText={copyText}
              onEscape={handleEscape}
              onSelectCrumb={selectCrumb}
              onHarmMove={handleHarmMove}
              onCopyBuddy={copyBuddy}
              onCloseBuddy={closeBuddy}
              onSavePlan={savePlan}
              onSkipSave={() => setSaveVisible(false)}
            />
          )}
        </PhoneShell>
      </section>

      <aside className="right-pane" aria-label="Session context and state">
        <section className="demo-brief">
          <p className="tiny-label">บริบทตอนนี้ / current state</p>
          <div className="context-fields">
            <label>
              <span>ชื่อ / Name</span>
              <input
                type="text"
                value={currentContext.name}
                onChange={(event) => updateContext("name", event.target.value)}
              />
            </label>
            <label>
              <span>ที่ไหน / Place</span>
              <input
                type="text"
                value={currentContext.place}
                onChange={(event) => updateContext("place", event.target.value)}
              />
            </label>
            <label>
              <span>ตอนนี้เกิดอะไรขึ้น / Situation</span>
              <textarea
                value={currentContext.situation}
                onChange={(event) => updateContext("situation", event.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="state-board">
          <p className="tiny-label">สรุปบริบท / Context Crumbs</p>
          <dl>
            <div><dt>urge</dt><dd>{urge}</dd></div>
            <div><dt>แรง</dt><dd>{energy}</dd></div>
            <div><dt>ติดขัด</dt><dd>{blocker}</dd></div>
            <div><dt>โหมด</dt><dd>{mode}</dd></div>
          </dl>
        </section>

        <section className="saved-plan">
          <p className="tiny-label">แผนที่บันทึก / Saved plan</p>
          <div>{savedPlan}</div>
          <button type="button" onClick={clearPlan}>ล้างแผน</button>
        </section>
      </aside>
    </main>
  );
}
