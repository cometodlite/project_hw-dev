import { state, addLog, updateCurrency, setBgmEnabled } from "./state.js";
import {
  renderInventory,
  gatherReward,
  fishReward,
  getSeedItems,
  getFarmStatus,
  plantSeed,
  harvestFarm,
  sellForagedItems
} from "./inventory.js";
import { renderShop } from "./shop.js";
import { saveGame, loadGame, resetGame } from "./save.js";
import { playRadio, stopRadio, getRadioState } from "./audio.js";
import {
  renderHousingSlots,
  populateHousingItemSelect,
  placeHousingItem,
  clearHousingSlots,
  getHousingSummary
} from "./housing.js";

const el = {};
let currentScene = "town";
let currentSideTab = "inventory";

const SCENE_META = {
  town: {
    title: "마을 광장",
    description: "사람들이 천천히 오가는 평온한 마을 광장입니다."
  },
  farm: {
    title: "조용한 밭",
    description: "씨앗을 심고 수확을 기다리는 작은 밭입니다."
  },
  home: {
    title: "아늑한 집",
    description: "가구를 배치하고 쉬어갈 수 있는 개인 공간입니다."
  }
};

function getTimeMood() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour <= 8) return { key: "dawn", label: "부드러운 아침빛이 천천히 공간을 감싸고 있습니다." };
  if (hour >= 9 && hour <= 16) return { key: "day", label: "따뜻한 낮 햇살이 공간 전체를 환하게 비추고 있습니다." };
  if (hour >= 17 && hour <= 20) return { key: "evening", label: "노을빛이 스며들며 하루가 차분하게 마무리되고 있습니다." };
  return { key: "night", label: "고요한 밤공기가 주변을 조용히 채우고 있습니다." };
}

function getPlacedHousingNames() {
  const ids = state.player.housing?.slots?.filter(Boolean) || [];
  return ids.map((id) => state.data.items.find((item) => item.id === id)?.name || id);
}

export function initUI() {
  el.currentTime = document.getElementById("current-time");
  el.coinValue = document.getElementById("coin-value");
  el.blingValue = document.getElementById("bling-value");
  el.bgmTitle = document.getElementById("bgm-title");
  el.timePeriodText = document.getElementById("time-period-text");
  el.inventoryList = document.getElementById("inventory-list");
  el.shopList = document.getElementById("shop-list");
  el.logList = document.getElementById("log-list");
  el.bgmEnabled = document.getElementById("bgm-enabled");
  el.radioTrackTitle = document.getElementById("radio-track-title");
  el.lifeSummary = document.getElementById("life-summary");
  el.activityList = document.getElementById("activity-list");
  el.farmSeedSelect = document.getElementById("farm-seed-select");
  el.farmStatus = document.getElementById("farm-status");
  el.housingSlots = document.getElementById("housing-slots");
  el.housingItemSelect = document.getElementById("housing-item-select");
  el.housingSummary = document.getElementById("housing-summary");
  el.sceneTitle = document.getElementById("scene-title");
  el.sceneDescription = document.getElementById("scene-description");
  el.sceneDetail = document.getElementById("scene-detail");
  el.sceneMoodBanner = document.getElementById("scene-mood-banner");
  el.farmVisualStatus = document.getElementById("farm-visual-status");
  el.homeVisualStatus = document.getElementById("home-visual-status");
  el.homeItemChips = document.getElementById("home-item-chips");

  populateSeedSelect();
  populateHousingItemSelect(el.housingItemSelect);
  syncSceneButtons();
  syncSideTabs();
}

function populateSeedSelect() {
  if (!el.farmSeedSelect) return;
  const seeds = getSeedItems();
  el.farmSeedSelect.innerHTML = seeds.length
    ? seeds.map((seed) => `<option value="${seed.id}">${seed.name} · 성장 ${seed.growthSeconds}초</option>`).join("")
    : '<option value="">사용 가능한 씨앗이 없습니다</option>';
}

function refreshHousingUI() {
  renderHousingSlots(el.housingSlots);
  populateHousingItemSelect(el.housingItemSelect);
  if (el.housingSummary) el.housingSummary.textContent = getHousingSummary();
}

function bindHousingPlacementButton(buttonId, slotIndex) {
  const button = document.getElementById(buttonId);
  if (!button) return;
  button.addEventListener("click", () => {
    const result = placeHousingItem(slotIndex, el.housingItemSelect?.value);
    addLog(result.message);
    currentScene = "home";
    currentSideTab = "housing";
    renderAll();
  });
}

function syncSceneButtons() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === currentScene);
  });
  document.body.classList.remove("scene-town", "scene-farm", "scene-home");
  document.body.classList.add(`scene-${currentScene}`);
}

