import { state, updateCurrency } from "./state.js";

function findItem(itemId) {
  return state.data.items.find((item) => item.id === itemId);
}

function addInventoryItem(itemId, amount = 1) {
  state.player.inventory[itemId] = (state.player.inventory[itemId] || 0) + amount;
}

export function initInventory() {
  // placeholder for future systems
}

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
      <small>보유 수량: ${count}</small>
    `;
    container.appendChild(div);
  }
}

export function addRandomItemToInventory(pool) {
  const randomId = pool[Math.floor(Math.random() * pool.length)];
  addInventoryItem(randomId, 1);
  return findItem(randomId);
}

export function gatherReward() {
  const rewardIds = ["herb", "flower", "wood"];
  const reward = addRandomItemToInventory(rewardIds);
  const amount = Math.floor(Math.random() * 3) + 1;
  addInventoryItem(reward.id, amount - 1);
  updateCurrency({ coin: 12 });
  return { label: reward.name, amount };
}

export function fishReward() {
  const rewardIds = ["fish", "shrimp"];
  const reward = addRandomItemToInventory(rewardIds);
  const amount = Math.floor(Math.random() * 2) + 1;
  addInventoryItem(reward.id, amount - 1);
  updateCurrency({ coin: 18 });
  return { label: reward.name, amount };
}

export function farmReward() {
  const rewardIds = ["wheat", "apple"];
  const reward = addRandomItemToInventory(rewardIds);
  const amount = Math.floor(Math.random() * 4) + 1;
  addInventoryItem(reward.id, amount - 1);
  updateCurrency({ coin: 20 });
  return { label: reward.name, amount };
}

export function hasEnoughCoin(price) {
  return state.player.coin >= price;
}
