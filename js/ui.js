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
  if (hour >= 5 && hour <= 8) {
    return {
      key: "dawn",
      label: "아침",
      banner: "부드러운 아침빛이 천천히 공간을 감싸고 있습니다."
    };
  }
  if (hour >= 9 && hour <= 16) {
    return {
      key: "day",
      label: "낮",
      banner: "따뜻한 낮 햇살이 공간 전체를 환하게 비추고 있습니다."
    };
  }
  if (hour >= 17 && hour <= 20) {
    return {
      key: "evening",
      label: "저녁",
      banner: "노을빛이 스며들며 하루가 차분하게 마무리되고 있습니다."
    };
  }
  return {
    key: "night",
    label: "밤",
    banner: "고요한 밤공기가 주변을 조용히 채우고 있습니다."
  };
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
  el.sceneBackgroundLayer = document.getElementById("scene-background-layer");
  el.timeVisualBadge = document.getElementById("time-visual-badge");
  el.sceneSpotlightText = document.getElementById("scene-spotlight-text");
  el.logPanel = document.getElementById("log-panel");
  el.mobileSheet = document.getElementById("mobile-sheet");
  el.mobileSheetContent = document.getElementById("mobile-sheet-content");
  el.mobileSheetBackdrop = document.getElementById("mobile-sheet-backdrop");

  populateSeedSelect();
  populateHousingItemSelect(el.housingItemSelect);
  syncSceneButtons();
  syncSideTabs();
  if (el.logPanel) el.logPanel.open = false;
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


function isMobileLayout() {
  return window.innerWidth <= 760;
}

function getItemName(itemId) {
  return state.data.items.find((item) => item.id === itemId)?.name || itemId;
}

function renderMobileInventoryList() {
  const entries = Object.entries(state.player.inventory);
  if (!entries.length) return '<div class="mobile-list-item">보유 중인 아이템이 없습니다.</div>';
  return entries.map(([itemId, count]) => {
    const item = state.data.items.find((entry) => entry.id === itemId);
    return `
      <div class="mobile-list-item">
        <strong>${item?.name || itemId}</strong>
        <div>${item?.description || "설명 없음"}</div>
        <div class="mobile-compact-row"><span>수량 ${count}</span><span>판매 ${item?.sellPrice ?? 0} 코인</span></div>
      </div>
    `;
  }).join("");
}

function renderMobileActivityList() {
  const stats = state.player.activityStats;
  const skills = state.player.lifeSkills;
  const unlocks = state.player.unlocks;
  return `
    <div class="mobile-list-item"><strong>생활 숙련도</strong><div>채집 ${skills.gathering} / 낚시 ${skills.fishing} / 농사 ${skills.farming}</div></div>
    <div class="mobile-list-item"><strong>활동 횟수</strong><div>채집 ${stats.gatheringCount} / 낚시 ${stats.fishingCount} / 수확 ${stats.farmingCount}</div></div>
    <div class="mobile-list-item"><strong>해금 상태</strong><div>사과 묘목: ${unlocks.appleSeedUnlocked ? "완료" : "농사 5 필요"}<br/>황금 씨앗: ${unlocks.goldenSeedUnlocked ? "완료" : "농사 10 필요"}</div></div>
  `;
}

function renderMobileHousing() {
  const owned = state.data.items.filter((item) => item.type === "housing" && (state.player.inventory[item.id] || 0) > 0);
  const slots = (state.player.housing?.slots || []).map((id, idx) => `
    <div class="mobile-list-item"><strong>${idx + 1}번 칸</strong><div>${id ? getItemName(id) : "비어 있음"}</div></div>
  `).join("");
  const options = owned.length
    ? owned.map((item) => `<option value="${item.id}">${item.name}</option>`).join("")
    : '<option value="">보유 가구 없음</option>';
  return `
    <div class="mobile-list">${slots}</div>
    <select id="mobile-housing-item-select">${options}</select>
    <div class="grid-2">
      <button data-mobile-place-slot="0">1번 칸</button>
      <button data-mobile-place-slot="1">2번 칸</button>
      <button data-mobile-place-slot="2">3번 칸</button>
      <button data-mobile-place-slot="3">4번 칸</button>
    </div>
    <button id="mobile-clear-housing">배치 초기화</button>
  `;
}

function renderMobileShop() {
  const visible = state.data.shop.filter((item) => {
    if (item.id === "apple_seed") return state.player.unlocks.appleSeedUnlocked;
    if (item.id === "golden_seed") return state.player.unlocks.goldenSeedUnlocked;
    return true;
  });
  if (!visible.length) return '<div class="mobile-list-item">구매 가능한 아이템이 없습니다.</div>';
  return visible.map((item) => `
    <div class="mobile-list-item">
      <strong>${item.name}</strong>
      <div>${item.description}</div>
      <div class="mobile-compact-row"><span>${item.currency === "bling" ? "블링" : "코인"} ${item.price}</span><button data-mobile-buy-id="${item.id}">구매</button></div>
    </div>
  `).join("");
}

