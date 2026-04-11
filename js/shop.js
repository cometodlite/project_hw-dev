import { state, addLog } from "./state.js";
import { renderAll } from "./ui.js";

export function initShop() {}

export function renderShop(container) {
  container.innerHTML = "";

  for (const item of state.data.shop) {
    const row = document.createElement("div");
    row.className = "shop-item";
    row.innerHTML = `
      <div>
        <strong>${item.name}</strong>
        <div>${item.description}</div>
        <small>${item.currency === "coin" ? "코인" : "블링"} ${item.price}</small>
      </div>
      <button data-buy-id="${item.id}">구매</button>
    `;
    container.appendChild(row);
  }

  container.querySelectorAll("[data-buy-id]").forEach((button) => {
    button.addEventListener("click", () => {
      buyItem(button.dataset.buyId);
    });
  });
}

function buyItem(itemId) {
  const item = state.data.shop.find((entry) => entry.id === itemId);
  if (!item) return;

  const balanceKey = item.currency === "bling" ? "bling" : "coin";
  if (state.player[balanceKey] < item.price) {
    addLog(`${item.name} 구매에 필요한 ${item.currency === "bling" ? "블링" : "코인"}이 부족합니다.`);
    return;
  }

  state.player[balanceKey] -= item.price;
  state.player.inventory[item.id] = (state.player.inventory[item.id] || 0) + 1;
  addLog(`${item.name}을(를) 구매했습니다.`);
  renderAll();
}
