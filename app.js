const STORAGE_KEY = "weather-bar-chart-saves-v1";

const TIME_BANDS = [
  { hour: 0, label: "未明", range: "0-3時" },
  { hour: 3, label: "明け方", range: "3-6時" },
  { hour: 6, label: "朝", range: "6-9時" },
  { hour: 9, label: "昼前", range: "9-12時" },
  { hour: 12, label: "昼過ぎ", range: "12-15時" },
  { hour: 15, label: "夕方", range: "15-18時" },
  { hour: 18, label: "夜のはじめ頃", range: "18-21時" },
  { hour: 21, label: "夜遅く", range: "21-24時" }
];

const DAY_LABELS = ["今日", "明日", "明後日"];

const PREFECTURE_CONFIG = {
  "大阪府": {
    patterns: {
      "全域": ["大阪府"]
    }
  },
  "京都府": {
    patterns: {
      "北部・南部": ["北部", "南部"],
      "全域": ["京都府"]
    }
  },
  "兵庫県": {
    patterns: {
      "北部・南部": ["北部", "南部"],
      "全域": ["兵庫県"]
    }
  },
  "滋賀県": {
    patterns: {
      "北部・南部": ["北部", "南部"],
      "全域": ["滋賀県"]
    }
  },
  "奈良県": {
    patterns: {
      "北部・南部": ["北部", "南部"],
      "全域": ["奈良県"]
    }
  },
  "和歌山県": {
    patterns: {
      "北部・南部": ["北部", "南部"],
      "全域": ["和歌山県"]
    }
  }
};

const DEFAULT_ROWS_PER_REGION = ["天気", "降水", "気温"];

const ELEMENT_OPTIONS = [
  "天気",
  "降水",
  "気温",
  "風",
  "波",
  "雷",
  "霧",
  "雪",
  "注意報",
  "警報"
];

const elements = {
  prefectureSelect: document.getElementById("prefectureSelect"),
  patternSelect: document.getElementById("patternSelect"),
  startTimeSelect: document.getElementById("startTimeSelect"),
  endDaySelect: document.getElementById("endDaySelect"),
  regionSelect: document.getElementById("regionSelect"),
  elementSelect: document.getElementById("elementSelect"),
  newChartBtn: document.getElementById("newChartBtn"),
  resetChartBtn: document.getElementById("resetChartBtn"),
  addRowBtn: document.getElementById("addRowBtn"),
  fillColorInput: document.getElementById("fillColorInput"),
  frameColorInput: document.getElementById("frameColorInput"),
  frameLabelInput: document.getElementById("frameLabelInput"),
  warningTypeSelect: document.getElementById("warningTypeSelect"),
  saveNameInput: document.getElementById("saveNameInput"),
  saveBtn: document.getElementById("saveBtn"),
  loadBtn: document.getElementById("loadBtn"),
  deleteSaveBtn: document.getElementById("deleteSaveBtn"),
  savedChartsSelect: document.getElementById("savedChartsSelect"),
  exportPngBtn: document.getElementById("exportPngBtn"),
  pngFileNameInput: document.getElementById("pngFileNameInput"),
  chartContainer: document.getElementById("chartContainer"),
  chartExportTarget: document.getElementById("chartExportTarget"),
  selectionOverlay: document.getElementById("selectionOverlay"),
  chartTitle: document.getElementById("chartTitle"),
  chartMetaText: document.getElementById("chartMetaText"),
  removeSelectedFrameBtn: document.getElementById("removeSelectedFrameBtn"),
  clearSelectionBtn: document.getElementById("clearSelectionBtn")
};

let state = null;
let savedCharts = loadAllSaves();
let dragState = null;
let activeFrameId = null;

init();

function init() {
  setupSelects();
  setupEvents();

  const prefecture = elements.prefectureSelect?.value || "大阪府";
  const pattern = elements.patternSelect?.value || getFirstPattern(prefecture);

  state = createNewChartState(prefecture, pattern);

  refreshSavedChartSelect();
  render();
}