function renderMobileActions() {
  return `
    <div class="mobile-action-grid">
      <button id="mobile-btn-gather">숲에서 채집하기</button>
      <button id="mobile-btn-fish">연못에서 낚시하기</button>
      <button id="mobile-btn-sell-all">수집품 판매하기</button>
      <select id="mobile-farm-seed-select">${(getSeedItems() || []).map((seed) => `<option value="${seed.id}">${seed.name} · 성장 ${seed.growthSeconds}초</option>`).join("")}</select>
      <div class="grid-2">
        <button id="mobile-btn-plant">씨앗 심기</button>
        <button id="mobile-btn-harvest">수확하기</button>
      </div>
      <div class="mini-note">${getFarmStatus().text}</div>
    </div>
  `;
}

function renderMobileMore() {
  return `
    <details class="utility-group" open>
      <summary>시스템</summary>
      <div class="top-gap stack">
        <button id="mobile-btn-save">저장</button>
        <button id="mobile-btn-load">불러오기</button>
        <button id="mobile-btn-reset" class="danger">새 게임</button>
      </div>
    </details>
    <details class="utility-group" open>
      <summary>설정</summary>
      <div class="top-gap stack">
        <label class="toggle"><input type="checkbox" id="mobile-bgm-enabled" ${state.player.settings.bgmEnabled ? "checked" : ""} /><span>시간대별 BGM 시스템 사용</span></label>
        <div class="grid-2">
          <button id="mobile-btn-add-coin">코인 +100</button>
          <button id="mobile-btn-add-bling">블링 +10</button>
        </div>
      </div>
    </details>
  `;
}

function bindMobileSheetEvents(kind) {
  document.getElementById("mobile-btn-gather")?.addEventListener("click", () => { document.getElementById("btn-gather")?.click(); closeMobileSheet(); });
  document.getElementById("mobile-btn-fish")?.addEventListener("click", () => { document.getElementById("btn-fish")?.click(); closeMobileSheet(); });
  document.getElementById("mobile-btn-sell-all")?.addEventListener("click", () => { document.getElementById("btn-sell-all")?.click(); closeMobileSheet(); });
  document.getElementById("mobile-btn-plant")?.addEventListener("click", () => {
    const source = document.getElementById("mobile-farm-seed-select");
    if (source && el.farmSeedSelect) el.farmSeedSelect.value = source.value;
    document.getElementById("btn-plant-seed")?.click();
  });
  document.getElementById("mobile-btn-harvest")?.addEventListener("click", () => { document.getElementById("btn-farm-harvest")?.click(); });

  document.getElementById("mobile-btn-save")?.addEventListener("click", () => { document.getElementById("btn-save")?.click(); closeMobileSheet(); });
  document.getElementById("mobile-btn-load")?.addEventListener("click", () => { document.getElementById("btn-load")?.click(); closeMobileSheet(); });
  document.getElementById("mobile-btn-reset")?.addEventListener("click", () => { document.getElementById("btn-reset")?.click(); closeMobileSheet(); });
  document.getElementById("mobile-bgm-enabled")?.addEventListener("change", (event) => {
    if (el.bgmEnabled) el.bgmEnabled.checked = event.target.checked;
    el.bgmEnabled?.dispatchEvent(new Event("change", { bubbles: true }));
  });
  document.getElementById("mobile-btn-add-coin")?.addEventListener("click", () => { document.getElementById("btn-add-coin")?.click(); });
  document.getElementById("mobile-btn-add-bling")?.addEventListener("click", () => { document.getElementById("btn-add-bling")?.click(); });

  document.querySelectorAll("[data-mobile-buy-id]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelector(`[data-buy-id="${button.dataset.mobileBuyId}"]`)?.click();
      openMobileSheet("shop");
    });
  });

  document.querySelectorAll("[data-mobile-place-slot]").forEach((button) => {
    button.addEventListener("click", () => {
      const select = document.getElementById("mobile-housing-item-select");
      if (select && el.housingItemSelect) el.housingItemSelect.value = select.value;
      document.getElementById(`btn-place-slot-${Number(button.dataset.mobilePlaceSlot) + 1}`)?.click();
      openMobileSheet("more");
    });
  });

  document.getElementById("mobile-clear-housing")?.addEventListener("click", () => {
    document.getElementById("btn-clear-housing")?.click();
    openMobileSheet("more");
  });
}

