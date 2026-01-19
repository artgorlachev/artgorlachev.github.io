const calendarGrid = document.getElementById("calendarGrid");
const monthTitle = document.getElementById("monthTitle");
const prevMonthBtn = document.getElementById("prevMonth");
const nextMonthBtn = document.getElementById("nextMonth");
const todayBtn = document.getElementById("todayBtn");
const dayModal = document.getElementById("dayModal");
const closeModalBtn = document.getElementById("closeModal");
const cancelBtn = document.getElementById("cancelBtn");
const saveBtn = document.getElementById("saveBtn");
const deleteEntryBtn = document.getElementById("deleteEntry");
const dayStatus = document.getElementById("dayStatus");
const shiftFields = document.getElementById("shiftFields");
const startTime = document.getElementById("startTime");
const endTime = document.getElementById("endTime");
const breakMinutes = document.getElementById("breakMinutes");
const fixedAmount = document.getElementById("fixedAmount");
const hourlyRate = document.getElementById("hourlyRate");
const bonusAmount = document.getElementById("bonusAmount");
const dayNote = document.getElementById("dayNote");
const shiftTotal = document.getElementById("shiftTotal");
const statsEarnings = document.getElementById("statsEarnings");
const statsShifts = document.getElementById("statsShifts");
const statsHours = document.getElementById("statsHours");
const statsAverage = document.getElementById("statsAverage");
const shiftList = document.getElementById("shiftList");
const statusFilter = document.getElementById("statusFilter");
const exportBtn = document.getElementById("exportBtn");
const backupBtn = document.getElementById("backupBtn");
const importInput = document.getElementById("importInput");
const themeToggle = document.getElementById("themeToggle");
const clearBtn = document.getElementById("clearBtn");
const closeBtn = document.getElementById("closeBtn");
const validationMessage = document.getElementById("validationMessage");
const toggleButtons = Array.from(document.querySelectorAll(".toggle-btn"));
const fixedFields = document.getElementById("fixedFields");
const hourlyFields = document.getElementById("hourlyFields");
const importHint = document.getElementById("importHint");
const toast = document.getElementById("toast");
const tabButtons = Array.from(document.querySelectorAll("[data-tab]"));
const tabPanels = Array.from(document.querySelectorAll("[data-panel]"));
const tabMediaQuery = window.matchMedia("(max-width: 900px)");

const STORAGE_KEY = "shiftCalendarEntries";
const THEME_KEY = "shiftCalendarTheme";
const TELEGRAM_DATA_KEY = "shiftCalendarTelegramTheme";

const telegramApp = window.Telegram?.WebApp || null;
const defaultColors = getDefaultColors();

let currentDate = new Date();
currentDate.setDate(1);
let selectedDateKey = null;
let entries = loadEntries();
let payMode = "fixed";
let toastTimeout = null;
let activeTab = "calendar";

const statusLabels = {
  shift: "Смена",
  off: "Выходной",
  vacation: "Отпуск",
  sick: "Больничный",
  other: "Другое",
};

const allowedStatuses = new Set(Object.keys(statusLabels));

function getDefaultColors() {
  const styles = getComputedStyle(document.documentElement);
  return {
    bg: styles.getPropertyValue("--bg").trim(),
    card: styles.getPropertyValue("--card").trim(),
    text: styles.getPropertyValue("--text").trim(),
    muted: styles.getPropertyValue("--muted").trim(),
    primary: styles.getPropertyValue("--primary").trim(),
    border: styles.getPropertyValue("--border").trim(),
  };
}

function loadEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
}

function saveEntries() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  if (toastTimeout) {
    clearTimeout(toastTimeout);
  }
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

function setActiveTab(tabName) {
  activeTab = tabName;
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabName);
  });
  if (tabMediaQuery.matches) {
    tabPanels.forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.panel === tabName);
    });
  } else {
    tabPanels.forEach((panel) => {
      panel.classList.add("active");
    });
  }
}

function formatDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function parseDateKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatCurrency(value) {
  return `${Math.round(value)} ₽`;
}

function formatHours(value) {
  return `${value.toFixed(1)} ч`;
}

function getMonthTitle(date) {
  return date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
}

function getStartOfCalendar(date) {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const dayOfWeek = (firstDay.getDay() + 6) % 7;
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - dayOfWeek);
  return start;
}

function calculateWorkedHours(entry) {
  if (!entry.startTime || !entry.endTime) {
    return 0;
  }
  const [startH, startM] = entry.startTime.split(":").map(Number);
  const [endH, endM] = entry.endTime.split(":").map(Number);
  if (Number.isNaN(startH) || Number.isNaN(endH)) {
    return 0;
  }
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  let diff = endMinutes - startMinutes;
  if (diff < 0) {
    diff += 24 * 60;
  }
  const breakValue = Math.max(0, Number(entry.breakMinutes) || 0);
  const worked = Math.max(0, diff - breakValue);
  return worked / 60;
}

function calculateShiftTotal(entry) {
  const bonus = Math.max(0, Number(entry.bonusAmount) || 0);
  if (entry.payMode === "hourly") {
    const hours = calculateWorkedHours(entry);
    const rate = Math.max(0, Number(entry.hourlyRate) || 0);
    return hours * rate + bonus;
  }
  const fixed = Math.max(0, Number(entry.fixedAmount) || 0);
  return fixed + bonus;
}

function renderCalendar() {
  calendarGrid.innerHTML = "";
  monthTitle.textContent = getMonthTitle(currentDate);

  const start = getStartOfCalendar(currentDate);
  for (let i = 0; i < 42; i += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const key = formatDateKey(day);
    const entry = entries[key];

    const dayEl = document.createElement("div");
    dayEl.className = "calendar-day";
    if (day.getMonth() !== currentDate.getMonth()) {
      dayEl.classList.add("outside");
    }

    if (entry) {
      if (entry.status === "shift") {
        const total = calculateShiftTotal(entry);
        dayEl.classList.add(total > 0 ? "shift-complete" : "shift-incomplete");
      } else if (entry.status === "off") {
        dayEl.classList.add("off");
      } else if (entry.status === "vacation") {
        dayEl.classList.add("vacation");
      } else if (entry.status === "sick") {
        dayEl.classList.add("sick");
      } else if (entry.status === "other") {
        dayEl.classList.add("other");
      }
    }

    const dateEl = document.createElement("div");
    dateEl.className = "date";
    dateEl.textContent = day.getDate();

    const metaEl = document.createElement("div");
    metaEl.className = "meta";
    if (entry) {
      if (entry.status === "shift") {
        const total = calculateShiftTotal(entry);
        metaEl.textContent = total > 0 ? formatCurrency(total) : "Данные неполные";
      } else {
        metaEl.textContent = statusLabels[entry.status] || "";
      }
    } else {
      metaEl.textContent = "Без записи";
    }

    dayEl.append(dateEl, metaEl);
    dayEl.addEventListener("click", () => openModal(key));
    calendarGrid.appendChild(dayEl);
  }

  updateStats();
  updateShiftList();
}

function openModal(dateKey) {
  selectedDateKey = dateKey;
  const entry = entries[dateKey];
  document.getElementById("modalTitle").textContent = `Редактировать ${formatDateForTitle(dateKey)}`;
  dayStatus.value = entry?.status || "shift";
  shiftFields.classList.toggle("hidden", dayStatus.value !== "shift");

  startTime.value = entry?.startTime || "";
  endTime.value = entry?.endTime || "";
  breakMinutes.value = entry?.breakMinutes ?? 0;
  payMode = entry?.payMode || "fixed";
  fixedAmount.value = entry?.fixedAmount ?? "";
  hourlyRate.value = entry?.hourlyRate ?? "";
  bonusAmount.value = entry?.bonusAmount ?? "";
  dayNote.value = entry?.note || "";
  setPayMode(payMode);
  validationMessage.textContent = "";
  updateShiftTotal();
  dayModal.classList.add("active");
  dayModal.setAttribute("aria-hidden", "false");
}