function syncSideTabs() {
  document.querySelectorAll(".side-tab").forEach((button) => {
    button.classList.toggle("active", button.dataset.sideTab === currentSideTab);
  });
  document.querySelectorAll(".side-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.sidePanel === currentSideTab);
  });
}

export function bindUIEvents() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    button.addEventListener("click", () => {
      currentScene = button.dataset.view;
      if (currentScene === "farm") currentSideTab = "life";
      if (currentScene === "home") currentSideTab = "housing";
      if (currentScene === "town") currentSideTab = currentSideTab === "housing" ? "inventory" : currentSideTab;
      syncSceneButtons();
      syncSideTabs();
      renderAll();
    });
  });

  document.querySelectorAll(".side-tab").forEach((button) => {
    button.addEventListener("click", () => {
      currentSideTab = button.dataset.sideTab;
      syncSideTabs();
      renderAll();
    });
  });

  document.getElementById("btn-save")?.addEventListener("click", () => { saveGame(); renderAll(); });
  document.getElementById("btn-load")?.addEventListener("click", () => { loadGame(); populateSeedSelect(); refreshHousingUI(); renderAll(); });
  document.getElementById("btn-reset")?.addEventListener("click", () => {
    const confirmed = window.confirm("정말 새 게임 상태로 초기화하시겠습니까?");
    if (!confirmed) return;
    resetGame();
    populateSeedSelect();
    refreshHousingUI();
    renderAll();
  });

  document.getElementById("btn-open-inventory")?.addEventListener("click", () => {
    currentSideTab = "inventory";
    syncSideTabs();
    addLog("인벤토리를 확인했습니다.");
    renderAll();
  });

  document.getElementById("btn-add-coin")?.addEventListener("click", () => { updateCurrency({ coin: 100 }); addLog("코인 100을 획득했습니다."); renderAll(); });
  document.getElementById("btn-add-bling")?.addEventListener("click", () => { updateCurrency({ bling: 10 }); addLog("블링 10을 획득했습니다."); renderAll(); });

  document.getElementById("btn-gather")?.addEventListener("click", () => {
    currentScene = "town";
    const reward = gatherReward();
    addLog(`채집 성공: ${reward.label} ${reward.amount}개 (${reward.rarity === "rare" ? "희귀" : "일반"})`);
    populateSeedSelect();
    syncSceneButtons();
    renderAll();
  });

  document.getElementById("btn-fish")?.addEventListener("click", () => {
    currentScene = "town";
    const reward = fishReward();
    addLog(`낚시 성공: ${reward.label} ${reward.amount}개 (${reward.rarity === "rare" ? "희귀" : "일반"})`);
    syncSceneButtons();
    renderAll();
  });

  document.getElementById("btn-sell-all")?.addEventListener("click", () => {
    const result = sellForagedItems();
    if (result.earned <= 0) addLog("판매할 생활 수집품이 없습니다.");
    else addLog(`수집품 판매 완료: ${result.sold.join(", ")} · 총 ${result.earned} 코인`);
    renderAll();
  });

  document.getElementById("btn-plant-seed")?.addEventListener("click", () => {
    currentScene = "farm";
    const result = plantSeed(el.farmSeedSelect?.value);
    addLog(result.message);
    syncSceneButtons();
    renderAll();
  });

  document.getElementById("btn-farm-harvest")?.addEventListener("click", () => {
    currentScene = "farm";
    const result = harvestFarm();
    addLog(result.message);
    populateSeedSelect();
    syncSceneButtons();
    renderAll();
  });

  document.getElementById("btn-clear-housing")?.addEventListener("click", () => {
    currentScene = "home";
    currentSideTab = "housing";
    const result = clearHousingSlots();
    addLog(result.message);
    syncSceneButtons();
    syncSideTabs();
    renderAll();
  });

  bindHousingPlacementButton("btn-place-slot-1", 0);
  bindHousingPlacementButton("btn-place-slot-2", 1);
  bindHousingPlacementButton("btn-place-slot-3", 2);
  bindHousingPlacementButton("btn-place-slot-4", 3);

  el.bgmEnabled?.addEventListener("change", (event) => {
    setBgmEnabled(event.target.checked);
    addLog(`시간대별 BGM 시스템을 ${event.target.checked ? "활성화" : "비활성화"}했습니다.`);
    renderAll();
  });

  document.getElementById("btn-radio-play")?.addEventListener("click", () => { playRadio(); renderAll(); });
  document.getElementById("btn-radio-stop")?.addEventListener("click", () => { stopRadio(); renderAll(); });
}

