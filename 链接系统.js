// ========== 链接预览系统 ==========
var _linkMetaCache = {};

// 🔥 图片代理函数：绕过防盗链
function proxyImgUrl(url) {
    if (!url) return '';
    if (url.indexOf('wsrv.nl') !== -1) return url;
    if (url.indexOf('data:') === 0) return url;
    return 'https://wsrv.nl/?url=' + encodeURIComponent(url);
}

// 检测文本中的URL
function detectUrls(text) {
    return String(text || '').match(/https?:\/\/[^\s<>"{}|\\^`\[\]，。！？、）)]+/gi) || [];
}

// 获取链接元数据（标题+描述+图标）
function fetchLinkMeta(url, callback) {
    if (_linkMetaCache[url]) { callback(_linkMetaCache[url]); return; }

    var domain = '';
    try { domain = new URL(url).hostname; } catch(e) { domain = url.slice(0, 40); }
    var fallback = {
        title: domain,
        desc: url,
        favicon: 'https://www.google.com/s2/favicons?domain=' + domain + '&sz=64',
        image: ''
    };

    fetch('https://api.microlink.io/?url=' + encodeURIComponent(url))
        .then(function(r) { return r.json(); })
        .then(function(d) {
            if (d.status === 'success' && d.data) {
                var meta = {
                    title: (d.data.title || domain).slice(0, 80),
                    desc: (d.data.description || '').slice(0, 120),
                    favicon: (d.data.logo && d.data.logo.url) ? d.data.logo.url : fallback.favicon,
                    image: (d.data.image && d.data.image.url) ? d.data.image.url : ''
                };
                _linkMetaCache[url] = meta;
                callback(meta);
            } else {
                _linkMetaCache[url] = fallback;
                callback(fallback);
            }
        })
        .catch(function() {
            _linkMetaCache[url] = fallback;
            callback(fallback);
        });
}

// 发送用户链接消息
function sendUserLinkMsg(charId, url, text) {
    var domain = '';
    try { domain = new URL(url).hostname; } catch(e) { domain = url; }

    var msg = {
        id: genId('link'),
        role: 'user',
        type: 'link',
        content: text || '',
        linkUrl: url,
        linkTitle: domain,
        linkDesc: '正在加载预览...',
        linkFavicon: 'https://www.google.com/s2/favicons?domain=' + domain + '&sz=64',
        linkImage: '',
        linkFullText: '',
        linkVirtual: false,
        time: Date.now()
    };

    appendMsgToChat(charId, msg);

    // 异步获取元数据并更新
    fetchLinkMeta(url, function(meta) {
        var data = getAccData();
        var msgs = data.chats[charId] || [];
        var found = msgs.find(function(m) { return m.id === msg.id; });
        if (found) {
            found.linkTitle = meta.title;
            found.linkDesc = meta.desc;
            found.linkFavicon = meta.favicon;
            found.linkImage = meta.image;
            save();
            renderMsgs(false);
        }
    });
}

// 渲染链接卡片HTML（🔥 所有图片走代理）
function renderLinkCard(msg) {
    var url = msg.linkUrl || '';
    var title = msg.linkTitle || '链接';
    var desc = msg.linkDesc || '';
    var favicon = msg.linkFavicon || '';
    var image = msg.linkImage || '';
    var isVirtual = !!msg.linkVirtual;
    var text = msg.content || '';
    var domain = '';
    try { domain = new URL(url).hostname; } catch(e) { domain = url.slice(0, 30); }

    // 🔥 封面图和图标都走代理，绕过防盗链
    var safeImage = image ? proxyImgUrl(image) : '';
    var safeFavicon = favicon ? proxyImgUrl(favicon) : '';

    var html = '';
    if (text) html += '<div class="link-msg-text">' + escHtml(text) + '</div>';

    html += '<div class="link-card" onclick="openLinkUrl(\'' + escHtml(url) + '\', ' + isVirtual + ')" ontouchstart="this.classList.add(\'pressed\')" ontouchend="this.classList.remove(\'pressed\')">';

    if (safeImage && !isVirtual) {
        html += '<div class="link-card-image"><img src="' + escHtml(safeImage) + '" onerror="this.parentNode.style.display=\'none\'"></div>';
    }

    html += '<div class="link-card-body">';
    html += '<div class="link-card-title">' + escHtml(title) + '</div>';
    if (desc) html += '<div class="link-card-desc">' + escHtml(desc) + '</div>';
    html += '<div class="link-card-footer">';
    if (safeFavicon) html += '<img class="link-card-favicon" src="' + escHtml(safeFavicon) + '" onerror="this.style.display=\'none\'">';
    html += '<span class="link-card-domain">' + escHtml(domain) + '</span>';
    if (isVirtual) html += '<span class="link-card-virtual">虚拟生成</span>';
    html += '</div>';
    html += '</div>';
    html += '</div>';

    return html;
}

// 打开链接
function openLinkUrl(url, isVirtual) {
    if (isVirtual) {
        toast('这是AI虚拟生成的链接，非真实网页');
        return;
    }
    if (url && url.indexOf('http') === 0) {
        window.open(url, '_blank');
    }
}

// 长按复制链接
function copyLinkUrl(url) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(function() { toast('链接已复制'); });
    } else {
        var t = document.createElement('textarea');
        t.value = url;
        document.body.appendChild(t);
        t.select();
        document.execCommand('copy');
        t.remove();
        toast('链接已复制');
    }
}

// escHtml 防XSS
function escHtml(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}