const PUSH_API_BASE = window.PUSH_API_BASE || "https://huios-push-production.up.railway.app";
function getPushUserId() {
  if (typeof D !== "undefined" && D.currentAccId) return String(D.currentAccId);
  let id = localStorage.getItem("huios_uid");
  if (!id) {
    id = "u_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    localStorage.setItem("huios_uid", id);
  }
  return id;
}

function withTimeout(promise, ms, msg) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(msg)), ms))
  ]);
}

async function onNotifyToggle(checked) {
  const statusEl = document.getElementById("notifyStatusText");
  const testEl = document.getElementById("testNotifyItem");
  const toggleEl = document.getElementById("notifyOn");

  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    if (toggleEl) toggleEl.checked = false;
    if (statusEl) statusEl.textContent = "当前浏览器不支持推送";
    return;
  }

  try {
    const reg = await withTimeout(navigator.serviceWorker.ready, 8000, "SW未就绪");

    if (!checked) {
      const sub = await reg.pushManager.getSubscription();
      if (sub) await sub.unsubscribe();
      if (statusEl) statusEl.textContent = "未开启推送";
      if (testEl) testEl.style.display = "none";
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      if (toggleEl) toggleEl.checked = false;
      if (statusEl) statusEl.textContent = "通知权限被拒绝";
      return;
    }

    const publicKey = await fetch(`${PUSH_API_BASE}/vapid-public-key`, { cache: "no-store" }).then(r => r.text());

    // 关键：先复用旧订阅，不要先退订
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await withTimeout(
        reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey)
        }),
        10000,
        "创建订阅超时"
      );
    }

    const subData = sub.toJSON ? sub.toJSON() : JSON.parse(JSON.stringify(sub));
    const userId = getPushUserId();

    const resp = await fetch(`${PUSH_API_BASE}/subscribe`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sub: subData, userId })
    });
    if (!resp.ok) throw new Error("上报失败: " + resp.status);

    if (statusEl) statusEl.textContent = "已开启推送";
    if (testEl) testEl.style.display = "";
    if (toggleEl) toggleEl.checked = true;
  } catch (e) {
    console.error("切换推送失败:", e);
    if (toggleEl) toggleEl.checked = false;
    if (statusEl) statusEl.textContent = "开启失败：" + (e.message || e);
  }
}
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}
async function initNotifyStatus() {
  const statusEl = document.getElementById("notifyStatusText");
  const toggleEl = document.getElementById("notifyOn");
  const testEl = document.getElementById("testNotifyItem");
  if (!statusEl || !toggleEl) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    statusEl.textContent = sub ? "已开启推送" : "未开启推送";
    toggleEl.checked = !!sub;
    if (testEl) testEl.style.display = sub ? "" : "none";
  } catch {
    statusEl.textContent = "推送状态检测失败";
  }
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initNotifyStatus);
} else {
  initNotifyStatus();
}
async function sendTestNotify() {
  try {
    const userId = getPushUserId();
    const res = await fetch(`${PUSH_API_BASE}/send-test?userId=${encodeURIComponent(userId)}`);
    if (!res.ok) throw new Error(await res.text());
    if (typeof toast === "function") toast("测试通知已发送");
  } catch (e) {
    alert("发送失败：" + e.message);
  }
}

async function showPushDebug() {
  const lines = [];
  lines.push("ServiceWorker: " + ("serviceWorker" in navigator));
  lines.push("PushManager: " + ("PushManager" in window));
  lines.push("Notification权限: " + Notification.permission);
  lines.push("userId: " + getPushUserId());

  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    lines.push("本地订阅: " + (sub ? "有" : "无"));
  } catch (e) {
    lines.push("本地订阅检测失败: " + e.message);
  }

  try {
    const data = await fetch(`${PUSH_API_BASE}/subscriptions?userId=${encodeURIComponent(getPushUserId())}`).then(r => r.json());
    lines.push("服务器订阅数: " + data.filtered);
  } catch (e) {
    lines.push("服务器查询失败: " + e.message);
  }

  alert(lines.join("\n"));
}