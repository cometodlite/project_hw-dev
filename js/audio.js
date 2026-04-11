import { state, addLog } from "./state.js";

let currentTrackId = null;

export function initAudio() {
  // 실제 오디오 파일이 생기면 이 모듈에 HTMLAudioElement 또는 Web Audio API를 연결하면 됩니다.
}

export function syncTrackWithTime(period) {
  if (!state.player.settings.bgmEnabled) {
    state.player.currentTrackTitle = "";
    currentTrackId = null;
    return;
  }

  if (currentTrackId === period.id) return;

  currentTrackId = period.id;
  state.player.currentTrackTitle = period.title;
  addLog(`배경음이 "${period.title}"(으)로 변경되었습니다.`);
}
