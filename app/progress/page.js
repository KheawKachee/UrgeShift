"use client";

import { useEffect, useMemo, useState } from "react";
import AppTabBar from "../components/AppTabBar";
import { actions } from "../lib/urgeshift";
import {
  CHECKIN_QUESTIONS,
  buildProgressSnapshot,
  readHardcoreState,
  recordCheckIn,
  recordHardcoreEvent,
  setCheckInSlot,
  setLocalName,
  syncSpiritFromContext
} from "../lib/hardcore";
import { recommendShift } from "../lib/shiftApi";

const slotLabels = {
  morning: "ตอนเช้า",
  "after-work": "หลังเลิกงาน",
  night: "ก่อนนอน"
};

export default function ProgressPage() {
  const [state, setState] = useState(null);
  const [localNameDraft, setLocalNameDraft] = useState("");
  const [checkInIndex, setCheckInIndex] = useState(-1);
  const [answers, setAnswers] = useState({});
  const [suggestion, setSuggestion] = useState(actions.first);
  const [showMetrics, setShowMetrics] = useState(false);

  function refresh() {
    const nextState = syncSpiritFromContext();
    setState(nextState);
    setLocalNameDraft(nextState.localName || "");
  }

  useEffect(() => {
    refresh();
  }, []);

  const snapshot = useMemo(
    () => buildProgressSnapshot(state || readHardcoreState()),
    [state]
  );

  const activeQuestion = checkInIndex >= 0 ? CHECKIN_QUESTIONS[checkInIndex] : null;

  function saveLocalName() {
    setLocalName(localNameDraft);
    refresh();
  }

  function beginCheckIn() {
    setAnswers({});
    setCheckInIndex(0);
    recordHardcoreEvent("checkin_started", { slot: snapshot.checkInSlot });
  }

  async function answerQuestion(choice) {
    const key = activeQuestion.id;
    const nextAnswers = { ...answers, [key]: choice };

    if (checkInIndex < CHECKIN_QUESTIONS.length - 1) {
      setAnswers(nextAnswers);
      setCheckInIndex(checkInIndex + 1);
      return;
    }

    const completedAnswers = nextAnswers;
    const recommended = await recommendShift(
      {
        event: "checkin",
        urgency: completedAnswers.stability,
        requested_help: completedAnswers.help,
        value: completedAnswers.goal
      },
      actions.first
    );

    setSuggestion(recommended.action || actions.first);
    recordCheckIn({
      stability: completedAnswers.stability,
      help: completedAnswers.help,
      goal: completedAnswers.goal,
      cta: "saved"
    });
    setAnswers(completedAnswers);
    setCheckInIndex(-1);
    refresh();
  }

  if (!state) return null;

  return (
    <main className="plans-page">
      <section className="plans-shell progress-shell">
        <AppTabBar />

        <div className="plans-header progress-header">
          <div>
            <p className="eyebrow">Progress</p>
            <h1>{snapshot.localName ? `${snapshot.localName} วันนี้เป็นยังไงบ้าง` : "Hardcore Mode"}</h1>
            <p>เก็บไว้บนอุปกรณ์นี้เท่านั้น ใช้ติดตามจังหวะของตัวเองและเล่า metrics ให้ judge ได้ในหน้าเดียว</p>
          </div>
        </div>

        <section className="progress-card">
          <p className="tiny-label">บริบทตอนนี้ / current state</p>
          <div className="progress-inline">
            <label className="progress-field">
              <span>ชื่อ / Name</span>
              <input
                type="text"
                value={localNameDraft}
                placeholder="ตั้งชื่อ"
                onChange={(event) => setLocalNameDraft(event.target.value)}
                onBlur={saveLocalName}
              />
            </label>
            <button type="button" onClick={saveLocalName}>บันทึกชื่อ</button>
          </div>
        </section>

        <section className="progress-grid">
          <article className="progress-card checkin-card">
            <div className="progress-card-head">
              <div>
                <p className="tiny-label">Scheduled Check-In</p>
                <h2>เช็กใจสั้นๆ</h2>
              </div>
              <select
                value={snapshot.checkInSlot}
                onChange={(event) => {
                  setCheckInSlot(event.target.value);
                  refresh();
                }}
              >
                {Object.entries(slotLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            {activeQuestion ? (
              <div className="checkin-flow">
                <p className="progress-step">ข้อ {checkInIndex + 1}/3</p>
                <h3>{activeQuestion.prompt}</h3>
                <div className="checkin-choices">
                  {activeQuestion.choices.map((choice) => (
                    <button key={choice} type="button" onClick={() => answerQuestion(choice)}>
                      {choice}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="checkin-idle">
                <p>รอบล่าสุดช่วยชี้ไปที่: <strong>{suggestion.text}</strong></p>
                <button type="button" className="active" onClick={beginCheckIn}>เริ่มเช็กอิน</button>
              </div>
            )}
          </article>

          <article className="progress-card">
            <p className="tiny-label">Progress Board</p>
            <div className="metric-grid">
              <div><span>streak</span><strong>{snapshot.streak}</strong></div>
              <div><span>check-ins สัปดาห์นี้</span><strong>{snapshot.checkInsThisWeek}</strong></div>
              <div><span>ทำตามแผน</span><strong>{snapshot.plansFollowed}</strong></div>
              <div><span>ผ่าน session</span><strong>{snapshot.sessionsCompleted}</strong></div>
            </div>
          </article>
        </section>

        <section className="progress-card">
          <button
            type="button"
            className={`metrics-toggle ${showMetrics ? "active" : ""}`}
            onClick={() => setShowMetrics((value) => !value)}
          >
            {showMetrics ? "ซ่อน Demo Metrics" : "ดู Demo Metrics"}
          </button>

          {showMetrics ? (
            <div className="metric-grid metric-grid--demo">
              <div><span>check-in completion</span><strong>{snapshot.percentages.checkInCompletionRate}%</strong></div>
              <div><span>plan save rate</span><strong>{snapshot.percentages.planSaveRate}%</strong></div>
              <div><span>plan follow-through</span><strong>{snapshot.percentages.planFollowThroughRate}%</strong></div>
              <div><span>session completion</span><strong>{snapshot.percentages.urgeSessionCompletionRate}%</strong></div>
              <div><span>return this week</span><strong>{snapshot.percentages.returnRateThisWeek}%</strong></div>
              <div><span>most-used path</span><strong>{snapshot.mostUsedSupportPath}</strong></div>
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}