function setupSelects() {
  setOptions(elements.prefectureSelect, Object.keys(PREFECTURE_CONFIG));

  if (elements.prefectureSelect) {
    elements.prefectureSelect.value = "大阪府";
  }

  if (elements.startTimeSelect && !elements.startTimeSelect.value) {
    elements.startTimeSelect.value = "21";
  }

  if (elements.endDaySelect && !elements.endDaySelect.value) {
    elements.endDaySelect.value = "1";
  }

  refreshPatternSelect();
  refreshRegionSelect();
  refreshElementSelect();
}

function setupEvents() {
  elements.prefectureSelect?.addEventListener("change", () => {
    const prefecture = elements.prefectureSelect.value;
    const firstPattern = getFirstPattern(prefecture);

    state = createNewChartState(prefecture, firstPattern);
    activeFrameId = null;

    refreshPatternSelect();
    refreshRegionSelect();
    render();
  });

  elements.patternSelect?.addEventListener("change", () => {
    const prefecture = elements.prefectureSelect.value;
    const pattern = elements.patternSelect.value;

    state = createNewChartState(prefecture, pattern);
    activeFrameId = null;

    refreshRegionSelect();
    render();
  });

  elements.startTimeSelect?.addEventListener("change", () => {
    changeTimeRange();
  });

  elements.endDaySelect?.addEventListener("change", () => {
    changeTimeRange();
  });

  elements.newChartBtn?.addEventListener("click", () => {
    const prefecture = elements.prefectureSelect.value;
    const pattern = elements.patternSelect.value;

    state = createNewChartState(prefecture, pattern);
    activeFrameId = null;
    render();
  });

  elements.resetChartBtn?.addEventListener("click", () => {
    if (!confirm("現在のバーチャートを初期状態に戻しますか？")) return;

    const prefecture = state.prefecture;
    const pattern = state.pattern;

    state = createNewChartState(prefecture, pattern);
    activeFrameId = null;
    render();
  });

  elements.addRowBtn?.addEventListener("click", () => {
    addRow();
  });

  elements.saveBtn?.addEventListener("click", () => {
    saveCurrentChart();
  });

  elements.loadBtn?.addEventListener("click", () => {
    loadSelectedChart();
  });

  elements.deleteSaveBtn?.addEventListener("click", () => {
    deleteSelectedChart();
  });

  elements.exportPngBtn?.addEventListener("click", () => {
    exportPng();
  });

  elements.removeSelectedFrameBtn?.addEventListener("click", () => {
    removeSelectedFrame();
  });

  elements.clearSelectionBtn?.addEventListener("click", () => {
    activeFrameId = null;
    renderFrames();
  });

  elements.chartContainer?.addEventListener("scroll", () => {
    renderFrames();
  });

  window.addEventListener("mouseup", () => {
    if (!dragState) return;
    applyDragAction();
    dragState = null;
  });

  window.addEventListener("resize", () => {
    renderFrames();
  });
}

function createNewChartState(prefecture, pattern) {
  const startHour = getStartHour();
  const endDay = getEndDay();
  const slots = createTimeSlots(startHour, endDay);
  const areas = PREFECTURE_CONFIG[prefecture].patterns[pattern];

  return {
    prefecture,
    pattern,
    startHour,
    endDay,
    rows: areas.flatMap(area => {
      return DEFAULT_ROWS_PER_REGION.map(elementName =>
        createRow(area, elementName, slots)
      );
    }),
    frames: []
  };
}

function createRow(area, elementName, slots = getCurrentSlots()) {
  return {
    id: createId(),
    area,
    elementName,
    cells: slots.map(slot => ({
      key: slot.key,
      day: slot.day,
      hour: slot.hour,
      value: "",
      fillColor: "",
      warning: ""
    }))
  };
}

