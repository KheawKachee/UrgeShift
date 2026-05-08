"use client";

import { useEffect, useMemo, useState } from "react";
import AppTabBar from "../components/AppTabBar";

const traits = ["spark", "mist", "sprout", "water", "wind", "light"];

const traitLabels = {
  spark: "ไวไฟ",
  mist: "หมอกนุ่ม",
  sprout: "ต้นกล้า",
  water: "น้ำใจ",
  wind: "ลมเย็น",
  light: "แสงดาว"
};

const questions = [
  {
    id: "first_reaction",
    text: "ตอน urge เริ่มมา อยากให้ภูติช่วยแบบไหนก่อน?",
    choices: [
      { id: "move", text: "ชวนขยับนิดเดียว ก่อนใจจะต่อรองนานเกินไป", traits: { spark: 2, wind: 1 } },
      { id: "freeze", text: "ลดเสียงรอบตัว ให้ใจค่อยๆ กลับมา", traits: { mist: 2, sprout: 1 } },
      { id: "argue", text: "ช่วยสะท้อนความรู้สึกสั้นๆ แบบไม่ตัดสิน", traits: { water: 2, mist: 1 } },
      { id: "ping", text: "พาไปหาใครสักคนที่อยู่ด้วยได้", traits: { light: 2, water: 1 } }
    ]
  },
  {
    id: "best_help",
    text: "วิธีช่วยแบบไหนที่คุณน่าจะรับไหวที่สุด?",
    choices: [
      { id: "tiny_order", text: "คำสั้นๆ ทำง่าย ไม่ต้องคิดเยอะ", traits: { wind: 2, spark: 1 } },
      { id: "soft_voice", text: "เสียงนุ่มๆ ที่ไม่เร่ง ไม่กดดัน", traits: { mist: 2, light: 1 } },
      { id: "body_anchor", text: "ให้ร่างกายทำอะไรง่ายๆ ก่อน ใจค่อยตามมา", traits: { sprout: 2, spark: 1 } },
      { id: "name_feeling", text: "ช่วยตั้งชื่อสิ่งที่กำลังรู้สึกเบาๆ", traits: { water: 2, mist: 1 } }
    ]
  },
  {
    id: "bad_prompt",
    text: "ประโยคแบบไหนที่ทำให้คุณอยากถอยออกจากแอป?",
    choices: [
      { id: "just_stop", text: "พูดเหมือนเรื่องนี้ควรหยุดได้ง่ายๆ", traits: { light: 2, water: 1 } },
      { id: "explain_now", text: "ขอให้เล่าทุกอย่าง ทั้งที่ตอนนั้นไม่มีแรง", traits: { wind: 2, mist: 1 } },
      { id: "be_strong", text: "ทำให้รู้สึกว่าต้องเข้มแข็งกว่านี้", traits: { mist: 2, light: 1 } },
      { id: "future_talk", text: "พาไปคิดไกลเกินไป ทั้งที่ตอนนี้ยังไม่ไหว", traits: { sprout: 2, spark: 1 } }
    ]
  },
  {
    id: "when_low",
    text: "ถ้าแรงเหลือน้อยมาก ภูติควรขอแค่อะไร?",
    choices: [
      { id: "one_breath", text: "หายใจด้วยกันหนึ่งครั้ง", traits: { mist: 2, sprout: 1 } },
      { id: "turn_body", text: "หันตัวออกจากสิ่งที่กระตุ้นนิดเดียว", traits: { sprout: 2, wind: 1 } },
      { id: "tap_button", text: "กดปุ่มเดียว แล้วให้ภูติพาไปต่อ", traits: { wind: 2, spark: 1 } },
      { id: "send_dot", text: "ส่งจุดเล็กๆ ให้คนที่ไว้ใจ", traits: { light: 2, mist: 1 } }
    ]
  },
  {
    id: "after_help",
    text: "หลังผ่านช่วงนั้นมาได้ อยากจำอะไรไว้บ้าง?",
    choices: [
      { id: "worked_action", text: "จำวิธีที่ทำให้ผ่านมาได้", traits: { wind: 2, sprout: 1 } },
      { id: "pattern", text: "จำแพทเทิร์นง่ายๆ เพื่อช่วยครั้งหน้า", traits: { water: 2, sprout: 1 } },
      { id: "buddy", text: "จำคนที่ทำให้รู้สึกไม่ต้องผ่านคนเดียว", traits: { light: 2, water: 1 } },
      { id: "nothing", text: "ไม่ต้องจำเยอะ", traits: { mist: 2, wind: 1 } }
    ]
  }
];