function openMobileSheet(kind) {
  if (!isMobileLayout() || !el.mobileSheet || !el.mobileSheetContent) return;

  document.querySelectorAll(".mobile-nav-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.mobileSheet === kind);
  });

  if (kind === "scene") {
    closeMobileSheet();
    return;
  }

  let title = "";
  let content = "";
  if (kind === "actions") {
    title = "행동";
    content = renderMobileActions();
  } else if (kind === "inventory") {
    title = "가방";
    content = renderMobileInventoryList();
  } else if (kind === "shop") {
    title = "상점";
    content = renderMobileShop();
  } else {
    title = "더보기";
    content = `
      <div class="mobile-sheet-section">
        <button id="mobile-open-life">생활 보기</button>
        <button id="mobile-open-housing">하우징 보기</button>
        ${renderMobileMore()}
      </div>
    `;
  }

  el.mobileSheetContent.innerHTML = `
    <div class="mobile-sheet-title"><strong>${title}</strong><span class="section-tip">하단 패널</span></div>
    <div class="mobile-list">${content}</div>
  `;

  el.mobileSheet.classList.add("open");
  if (el.mobileSheetBackdrop) el.mobileSheetBackdrop.hidden = false;
  bindMobileSheetEvents(kind);

  document.getElementById("mobile-open-life")?.addEventListener("click", () => {
    el.mobileSheetContent.innerHTML = `
      <div class="mobile-sheet-title"><strong>생활</strong><span class="section-tip">하단 패널</span></div>
      <div class="mobile-list">${renderMobileActivityList()}</div>
    `;
  });

  document.getElementById("mobile-open-housing")?.addEventListener("click", () => {
    el.mobileSheetContent.innerHTML = `
      <div class="mobile-sheet-title"><strong>하우징</strong><span class="section-tip">하단 패널</span></div>
      <div class="mobile-list">${renderMobileHousing()}</div>
    `;
    bindMobileSheetEvents("housing");
  });
}

function closeMobileSheet() {
  if (!el.mobileSheet) return;
  el.mobileSheet.classList.remove("open");
  if (el.mobileSheetBackdrop) el.mobileSheetBackdrop.hidden = true;
  document.querySelectorAll(".mobile-nav-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.mobileSheet === "scene");
  });
}