function createTimeSlots(startHour, endDay) {
  const slots = [];

  for (let day = 0; day <= endDay; day++) {
    TIME_BANDS.forEach(band => {
      if (day === 0 && band.hour < startHour) return;

      slots.push({
        key: `${day}-${band.hour}`,
        day,
        hour: band.hour,
        dayLabel: DAY_LABELS[day],
        label: band.label,
        range: band.range
      });
    });
  }

  return slots;
}

function changeTimeRange() {
  if (!state) return;

  const startHour = getStartHour();
  const endDay = getEndDay();
  const slots = createTimeSlots(startHour, endDay);

  state.startHour = startHour;
  state.endDay = endDay;
  state.frames = [];

  state.rows = state.rows.map(row => {
    const oldCells = new Map(row.cells.map(cell => [cell.key, cell]));

    return {
      ...row,
      cells: slots.map(slot => {
        const oldCell = oldCells.get(slot.key);

        if (oldCell) {
          return {
            ...oldCell,
            key: slot.key,
            day: slot.day,
            hour: slot.hour
          };
        }

        return {
          key: slot.key,
          day: slot.day,
          hour: slot.hour,
          value: "",
          fillColor: "",
          warning: ""
        };
      })
    };
  });

  activeFrameId = null;
  render();
}

function refreshPatternSelect() {
  if (!elements.patternSelect || !elements.prefectureSelect) return;

  const prefecture = elements.prefectureSelect.value;
  const patterns = Object.keys(PREFECTURE_CONFIG[prefecture].patterns);

  setOptions(elements.patternSelect, patterns);

  if (state?.pattern && patterns.includes(state.pattern)) {
    elements.patternSelect.value = state.pattern;
  } else {
    elements.patternSelect.value = patterns[0];
  }
}

function refreshRegionSelect() {
  if (!elements.regionSelect) return;

  const prefecture = elements.prefectureSelect?.value || state?.prefecture || "大阪府";
  const pattern = elements.patternSelect?.value || getFirstPattern(prefecture);
  const areas = PREFECTURE_CONFIG[prefecture].patterns[pattern];

  setOptions(elements.regionSelect, areas);
}

function refreshElementSelect() {
  if (!elements.elementSelect) return;

  setOptions(elements.elementSelect, ELEMENT_OPTIONS);
}

function setOptions(select, values) {
  if (!select) return;

  select.innerHTML = "";

  values.forEach(value => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    select.appendChild(option);
  });
}

function addRow() {
  const area = elements.regionSelect?.value;
  const elementName = elements.elementSelect?.value;

  if (!area || !elementName) return;

  state.rows.push(createRow(area, elementName));
  render();
}

function render() {
  renderTitle();
  renderChart();
  renderFrames();
}

function renderTitle() {
  if (elements.chartTitle) {
    elements.chartTitle.textContent = `${state.prefecture} ${state.pattern} バーチャート`;
  }

  if (elements.chartMetaText) {
    const slots = getCurrentSlots();
    const first = slots[0];
    const last = slots[slots.length - 1];

    elements.chartMetaText.textContent =
      `期間：${first.dayLabel}${String(first.hour).padStart(2, "0")}時から ` +
      `${last.dayLabel}${String(last.hour).padStart(2, "0")}時まで`;
  }
}

