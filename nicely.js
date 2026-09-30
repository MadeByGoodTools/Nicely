const noteEl = document.querySelector("#note");
const saveButton = document.querySelector("#save");
const anotherButton = document.querySelector("#another");
const continueButton = document.querySelector("#continue");
const dateEl = document.querySelector("#date");
const greetingEl = document.querySelector("#greeting");
const clouds = [...document.querySelectorAll(".cloud")];
const sparkleField = document.querySelector("#sparkles");
const viewSavedButton = document.querySelector("#view-saved");
const savedPanel = document.querySelector("#saved-panel");
const savedList = document.querySelector("#saved-list");
const savedEmpty = document.querySelector("#saved-empty");
const savedCount = document.querySelector("#saved-count");
const winkEl = document.querySelector(".wink");
const pawEl = document.querySelector(".paw-motion");
const DAILY_CHOICE_KEY = "nicelyDailyChoice";

let currentIndex = 0;
let savedNotes = [];

function dayNumber(date = new Date()) {
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date - start) / 86400000);
}

function noteCollection(date = new Date()) {
  return NOTES[timePeriod(date)];
}

function randomIndex(length) {
  if (globalThis.crypto?.getRandomValues) {
    const value = new Uint32Array(1);
    globalThis.crypto.getRandomValues(value);
    return value[0] % length;
  }
  return Math.floor(Math.random() * length);
}

