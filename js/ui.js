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
let currentMobilePanel = "status";
let currentMobileBagTab = "inventory";

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


function isFivePanelMobile() {
  return window.innerWidth <= 760 ||
    (window.innerWidth <= 1024 &&
     window.matchMedia("(orientation: portrait)").matches &&
     window.matchMedia("(pointer: coarse)").matches);
}

function setMobilePanel(panel) {
  currentMobilePanel = panel || "status";
  document.querySelectorAll(".mobile-panel").forEach((node) => {
    const active = node.dataset.mobilePanel === currentMobilePanel;
    node.classList.toggle("active", active);
    node.style.display = active ? "block" : "none";
  });
}

function setMobileBagTab(tab) {
  currentMobileBagTab = tab || "inventory";
  document.querySelectorAll(".mobile-subtab").forEach((button) => {
    button.classList.toggle("active", button.dataset.mobileBagTab === currentMobileBagTab);
  });
  document.querySelectorAll(".mobile-bag-view").forEach((node) => {
    const active = node.dataset.mobileBagView === currentMobileBagTab;
    node.classList.toggle("active", active);
    node.style.display = active ? "grid" : "none";
  });
}

function renderM5Status() {
  if (el.m5StatusSceneTitle) el.m5StatusSceneTitle.textContent = SCENE_META[currentScene]?.title || "마을 광장";
  if (el.m5StatusSceneDetail) el.m5StatusSceneDetail.textContent = el.sceneDetail?.textContent || "공간 정보를 불러오는 중입니다.";
  if (el.m5StatusLife) el.m5StatusLife.textContent = el.lifeSummary?.textContent || "불러오는 중입니다.";
  if (el.m5StatusHome) el.m5StatusHome.textContent = el.homeVisualStatus?.textContent || "불러오는 중입니다.";
  if (el.m5StatusBgm) el.m5StatusBgm.textContent = state.player.settings.bgmEnabled ? (state.player.currentTrackTitle || "없음") : "사용 안 함";
}

function renderM5Action() {
  if (!el.m5SeedSelect) return;
  const seeds = getSeedItems();
  el.m5SeedSelect.innerHTML = seeds.length
    ? seeds.map((seed) => `<option value="${seed.id}">${seed.name} · 성장 ${seed.growthSeconds}초</option>`).join("")
    : '<option value="">사용 가능한 씨앗이 없습니다</option>';
  if (el.m5FarmStatus) el.m5FarmStatus.textContent = getFarmStatus().text;
}

function renderM5Bag() {
  if (el.m5BagInventoryList) {
    const entries = Object.entries(state.player.inventory || {});
    el.m5BagInventoryList.innerHTML = entries.length
      ? entries.map(([itemId, count]) => {
          const item = state.data.items.find((entry) => entry.id === itemId);
          return `<div class="mobile-bag-item"><strong>${item?.name || itemId}</strong><div>${item?.description || "설명 없음"}</div><small>수량 ${count} · 판매 ${item?.sellPrice ?? 0} 코인</small></div>`;
        }).join("")
      : '<div class="mobile-bag-item">보유 중인 아이템이 없습니다.</div>';
  }

  renderHousingSlots(el.m5HousingSlots);
  populateHousingItemSelect(el.m5HousingItemSelect);
  if (el.m5HousingSummary) el.m5HousingSummary.textContent = getHousingSummary();
  setMobileBagTab(currentMobileBagTab);
}

function renderM5Shop() {
  if (!el.m5ShopList) return;
  const visible = state.data.shop.filter((item) => {
    if (item.id === "apple_seed") return state.player.unlocks.appleSeedUnlocked;
    if (item.id === "golden_seed") return state.player.unlocks.goldenSeedUnlocked;
    return true;
  });

  el.m5ShopList.innerHTML = visible.length
    ? visible.map((item) => `
      <div class="mobile-shop-item">
        <div>
          <strong>${item.name}</strong>
          <div>${item.description}</div>
          <small>${item.currency === "coin" ? "코인" : "블링"} ${item.price}</small>
        </div>
        <button data-m5-buy-id="${item.id}">구매</button>
      </div>
    `).join("")
    : '<div class="mobile-shop-item"><div>구매 가능한 아이템이 없습니다.</div></div>';

  document.querySelectorAll("[data-m5-buy-id]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelector(`[data-buy-id="${button.dataset.m5BuyId}"]`)?.click();
      renderM5Shop();
      renderM5Bag();
      renderM5Log();
      renderM5Status();
    });
  });
}

