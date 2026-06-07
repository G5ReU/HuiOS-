// ========== Worker 爬虫客户端 ==========

// 配置：填你的 Worker URL 和密钥
var SCRAPER_CONFIG = {
    url: 'https://scraper.g5reu418.workers.dev',  // ← 改成你的 Worker URL
    secret: 'baobao-scraper-2024'              // ← 和 Worker 里的 SECRET 一致
};

/**
 * 抓取一个链接的内容
 * @param {string} url 要抓的链接
 * @returns {Promise<{title, text, images, platform}>}
 */
async function scrapeUrl(url) {
    if (!url) throw new Error('URL 为空');

    var resp = await fetch(SCRAPER_CONFIG.url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Secret': SCRAPER_CONFIG.secret
        },
        body: JSON.stringify({ url: url })
    });

    if (!resp.ok) {
        var txt = await resp.text();
        throw new Error('HTTP ' + resp.status + ': ' + txt);
    }

    var result = await resp.json();
    if (result.error) throw new Error(result.error);

    // Worker 返回的格式：{ data: {...}, type: 'application/json' }
    // 或直接：{ title, text, images, platform }
    var data = result.data || result;
    return data;
}

/**
 * 从一段文字里提取所有 URL
 */
function extractUrls(text) {
    if (!text) return [];
    var re = /https?:\/\/[^\s\u4e00-\u9fa5"'<>]+/g;
    return text.match(re) || [];
}

/**
 * 检测平台名（中文显示用）
 */
function getPlatformName(url) {
    if (/xiaohongshu\.com|xhslink\.com/.test(url)) return '小红书';
    if (/douyin\.com/.test(url)) return '抖音';
    if (/weibo\.com|weibo\.cn/.test(url)) return '微博';
    if (/bilibili\.com|b23\.tv/.test(url)) return 'B站';
    if (/zhihu\.com/.test(url)) return '知乎';
    return '网页';
}

// ========== 测试函数（在控制台调用） ==========

/**
 * 测试：在浏览器控制台运行 testScrape('https://...')
 */
window.testScrape = async function(url) {
    if (!url) {
        url = prompt('输入要抓取的网址:', 'https://example.com');
        if (!url) return;
    }
    console.log('🚀 开始抓取:', url);
    toast && toast('抓取中...');
    try {
        var data = await scrapeUrl(url);
        console.log('✅ 抓取成功:', data);
        console.log('标题:', data.title);
        console.log('正文:', data.text);
        console.log('图片数:', (data.images || []).length);
        toast && toast('抓取成功，看控制台');
        return data;
    } catch (e) {
        console.error('❌ 抓取失败:', e);
        toast && toast('失败：' + e.message);
    }
};