const results = {
  spark: {
    title: "ภูติประกายไฟ",
    oneLine: "เริ่มนิดเดียวก่อน ใจค่อยตามมา",
    share: "ภูติประจำตัวของฉันคือ ภูติประกายไฟ: เวลาความอยากมาแรง แค่ขยับก้าวเล็กๆ ก่อนก็พอ",
    card: "เหมาะกับปุ่มใหญ่ ก้าวแรกง่าย คำน้อยๆ ที่ช่วยพาออกจากวงวนโดยไม่ต้องคิดเยอะ",
    llm: "User responds best to warm, immediate, low-verbiage actions. Prioritize one small concrete step, gentle momentum, and minimal reflection.",
    imagePrompt: "Original Thai guardian spirit mascot for urge interruption app, tiny ember spirit, soft warm orange glow, gentle forward motion, caring protective presence, not childish, paper-grain texture, Thai contemporary illustration, no text, mobile app result card, high contrast, kind expression"
  },

  mist: {
    title: "ภูติหมอกนุ่ม",
    oneLine: "ไม่ต้องรีบ เดี๋ยวค่อยๆ กลับมา",
    share: "ภูติประจำตัวของฉันคือ ภูติหมอกนุ่ม: วันที่ใจเบลอ แค่มีเสียงนุ่มๆ กับก้าวเล็กมากๆ ก็พอ",
    card: "เหมาะกับโหมดเงียบๆ grounding เบาๆ ไม่มีแรงกด ไม่มีคำสั่ง มีแค่การพากลับมาช้าๆ",
    llm: "User responds best to gentle, low-pressure, nonjudgmental support. Avoid urgency-heavy language. Offer very small grounding actions with warmth.",
    imagePrompt: "Original Thai guardian spirit mascot for urge interruption app, soft mist spirit, pale cream and cool green haze, calm caring presence, gentle rounded shapes, paper-grain texture, Thai contemporary illustration, no text, mobile app result card, soothing but not babyish"
  },

  sprout: {
    title: "ภูติต้นกล้า",
    oneLine: "จับพื้นไว้ แล้วหายใจอีกครั้ง",
    share: "ภูติประจำตัวของฉันคือ ภูติต้นกล้า: เวลาใจแกว่ง ร่างกายช่วยพากลับมาได้ทีละนิด",
    card: "เหมาะกับสิ่งจับต้องได้: วางเท้า ดื่มน้ำ ลุกเปลี่ยนที่ หายใจ และออกจากจุดที่กระตุ้น",
    llm: "User responds best to body-based grounding, environmental shifts, and simple routines. Suggest sensory anchors and gentle movement.",
    imagePrompt: "Original Thai guardian spirit mascot for urge interruption app, grounded sprout spirit, earthy green and ochre, small sturdy body, calm hands touching ground, caring protective companion, paper-grain texture, Thai contemporary illustration, no text, mobile app result card"
  },

  water: {
    title: "ภูติน้ำใจ",
    oneLine: "เรียกชื่อมันเบาๆ แล้วค่อยไปต่อ",
    share: "ภูติประจำตัวของฉันคือ ภูติน้ำใจ: แค่รู้ทันว่าใจตอนนี้เป็นอะไร บางอย่างก็เบาลงเองนิดหนึ่ง",
    card: "เหมาะกับการค่อยๆ รู้ทันใจแบบสั้นๆ: นี่คือเครียด นี่คือเหงา นี่คือเหนื่อย แล้วค่อยเลือกก้าวถัดไป",
    llm: "User responds best to brief emotional labeling and gentle meaning-making. Keep reflection short, validating, and followed by one small action.",
    imagePrompt: "Original Thai guardian spirit mascot for urge interruption app, water-heart spirit, small reflective gem, warm cream and teal, compassionate gaze, helps name feelings softly, paper-grain texture, Thai contemporary illustration, no text, mobile app result card"
  },

  wind: {
    title: "ภูติลมเย็น",
    oneLine: "ให้ง่ายไว้ก่อน ใจจะได้ไม่ถอย",
    share: "ภูติประจำตัวของฉันคือ ภูติลมเย็น: ตอนใจล้า แค่มีทางที่ง่ายพอให้ทำไหว ก็ช่วยได้มากแล้ว",
    card: "เหมาะกับทางเลือกสั้นๆ กดครั้งเดียว ใช้ค่าเริ่มต้นได้เลย และคำตอบที่ไม่ต้องฝืนคิดเยอะ",
    llm: "User has low tolerance for friction during distress. Use defaults, chips, one-tap choices, and avoid open-ended questions unless necessary.",
    imagePrompt: "Original Thai guardian spirit mascot for urge interruption app, wind spirit, tiny guide with folded-paper arrow cloak, soft orange accent, fast but gentle, minimal friction theme, caring expression, paper-grain texture, Thai contemporary illustration, no text, mobile app result card"
  },

  light: {
    title: "ภูติแสงดาว",
    oneLine: "ไม่ต้องผ่านคนเดียว",
    share: "ภูติประจำตัวของฉันคือ ภูติแสงดาว: บางช่วงเวลา แค่มีใครสักคนอยู่ปลายสายก็ช่วยให้ผ่านไปได้",
    card: "เหมาะกับ Buddy Bridge, ข้อความร่าง, คนที่ไว้ใจ, และภาษาที่ขอให้อยู่ด้วยโดยไม่รู้สึกเป็นภาระ",
    llm: "User responds best to relational support. Offer gentle buddy message drafts and reassurance that asking for presence is enough.",
    imagePrompt: "Original Thai guardian spirit mascot for urge interruption app, light spirit, tiny companion holding a soft glowing thread between people, warm green and orange, relational support, gentle protective expression, paper-grain texture, Thai contemporary illustration, no text, mobile app result card"
  }
};
function emptyScores() {
  return traits.reduce((scores, trait) => ({ ...scores, [trait]: 0 }), {});
}

