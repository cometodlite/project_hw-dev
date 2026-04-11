import { state, DEFAULT_PLAYER_STATE, addLog } from "./state.js";

const SAVE_KEY = "project-hw-save-v1";

export function saveGame() {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state.player));
  addLog("저장이 완료되었습니다.");
}

export function loadGame() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) {
    addLog("저장된 데이터가 없어 기본 상태로 시작합니다.");
    return;
  }

  try {
    const parsed = JSON.parse(raw);
    state.player = {
      ...structuredClone(DEFAULT_PLAYER_STATE),
      ...parsed,
      settings: {
        ...DEFAULT_PLAYER_STATE.settings,
        ...(parsed.settings || {})
      },
      inventory: {
        ...DEFAULT_PLAYER_STATE.inventory,
        ...(parsed.inventory || {})
      }
    };
    addLog("저장 데이터를 불러왔습니다.");
  } catch (error) {
    console.error(error);
    addLog("저장 데이터를 불러오지 못해 기본 상태를 유지합니다.");
  }
}

export function resetGame() {
  localStorage.removeItem(SAVE_KEY);
  state.player = structuredClone(DEFAULT_PLAYER_STATE);
  addLog("새 게임 상태로 초기화했습니다.");
}
