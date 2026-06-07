// ========== Cloudflare Worker 抓取对接（修正版）==========
const SCRAPER_WORKER_URL = 'https://scraper.g5reu418.workers.dev';
const SCRAPER_SECRET = 'baobao-scraper-2024';

// 哪些站点走 Worker（反爬严重的社媒）
function shouldUseWorker(url) {
    if (!url) return false;
    return /xiaohongshu\.com|xhslink\.com|douyin\.com|weibo\.com|weibo\.cn|bilibili\.com|b23\.tv|zhihu\.com/.test(url);
}

// 调用 Worker（字段名已对齐：base64Images / imageUrls）
async function scrapeViaWorker(url) {
    try {
        const resp = await Promise.race([
            fetch(SCRAPER_WORKER_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Secret': SCRAPER_SECRET },
                body: JSON.stringify({ url: url })
            }),
            new Promise((_, rej) => setTimeout(() => rej(new Error('Worker 超时')), 80000))
        ]);
        const data = await resp.json();
        if (!data || !data.ok) {
            return { ok: false, error: (data && data.error) || 'HTTP ' + resp.status, base64Images: [], imageUrls: [] };
        }
        return {
            ok: true,
            title: data.title || '',
            text: data.text || '',
            base64Images: data.base64Images || [],   // ✅ 正确字段
            imageUrls: data.imageUrls || []
        };
    } catch (e) {
        console.warn('[Worker抓取] 失败:', e.message);
        return { ok: false, error: e.message, base64Images: [], imageUrls: [] };
    }
}