function renderM5Log() {
  if (!el.m5LogList) return;
  const rows = (state.player.log || []).slice(0, 12);
  el.m5LogList.innerHTML = rows.length
    ? rows.map((row) => `<div class="mobile-log-item"><strong>${row.time}</strong><div>${row.text}</div></div>`).join("")
    : '<div class="mobile-log-item">최근 알림이 없습니다.</div>';
}

function renderAllM5Panels() {
  renderM5Status();
  renderM5Action();
  renderM5Bag();
  renderM5Shop();
  renderM5Log();
  setMobilePanel(currentMobilePanel);
  setMobileBagTab(currentMobileBagTab);
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
  el.m5StatusSceneTitle = document.getElementById("m5-status-scene-title");
  el.m5StatusSceneDetail = document.getElementById("m5-status-scene-detail");
  el.m5StatusLife = document.getElementById("m5-status-life");
  el.m5StatusHome = document.getElementById("m5-status-home");
  el.m5StatusBgm = document.getElementById("m5-status-bgm");
  el.m5SeedSelect = document.getElementById("m5-seed-select");
  el.m5FarmStatus = document.getElementById("m5-farm-status");
  el.m5BagInventoryList = document.getElementById("m5-bag-inventory-list");
  el.m5HousingSlots = document.getElementById("m5-housing-slots");
  el.m5HousingItemSelect = document.getElementById("m5-housing-item-select");
  el.m5HousingSummary = document.getElementById("m5-housing-summary");
  el.m5ShopList = document.getElementById("m5-shop-list");
  el.m5LogList = document.getElementById("m5-log-list");

  populateSeedSelect();
  populateHousingItemSelect(el.housingItemSelect);
  syncSceneButtons();
  syncSideTabs();
  if (el.logPanel) el.logPanel.open = false;
  currentMobilePanel = "status";
  currentMobileBagTab = "inventory";
  renderAllM5Panels();
  setMobilePanel(currentMobilePanel);
  setMobileBagTab(currentMobileBagTab);
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

document.querySelectorAll(".mobile-5panel-button").forEach((button) => {
  button.addEventListener("click", () => {
    const panel = button.dataset.m5Panel || "status";
    setMobilePanel(panel);
    renderAllM5Panels();
    setMobilePanel(currentMobilePanel);
    setMobileBagTab(currentMobileBagTab);
  });
});

});

document.querySelectorAll(".mobile-subtab").forEach((button) => {
  button.addEventListener("click", () => {
    setMobileBagTab(button.dataset.mobileBagTab);
  });
});

document.getElementById("m5-btn-gather")?.addEventListener("click", () => {
  document.getElementById("btn-gather")?.click();
  renderAllM5Panels();
});
document.getElementById("m5-btn-fish")?.addEventListener("click", () => {
  document.getElementById("btn-fish")?.click();
  renderAllM5Panels();
});
document.getElementById("m5-btn-sell")?.addEventListener("click", () => {
  document.getElementById("btn-sell-all")?.click();
  renderAllM5Panels();
});
document.getElementById("m5-btn-plant")?.addEventListener("click", () => {
  if (el.m5SeedSelect && el.farmSeedSelect) el.farmSeedSelect.value = el.m5SeedSelect.value;
  document.getElementById("btn-plant-seed")?.click();
  renderAllM5Panels();
});
document.getElementById("m5-btn-harvest")?.addEventListener("click", () => {
  document.getElementById("btn-farm-harvest")?.click();
  renderAllM5Panels();
});

document.querySelectorAll("[data-m5-place-slot]").forEach((button) => {
  button.addEventListener("click", () => {
    if (el.m5HousingItemSelect && el.housingItemSelect) {
      el.housingItemSelect.value = el.m5HousingItemSelect.value;
    }
    document.getElementById(`btn-place-slot-${button.dataset.m5PlaceSlot}`)?.click();
    renderAllM5Panels();
  });
});

document.getElementById("m5-btn-clear-housing")?.addEventListener("click", () => {
  document.getElementById("btn-clear-housing")?.click();
  renderAllM5Panels();
});
  });
});
  });
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
  renderAllM5Panels();
  setMobilePanel(currentMobilePanel);
  setMobileBagTab(currentMobileBagTab);
  syncSceneButtons();
  syncSideTabs();
  if (el.logPanel) el.logPanel.open = false;
  currentMobilePanel = "status";
  currentMobileBagTab = "inventory";
  renderAllM5Panels();
  setMobilePanel(currentMobilePanel);
  setMobileBagTab(currentMobileBagTab);
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
