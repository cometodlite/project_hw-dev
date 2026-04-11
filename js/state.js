export const DEFAULT_PLAYER_STATE = {
  coin: 500,
  bling: 30,
  inventory: {
    herb: 2,
    fish: 1,
    wheat: 3
  },
  housingNote: "",
  settings: {
    bgmEnabled: true
  },
  log: [
    {
      text: "PROJECT: HW에 오신 것을 환영합니다.",
      time: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
    }
  ],
  currentPeriodLabel: "",
  currentTrackTitle: ""
};

export const state = {
  player: structuredClone(DEFAULT_PLAYER_STATE),
  ui: {
    currentTime: "",
    currentTrack: null
  },
  data: {
    items: [],
    shop: [],
    bgmSchedule: []
  },
  meta: {
    dataFilesLoaded: false
  }
};

export function setDataFilesLoaded(value) {
  state.meta.dataFilesLoaded = value;
}

export function addLog(text) {
  state.player.log.unshift({
    text,
    time: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })
  });

  state.player.log = state.player.log.slice(0, 30);
}

export function updateCurrency({ coin = 0, bling = 0 }) {
  state.player.coin += coin;
  state.player.bling += bling;
}

export function setHousingNote(note) {
  state.player.housingNote = note;
}

export function setBgmEnabled(enabled) {
  state.player.settings.bgmEnabled = enabled;
}
