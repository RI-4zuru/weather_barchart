const TIME_SLOTS = ["21", "00", "03", "06", "09", "12", "15", "18"];
const STORAGE_KEY = "weather-bar-chart-saves-v1";

const PREFECTURE_CONFIG = {
  "北海道": {
    patterns: {
      "北部・中部": ["北部", "中部"],
      "全域": ["全域"]
    }
  },
  "青森県": {
    patterns: {
      "津軽・下北": ["津軽", "下北"],
      "全域": ["全域"]
    }
  },
  "東京都": {
    patterns: {
      "多摩・23区": ["多摩", "23区"],
      "全域": ["全域"]
    }
  },
  "大阪府": {
    patterns: {
      "北部・中部": ["北部", "中部"],
      "全域": ["全域"]
    }
  },
  "奈良県": {
    patterns: {
      "北部・南部": ["北部", "南部"],
      "全域": ["全域"]
    }
  }
};

const DEFAULT_ROWS_PER_REGION = ["天気", "降水", "気温"];

const elements = {
  prefectureSelect: document.getElementById("prefectureSelect"),
  patternSelect: document.getElementById("patternSelect"),
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

let state = createNewChartState("北海道", "北部・中部");
let savedCharts = loadAllSaves();
let dragState = null;
let activeFrameId = null;

init();

function init() {
}
