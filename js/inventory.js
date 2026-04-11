import { state, updateCurrency, increaseSkill, increaseActivityCount } from "./state.js";

function findItem(itemId) {
  return state.data.items.find((item) => item.id === itemId);
}

export function addInventoryItem(itemId, amount = 1) {
  state.player.inventory[itemId] = (state.player.inventory[itemId] || 0) + amount;
}

export function removeInventoryItem(itemId, amount = 1) {
  const current = state.player.inventory[itemId] || 0;
  const next = Math.max(0, current - amount);
  if (next <= 0) {
    delete state.player.inventory[itemId];
  } else {
    state.player.inventory[itemId] = next;
  }
}

function pickWeightedEntry(entries) {
  const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let random = Math.random() * totalWeight;
  for (const entry of entries) {
    random -= entry.weight;
    if (random <= 0) return entry;
  }
  return entries[entries.length - 1];
}

export function initInventory() {}

export function renderInventory(container) {
  container.innerHTML = "";

  const entries = Object.entries(state.player.inventory);
  if (entries.length === 0) {
    container.innerHTML = '<div class="inventory-item">보유 중인 아이템이 없습니다.</div>';
    return;
  }

  for (const [itemId, count] of entries) {
    const itemData = findItem(itemId);
    const div = document.createElement("div");
    div.className = "inventory-item";
    div.innerHTML = `
      <strong>${itemData?.name || itemId}</strong>
      <div>${itemData?.description || "설명 없음"}</div>
      <small>보유 수량: ${count} · 판매가: ${itemData?.sellPrice ?? 0} 코인</small>
    `;
    container.appendChild(div);
  }
}

function resolveReward(tableKey) {
  const table = state.data.lifeTables?.[tableKey] || [];
  const picked = pickWeightedEntry(table);
  const item = findItem(picked.itemId);
  const amount = Math.floor(Math.random() * (picked.maxAmount - picked.minAmount + 1)) + picked.minAmount;
  addInventoryItem(picked.itemId, amount);
  return { item, amount, rarity: picked.rarity };
}

export function gatherReward() {
  const reward = resolveReward("gathering");
  const bonusCoin = reward.rarity === "rare" ? 22 : 12;
  updateCurrency({ coin: bonusCoin });
  increaseSkill("gathering", 1);
  increaseActivityCount("gatheringCount", 1);
  return { label: reward.item.name, amount: reward.amount, rarity: reward.rarity, coin: bonusCoin };
}

export function fishReward() {
  const reward = resolveReward("fishing");
  const bonusCoin = reward.rarity === "rare" ? 28 : 18;
  updateCurrency({ coin: bonusCoin });
  increaseSkill("fishing", 1);
  increaseActivityCount("fishingCount", 1);
  return { label: reward.item.name, amount: reward.amount, rarity: reward.rarity, coin: bonusCoin };
}

export function getSeedItems() {
  return state.data.items.filter((item) => item.type === "seed");
}

export function getFarmStatus() {
  const plot = state.player.farmPlot;
  if (!plot.plantedSeedId) {
    return { state: "empty", text: "밭이 비어 있습니다. 씨앗을 심을 수 있습니다." };
  }

  const seed = findItem(plot.plantedSeedId);
  const now = Date.now();
  if (plot.readyAt && now >= plot.readyAt) {
    return {
      state: "ready",
      text: `${seed?.name || "작물"}이(가) 다 자랐습니다. 수확할 수 있습니다.`
    };
  }

  const remainingMs = Math.max(0, (plot.readyAt || now) - now);
  const remainingSec = Math.ceil(remainingMs / 1000);
  return {
    state: "growing",
    text: `${seed?.name || "작물"}이(가) 자라는 중입니다. 약 ${remainingSec}초 후 수확 가능합니다.`
  };
}

export function plantSeed(seedId) {
  const seed = findItem(seedId);
  if (!seed || seed.type !== "seed") {
    return { ok: false, message: "심을 수 있는 씨앗이 아닙니다." };
  }

  if ((state.player.inventory[seedId] || 0) <= 0) {
    return { ok: false, message: `${seed.name}이(가) 부족합니다.` };
  }

  if (state.player.farmPlot.plantedSeedId) {
    return { ok: false, message: "이미 밭에 작물이 자라고 있습니다." };
  }

  const now = Date.now();
  removeInventoryItem(seedId, 1);
  state.player.farmPlot = {
    plantedSeedId: seedId,
    plantedAt: now,
    readyAt: now + (seed.growthSeconds || 30) * 1000
  };

  return { ok: true, message: `${seed.name}을(를) 심었습니다.` };
}

export function harvestFarm() {
  const plot = state.player.farmPlot;
  if (!plot.plantedSeedId) {
    return { ok: false, message: "수확할 작물이 없습니다." };
  }

  const now = Date.now();
  if (now < plot.readyAt) {
    return { ok: false, message: "아직 수확할 수 없습니다." };
  }

  const seed = findItem(plot.plantedSeedId);
  const harvestItem = findItem(seed.harvestItemId);
  const amount = Math.floor(Math.random() * ((seed.harvestMax || 2) - (seed.harvestMin || 1) + 1)) + (seed.harvestMin || 1);

  addInventoryItem(seed.harvestItemId, amount);
  state.player.farmPlot = { plantedSeedId: null, plantedAt: null, readyAt: null };
  updateCurrency({ coin: 16 + amount * 3 });
  increaseSkill("farming", 1);
  increaseActivityCount("farmingCount", 1);

  return { ok: true, message: `${harvestItem.name} ${amount}개를 수확했습니다.`, itemName: harvestItem.name, amount };
}

export function sellForagedItems() {
  let earned = 0;
  const sold = [];

  for (const [itemId, count] of Object.entries({ ...state.player.inventory })) {
    const item = findItem(itemId);
    if (!item || !["gather", "fish", "farm"].includes(item.type)) continue;

    earned += (item.sellPrice || 0) * count;
    sold.push(`${item.name} ${count}개`);
    delete state.player.inventory[itemId];
  }

  if (earned > 0) {
    updateCurrency({ coin: earned });
  }

  return { earned, sold };
}
