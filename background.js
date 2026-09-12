const STORAGE_KEY = "nicelyLastOpened";
let dailyOpenQueue = Promise.resolve();

function localDay() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

async function openDailyNote() {
  const today = localDay();
  const stored = await chrome.storage.local.get(STORAGE_KEY);
  if (stored[STORAGE_KEY] === today) return;

  await chrome.storage.local.set({ [STORAGE_KEY]: today });
  await chrome.tabs.create({ url: chrome.runtime.getURL("nicely.html") });
}

function queueDailyNote() {
  dailyOpenQueue = dailyOpenQueue.then(openDailyNote, openDailyNote);
  return dailyOpenQueue;
}

chrome.runtime.onStartup.addListener(() => {
  void queueDailyNote();
});

chrome.windows.onCreated.addListener((window) => {
  if (window.type === "normal") void queueDailyNote();
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId !== chrome.windows.WINDOW_ID_NONE) void queueDailyNote();
});

chrome.tabs.onActivated.addListener(() => {
  void queueDailyNote();
});

chrome.tabs.onCreated.addListener(() => {
  void queueDailyNote();
});

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === "install") {
    await chrome.storage.local.set({ [STORAGE_KEY]: localDay() });
    await chrome.tabs.create({ url: chrome.runtime.getURL("nicely.html?welcome=1") });
  }
});