function closeModal() {
  dayModal.classList.remove("active");
  dayModal.setAttribute("aria-hidden", "true");
  selectedDateKey = null;
}

function setPayMode(mode) {
  payMode = mode;
  toggleButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.mode === mode);
  });
  fixedFields.classList.toggle("hidden", mode !== "fixed");
  hourlyFields.classList.toggle("hidden", mode !== "hourly");
  updateShiftTotal();
}

function updateShiftTotal() {
  if (dayStatus.value !== "shift") {
    shiftTotal.textContent = "0 ₽";
    return;
  }
  const tempEntry = collectEntry(false);
  const total = calculateShiftTotal(tempEntry);
  shiftTotal.textContent = formatCurrency(total);
}

function collectEntry(requireValidation = true) {
  const entry = {
    status: dayStatus.value,
    startTime: startTime.value,
    endTime: endTime.value,
    breakMinutes: Number(breakMinutes.value) || 0,
    payMode,
    fixedAmount: fixedAmount.value === "" ? null : Number(fixedAmount.value),
    hourlyRate: hourlyRate.value === "" ? null : Number(hourlyRate.value),
    bonusAmount: bonusAmount.value === "" ? null : Number(bonusAmount.value),
    note: dayNote.value.trim(),
  };

  if (!requireValidation) {
    return entry;
  }

  const validationError = validateEntry(entry);
  if (validationError) {
    validationMessage.textContent = validationError;
    throw new Error(validationError);
  }
  validationMessage.textContent = "";
  return entry;
}

function validateEntry(entry) {
  if (entry.status !== "shift") {
    return "";
  }
  const negativeValues = [
    entry.breakMinutes,
    entry.fixedAmount,
    entry.hourlyRate,
    entry.bonusAmount,
  ].filter((value) => value !== null && value < 0);
  if (negativeValues.length > 0) {
    return "Значения не могут быть отрицательными.";
  }
  if (entry.startTime && !/^\d{2}:\d{2}$/.test(entry.startTime)) {
    return "Некорректный формат времени начала.";
  }
  if (entry.endTime && !/^\d{2}:\d{2}$/.test(entry.endTime)) {
    return "Некорректный формат времени окончания.";
  }
  return "";
}

function formatDateForTitle(key) {
  const date = parseDateKey(key);
  return date.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function updateStats() {
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();

  let earnings = 0;
  let shiftCount = 0;
  let totalHours = 0;

  Object.entries(entries).forEach(([key, entry]) => {
    const date = parseDateKey(key);
    if (date.getMonth() !== month || date.getFullYear() !== year) {
      return;
    }
    if (entry.status === "shift") {
      const total = calculateShiftTotal(entry);
      earnings += total;
      shiftCount += 1;
      const hours = calculateWorkedHours(entry);
      totalHours += hours;
    }
  });

  statsEarnings.textContent = formatCurrency(earnings);
  statsShifts.textContent = shiftCount;
  statsHours.textContent = formatHours(totalHours);
  statsAverage.textContent = shiftCount ? formatCurrency(earnings / shiftCount) : "0 ₽";
}

function buildShiftRow(key, entry) {
  const row = document.createElement("div");
  row.className = "shift-row";

  const dateCell = document.createElement("strong");
  dateCell.textContent = parseDateKey(key).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
  });

  const statusCell = document.createElement("span");
  statusCell.textContent = statusLabels[entry.status] || "—";

  const detailsCell = document.createElement("span");
  if (entry.status === "shift") {
    const hours = calculateWorkedHours(entry);
    const timeLabel = entry.startTime && entry.endTime ? `${entry.startTime}–${entry.endTime}` : "Время не указано";
    const hoursLabel = hours > 0 ? `, ${hours.toFixed(1)} ч` : "";
    detailsCell.textContent = `${timeLabel}${hoursLabel}`;
  } else {
    detailsCell.textContent = entry.note || "—";
  }

  const totalCell = document.createElement("strong");
  totalCell.textContent = entry.status === "shift" ? formatCurrency(calculateShiftTotal(entry)) : "—";

  row.append(dateCell, statusCell, detailsCell, totalCell);
  row.addEventListener("click", () => openModal(key));
  return row;
}

