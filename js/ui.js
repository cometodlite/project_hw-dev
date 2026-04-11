import { state, addLog, updateCurrency, setHousingNote, setBgmEnabled } from "./state.js";
import { renderInventory, gatherReward, fishReward, farmReward } from "./inventory.js";
import { renderShop } from "./shop.js";
import { saveGame, loadGame, resetGame } from "./save.js";
import { playRadio, stopRadio, getRadioState } from "./audio.js";

const el = {};

export function initUI() {
  el.currentTime = document.getElementById("current-time");
  el.coinValue = document.getElementById("coin-value");
  el.blingValue = document.getElementById("bling-value");
  el.bgmTitle = document.getElementById("bgm-title");
  el.timePeriodText = document.getElementById("time-period-text");
  el.inventoryList = document.getElementById("inventory-list");
  el.shopList = document.getElementById("shop-list");
  el.logList = document.getElementById("log-list");
  el.housingNote = document.getElementById("housing-note");
  el.bgmEnabled = document.getElementById("bgm-enabled");
  el.radioTrackTitle = document.getElementById("radio-track-title");
}

export function bindUIEvents() {
  document.getElementById("btn-save").addEventListener("click", () => {
    saveGame();
    renderAll();
  });

  document.getElementById("btn-load").addEventListener("click", () => {
    loadGame();
    renderAll();
  });

  document.getElementById("btn-reset").addEventListener("click", () => {
    const confirmed = window.confirm("정말 새 게임 상태로 초기화하시겠습니까?");
    if (!confirmed) return;
    resetGame();
    renderAll();
  });

  const inventoryButton = document.getElementById("btn-open-inventory");
  if (inventoryButton) {
    inventoryButton.addEventListener("click", () => {
      addLog("인벤토리를 확인했습니다.");
      renderAll();
    });
  }

  document.getElementById("btn-add-coin").addEventListener("click", () => {
    updateCurrency({ coin: 100 });
    addLog("코인 100을 획득했습니다.");
    renderAll();
  });

  document.getElementById("btn-add-bling").addEventListener("click", () => {
    updateCurrency({ bling: 10 });
    addLog("블링 10을 획득했습니다.");
    renderAll();
  });

  document.getElementById("btn-gather").addEventListener("click", () => {
    const reward = gatherReward();
    addLog(`채집 성공: ${reward.label} ${reward.amount}개를 획득했습니다.`);
    renderAll();
  });

  document.getElementById("btn-fish").addEventListener("click", () => {
    const reward = fishReward();
    addLog(`낚시 성공: ${reward.label} ${reward.amount}개를 획득했습니다.`);
    renderAll();
  });

  document.getElementById("btn-farm").addEventListener("click", () => {
    const reward = farmReward();
    addLog(`농사 수확: ${reward.label} ${reward.amount}개를 획득했습니다.`);
    renderAll();
  });

  document.getElementById("btn-save-note").addEventListener("click", () => {
    setHousingNote(el.housingNote.value);
    addLog("하우징 메모를 저장했습니다.");
    renderAll();
  });

  el.bgmEnabled.addEventListener("change", (event) => {
    setBgmEnabled(event.target.checked);
    addLog(`시간대별 BGM 시스템을 ${event.target.checked ? "활성화" : "비활성화"}했습니다.`);
    renderAll();
  });

  const radioPlay = document.getElementById("btn-radio-play");
  if (radioPlay) {
    radioPlay.addEventListener("click", () => {
      playRadio();
      renderAll();
    });
  }

  const radioStop = document.getElementById("btn-radio-stop");
  if (radioStop) {
    radioStop.addEventListener("click", () => {
      stopRadio();
      renderAll();
    });
  }
}

export function renderStatus() {
  el.currentTime.textContent = state.ui.currentTime || "--:--";
  el.coinValue.textContent = `${state.player.coin}`;
  el.blingValue.textContent = `${state.player.bling}`;
  el.bgmTitle.textContent = state.player.settings.bgmEnabled
    ? (state.player.currentTrackTitle || "없음")
    : "사용 안 함";
  el.timePeriodText.textContent = state.player.currentPeriodLabel || "시간대를 계산하는 중입니다.";
  el.housingNote.value = state.player.housingNote || "";
  el.bgmEnabled.checked = Boolean(state.player.settings.bgmEnabled);

  if (el.radioTrackTitle) {
    const radio = getRadioState();
    el.radioTrackTitle.textContent = radio.isRadioPlaying
      ? `현재 라디오: ${radio.title}`
      : "현재 라디오: 꺼짐";
  }
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
  renderLog();
}
