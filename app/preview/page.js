"use client";

import { useEffect, useState } from "react";
import AppTabBar from "../components/AppTabBar";

const profiles = {
  spark: {
    title: "ภูติประกายไฟ",
    tone: "คิดทีหลัง ขยับก่อน",
    encourage: "ไม่ต้องชนะทั้งคืน แค่ขยับออกจากจุดเดิมก่อน",
    color: "ember"
  },
  mist: {
    title: "ภูติหมอกนุ่ม",
    tone: "อย่าเร่งฉัน เดี๋ยวฉันกลับมาเอง",
    encourage: "ลดเสียงทุกอย่างลงก่อน ไม่ต้องรีบเก่ง",
    color: "mist"
  },
  sprout: {
    title: "ภูติต้นกล้า",
    tone: "ร่างกายนิ่ง ใจค่อยตาม",
    encourage: "จับร่างกายไว้กับพื้น น้ำ ลมหายใจ และก้าวเล็กๆ",
    color: "sprout"
  },
  water: {
    title: "ภูติน้ำใจ",
    tone: "ค่อยๆ รู้ทัน แล้วค่อยเลือก",
    encourage: "แค่รู้ว่าตอนนี้ใจเป็นอะไร ก็ช่วยให้ค่อยๆ ไปต่อได้",
    color: "water"
  },
  wind: {
    title: "ภูติลมเย็น",
    tone: "เอาให้ง่ายไว้ก่อน",
    encourage: "ไม่ต้องทำหลายอย่าง เอาแค่ก้าวที่ไหวตอนนี้ก็พอ",
    color: "wind"
  },
  light: {
    title: "ภูติแสงดาว",
    tone: "ไม่ต้องแก้ แค่อยู่ด้วย",
    encourage: "พูดไม่เก่ง แต่จะอยู่เป็นเพื่อนนะ",
    color: "light"
  }
};

const stages = [
  {
    id: "now",
    label: "ตอนนี้",
    action: "วางแรงกดลงก่อน",
    line: "ภูติอยู่ข้างๆ เงียบๆ ไม่ต้องรีบอธิบาย ไม่ต้องรีบร้อน"
  },
  {
    id: "10mins",
    label: "10 นาที",
    action: "เลือกก้าวเล็กที่ปลอดภัยกว่า",
    line: "แค่มีช่องว่างนิดเดียวระหว่าง แรงกระตุ้น กับการตอบสนอง คุณก็เริ่มมีทางเลือกแล้ว"
  },
  {
    id: "today",
    label: "วันนี้",
    action: "เก็บสิ่งที่ช่วยไว้เบาๆ",
    line: "ไม่ต้องทบทวนทุกอย่าง เก็บแค่วิธีเล็กๆ ที่พาคุณผ่านช่วงนั้นมาได้"
  },
  {
    id: "7days",
    label: "7 วัน",
    action: "ค่อยๆ เห็นทางกลับของตัวเอง",
    line: "แค่รู้มากขึ้นว่าเวลาใจหลุด จะพาตัวเองกลับมายังไง"
  }
];
function getStoredSpirit() {
  try {
    const raw = window.sessionStorage.getItem("urgeshift-user-context");
    if (!raw) return "wind";
    const parsed = JSON.parse(raw);
    return parsed?.result?.id && profiles[parsed.result.id] ? parsed.result.id : "wind";
  } catch {
    return "wind";
  }
}

export default function PreviewPage() {
  const [spirit, setSpirit] = useState("wind");
  const [stage, setStage] = useState(1);
  const [imageMissing, setImageMissing] = useState(false);

  useEffect(() => {
    setSpirit(getStoredSpirit());
  }, []);

  const profile = profiles[spirit];
  const currentStage = stages[stage];
  const imagePath = `/spirits/${spirit}_${currentStage.id}.png`;

  function changeStage(nextStage) {
    setStage(Number(nextStage));
    setImageMissing(false);
  }

  return (
    <main className="preview-page">
      <section className="preview-shell">
        <AppTabBar />

        <section className="preview-hero">
          <p className="eyebrow">Better Self Preview</p>
          <h1>ตัวเราที่ค่อยๆ กลับมาคุมได้</h1>
          <p>{profile.encourage}</p>
        </section>

        <section className="twin-card">
          <div className={`spirit-frame ${profile.color}`}>
            {!imageMissing ? (
              <img src={imagePath} alt={`${profile.title} ${currentStage.label}`} onError={() => setImageMissing(true)} />
            ) : (
              <div className="spirit-fallback" aria-label={`${profile.title} fallback`}>
                <span />
              </div>
            )}
          </div>

          <div className="twin-copy">
            <p className="tiny-label">{profile.title}</p>
            <h2>{currentStage.label}</h2>
            <h3>{profile.tone}</h3>
            <p>{currentStage.line}</p>
            <strong>{currentStage.action}</strong>
          </div>
        </section>

        <section className="timebar-panel">
          <div className="timebar-labels">
            {stages.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className={stage === index ? "active" : ""}
                onClick={() => changeStage(index)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