function updateShiftList() {
  shiftList.innerHTML = "";
  const month = currentDate.getMonth();
  const year = currentDate.getFullYear();
  const filter = statusFilter.value;

  const monthEntries = Object.entries(entries)
    .filter(([key, entry]) => {
      const date = parseDateKey(key);
      const inMonth = date.getMonth() === month && date.getFullYear() === year;
      const statusMatch = filter === "all" || entry.status === filter;
      return inMonth && statusMatch;
    })
    .sort(([a], [b]) => a.localeCompare(b));

  if (monthEntries.length === 0) {
    const empty = document.createElement("p");
    empty.textContent = "Нет записей за месяц.";
    empty.className = "meta";
    shiftList.appendChild(empty);
    return;
  }

  monthEntries.forEach(([key, entry]) => {
    shiftList.appendChild(buildShiftRow(key, entry));
  });
}

function handleSave() {
  if (!selectedDateKey) {
    return;
  }
  try {
    const entry = collectEntry(true);
    entries[selectedDateKey] = entry;
    saveEntries();
    closeModal();
    renderCalendar();
  } catch (error) {
    // validation handled
  }
}

function handleDelete() {
  if (!selectedDateKey) {
    return;
  }
  delete entries[selectedDateKey];
  saveEntries();
  closeModal();
  renderCalendar();
}

function buildBackupData() {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    entries,
    theme: localStorage.getItem(THEME_KEY) || "light",
    telegramTheme: localStorage.getItem(TELEGRAM_DATA_KEY) || null,
  };
}

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function handleExport() {
  const data = buildBackupData();
  downloadJson(data, "shift-calendar-backup.json");
  showToast("Файл сохранён.");
}

function handleBackup() {
  const data = buildBackupData();
  if (telegramApp) {
    telegramApp.sendData(JSON.stringify(data));
    showToast("Резервная копия отправлена в чат.");
    return;
  }
  downloadJson(data, "backup.json");
  showToast("Резервная копия скачана.");
}

function normalizeImportedData(data) {
  if (data && typeof data === "object" && data.entries) {
    return { entries: data.entries, theme: data.theme, telegramTheme: data.telegramTheme };
  }
  if (data && typeof data === "object") {
    return { entries: data };
  }
  return null;
}

function validateEntriesData(entriesData) {
  if (!entriesData || typeof entriesData !== "object") {
    return false;
  }
  return Object.values(entriesData).every((entry) => {
    if (!entry || typeof entry !== "object") {
      return false;
    }
    return allowedStatuses.has(entry.status);
  });
}

function applyImportedData(data) {
  const normalized = normalizeImportedData(data);
  if (!normalized || !validateEntriesData(normalized.entries)) {
    showToast("Ошибка импорта: неверный формат данных.");
    return;
  }
  entries = normalized.entries;
  saveEntries();
  if (normalized.theme) {
    localStorage.setItem(THEME_KEY, normalized.theme);
    applyLocalTheme(normalized.theme);
  }
  if (normalized.telegramTheme) {
    localStorage.setItem(TELEGRAM_DATA_KEY, normalized.telegramTheme);
  }
  renderCalendar();
  showToast("Данные импортированы.");
}