async function dailyIndex(date = new Date()) {
  const notes = noteCollection(date);
  const choiceId = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${timePeriod(date)}`;
  const data = await chrome.storage.local.get(DAILY_CHOICE_KEY);
  const savedChoice = data[DAILY_CHOICE_KEY];
  if (savedChoice?.id === choiceId && Number.isInteger(savedChoice.index) && savedChoice.index < notes.length) {
    return savedChoice.index;
  }

  const index = randomIndex(notes.length);
  await chrome.storage.local.set({ [DAILY_CHOICE_KEY]: { id: choiceId, index } });
  return index;
}

const GREETING_PARTS = {
  morning: [
    "Good morning",
    "A fresh morning",
    "As the day begins",
    "A gentle start",
    "Morning is here",
    "For the day ahead",
    "I’m glad you came by this morning",
    "There you are—good morning"
  ],
  afternoon: [
    "Good afternoon",
    "A quiet afternoon pause",
    "In the middle of your day",
    "For the rest of today",
    "This afternoon",
    "For right now",
    "I’m glad you found your way here",
    "A little place to land this afternoon"
  ],
  evening: [
    "Good evening",
    "As the day softens",
    "For this quiet evening",
    "Before the day ends",
    "You made it here",
    "As evening settles in",
    "There you are—I’m glad you’re here",
    "This evening kept a quiet moment for you"
  ],
  night: [
    "For this late hour",
    "Before you rest",
    "A quiet moment tonight",
    "The day can be still now",
    "For the end of your day",
    "As night grows quiet",
    "I’m glad you’re here tonight",
    "You are welcome in this quiet little place"
  ],
  endings: [
    "— this one is for you",
    "— a little kindness for you",
    "— something gentle to carry with you",
    "— take this moment softly",
    "— here is a small bit of light",
    "— a kind word, just when you need it",
    "— something warm for right now",
    "— begin again from here",
    "— I’m really glad you’re here",
    "— you are welcome here, exactly as you are",
    "— this little place saved a soft moment for you",
    "— there is room for you here",
    "— you never have to earn your welcome here",
    "— stay for one gentle breath",
    "— the day is better for having you in it",
    "— come as you are; that is enough"
  ]
};

function timePeriod(date = new Date()) {
  const hour = date.getHours();
  return hour < 12 ? "morning" : hour < 17 ? "afternoon" : hour < 22 ? "evening" : "night";
}

function dailyGreeting(date = new Date(), personalSeed = currentIndex) {
  const hour = date.getHours();
  const period = timePeriod(date);
  const daySeed = date.getFullYear() * 366 + dayNumber(date);
  const timeSeed = Math.floor((hour * 60 + date.getMinutes()) / 30);
  const openings = GREETING_PARTS[period];
  const endings = GREETING_PARTS.endings;
  const opening = openings[(daySeed + timeSeed + personalSeed) % openings.length];
  const ending = endings[(daySeed * 3 + timeSeed * 5 + personalSeed * 7) % endings.length];
  return opening + " " + ending;
}

function renderNote(index, animate = false) {
  const notes = noteCollection();
  const apply = () => {
    currentIndex = index;
    noteEl.textContent = notes[index];
    const isSaved = savedNotes.includes(notes[index]);
    saveButton.classList.toggle("saved", isSaved);
    saveButton.setAttribute("aria-pressed", String(isSaved));
    const heart = document.createElement("span");
    heart.setAttribute("aria-hidden", "true");
    heart.textContent = isSaved ? "♥" : "♡";
    saveButton.replaceChildren(heart, document.createTextNode(` ${isSaved ? "Saved" : "Save this note"}`));
    noteEl.classList.remove("changing");
  };

  if (!animate) return apply();
  noteEl.classList.add("changing");
  window.setTimeout(apply, 170);
}

function renderSavedNotes() {
  savedCount.textContent = savedNotes.length;
  savedEmpty.hidden = savedNotes.length > 0;
  savedList.replaceChildren();

  savedNotes.forEach(savedNote => {
    const item = document.createElement("li");
    item.className = "saved-note";
    const text = document.createElement("span");
    text.textContent = savedNote;
    const remove = document.createElement("button");
    remove.className = "remove-saved";
    remove.type = "button";
    remove.dataset.note = savedNote;
    remove.setAttribute("aria-label", "Remove saved note");
    remove.textContent = "×";
    item.append(text, remove);
    savedList.appendChild(item);
  });
}

function anotherIndex() {
  const notes = noteCollection();
  if (notes.length < 2) return currentIndex;
  let next;
  do next = randomIndex(notes.length); while (next === currentIndex);
  return next;
}

async function init() {
  const data = await chrome.storage.local.get("nicelySavedNotes");
  savedNotes = Array.isArray(data.nicelySavedNotes) ? data.nicelySavedNotes : [];
  renderSavedNotes();
  const now = new Date();
  renderNote(await dailyIndex(now));

  document.body.dataset.period = timePeriod(now);
  dateEl.textContent = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  greetingEl.textContent = dailyGreeting(now);
}

anotherButton.addEventListener("click", () => renderNote(anotherIndex(), true));
continueButton.addEventListener("click", () => window.close());

saveButton.addEventListener("click", async () => {
  const note = noteCollection()[currentIndex];
  savedNotes = savedNotes.includes(note) ? savedNotes.filter(item => item !== note) : [...savedNotes, note];
  await chrome.storage.local.set({ nicelySavedNotes: savedNotes });
  renderNote(currentIndex);
  renderSavedNotes();
});

viewSavedButton.addEventListener("click", () => {
  const willOpen = savedPanel.hidden;
  savedPanel.hidden = !willOpen;
  viewSavedButton.setAttribute("aria-expanded", String(willOpen));
});

savedList.addEventListener("click", async event => {
  const remove = event.target.closest(".remove-saved");
  if (!remove) return;
  savedNotes = savedNotes.filter(note => note !== remove.dataset.note);
  await chrome.storage.local.set({ nicelySavedNotes: savedNotes });
  renderSavedNotes();
  renderNote(currentIndex);
});

init();

for (let index = 0; index < 14; index += 1) {
  const sparkle = document.createElement("span");
  sparkle.className = "sparkle";
  sparkle.style.setProperty("--left", `${5 + Math.random() * 90}%`);
  sparkle.style.setProperty("--top", `${6 + Math.random() * 84}%`);
  sparkle.style.setProperty("--size", `${3 + Math.random() * 4}px`);
  sparkle.style.setProperty("--duration", `${5.5 + Math.random() * 6}s`);
  sparkle.style.setProperty("--delay", `${Math.random() * -10}s`);
  sparkle.style.setProperty("--brightness", `${0.28 + Math.random() * 0.3}`);
  sparkleField.appendChild(sparkle);
}

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const blinkOnce = () => {
    winkEl.classList.add("active");
    window.setTimeout(() => winkEl.classList.remove("active"), 190);
  };

  const scheduleWink = () => {
    window.setTimeout(() => {
      blinkOnce();
      if (Math.random() < .18) window.setTimeout(blinkOnce, 420);
      scheduleWink();
    }, 6500 + Math.random() * 10500);
  };

  const schedulePaw = () => {
    window.setTimeout(() => {
      pawEl.classList.remove("waving");
      void pawEl.offsetWidth;
      pawEl.classList.add("waving");
      schedulePaw();
    }, 9000 + Math.random() * 14000);
  };

  scheduleWink();
  schedulePaw();
}

window.setInterval(async () => {
  const now = new Date();
  const previousPeriod = document.body.dataset.period;
  greetingEl.textContent = dailyGreeting(now);
  document.body.dataset.period = timePeriod(now);
  if (previousPeriod && previousPeriod !== timePeriod(now)) renderNote(await dailyIndex(now), true);
}, 60000);

if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  let frame;
  window.addEventListener("pointermove", event => {
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      const x = event.clientX / window.innerWidth - 0.5;
      const y = event.clientY / window.innerHeight - 0.5;
      const depths = [42, -32, 22];
      clouds.forEach((cloud, index) => {
        const depth = depths[index];
        cloud.style.setProperty("--mx", `${x * depth}px`);
        cloud.style.setProperty("--my", `${y * depth * 0.8}px`);
      });
      document.querySelectorAll(".sparkle").forEach((sparkle, index) => {
        const direction = index % 2 === 0 ? 1 : -1;
        const depth = 5 + (index % 4) * 2;
        sparkle.style.setProperty("--drift-x", `${x * depth * direction}px`);
        sparkle.style.setProperty("--drift-y", `${y * depth}px`);
      });
      document.documentElement.style.setProperty("--pointer-x", `${event.clientX}px`);
      document.documentElement.style.setProperty("--pointer-y", `${event.clientY}px`);
      document.documentElement.style.setProperty("--haze-x", `${x * -10}px`);
      document.documentElement.style.setProperty("--haze-y", `${y * -8}px`);
    });
  }, { passive: true });
}