export function bindUIEvents() {

document.querySelectorAll(".mobile-nav-button").forEach((button) => {
  button.addEventListener("click", () => {
    openMobileSheet(button.dataset.mobileSheet);
  });
});

el.mobileSheetBackdrop?.addEventListener("click", () => {
  closeMobileSheet();
});

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


function getSceneBackgroundStyle(sceneKey, timeKey) {
  const map = {
    town: {
      dawn: "radial-gradient(circle at 16% 18%, rgba(255,220,148,0.95) 0%, rgba(255,220,148,0.65) 12%, transparent 24%), linear-gradient(180deg, #ffe9cb 0%, #f7d8bb 55%, #eadcc9 100%)",
      day: "radial-gradient(circle at 18% 16%, rgba(255,244,150,0.98) 0%, rgba(255,244,150,0.72) 12%, transparent 24%), linear-gradient(180deg, #bfe3ff 0%, #d7f0ff 38%, #f2eadc 100%)",
      evening: "radial-gradient(circle at 82% 18%, rgba(255,151,88,0.98) 0%, rgba(255,151,88,0.70) 12%, transparent 24%), linear-gradient(180deg, #ffbe8a 0%, #ffccb3 42%, #ead8ca 100%)",
      night: "radial-gradient(circle at 82% 18%, rgba(219,227,255,0.36) 0%, rgba(219,227,255,0.20) 10%, transparent 22%), linear-gradient(180deg, #24324f 0%, #3a4d70 45%, #59657d 100%)"
    },
    farm: {
      dawn: "radial-gradient(circle at 16% 18%, rgba(255,220,148,0.92) 0%, rgba(255,220,148,0.60) 12%, transparent 24%), linear-gradient(180deg, #e9f3c9 0%, #d8e8b8 48%, #c6d4a8 100%)",
      day: "radial-gradient(circle at 18% 16%, rgba(255,244,150,0.96) 0%, rgba(255,244,150,0.70) 12%, transparent 24%), linear-gradient(180deg, #bfe7b8 0%, #d9f1c9 38%, #c8dfb9 100%)",
      evening: "radial-gradient(circle at 82% 18%, rgba(255,151,88,0.94) 0%, rgba(255,151,88,0.66) 12%, transparent 24%), linear-gradient(180deg, #efc182 0%, #e2d09f 42%, #cfc2a3 100%)",
      night: "radial-gradient(circle at 82% 18%, rgba(219,227,255,0.24) 0%, rgba(219,227,255,0.12) 10%, transparent 22%), linear-gradient(180deg, #2d3f42 0%, #40584f 45%, #5a665d 100%)"
    },
    home: {
      dawn: "radial-gradient(circle at 16% 18%, rgba(255,220,148,0.90) 0%, rgba(255,220,148,0.58) 12%, transparent 24%), linear-gradient(180deg, #f8e3d2 0%, #eed4c2 52%, #e2cbbd 100%)",
      day: "radial-gradient(circle at 18% 16%, rgba(255,244,150,0.94) 0%, rgba(255,244,150,0.66) 12%, transparent 24%), linear-gradient(180deg, #f7eadb 0%, #f2e1d3 38%, #ead7c9 100%)",
      evening: "radial-gradient(circle at 82% 18%, rgba(255,151,88,0.92) 0%, rgba(255,151,88,0.64) 12%, transparent 24%), linear-gradient(180deg, #efc4a9 0%, #e6c6b7 42%, #dcc4bc 100%)",
      night: "radial-gradient(circle at 82% 18%, rgba(219,227,255,0.22) 0%, rgba(219,227,255,0.10) 10%, transparent 22%), linear-gradient(180deg, #4a4054 0%, #63556a 45%, #7b6f72 100%)"
    }
  };
  return map[sceneKey]?.[timeKey] || map.town.day;
}

function applySceneBackground(sceneKey, timeKey) {
  if (!el.sceneBackgroundLayer) return;
  const background = getSceneBackgroundStyle(sceneKey, timeKey);
  el.sceneBackgroundLayer.style.background = background;
  el.sceneBackgroundLayer.className = `scene-background-layer time-${timeKey}`;
  el.sceneBackgroundLayer.setAttribute("data-scene", sceneKey);
  el.sceneBackgroundLayer.setAttribute("data-time", timeKey);
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

  if (el.sceneMoodBanner) el.sceneMoodBanner.textContent = mood.banner;
  if (el.timeVisualBadge) {
    el.timeVisualBadge.textContent = `${mood.label} 분위기 · ${scene.title}`;
    el.timeVisualBadge.className = `time-visual-badge time-${mood.key}`;
  }
  applySceneBackground(currentScene, mood.key);

  if (el.sceneDetail) {
    if (currentScene === "town") {
      el.sceneDetail.textContent = "생활 활동을 시작하거나, 상점과 인벤토리를 둘러보기에 좋은 중심 공간입니다. 시간대가 바뀌면 광장의 하늘빛과 전체 배경 톤도 함께 달라집니다.";
    } else if (currentScene === "farm") {
      el.sceneDetail.textContent = `밭 풍경 · ${getFarmStatus().text} 시간대에 따라 밭의 색감도 달라집니다.`;
    } else {
      const placedNames = getPlacedHousingNames();
      el.sceneDetail.textContent = placedNames.length
        ? `현재 집 안에는 ${placedNames.join(", ")}이(가) 배치되어 있습니다.`
        : "아직 집 안이 비어 있습니다. 가구를 배치하면 시간대에 따라 더 다른 집 분위기를 느낄 수 있습니다.";
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

  if (el.sceneSpotlightText) {
    if (currentScene === "town") {
      el.sceneSpotlightText.textContent = mood.key === "evening"
        ? "노을빛이 천천히 마을에 내려앉고 있습니다. 광장 전체가 따뜻한 주황빛으로 물들고 있습니다."
        : mood.key === "night"
          ? "고요한 밤공기가 마을을 감싸며 차분한 푸른빛이 광장에 번지고 있습니다."
          : mood.key === "dawn"
            ? "아침 햇살이 광장 가장자리를 부드럽게 밝히며 하루를 깨우고 있습니다."
            : "햇살이 넓게 퍼지며 광장 전체를 맑고 환하게 비추고 있습니다.";
    } else if (currentScene === "farm") {
      el.sceneSpotlightText.textContent = mood.key === "evening"
        ? "밭 주변이 노을빛으로 물들며 오늘의 수확을 정리하기 좋은 시간입니다."
        : mood.key === "night"
          ? "밭은 조용한 밤공기 아래 잠시 쉬어가고 있습니다."
          : mood.key === "dawn"
            ? "서늘한 아침 공기와 함께 밭이 천천히 빛을 받기 시작합니다."
            : "작물이 햇빛을 받으며 자라기 좋은 밝은 시간입니다.";
    } else {
      el.sceneSpotlightText.textContent = mood.key === "evening"
        ? "실내가 포근한 주황빛으로 물들며 쉬어가기 좋은 분위기가 만들어지고 있습니다."
        : mood.key === "night"
          ? "집 안이 차분하고 고요한 밤 분위기로 바뀌며 휴식에 더 잘 어울립니다."
          : mood.key === "dawn"
            ? "은은한 아침빛이 집 안을 부드럽게 비추기 시작합니다."
            : "실내가 따뜻하고 환한 낮 분위기로 유지되고 있습니다.";
    }
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
  if (el.logPanel) el.logPanel.open = false;
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