function handleImport(event) {
  const file = event.target.files[0];
  if (!file) {
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      applyImportedData(data);
    } catch (error) {
      showToast("Ошибка импорта: JSON повреждён.");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

function initTheme() {
  const theme = localStorage.getItem(THEME_KEY) || "light";
  applyLocalTheme(theme);
}

function applyLocalTheme(theme) {
  if (telegramApp) {
    return;
  }
  document.body.classList.toggle("dark", theme === "dark");
  themeToggle.textContent = theme === "dark" ? "Светлая тема" : "Тёмная тема";
}

function toggleTheme() {
  if (telegramApp) {
    return;
  }
  const isDark = document.body.classList.toggle("dark");
  localStorage.setItem(THEME_KEY, isDark ? "dark" : "light");
  themeToggle.textContent = isDark ? "Светлая тема" : "Тёмная тема";
}

function applyTelegramTheme(params) {
  if (!params) {
    return;
  }
  const root = document.documentElement.style;
  root.setProperty("--bg", params.background_color || defaultColors.bg);
  root.setProperty("--card", params.secondary_bg_color || defaultColors.card);
  root.setProperty("--text", params.text_color || defaultColors.text);
  root.setProperty("--muted", params.hint_color || defaultColors.muted);
  root.setProperty("--primary", params.button_color || defaultColors.primary);
  root.setProperty("--border", params.hint_color || defaultColors.border);
  localStorage.setItem(TELEGRAM_DATA_KEY, JSON.stringify(params));
}

function updateViewportHeight() {
  const height = telegramApp ? telegramApp.viewportHeight : window.innerHeight;
  document.documentElement.style.setProperty("--app-height", `${height}px`);
}

function initTelegram() {
  if (!telegramApp) {
    return;
  }
  telegramApp.ready();
  telegramApp.expand();
  applyTelegramTheme(telegramApp.themeParams);
  document.body.classList.toggle("dark", telegramApp.colorScheme === "dark");
  themeToggle.classList.add("hidden");
  closeBtn.classList.remove("hidden");
  importHint.classList.remove("hidden");

  telegramApp.onEvent("themeChanged", () => {
    applyTelegramTheme(telegramApp.themeParams);
    document.body.classList.toggle("dark", telegramApp.colorScheme === "dark");
  });

  telegramApp.onEvent("viewportChanged", updateViewportHeight);
  updateViewportHeight();
}

function handleClearData() {
  const confirmed = window.confirm("Удалить все сохранённые данные календаря?");
  if (!confirmed) {
    return;
  }
  entries = {};
  saveEntries();
  renderCalendar();
  showToast("Данные очищены.");
}

function handleClose() {
  if (telegramApp) {
    telegramApp.close();
  }
}

prevMonthBtn.addEventListener("click", () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
});

nextMonthBtn.addEventListener("click", () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
});

todayBtn.addEventListener("click", () => {
  currentDate = new Date();
  currentDate.setDate(1);
  renderCalendar();
});

closeModalBtn.addEventListener("click", closeModal);
cancelBtn.addEventListener("click", closeModal);

saveBtn.addEventListener("click", handleSave);

deleteEntryBtn.addEventListener("click", handleDelete);

dayStatus.addEventListener("change", () => {
  shiftFields.classList.toggle("hidden", dayStatus.value !== "shift");
  updateShiftTotal();
});

[startTime, endTime, breakMinutes, fixedAmount, hourlyRate, bonusAmount].forEach((input) => {
  input.addEventListener("input", updateShiftTotal);
});

bonusAmount.addEventListener("input", updateShiftTotal);

statusFilter.addEventListener("change", updateShiftList);

exportBtn.addEventListener("click", handleExport);
backupBtn.addEventListener("click", handleBackup);
importInput.addEventListener("change", handleImport);

clearBtn.addEventListener("click", handleClearData);

closeBtn.addEventListener("click", handleClose);

themeToggle.addEventListener("click", toggleTheme);

toggleButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    setPayMode(btn.dataset.mode);
  });
});

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActiveTab(button.dataset.tab);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && dayModal.classList.contains("active")) {
    closeModal();
  }
});

window.addEventListener("resize", updateViewportHeight);

initTheme();
initTelegram();
updateViewportHeight();
setActiveTab(activeTab);
tabMediaQuery.addEventListener("change", () => {
  setActiveTab(activeTab);
});
renderCalendar();