function renderChart() {
  if (!elements.chartContainer) return;

  const table = document.createElement("table");
  table.className = "bar-chart-table";

  table.appendChild(createTableHeader());

  const tbody = document.createElement("tbody");

  state.rows.forEach((row, rowIndex) => {
    const tr = document.createElement("tr");

    const areaCell = document.createElement("th");
    areaCell.className = "area-cell";
    areaCell.textContent = row.area;
    tr.appendChild(areaCell);

    const elementCell = document.createElement("th");
    elementCell.className = "element-cell";
    elementCell.textContent = row.elementName;
    tr.appendChild(elementCell);

    row.cells.forEach((cell, colIndex) => {
      const td = document.createElement("td");
      td.className = "chart-cell";
      td.dataset.rowIndex = rowIndex;
      td.dataset.colIndex = colIndex;

      if (cell.fillColor) {
        td.style.backgroundColor = cell.fillColor;
      }

      const value = document.createElement("div");
      value.className = "cell-value";
      value.textContent = cell.value;
      td.appendChild(value);

      if (cell.warning) {
        const warning = document.createElement("div");
        warning.className = "warning-mark";
        warning.textContent = cell.warning;
        td.appendChild(warning);
      }

      td.addEventListener("mousedown", handleCellMouseDown);
      td.addEventListener("mouseenter", handleCellMouseEnter);
      td.addEventListener("mouseup", handleCellMouseUp);
      td.addEventListener("click", handleCellClick);

      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);

  elements.chartContainer.innerHTML = "";
  elements.chartContainer.appendChild(table);
}

function createTableHeader() {
  const thead = document.createElement("thead");

  const dateRow = document.createElement("tr");
  const timeRow = document.createElement("tr");

  const areaTh = document.createElement("th");
  areaTh.textContent = "地域";
  areaTh.rowSpan = 2;
  dateRow.appendChild(areaTh);

  const elementTh = document.createElement("th");
  elementTh.textContent = "要素";
  elementTh.rowSpan = 2;
  dateRow.appendChild(elementTh);

  const slots = getCurrentSlots();
  const grouped = groupSlotsByDay(slots);

  grouped.forEach(group => {
    const th = document.createElement("th");
    th.textContent = group.dayLabel;
    th.colSpan = group.slots.length;
    th.className = "date-header-cell";
    dateRow.appendChild(th);
  });

  slots.forEach(slot => {
    const th = document.createElement("th");
    th.className = "time-band-cell";
    th.innerHTML = `
      <div class="time-band-label">${slot.label}</div>
      <div class="time-band-range">${slot.range}</div>
    `;
    timeRow.appendChild(th);
  });

  thead.appendChild(dateRow);
  thead.appendChild(timeRow);

  return thead;
}

function groupSlotsByDay(slots) {
  const map = new Map();

  slots.forEach(slot => {
    if (!map.has(slot.day)) {
      map.set(slot.day, {
        day: slot.day,
        dayLabel: slot.dayLabel,
        slots: []
      });
    }

    map.get(slot.day).slots.push(slot);
  });

  return [...map.values()];
}

function handleCellClick(event) {
  if (dragState?.moved) return;

  const mode = getEditMode();

  if (mode !== "value") return;

  const td = event.currentTarget;
  const rowIndex = Number(td.dataset.rowIndex);
  const colIndex = Number(td.dataset.colIndex);

  const currentValue = state.rows[rowIndex].cells[colIndex].value;
  const nextValue = prompt("セルに入力する値を指定してください。", currentValue);

  if (nextValue === null) return;

  state.rows[rowIndex].cells[colIndex].value = nextValue;
  render();
}

function handleCellMouseDown(event) {
  if (event.button !== 0) return;

  const td = event.currentTarget;

  dragState = {
    startRow: Number(td.dataset.rowIndex),
    startCol: Number(td.dataset.colIndex),
    endRow: Number(td.dataset.rowIndex),
    endCol: Number(td.dataset.colIndex),
    moved: false
  };

  event.preventDefault();
}

function handleCellMouseEnter(event) {
  if (!dragState) return;

  const td = event.currentTarget;

  dragState.endRow = Number(td.dataset.rowIndex);
  dragState.endCol = Number(td.dataset.colIndex);
  dragState.moved = true;
}

function handleCellMouseUp(event) {
  if (!dragState) return;

  const td = event.currentTarget;

  dragState.endRow = Number(td.dataset.rowIndex);
  dragState.endCol = Number(td.dataset.colIndex);

  applyDragAction();
  dragState = null;
}

function applyDragAction() {
  if (!dragState) return;

  const mode = getEditMode();

  const range = normalizeRange(
    dragState.startRow,
    dragState.startCol,
    dragState.endRow,
    dragState.endCol
  );

  if (mode === "fill") {
    applyFillColor(range);
  }

  if (mode === "frame") {
    createFrame(range);
  }

  if (mode === "warning") {
    applyWarning(range);
  }

  render();
}

function normalizeRange(startRow, startCol, endRow, endCol) {
  return {
    rowStart: Math.min(startRow, endRow),
    rowEnd: Math.max(startRow, endRow),
    colStart: Math.min(startCol, endCol),
    colEnd: Math.max(startCol, endCol)
  };
}

function applyFillColor(range) {
  const color = elements.fillColorInput?.value || "#dbeafe";

  for (let rowIndex = range.rowStart; rowIndex <= range.rowEnd; rowIndex++) {
    for (let colIndex = range.colStart; colIndex <= range.colEnd; colIndex++) {
      state.rows[rowIndex].cells[colIndex].fillColor = color;
    }
  }
}

function createFrame(range) {
  const frame = {
    id: createId(),
    ...range,
    color: elements.frameColorInput?.value || "#ef4444",
    label: elements.frameLabelInput?.value || ""
  };

  state.frames.push(frame);
  activeFrameId = frame.id;
}

function applyWarning(range) {
  const warning = elements.warningTypeSelect?.value || "発";

  for (let rowIndex = range.rowStart; rowIndex <= range.rowEnd; rowIndex++) {
    for (let colIndex = range.colStart; colIndex <= range.colEnd; colIndex++) {
      state.rows[rowIndex].cells[colIndex].warning = warning;
    }
  }
}

function renderFrames() {
  if (!elements.selectionOverlay || !elements.chartContainer) return;

  elements.selectionOverlay.innerHTML = "";

  const table = elements.chartContainer.querySelector(".bar-chart-table");
  if (!table) return;

  const containerRect = elements.chartContainer.getBoundingClientRect();

  state.frames.forEach(frame => {
    const startCell = getCell(frame.rowStart, frame.colStart);
    const endCell = getCell(frame.rowEnd, frame.colEnd);

    if (!startCell || !endCell) return;

    const startRect = startCell.getBoundingClientRect();
    const endRect = endCell.getBoundingClientRect();

    const frameEl = document.createElement("div");
    frameEl.className = "selection-frame";
    frameEl.dataset.frameId = frame.id;

    if (activeFrameId === frame.id) {
      frameEl.classList.add("active");
    }

    frameEl.style.left =
      `${startRect.left - containerRect.left + elements.chartContainer.scrollLeft}px`;
    frameEl.style.top =
      `${startRect.top - containerRect.top + elements.chartContainer.scrollTop}px`;
    frameEl.style.width = `${endRect.right - startRect.left}px`;
    frameEl.style.height = `${endRect.bottom - startRect.top}px`;
    frameEl.style.borderColor = frame.color;

    frameEl.addEventListener("click", event => {
      event.stopPropagation();
      activeFrameId = frame.id;
      renderFrames();
    });

    if (frame.label) {
      const label = document.createElement("div");
      label.className = "selection-frame-label";
      label.textContent = frame.label;
      label.style.backgroundColor = frame.color;
      frameEl.appendChild(label);
    }

    elements.selectionOverlay.appendChild(frameEl);
  });
}

function getCell(rowIndex, colIndex) {
  return elements.chartContainer.querySelector(
    `.chart-cell[data-row-index="${rowIndex}"][data-col-index="${colIndex}"]`
  );
}

function removeSelectedFrame() {
  if (!activeFrameId) return;

  state.frames = state.frames.filter(frame => frame.id !== activeFrameId);
  activeFrameId = null;
  renderFrames();
}

function getEditMode() {
  const checkedRadio = document.querySelector('input[name="editMode"]:checked');

  if (checkedRadio) {
    return checkedRadio.value;
  }

  const select = document.getElementById("editModeSelect");

  if (select) {
    return select.value;
  }

  return "value";
}

function saveCurrentChart() {
  const name = elements.saveNameInput?.value?.trim();

  if (!name) {
    alert("保存名を入力してください。");
    return;
  }

  savedCharts[name] = structuredCloneSafe(state);
  saveAllSaves(savedCharts);
  refreshSavedChartSelect();

  if (elements.savedChartsSelect) {
    elements.savedChartsSelect.value = name;
  }

  alert("保存しました。");
}

function loadSelectedChart() {
  const name = elements.savedChartsSelect?.value;

  if (!name || !savedCharts[name]) return;

  state = normalizeLoadedState(structuredCloneSafe(savedCharts[name]));
  activeFrameId = null;

  if (elements.prefectureSelect) {
    elements.prefectureSelect.value = state.prefecture;
  }

  refreshPatternSelect();

  if (elements.patternSelect) {
    elements.patternSelect.value = state.pattern;
  }

  if (elements.startTimeSelect) {
    elements.startTimeSelect.value = String(state.startHour ?? 21);
  }

  if (elements.endDaySelect) {
    elements.endDaySelect.value = String(state.endDay ?? 1);
  }

  refreshRegionSelect();
  render();
}

function deleteSelectedChart() {
  const name = elements.savedChartsSelect?.value;

  if (!name || !savedCharts[name]) return;

  if (!confirm(`「${name}」を削除しますか？`)) return;

  delete savedCharts[name];
  saveAllSaves(savedCharts);
  refreshSavedChartSelect();
}

function refreshSavedChartSelect() {
  if (!elements.savedChartsSelect) return;

  const names = Object.keys(savedCharts);

  elements.savedChartsSelect.innerHTML = "";

  names.forEach(name => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    elements.savedChartsSelect.appendChild(option);
  });
}

function loadAllSaves() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveAllSaves(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

async function exportPng() {
  if (!elements.chartExportTarget) return;

  if (typeof html2canvas === "undefined") {
    alert("PNG出力には html2canvas が必要です。index.htmlで読み込まれているか確認してください。");
    return;
  }

  const canvas = await html2canvas(elements.chartExportTarget, {
    backgroundColor: "#ffffff",
    scale: 2
  });

  const fileName =
    elements.pngFileNameInput?.value?.trim() || "weather-barchart";

  const link = document.createElement("a");
  link.download = `${fileName}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function getCurrentSlots() {
  return createTimeSlots(state.startHour, state.endDay);
}

function getStartHour() {
  return Number(elements.startTimeSelect?.value ?? state?.startHour ?? 21);
}

function getEndDay() {
  return Number(elements.endDaySelect?.value ?? state?.endDay ?? 1);
}

function getFirstPattern(prefecture) {
  return Object.keys(PREFECTURE_CONFIG[prefecture].patterns)[0];
}

function normalizeLoadedState(loadedState) {
  const startHour = Number(loadedState.startHour ?? 21);
  const endDay = Number(loadedState.endDay ?? 1);
  const slots = createTimeSlots(startHour, endDay);

  return {
    ...loadedState,
    startHour,
    endDay,
    rows: loadedState.rows.map(row => {
      const oldCells = new Map((row.cells || []).map(cell => [cell.key, cell]));

      return {
        ...row,
        cells: slots.map(slot => {
          const oldCell = oldCells.get(slot.key);

          if (oldCell) {
            return {
              key: slot.key,
              day: slot.day,
              hour: slot.hour,
              value: oldCell.value || "",
              fillColor: oldCell.fillColor || "",
              warning: oldCell.warning || ""
            };
          }

          return {
            key: slot.key,
            day: slot.day,
            hour: slot.hour,
            value: "",
            fillColor: "",
            warning: ""
          };
        })
      };
    }),
    frames: loadedState.frames || []
  };
}

function createId() {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function structuredCloneSafe(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}
