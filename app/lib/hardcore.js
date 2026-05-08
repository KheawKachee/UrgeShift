const HARDCORE_KEY = "urgeshift-hardcore-v1";
const CONTEXT_KEY = "urgeshift-user-context";

export const HARDCORE_TABS = [
  { href: "/", label: "Shift" },
  { href: "/context", label: "ภูติ" },
  { href: "/preview", label: "Preview" },
  { href: "/plans", label: "Plans" },
  { href: "/progress", label: "Progress" }
];

export const CHECKIN_QUESTIONS = [
  {
    id: "stability",
    prompt: "ตอนนี้ใจไหวแค่ไหน",
    choices: ["ยังโอเค", "เริ่มแกว่ง", "เสี่ยงแล้ว", "ไม่ไหวแล้ว"]
  },
  {
    id: "help",
    prompt: "ตอนนี้อยากให้ช่วยแบบไหน",
    choices: ["ขยับก่อน", "เงียบๆ ก่อน", "เตือนแผน", "ขอคนอยู่ด้วย"]
  },
  {
    id: "goal",
    prompt: "เอาเป้าหมายเล็กอะไรสำหรับรอบนี้",
    choices: ["ผ่าน 10 นาที", "ทำตามแผนเดิม", "ทักใครสักคน", "แค่เช็กชื่อใจ"]
  }
];

function canUseBrowserStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function safeParse(raw, fallback) {
  if (!raw) return fallback;

  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function todayKey(dateInput = new Date()) {
  return new Date(dateInput).toISOString().slice(0, 10);
}

function startOfDay(dateInput) {
  const date = new Date(dateInput);
  date.setHours(0, 0, 0, 0);
  return date;
}

function uniqueDays(items) {
  return [...new Set(items.map((item) => todayKey(item.at || item.createdAt || item.completedAt)))];
}

function emptyModel() {
  return {
    version: 1,
    localName: "",
    spiritId: "wind",
    checkInSlot: "after-work",
    events: [],
    checkIns: []
  };
}

export function readHardcoreState() {
  if (!canUseBrowserStorage()) return emptyModel();
  const parsed = safeParse(window.localStorage.getItem(HARDCORE_KEY), emptyModel());
  return {
    ...emptyModel(),
    ...parsed,
    events: Array.isArray(parsed.events) ? parsed.events : [],
    checkIns: Array.isArray(parsed.checkIns) ? parsed.checkIns : []
  };
}

export function writeHardcoreState(nextState) {
  if (!canUseBrowserStorage()) return nextState;
  window.localStorage.setItem(HARDCORE_KEY, JSON.stringify(nextState));
  return nextState;
}

export function syncSpiritFromContext() {
  if (typeof window === "undefined" || typeof window.sessionStorage === "undefined") return readHardcoreState();
  const state = readHardcoreState();
  const context = safeParse(window.sessionStorage.getItem(CONTEXT_KEY), null);
  const spiritId = context?.result?.id || state.spiritId || "wind";
  const nextState = { ...state, spiritId };
  return writeHardcoreState(nextState);
}

export function setLocalName(localName) {
  const state = readHardcoreState();
  return writeHardcoreState({ ...state, localName: localName.trim() });
}

export function setCheckInSlot(checkInSlot) {
  const state = readHardcoreState();
  return writeHardcoreState({ ...state, checkInSlot });
}

export function recordHardcoreEvent(type, payload = {}) {
  const state = syncSpiritFromContext();
  const event = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    at: new Date().toISOString(),
    ...payload
  };
  const nextState = {
    ...state,
    events: [event, ...state.events].slice(0, 400)
  };
  writeHardcoreState(nextState);
  return event;
}

export function recordCheckIn(checkIn) {
  const state = syncSpiritFromContext();
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    completedAt: new Date().toISOString(),
    ...checkIn
  };
  const nextState = {
    ...state,
    checkIns: [entry, ...state.checkIns].slice(0, 120)
  };
  writeHardcoreState(nextState);
  recordHardcoreEvent("checkin_completed", {
    stability: entry.stability,
    help: entry.help,
    goal: entry.goal,
    cta: entry.cta
  });
  return entry;
}

export function getLocalSpirit() {
  return syncSpiritFromContext().spiritId || "wind";
}

export function buildProgressSnapshot(state = readHardcoreState()) {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const events = state.events || [];
  const checkIns = state.checkIns || [];
  const recentEvents = events.filter((event) => new Date(event.at).getTime() >= weekAgo);
  const recentCheckIns = checkIns.filter((entry) => new Date(entry.completedAt).getTime() >= weekAgo);

  const sessionsStarted = events.filter((event) => event.type === "session_started");
  const sessionsCompleted = events.filter(
    (event) => event.type === "session_completed" || event.type === "session_plan_saved"
  );
  const plansSaved = events.filter((event) => event.type === "plan_saved");
  const plansFollowed = events.filter((event) => event.type === "plan_followed");
  const checkInsStarted = events.filter((event) => event.type === "checkin_started");

  const pathCounts = {
    Shift: sessionsStarted.length,
    Plans: plansSaved.length + plansFollowed.length,
    Progress: checkIns.length
  };
  const mostUsedSupportPath = Object.entries(pathCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Shift";

  const streakDays = uniqueDays(checkIns);
  let streak = 0;
  for (let index = 0; index < 30; index += 1) {
    const date = startOfDay(Date.now() - index * 24 * 60 * 60 * 1000);
    if (streakDays.includes(todayKey(date))) {
      streak += 1;
      continue;
    }
    break;
  }

  const activeDaysThisWeek = new Set(
    [...recentEvents, ...recentCheckIns.map((item) => ({ at: item.completedAt }))]
      .map((item) => todayKey(item.at))
  ).size;

  const percentages = {
    checkInCompletionRate: checkInsStarted.length
      ? Math.round((checkIns.length / checkInsStarted.length) * 100)
      : 0,
    planSaveRate: sessionsStarted.length ? Math.round((plansSaved.length / sessionsStarted.length) * 100) : 0,
    planFollowThroughRate: plansSaved.length ? Math.round((plansFollowed.length / plansSaved.length) * 100) : 0,
    urgeSessionCompletionRate: sessionsStarted.length
      ? Math.round((sessionsCompleted.length / sessionsStarted.length) * 100)
      : 0,
    returnRateThisWeek: Math.min(100, Math.round((activeDaysThisWeek / 7) * 100))
  };

  return {
    localName: state.localName || "",
    spiritId: state.spiritId || "wind",
    checkInSlot: state.checkInSlot || "after-work",
    streak,
    checkInsThisWeek: recentCheckIns.length,
    plansFollowed: plansFollowed.length,
    sessionsCompleted: sessionsCompleted.length,
    totalPlansSaved: plansSaved.length,
    activeDaysThisWeek,
    mostUsedSupportPath,
    percentages
  };
}