function buildScores(answers) {
  return answers.reduce((scores, answer) => {
    Object.entries(answer.traits).forEach(([trait, value]) => {
      scores[trait] += value;
    });
    return scores;
  }, emptyScores());
}

function chooseResult(scores) {
  return traits.reduce((winner, trait) => (scores[trait] > scores[winner] ? trait : winner), "wind");
}

export default function ContextQuizPage() {
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);
  const [imageMissing, setImageMissing] = useState(false);

  const scores = useMemo(() => buildScores(answers), [answers]);
  const resultKey = useMemo(() => chooseResult(scores), [scores]);
  const result = results[resultKey];
  const question = questions[index];
  const resultImagePath = `/spirits/${resultKey}_today.png`;

  useEffect(() => {
    setImageMissing(false);
  }, [resultKey]);

  function start() {
    setStarted(true);
    setIndex(0);
    setAnswers([]);
    setSelected(null);
    setDone(false);
  }

  function next(skip = false) {
    const choice = skip ? null : selected;
    const nextAnswers = choice
      ? [
          ...answers.filter((answer) => answer.questionId !== question.id),
          {
            questionId: question.id,
            choiceId: choice.id,
            choiceText: choice.text,
            traits: choice.traits
          }
        ]
      : answers;

    setAnswers(nextAnswers);
    setSelected(null);

    if (index === questions.length - 1) {
      const finalScores = buildScores(nextAnswers);
      const finalKey = chooseResult(finalScores);
      const payload = {
        version: 1,
        source: "helper_spirit_context_quiz",
        language: "th-TH",
        traits: finalScores,
        result: {
          id: finalKey,
          title: results[finalKey].title,
          oneLine: results[finalKey].oneLine,
          llmContext: results[finalKey].llm,
          imagePrompt: results[finalKey].imagePrompt
        },
        answers: nextAnswers,
        generatedAt: new Date().toISOString()
      };
      window.sessionStorage.setItem("urgeshift-user-context", JSON.stringify(payload));
      setDone(true);
      return;
    }

    setIndex(index + 1);
  }

  async function copyShare() {
    await navigator.clipboard.writeText(`${result.share}\n\n${result.card}`);
    setCopied(true);
  }

  return (
    <main className="quiz-page">
      <section className="quiz-shell">
        <AppTabBar />

        {!started ? (
          <section className="quiz-hero p-6 max-w-sm mx-auto text-center space-y-3">
            <p className="eyebrow">Context quiz</p>
            <h1>ภูติประจำตัวของคุณเป็นแบบไหน?</h1>
            <p>ตอบ 5 ข้อ ให้แอปรู้ persona ที่ควรใช้ช่วยคุณตอน urge มา ข้อมูลอยู่แค่ใน session นี้</p>
            <button className="quiz-start" type="button" onClick={start}>เริ่มเลย / Start</button>
          </section>
        ) : null}

        {started && !done ? (
          <section className="quiz-card">
            <div className="quiz-progress">
              <span>ข้อ {index + 1}/5</span>
              <span>สั้นๆ พอ</span>
            </div>
            <h2>{question.text}</h2>
            <div className="quiz-choices">
              {question.choices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  className={selected?.id === choice.id ? "selected" : ""}
                  onClick={() => setSelected(choice)}
                >
                  {choice.text}
                </button>
              ))}
            </div>
            <div className="quiz-actions">
              <button type="button" onClick={() => next(true)}>ข้าม / Skip</button>
              <button type="button" disabled={!selected} onClick={() => next(false)}>
                {index === questions.length - 1 ? "ดูผล / Result" : "ต่อไป / Next"}
              </button>
            </div>
          </section>
        ) : null}

        {done ? (
          <section className="result-card">
            <p className="eyebrow">ผลลัพธ์ / Result</p>
            <div className="result-identity">
              <div className={`spirit-frame result-spirit ${resultKey === "spark" ? "ember" : resultKey}`}>
                {!imageMissing ? (
                  <img
                    src={resultImagePath}
                    alt={result.title}
                    onError={() => setImageMissing(true)}
                  />
                ) : (
                  <div className="spirit-fallback" aria-label={`${result.title} fallback`}>
                    <span />
                  </div>
                )}
              </div>
              <div>
                <h1>{result.title}</h1>
                <h2>{result.oneLine}</h2>
                <p>{result.card}</p>
              </div>
            </div>
            <div className="trait-grid">
              {traits.map((trait) => (
                <div key={trait}>
                  <span>{traitLabels[trait]}</span>
                  <strong>{scores[trait]}</strong>
                </div>
              ))}
            </div>
            <div className="share-copy">
              <p>{result.share}</p>
            </div>
            <div className="quiz-actions">
              <button type="button" onClick={copyShare}>{copied ? "คัดลอกแล้ว" : "คัดลอกการ์ด / Copy"}</button>
              <button type="button" onClick={() => window.print()}>พิมพ์ผลลัพธ์ / Print</button>
              <button type="button" onClick={start}>ทำใหม่ / Restart</button>
            </div>
          </section>
        ) : null}

      </section>
    </main>
  );
}