// 用户发链接 → 优先走 Worker
async function processUserLinkMsgViaWorker(charId, msgIdx) {
    var data = getAccData();
    var msg = data.chats[charId] && data.chats[charId][msgIdx];
    if (!msg || msg.type !== 'link' || !msg.linkUrl) return;
    if (msg.content && msg.content.indexOf('{{FETCHED_LINK_DATA}}') >= 0 && msg.linkFullText && msg.linkFullText.length > 100) return;

    var url = msg.linkUrl;

    // 不是社媒链接 → 直接交回原逻辑（✅ 调原函数，不会自己调自己）
    if (!shouldUseWorker(url)) {
        if (typeof window._origProcessUserLinkMsg === 'function') {
            return await window._origProcessUserLinkMsg(charId, msgIdx);
        }
        return;
    }

    try {
        var dom = new URL(url).hostname;
        if (!msg.linkFavicon) msg.linkFavicon = 'https://www.google.com/s2/favicons?domain=' + dom + '&sz=64';
        save();
        if (curChar && curChar.id === charId && !responding) renderMsgs(false);
    } catch (e) {}

    toast('🚀 启动浏览器抓取...');
    if ($('crStatus') && curChar && curChar.id === charId) {
        $('crStatus').textContent = '正在用浏览器抓取...';
        $('crStatus').classList.add('typing');
    }

    var result = await scrapeViaWorker(url);

    // Worker 失败 → 降级回原 11 通道（✅ 调原函数）
    if (!result.ok || (!result.text && !result.base64Images.length)) {
        toast('⚠️ 浏览器抓取失败，改用本地抓取');
        if ($('crStatus') && curChar && curChar.id === charId) {
            $('crStatus').textContent = '在线';
            $('crStatus').classList.remove('typing');
        }
        if (typeof window._origProcessUserLinkMsg === 'function') {
            return await window._origProcessUserLinkMsg(charId, msgIdx);
        }
        return;
    }

    // 成功：写入标题/正文/封面
    var fd = getAccData();
    var fm = fd.chats[charId] && fd.chats[charId][msgIdx];
    if (!fm) return;

    if (result.title) fm.linkTitle = result.title;
    if (result.text) fm.linkDesc = result.text.slice(0, 150);
    if (result.base64Images.length && !fm.linkImage) fm.linkImage = result.base64Images[0];

    var fullText = '';
    if (result.title) fullText += '# ' + result.title + '\n\n';
    if (result.text) fullText += result.text + '\n';
    fm.linkFullText = fullText;

    // 先存原图作兜底（识图失败时 buildMessages 会直接传给 AI）
    if (result.base64Images.length) fm._linkBase64Images = result.base64Images.slice(0, 4);

    var orig = getDisplayContent(fm);
    fm.content = orig + LINK_DATA_SEP
        + '[链接: ' + url + ']\n'
        + '\n--- [浏览器抓取内容] ---\n'
        + '【页面标题】: ' + (result.title || '未知') + '\n'
        + '【正文/标签】:\n' + (result.text || '（无正文）') + '\n'
        + '--- [抓取结束] ---\n';
    save();
    if (curChar && curChar.id === charId && !responding) renderMsgs(false);

    // 把 base64 图并行识别成文字（一次识图，之后永久是文本，省 token）
    var base64s = result.base64Images.slice(0, 3);
    if (base64s.length && typeof recognizeImage === 'function') {
        if ($('crStatus') && curChar && curChar.id === charId) $('crStatus').textContent = '正在识别图片...';

        var descArr = await Promise.all(base64s.map(function(b64) {
            return new Promise(function(resolve) {
                var done = false;
                var to = setTimeout(function() { if (!done) { done = true; resolve(''); } }, 20000);
                recognizeImage(b64, function(d) { if (!done) { done = true; clearTimeout(to); resolve(d || ''); } });
            });
        }));

        var descs = [];
        descArr.forEach(function(d, i) {
            if (d && d !== '图片' && d.length > 4) descs.push('【图' + (i + 1) + '】' + d);
        });

        var fd2 = getAccData();
        var fm2 = fd2.chats[charId] && fd2.chats[charId][msgIdx];
        if (fm2) {
            if (descs.length) {
                var imgSection = '\n--- [链接含 ' + descs.length + ' 张图片，已识别] ---\n' + descs.join('\n') + '\n--- [图片描述结束] ---\n';
                fm2.content = (fm2.content || '') + imgSection;
                fm2.linkFullText = (fm2.linkFullText || '') + imgSection;
                delete fm2._linkBase64Images;   // 识别成功就不必每轮重发原图
                save();
                if (curChar && curChar.id === charId && !responding) renderMsgs(false);
                toast('✅ 抓取+识图完成（' + (result.text ? result.text.length + '字 ' : '') + descs.length + '图）');
            } else {
                toast('⚠️ 图片识别失败，将直接把原图传给AI');
            }
        }
    }

    if ($('crStatus') && curChar && curChar.id === charId) {
        $('crStatus').textContent = '在线';
        $('crStatus').classList.remove('typing');
    }
}

// 挂钩：把 processUserLinkMsg 换成 Worker 版（原函数存到 _orig，避免递归）
function _hookLinkProcess() {
    if (typeof processUserLinkMsg !== 'function') { setTimeout(_hookLinkProcess, 500); return; }
    if (window.processUserLinkMsg && window.processUserLinkMsg._workerHooked) return;
    window._origProcessUserLinkMsg = processUserLinkMsg;
    window.processUserLinkMsg = processUserLinkMsgViaWorker;
    window.processUserLinkMsg._workerHooked = true;
    console.log('✅ Worker 抓取已挂钩');
}
setTimeout(_hookLinkProcess, 800);

// 调试：手动测
window.testWorker = async function(url) {
    var r = await scrapeViaWorker(url || 'http://xhslink.com/o/7if6smCQSE1');
    showMsgDataDialog('ok=' + r.ok + '\ntitle=' + r.title + '\ntext长度=' + (r.text || '').length
        + '\nbase64图=' + r.base64Images.length + '张\nimageUrls=' + r.imageUrls.length + '个\nerror=' + (r.error || '无'), null);
};