function renderActivityStats() {
  if (!el.activityList) return;
  const stats = state.player.activityStats;
  const skills = state.player.lifeSkills;
  const unlocks = state.player.unlocks;
  el.activityList.innerHTML = `
    <div class="stat-row"><strong>채집 숙련도</strong><span>${skills.gathering}</span></div>
    <div class="stat-row"><strong>낚시 숙련도</strong><span>${skills.fishing}</span></div>
    <div class="stat-row"><strong>농사 숙련도</strong><span>${skills.farming}</span></div>
    <div class="stat-row"><strong>채집 횟수</strong><span>${stats.gatheringCount}</span></div>
    <div class="stat-row"><strong>낚시 횟수</strong><span>${stats.fishingCount}</span></div>
    <div class="stat-row"><strong>수확 횟수</strong><span>${stats.farmingCount}</span></div>
    <div class="stat-row"><strong>사과 묘목 해금</strong><span>${unlocks.appleSeedUnlocked ? "완료" : "농사 5 필요"}</span></div>
    <div class="stat-row"><strong>황금 씨앗 해금</strong><span>${unlocks.goldenSeedUnlocked ? "완료" : "농사 10 필요"}</span></div>
  `;
}

function renderScene() {
  const scene = SCENE_META[currentScene] || SCENE_META.town;
  if (el.sceneTitle) el.sceneTitle.textContent = scene.title;
  if (el.sceneDescription) el.sceneDescription.textContent = scene.description;

  const mood = getTimeMood();
  document.body.classList.remove("time-dawn", "time-day", "time-evening", "time-night");
  document.body.classList.add(`time-${mood.key}`);

  if (el.sceneMoodBanner) el.sceneMoodBanner.textContent = mood.label;

  if (el.sceneDetail) {
    if (currentScene === "town") {
      el.sceneDetail.textContent = "생활 활동을 시작하거나, 상점과 인벤토리를 둘러보기에 좋은 중심 공간입니다.";
    } else if (currentScene === "farm") {
      el.sceneDetail.textContent = getFarmStatus().text;
    } else {
      const placedNames = getPlacedHousingNames();
      el.sceneDetail.textContent = placedNames.length
        ? `현재 집 안에는 ${placedNames.join(", ")}이(가) 배치되어 있습니다.`
        : "아직 집 안이 비어 있습니다. 가구를 배치해 보세요.";
    }
  }

  if (el.farmVisualStatus) {
    const farmStatus = getFarmStatus();
    el.farmVisualStatus.textContent = currentScene === "farm"
      ? `밭 시각화 · ${farmStatus.text}`
      : `밭 요약 · ${farmStatus.text}`;
  }

  if (el.homeVisualStatus) {
    const placedNames = getPlacedHousingNames();
    el.homeVisualStatus.textContent = placedNames.length
      ? `현재 집 분위기: ${placedNames.join(", ")}`
      : "현재 집 분위기: 배치된 가구가 없습니다.";
  }

  if (el.homeItemChips) {
    const placedNames = getPlacedHousingNames();
    el.homeItemChips.innerHTML = placedNames.length
      ? placedNames.map((name) => `<span class="mini-chip">${name}</span>`).join("")
      : '<span class="mini-chip">비어 있음</span>';
  }
}

export function renderStatus() {
  el.currentTime.textContent = state.ui.currentTime || "--:--";
  el.coinValue.textContent = `${state.player.coin}`;
  el.blingValue.textContent = `${state.player.bling}`;
  el.bgmTitle.textContent = state.player.settings.bgmEnabled ? (state.player.currentTrackTitle || "없음") : "사용 안 함";
  el.timePeriodText.textContent = state.player.currentPeriodLabel || "시간대를 계산하는 중입니다.";
  el.bgmEnabled.checked = Boolean(state.player.settings.bgmEnabled);

  const life = state.player.lifeSkills;
  if (el.lifeSummary) el.lifeSummary.textContent = `생활 숙련도 · 채집 ${life.gathering} / 낚시 ${life.fishing} / 농사 ${life.farming}`;
  if (el.farmStatus) el.farmStatus.textContent = getFarmStatus().text;

  if (el.radioTrackTitle) {
    const radio = getRadioState();
    el.radioTrackTitle.textContent = radio.isRadioPlaying ? `현재 라디오: ${radio.title}` : "현재 라디오: 꺼짐";
  }

  renderScene();
  refreshHousingUI();
  syncSceneButtons();
  syncSideTabs();
}

export function renderLog() {
  el.logList.innerHTML = "";
  for (const row of state.player.log) {
    const item = document.createElement("div");
    item.className = "log-item";
    item.innerHTML = `<small>${row.time}</small><div>${row.text}</div>`;
    el.logList.appendChild(item);
  }
}

export function renderAll() {
  renderStatus();
  renderInventory(el.inventoryList);
  renderShop(el.shopList);
  renderActivityStats();
  renderLog();
}
