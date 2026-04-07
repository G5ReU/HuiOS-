(function () {
const API_BASE = window.PUSH_API_BASE || "https://huios-push.onrender.com";

  function getUserIdForBanCheck() {
    // 优先账号ID
    if (typeof D !== "undefined" && D.currentAccId) return String(D.currentAccId);

    // 兼容推送ID
    let id = localStorage.getItem("huios_push_uid");
    if (!id) {
      id = "dev_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
      localStorage.setItem("huios_push_uid", id);
    }
    return id;
  }

  async function checkBanStatusOnBoot() {
    try {
      const userId = getUserIdForBanCheck();
      const res = await fetch(`${API_BASE}/client/status?userId=${encodeURIComponent(userId)}`, { cache: "no-store" });
      const data = await res.json();
      if (!data.ok || !data.banned) return;

      const untilText = data.until ? new Date(data.until).toLocaleString("zh-CN") : "永久";
      const reason = data.reason || "违反使用规范";

      const mask = document.createElement("div");
      mask.style.cssText = "position:fixed;inset:0;background:#111;z-index:999999;color:#fff;display:flex;align-items:center;justify-content:center;padding:20px";
      mask.innerHTML = `
        <div style="width:min(92vw,420px);background:#1c1c1c;border:1px solid #333;border-radius:16px;padding:18px">
          <h2 style="margin:0 0 10px;font-size:20px">账号已被限制访问</h2>
          <div style="font-size:14px;line-height:1.8;color:#ddd">
            原因：${reason}<br>截止：${untilText}
          </div>
          <textarea id="appealText" placeholder="填写申诉理由..." style="width:100%;margin-top:12px;height:90px;border-radius:10px;border:1px solid #444;background:#111;color:#fff;padding:10px"></textarea>
          <input id="appealContact" placeholder="联系方式（可选）" style="width:100%;margin-top:8px;border-radius:10px;border:1px solid #444;background:#111;color:#fff;padding:10px">
          <button id="appealBtn" style="width:100%;margin-top:10px;padding:12px;border:none;border-radius:10px;background:#9D8BB8;color:white">提交申诉</button>
          <div id="appealMsg" style="margin-top:8px;font-size:12px;color:#aaa"></div>
        </div>
      `;
      document.body.appendChild(mask);

      document.getElementById("appealBtn").onclick = async () => {
        const text = (document.getElementById("appealText").value || "").trim();
        const contact = (document.getElementById("appealContact").value || "").trim();
        if (text.length < 5) {
          document.getElementById("appealMsg").textContent = "申诉内容至少5个字";
          return;
        }
        try {
          const r = await fetch(`${API_BASE}/client/appeal`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, text, contact })
          });
          const d = await r.json();
          document.getElementById("appealMsg").textContent = d.ok ? "申诉已提交，请等待处理" : ("提交失败：" + (d.error || ""));
        } catch (e) {
          document.getElementById("appealMsg").textContent = "提交失败：" + e.message;
        }
      };
    } catch (e) {
      console.warn("ban check failed:", e);
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", checkBanStatusOnBoot);
  } else {
    checkBanStatusOnBoot();
  }
})();