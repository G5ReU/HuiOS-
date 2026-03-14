// ========================================
// 更新公告.js
// ========================================
// 配置区：每次更新只需修改这里
const UPDATE_CONFIG = {
  version: 'v1.0.1',
  content: `
🎉 欢迎使用 HuiPhone！

【新功能】
· 查手机系统全面升级，支持淘宝购物车/订单/收藏
· 浏览器支持批量生成页面
· 网易云播放器支持自定义封面和背景

【修复】
· 修复API弹窗层级问题
· 修复淘宝购物车生成不了的问题
· 修复closeModal报错

【优化】
· AI引用规则优化，减少重复引用
· 心声标签解析更稳定
  `.trim()
};

// ========================================
// 以下不需要修改
// ========================================
(function() {
  const STORAGE_KEY = 'skipUpdateNotice_' + UPDATE_CONFIG.version;

  function shouldShow() {
    return localStorage.getItem(STORAGE_KEY) !== '1';
  }

  function markSkip() {
    localStorage.setItem(STORAGE_KEY, '1');
  }

  function closeNotice() {
    const mask = document.getElementById('updateNoticeMask');
    if (!mask) return;
    mask.style.opacity = '0';
    mask.style.transform = 'scale(0.96)';
    setTimeout(() => {
      if (mask.parentNode) mask.parentNode.removeChild(mask);
    }, 250);
  }

  function showNotice() {
    if (!shouldShow()) return;

    const mask = document.createElement('div');
    mask.id = 'updateNoticeMask';
    mask.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.45);
      z-index: 99999;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      opacity: 0;
      transition: opacity 0.25s ease;
    `;

    mask.innerHTML = `
      <div id="updateNoticeBox" style="
        background: white;
        border-radius: 18px;
        width: min(88vw, 360px);
        max-height: 70vh;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        box-shadow: 0 20px 60px rgba(0,0,0,0.25);
        transform: translateY(16px);
        transition: transform 0.25s ease;
      ">
        <!-- 顶部版本号 -->
        <div style="
          padding: 20px 20px 14px;
          border-bottom: 1px solid #f0f0f0;
          flex-shrink: 0;
          text-align: center;
        ">
          <div style="
            display: inline-block;
            background: linear-gradient(135deg, var(--primary, #B8A9C9), var(--primary-dark, #9D8BB8));
            color: white;
            font-size: 12px;
            font-weight: 600;
            padding: 3px 12px;
            border-radius: 20px;
            letter-spacing: 1px;
            margin-bottom: 8px;
          ">${UPDATE_CONFIG.version}</div>
          <div style="font-size: 17px; font-weight: 700; color: #222;">更新公告</div>
        </div>

        <!-- 正文（可滚动） -->
        <div style="
          flex: 1;
          overflow-y: auto;
          padding: 16px 20px;
          font-size: 14px;
          color: #444;
          line-height: 1.8;
          white-space: pre-wrap;
          -webkit-overflow-scrolling: touch;
        ">${escapeHtml(UPDATE_CONFIG.content)}</div>

        <!-- 底部按钮 -->
        <div style="
          display: grid;
          grid-template-columns: 1fr 1fr;
          border-top: 1px solid #f0f0f0;
          flex-shrink: 0;
        ">
          <button id="updateNoticeSkip" style="
            padding: 14px;
            border: none;
            background: none;
            font-size: 14px;
            color: #999;
            cursor: pointer;
            border-right: 1px solid #f0f0f0;
            font-family: inherit;
          ">本次不再提示</button>
          <button id="updateNoticeClose" style="
            padding: 14px;
            border: none;
            background: none;
            font-size: 14px;
            font-weight: 600;
            color: var(--primary-dark, #9D8BB8);
            cursor: pointer;
            font-family: inherit;
          ">关闭</button>
        </div>
      </div>
    `;

    document.body.appendChild(mask);

    // 入场动画
    requestAnimationFrame(() => {
      mask.style.opacity = '1';
      const box = document.getElementById('updateNoticeBox');
      if (box) box.style.transform = 'translateY(0)';
    });

    // 点击遮罩关闭
    mask.addEventListener('click', function(e) {
      if (e.target === mask) closeNotice();
    });

    document.getElementById('updateNoticeClose').onclick = function() {
      closeNotice();
    };

    document.getElementById('updateNoticeSkip').onclick = function() {
      markSkip();
      closeNotice();
    };
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // 等页面加载完再弹
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showNotice);
  } else {
    showNotice();
  }
})();