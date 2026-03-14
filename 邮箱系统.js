// ========== 邮箱系统 ==========

function initEmailData() {
    var data = getAccData();
    if (!data.emails) data.emails = [];
    if (!data.externalEmails) data.externalEmails = {};
    if (!data.emailDrafts) data.emailDrafts = [];
    save();
}

function getUserEmail() {
    var acc = getCurAcc();
    return acc && acc.email ? acc.email : 'user@lhuy.vip';
}

function getCharEmail(charId) {
    var data = getAccData();
    var char = data.chars.find(function(c) { return c.id === charId; });
    return (char && (char.emailAddress || char.email)) || null;
}

function findCharByEmail(email) {
    if (!email) return null;
    var data = getAccData();
    return data.chars.find(function(c) {
        return (c.emailAddress && c.emailAddress === email) || (c.email && c.email === email);
    });
}

var emailCurrentFolder = 'inbox';
var emailCurrentId = null;
var emailSearchKeyword = '';

function openEmailPage() {
    initEmailData();
    emailCurrentFolder = 'inbox';
    emailCurrentId = null;
    emailSearchKeyword = '';
    var page = document.getElementById('emailPage');
    if (page) {
        page.classList.add('active');
        page.classList.remove('email-detail-open');
    }
    renderEmailFolders();
    renderEmailList();
    renderEmailDetail();
    updateEmailBadge();
}

function closeEmailPage() {
    var page = document.getElementById('emailPage');
    if (page) page.classList.remove('active');
}

// ========== 文件夹渲染 ==========
function renderEmailFolders() {
    var data = getAccData();
    var emails = data.emails || [];
    var drafts = data.emailDrafts || [];
    var counts = { inbox: 0, sent: 0, draft: drafts.length, trash: 0, spam: 0, starred: 0 };
    emails.forEach(function(e) {
        if (e.starred && e.folder !== 'trash') counts.starred++;
        if (e.folder === 'inbox' && !e.read) counts.inbox++;
        if (e.folder === 'spam' && !e.read) counts.spam++;
    });
    var folders = [
        { id: 'inbox',   icon: '📥', name: '收件箱',   count: counts.inbox },
        { id: 'sent',    icon: '📤', name: '已发送',   count: 0 },
        { id: 'draft',   icon: '📝', name: '草稿箱',   count: counts.draft },
        { id: 'starred', icon: '⭐', name: '已加星标', count: 0 },
        { id: 'spam',    icon: '🚫', name: '垃圾邮件', count: counts.spam },
        { id: 'trash',   icon: '🗑️', name: '已删除',   count: 0 }
    ];
    var h = '';
    folders.forEach(function(f) {
        var active = emailCurrentFolder === f.id ? ' email-folder-active' : '';
        h += '<div class="email-folder-item' + active + '" onclick="selectEmailFolder(\'' + f.id + '\')">';
        h += '<span class="email-folder-icon">' + f.icon + '</span>';
        h += '<span class="email-folder-name">' + f.name + '</span>';
        if (f.count > 0) h += '<span class="email-folder-count">' + f.count + '</span>';
        h += '</div>';
    });
    // 设置入口
    h += '<div class="email-folder-item" onclick="openEmailSettings()" style="margin-top:auto;border-top:1px solid #e8e8e8">';
    h += '<span class="email-folder-icon">⚙️</span>';
    h += '<span class="email-folder-name">设置</span>';
    h += '</div>';
    $('emailFolderList').innerHTML = h;
}

function selectEmailFolder(folder) {
    emailCurrentFolder = folder;
    emailCurrentId = null;
    emailSearchKeyword = '';
    document.getElementById('emailPage').classList.remove('email-detail-open');
    renderEmailFolders();
    renderEmailList();
    renderEmailDetail();
}

// ========== 搜索 ==========
function onEmailSearch(val) {
    emailSearchKeyword = val.trim();
    emailCurrentId = null;
    renderEmailList();
    renderEmailDetail();
}

function clearEmailSearch() {
    emailSearchKeyword = '';
    var searchInput = document.getElementById('emailSearchInput');
    if (searchInput) searchInput.value = '';
    renderEmailList();
}

// ========== 邮件列表渲染 ==========
function renderEmailList() {
    var data = getAccData();

    // 草稿箱单独处理
    if (emailCurrentFolder === 'draft') {
        renderDraftList();
        return;
    }

    var emails = data.emails || [];
    var filtered;
    if (emailCurrentFolder === 'starred') {
        filtered = emails.filter(function(e) { return e.starred && e.folder !== 'trash'; });
    } else {
        filtered = emails.filter(function(e) { return e.folder === emailCurrentFolder; });
    }

    // 搜索过滤
    if (emailSearchKeyword) {
        var kw = emailSearchKeyword.toLowerCase();
        filtered = filtered.filter(function(e) {
            return (e.subject || '').toLowerCase().indexOf(kw) >= 0 ||
                   (e.body || '').toLowerCase().indexOf(kw) >= 0 ||
                   (e.from || '').toLowerCase().indexOf(kw) >= 0;
        });
    }

    filtered.sort(function(a, b) { return b.time - a.time; });

    var searchBar = '<div style="padding:8px 10px;background:white;border-bottom:1px solid #f0f0f0;position:sticky;top:0;z-index:5">' +
        '<div style="display:flex;align-items:center;gap:6px">' +
        '<div style="flex:1;display:flex;align-items:center;gap:6px;background:#f5f5f5;border-radius:8px;padding:6px 10px">' +
        '<span style="color:#999;font-size:14px">🔍</span>' +
        '<input id="emailSearchInput" type="text" placeholder="搜索邮件..." value="' + esc(emailSearchKeyword) + '" ' +
        'onkeydown="if(event.key===\'Enter\'){onEmailSearch(this.value)}" ' +
        'style="flex:1;border:none;background:transparent;font-size:13px;outline:none;color:#333">' +
        (emailSearchKeyword ? '<span onclick="clearEmailSearch()" style="color:#999;cursor:pointer;font-size:16px;line-height:1">×</span>' : '') +
        '</div>' +
        '<button onclick="onEmailSearch(document.getElementById(\'emailSearchInput\').value)" style="padding:6px 12px;border:none;border-radius:8px;background:#4682B4;color:white;font-size:13px;cursor:pointer">搜索</button>' +
        '</div></div>';

    if (!filtered.length) {
        $('emailListWrap').innerHTML = searchBar + '<div class="email-empty">' +
            (emailSearchKeyword ? '🔍 未找到相关邮件' : '📭 暂无邮件') + '</div>';
        return;
    }

    var h = searchBar;
    filtered.forEach(function(e) {
        var sender = getSenderInfo(e.from);
        var active = emailCurrentId === e.id ? ' email-item-active' : '';
        var unread = !e.read ? ' email-item-unread' : '';
        var starred = e.starred ? '★' : '☆';
        var preview = (e.body || '').replace(/<[^>]+>/g, '').slice(0, 50);

        // 搜索高亮
        var subjectDisplay = esc(e.subject || '(无主题)');
        if (emailSearchKeyword) {
            var re = new RegExp('(' + emailSearchKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
            subjectDisplay = esc(e.subject || '(无主题)').replace(re, '<mark style="background:#fff3b0;border-radius:2px">$1</mark>');
        }

        var avatarHtml = sender.avatar && sender.avatar.length > 2
            ? '<img src="' + sender.avatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">'
            : (sender.avatar || sender.name.charAt(0));
        h += '<div class="email-item' + active + unread + '" onclick="selectEmail(\'' + e.id + '\')">';
        h += '<div class="email-item-avatar">' + avatarHtml + '</div>';
        h += '<div class="email-item-content">';
        h += '<div class="email-item-top">';
        h += '<span class="email-item-sender">' + esc(sender.name) + '</span>';
        h += '<span class="email-item-time">' + fmtEmailTime(e.time) + '</span>';
        h += '</div>';
        h += '<div class="email-item-subject">' + subjectDisplay + '</div>';
        h += '<div class="email-item-preview">' + esc(preview) + '</div>';
        h += '</div>';
        h += '<div class="email-item-star" onclick="event.stopPropagation();toggleEmailStar(\'' + e.id + '\')">' + starred + '</div>';
        h += '</div>';
    });
    $('emailListWrap').innerHTML = h;
}

// ========== 草稿箱 ==========
function renderDraftList() {
    var data = getAccData();
    var drafts = data.emailDrafts || [];

    var h = '<div style="padding:8px 10px;background:white;border-bottom:1px solid #f0f0f0">' +
        '<span style="font-size:13px;color:#888">共 ' + drafts.length + ' 封草稿</span></div>';

    if (!drafts.length) {
        $('emailListWrap').innerHTML = h + '<div class="email-empty">📝 暂无草稿</div>';
        return;
    }
    drafts.slice().reverse().forEach(function(d) {
        var active = emailCurrentId === d.id ? ' email-item-active' : '';
        h += '<div class="email-item' + active + '" onclick="selectDraft(\'' + d.id + '\')">';
        h += '<div class="email-item-avatar" style="background:linear-gradient(135deg,#aaa,#888);color:white;font-size:18px;display:flex;align-items:center;justify-content:center">📝</div>';
        h += '<div class="email-item-content">';
        h += '<div class="email-item-top">';
        h += '<span class="email-item-sender">草稿</span>';
        h += '<span class="email-item-time">' + fmtEmailTime(d.time) + '</span>';
        h += '</div>';
        h += '<div class="email-item-subject">' + esc(d.subject || '(无主题)') + '</div>';
        h += '<div class="email-item-preview">' + esc((d.body || '').slice(0, 50)) + '</div>';
        h += '</div>';
        h += '<div class="email-item-star" onclick="event.stopPropagation();deleteDraft(\'' + d.id + '\')" style="font-size:14px;color:#ccc">🗑</div>';
        h += '</div>';
    });
    $('emailListWrap').innerHTML = h;
}

function selectDraft(id) {
    var data = getAccData();
    var draft = (data.emailDrafts || []).find(function(d) { return d.id === id; });
    if (!draft) return;
    // 打开写信框并填入草稿内容
    openComposeEmail(null, draft);
}

function deleteDraft(id) {
    var data = getAccData();
    data.emailDrafts = (data.emailDrafts || []).filter(function(d) { return d.id !== id; });
    save();
    renderEmailFolders();
    renderEmailList();
    toast('草稿已删除');
}

function saveDraft() {
    var to = $('composeEmailTo').value.trim();
    var subject = $('composeEmailSubject').value.trim();
    var body = $('composeEmailBody').value.trim();
    if (!to && !subject && !body) {
        closeModal('composeEmailModal');
        return;
    }
    var data = getAccData();
    if (!data.emailDrafts) data.emailDrafts = [];
    var draftId = $('composeEmailDraftId').value;
    if (draftId) {
        // 更新已有草稿
        var existing = data.emailDrafts.find(function(d) { return d.id === draftId; });
        if (existing) {
            existing.to = to; existing.subject = subject; existing.body = body; existing.time = Date.now();
        }
    } else {
        data.emailDrafts.push({
            id: 'draft_' + genId(),
            to: to, subject: subject, body: body,
            time: Date.now(),
            replyTo: $('composeEmailReplyTo').value || null
        });
    }
    save();
    closeModal('composeEmailModal');
    renderEmailFolders();
    renderEmailList();
    toast('已保存草稿');
}

// ========== 选择邮件 ==========
function selectEmail(id) {
    emailCurrentId = id;
    var data = getAccData();
    var email = data.emails.find(function(e) { return e.id === id; });
    if (email && !email.read) {
        email.read = true;
        save();
        renderEmailFolders();
    }
    document.getElementById('emailPage').classList.add('email-detail-open');
    renderEmailList();
    renderEmailDetail();
}

function backToEmailList() {
    emailCurrentId = null;
    document.getElementById('emailPage').classList.remove('email-detail-open');
    renderEmailFolders();
    renderEmailList();
    renderEmailDetail();
}

// ========== 邮件详情 ==========
function renderEmailDetail() {
    var detail = document.getElementById('emailDetailWrap');
    if (!detail) return;
    if (!emailCurrentId) {
        detail.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:200px;color:#999;font-size:14px">📧 选择一封邮件查看</div>';
        return;
    }
    var data = getAccData();
    var email = data.emails.find(function(e) { return e.id === emailCurrentId; });
    if (!email) {
        detail.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:200px;color:#999;font-size:14px">邮件不存在</div>';
        return;
    }
    var sender = getSenderInfo(email.from);
    var starred = email.starred ? '★' : '☆';
    var html = '';

    html += '<div style="padding:10px 14px;border-bottom:1px solid #e0e0e0;background:white;position:sticky;top:0;z-index:10;display:flex;align-items:center;gap:10px">';
    html += '<button onclick="backToEmailList()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#666;padding:0;line-height:1">‹</button>';
    html += '<span style="font-size:14px;font-weight:500;color:#333;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(email.subject || '(无主题)') + '</span>';
    html += '</div>';

    html += '<div style="padding:16px 20px;background:white;border-bottom:1px solid #e0e0e0">';
    html += '<div style="font-size:18px;font-weight:600;margin-bottom:14px;color:#222">' + esc(email.subject || '(无主题)') + '</div>';
    html += '<div style="display:flex;gap:12px;align-items:center">';
    if (sender.avatar && sender.avatar.length > 2) {
        html += '<div style="width:42px;height:42px;border-radius:50%;overflow:hidden;flex-shrink:0"><img src="' + sender.avatar + '" style="width:100%;height:100%;object-fit:cover"></div>';
    } else {
        html += '<div style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#888,#555);display:flex;align-items:center;justify-content:center;font-size:18px;color:white;flex-shrink:0">' + (sender.avatar || sender.name.charAt(0)) + '</div>';
    }
    html += '<div style="flex:1;min-width:0">';
    html += '<div style="font-size:14px;font-weight:500;color:#333">' + esc(sender.name) + '</div>';
    html += '<div style="font-size:11px;color:#999">' + esc(email.from) + ' → ' + esc(email.to) + '</div>';
    html += '</div>';
    html += '<div style="font-size:11px;color:#bbb;flex-shrink:0">' + fmtEmailTime(email.time) + '</div>';
    html += '</div></div>';

    html += '<div style="padding:20px;background:white;font-size:14px;line-height:1.9;color:#333;white-space:pre-wrap;word-break:break-word">';
    html += esc(email.body || '(无正文)');
    html += '</div>';

    html += '<div style="padding:14px 16px;background:#f8f8f8;border-top:1px solid #e0e0e0;display:flex;gap:8px;flex-wrap:wrap">';
    html += '<button onclick="replyEmail(\'' + email.id + '\')" style="padding:8px 14px;border:1px solid #ddd;border-radius:8px;background:white;font-size:13px;cursor:pointer;color:#444">↩️ 回复</button>';
    html += '<button onclick="forwardEmailToChat(\'' + email.id + '\')" style="padding:8px 14px;border:1px solid #ddd;border-radius:8px;background:white;font-size:13px;cursor:pointer;color:#444">💬 转发到聊天</button>';
    html += '<button onclick="toggleEmailStar(\'' + email.id + '\')" style="padding:8px 14px;border:1px solid #ddd;border-radius:8px;background:white;font-size:13px;cursor:pointer;color:#444">' + starred + ' 星标</button>';
    html += '<button onclick="deleteEmail(\'' + email.id + '\')" style="padding:8px 14px;border:1px solid #ddd;border-radius:8px;background:white;font-size:13px;cursor:pointer;color:#c00">🗑️ 删除</button>';
    html += '</div>';

    detail.innerHTML = html;
}

// ========== 邮箱设置 ==========
function openEmailSettings() {
    var acc = getCurAcc();
    var currentEmail = acc && acc.email ? acc.email : '';
    var h = '<div class="modal-box">';
    h += '<h2>📧 邮箱设置</h2>';
    h += '<div class="field">';
    h += '<label>我的邮箱地址</label>';
    h += '<input type="text" id="myEmailInput" value="' + esc(currentEmail) + '" placeholder="例如：yourname@lhuy.vip">';
    h += '<div style="font-size:11px;color:var(--text-gray);margin-top:4px">其他人给你发邮件时使用此地址</div>';
    h += '</div>';
    h += '<div class="modal-btns">';
    h += '<button class="btn-cancel" onclick="closeModal(\'emailSettingsModal\')">取消</button>';
    h += '<button class="btn-ok" onclick="saveEmailSettings()">保存</button>';
    h += '</div></div>';

    var modal = document.getElementById('emailSettingsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'emailSettingsModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    modal.innerHTML = h;
    modal.classList.add('active');
}

function saveEmailSettings() {
    var val = document.getElementById('myEmailInput').value.trim();
    if (!val) return toast('请输入邮箱地址');
    if (!val.includes('@')) return toast('邮箱格式不正确');
    var acc = getCurAcc();
    if (acc) {
        acc.email = val;
        save();
        toast('邮箱已保存：' + val);
        closeModal('emailSettingsModal');
    }
}

// ========== 写信 / 回复 ==========
function openComposeEmail(replyToId, draft) {
    var data = getAccData();
    $('composeEmailTo').value = '';
    $('composeEmailSubject').value = '';
    $('composeEmailBody').value = '';
    $('composeEmailReplyTo').value = '';
    $('composeEmailDraftId').value = '';

    if (draft) {
        // 从草稿恢复
        $('composeEmailTo').value = draft.to || '';
        $('composeEmailSubject').value = draft.subject || '';
        $('composeEmailBody').value = draft.body || '';
        $('composeEmailReplyTo').value = draft.replyTo || '';
        $('composeEmailDraftId').value = draft.id || '';
    } else if (replyToId) {
        var original = data.emails.find(function(e) { return e.id === replyToId; });
        if (original) {
            $('composeEmailTo').value = original.from;
            $('composeEmailSubject').value = original.subject.startsWith('Re:') ? original.subject : 'Re: ' + (original.subject || '');
            $('composeEmailBody').value = '\n\n---\n原邮件：\n' + (original.body || '');
            $('composeEmailReplyTo').value = replyToId;
        }
    }

    var opts = '<option value="">选择收件人或直接输入邮箱</option>';
    data.chars.forEach(function(c) {
        var email = c.emailAddress || c.email;
        if (email) {
            opts += '<option value="' + email + '">' + (c.displayName || c.realName) + ' (' + email + ')</option>';
        }
    });
    $('composeEmailToSelect').innerHTML = opts;
    openModal('composeEmailModal');
}

function onEmailToSelect() {
    var val = $('composeEmailToSelect').value;
    if (val) $('composeEmailTo').value = val;
}

function sendEmail() {
    var to = $('composeEmailTo').value.trim();
    var subject = $('composeEmailSubject').value.trim();
    var body = $('composeEmailBody').value.trim();
    var replyTo = $('composeEmailReplyTo').value;
    var draftId = $('composeEmailDraftId').value;
    if (!to) { toast('请输入收件人'); return; }
    if (!to.includes('@')) to += '@lhuy.vip';
    var data = getAccData();

    // 发送后删除对应草稿
    if (draftId) {
        data.emailDrafts = (data.emailDrafts || []).filter(function(d) { return d.id !== draftId; });
    }

    var email = {
        id: 'email_' + genId(),
        from: getUserEmail(),
        to: to,
        subject: subject || '(无主题)',
        body: body,
        time: Date.now(),
        read: true,
        starred: false,
        folder: 'sent',
        replyTo: replyTo || null
    };
    data.emails.push(email);
    save();
    closeModal('composeEmailModal');
    renderEmailFolders();
    renderEmailList();
    toast('邮件已发送');

    // 触发角色回复
    var char = findCharByEmail(to);
    if (char) {
        var replyDelay = 3000 + Math.random() * 8000;
        setTimeout(function() { triggerEmailReply(char, email); }, replyDelay);
    }
}

function replyEmail(id) { openComposeEmail(id); }

// ========== 其他操作 ==========
function getSenderInfo(email) {
    var char = findCharByEmail(email);
    if (char) return { name: char.displayName || char.realName, avatar: char.avatar };
    var data = getAccData();
    var ext = data.externalEmails && data.externalEmails[email];
    if (ext) return { name: ext.name, avatar: null };
    var userEmail = getUserEmail();
    if (email === userEmail) {
        var acc = getCurAcc();
        return { name: acc ? acc.nick : '我', avatar: acc ? acc.avatar : null };
    }
    return { name: email.split('@')[0], avatar: null };
}

function fmtEmailTime(ts) {
    var d = new Date(ts);
    var now = new Date();
    var diff = now - d;
    if (diff < 86400000 && d.getDate() === now.getDate()) {
        return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
    } else if (diff < 604800000) {
        var days = ['周日','周一','周二','周三','周四','周五','周六'];
        return days[d.getDay()];
    } else {
        return (d.getMonth() + 1) + '/' + d.getDate();
    }
}

function toggleEmailStar(id) {
    var data = getAccData();
    var email = data.emails.find(function(e) { return e.id === id; });
    if (email) { email.starred = !email.starred; save(); renderEmailList(); renderEmailDetail(); }
}

function deleteEmail(id) {
    var data = getAccData();
    var email = data.emails.find(function(e) { return e.id === id; });
    if (!email) return;
    if (email.folder === 'trash') {
        if (!confirm('彻底删除这封邮件？')) return;
        data.emails = data.emails.filter(function(e) { return e.id !== id; });
    } else {
        email.folder = 'trash';
    }
    save();
    emailCurrentId = null;
    document.getElementById('emailPage').classList.remove('email-detail-open');
    renderEmailFolders(); renderEmailList(); renderEmailDetail();
    toast('已删除');
}

// ========== 转发到聊天 ==========
function forwardEmailToChat(emailId) {
    var data = getAccData();
    var email = data.emails.find(function(e) { return e.id === emailId; });
    if (!email) return;
    var chars = data.chars.filter(function(c) { return !c.isGroup; });
    if (!chars.length) { toast('没有可转发的对象'); return; }

    var h = '<div class="modal-box"><h2>💬 转发到聊天</h2>';
    h += '<div style="max-height:300px;overflow-y:auto">';
    chars.forEach(function(c) {
        var avatarHtml = c.avatar && c.avatar.length > 2
            ? '<img src="' + c.avatar + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%">'
            : (c.avatar || c.realName.charAt(0));
        h += '<div class="email-forward-char" onclick="doForwardEmailToChat(\'' + emailId + '\',\'' + c.id + '\')">';
        h += '<div class="contact-avatar" style="flex-shrink:0">' + avatarHtml + '</div>';
        h += '<span style="font-size:14px">' + esc(c.displayName || c.realName) + '</span>';
        h += '</div>';
    });
    h += '<div class="modal-btns"><button class="btn-cancel" onclick="closeModal(\'forwardEmailModal\')">取消</button></div>';
    h += '</div>';

    var modal = document.getElementById('forwardEmailModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'forwardEmailModal';
        modal.className = 'modal';
        document.body.appendChild(modal);
    }
    modal.innerHTML = h;
    modal.classList.add('active');
}

function doForwardEmailToChat(emailId, charId) {
    var data = getAccData();
    var email = data.emails.find(function(e) { return e.id === emailId; });
    if (!email) return;
    var sender = getSenderInfo(email.from);
    var msg = {
        id: genId(),
        role: 'user',
        type: 'email_forward',
        content: '[邮件转发] ' + (email.subject || '无主题'),
        time: Date.now(),
        emailSubject: email.subject,
        emailFrom: sender.name,
        emailBody: email.body,
        emailTime: email.time
    };
    if (!data.chats[charId]) data.chats[charId] = [];
    data.chats[charId].push(msg);
    save();

    var modal = document.getElementById('forwardEmailModal');
    if (modal) modal.classList.remove('active');
    var emailPage = document.getElementById('emailPage');
    if (emailPage) emailPage.classList.remove('active');
    openPage('chat');
    setTimeout(function() { openChat(charId); }, 150);
    toast('已转发到聊天');
}

// ========== AI回复逻辑 ==========
function triggerEmailReply(char, originalEmail) {
    if (!D.api.key) return;
    var charEmail = char.emailAddress || char.email;
    if (!charEmail) return;
    var sysPrompt = '你是"' + char.realName + '"。\n';
    if (char.persona) sysPrompt += '【角色设定】\n' + char.persona + '\n\n';
    sysPrompt += '你的邮箱是：' + charEmail + '\n';
    sysPrompt += '用户邮箱是：' + getUserEmail() + '\n\n';
    sysPrompt += '用户给你发了一封邮件，根据你的性格决定是否回复。\n';
    sysPrompt += '如果决定回复，用以下格式：\n';
    sysPrompt += '<EMAIL subject="回复主题">回复正文</EMAIL>\n';
    sysPrompt += '如果决定不回复（例如垃圾邮件、不相关），回复<IGNORE>。\n\n';
    sysPrompt += '【收到的邮件】\n主题：' + originalEmail.subject + '\n内容：' + originalEmail.body;

    fetch(D.api.url.replace(/\/+$/, '') + '/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + D.api.key },
        body: JSON.stringify({
            model: D.api.model,
            messages: [
                { role: 'system', content: sysPrompt },
                { role: 'user', content: '请回复这封邮件' }
            ],
            temperature: 1
        })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (d.error || !d.choices || !d.choices[0]) return;
        processEmailResponse(char, d.choices[0].message.content, originalEmail.id);
    })
    .catch(function(e) { console.log('邮件回复失败', e); });
}

function processEmailResponse(char, content, replyToId) {
    var emailMatch = content.match(/<EMAIL\s+subject="([^"]*)">([\s\S]*?)<\/EMAIL>/i);
    if (!emailMatch) return;
    var subject = emailMatch[1];
    var body = emailMatch[2].trim();
    var charEmail = char.emailAddress || char.email;
    var data = getAccData();
    var email = {
        id: 'email_' + genId(),
        from: charEmail,
        to: getUserEmail(),
        subject: subject,
        body: body,
        time: Date.now(),
        read: false,
        starred: false,
        folder: 'inbox',
        replyTo: replyToId
    };
    data.emails.push(email);
    save();
    showNotify([{
        name: char.displayName || char.realName,
        avatar: char.avatar,
        content: '📧 ' + subject,
        time: Date.now(),
        accId: D.currentAccId,
        type: 'email'
    }]);
    updateEmailBadge();
    var emailPage = document.getElementById('emailPage');
    if (emailPage && emailPage.classList.contains('active')) {
        renderEmailFolders();
        renderEmailList();
    }
}

// ========== 角色主动发邮件（后台定时触发）==========
// 在后台活动系统中调用此函数
function maybeCharSendEmail(char) {
    if (!D.api.key) return;
    var charEmail = char.emailAddress || char.email;
    if (!charEmail) return;
    var userEmail = getUserEmail();

    var sysPrompt = '你是"' + char.realName + '"。\n';
    if (char.persona) sysPrompt += '【角色设定】\n' + char.persona + '\n\n';
    sysPrompt += '你的邮箱：' + charEmail + '\n用户邮箱：' + userEmail + '\n\n';
    sysPrompt += '你想主动给用户发一封邮件。可以是关心、分享心情、通知某件事、说说最近的生活等，符合你的角色性格。\n';
    sysPrompt += '用以下格式输出邮件：\n<EMAIL subject="邮件主题">邮件正文</EMAIL>\n';
    sysPrompt += '如果现在不想发，输出<SKIP>。';

    fetch(D.api.url.replace(/\/+$/, '') + '/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + D.api.key },
        body: JSON.stringify({
            model: D.api.model,
            messages: [
                { role: 'system', content: sysPrompt },
                { role: 'user', content: '写一封邮件给用户' }
            ],
            temperature: 1.1
        })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (d.error || !d.choices || !d.choices[0]) return;
        var content = d.choices[0].message.content;
        var emailMatch = content.match(/<EMAIL\s+subject="([^"]*)">([\s\S]*?)<\/EMAIL>/i);
        if (!emailMatch) return;
        var data = getAccData();
        var email = {
            id: 'email_' + genId(),
            from: charEmail,
            to: userEmail,
            subject: emailMatch[1],
            body: emailMatch[2].trim(),
            time: Date.now(),
            read: false,
            starred: false,
            folder: 'inbox',
            replyTo: null,
            isProactive: true
        };
        data.emails.push(email);
        save();
        showNotify([{
            name: char.displayName || char.realName,
            avatar: char.avatar,
            content: '📧 ' + emailMatch[1],
            time: Date.now(),
            accId: D.currentAccId,
            type: 'email'
        }]);
        updateEmailBadge();
        var emailPage = document.getElementById('emailPage');
        if (emailPage && emailPage.classList.contains('active')) {
            renderEmailFolders();
            renderEmailList();
        }
    })
    .catch(function(e) { console.log('主动发邮件失败', e); });
}

// ========== 聊天结束后触发（在聊天系统中调用）==========
// 调用方式：聊天AI回复完成后，调用 tryTriggerEmailAfterChat(curChar)
function tryTriggerEmailAfterChat(char) {
    if (!char) return;
    var charEmail = char.emailAddress || char.email;
    if (!charEmail) return;
    if (!D.api.key) return;
    // 30% 概率触发
    if (Math.random() > 0.30) return;

    var data = getAccData();
    var recentMsgs = (data.chats[char.id] || []).slice(-10);
    var chatSummary = recentMsgs.filter(function(m) {
        return m.type !== 'sys' && !m.recalled && m.content;
    }).map(function(m) {
        return (m.role === 'user' ? '用户' : char.realName) + '：' + (m.content || '').slice(0, 80);
    }).join('\n');

    if (!chatSummary) return;

    var userEmail = getUserEmail();
    var sysPrompt = '你是"' + char.realName + '"。\n';
    if (char.persona) sysPrompt += '【角色设定】\n' + char.persona + '\n\n';
    sysPrompt += '你的邮箱：' + charEmail + '\n用户邮箱：' + userEmail + '\n\n';
    sysPrompt += '你们刚刚聊完天，最近的对话内容如下：\n' + chatSummary + '\n\n';
    sysPrompt += '根据这次聊天，你觉得有什么想通过邮件跟进或补充的吗？（比如聊到的约定、你想多说的话、或者分享某件事）\n';
    sysPrompt += '如果有，用以下格式写邮件：\n<EMAIL subject="主题">正文</EMAIL>\n';
    sysPrompt += '如果没有必要发邮件，输出<SKIP>。';

    // 延迟1~3分钟后发送，更真实
    var delay = 60000 + Math.random() * 120000;
    setTimeout(function() {
        fetch(D.api.url.replace(/\/+$/, '') + '/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + D.api.key },
            body: JSON.stringify({
                model: D.api.model,
                messages: [
                    { role: 'system', content: sysPrompt },
                    { role: 'user', content: '写邮件' }
                ],
                temperature: 1
            })
        })
        .then(function(r) { return r.json(); })
        .then(function(d) {
            if (d.error || !d.choices || !d.choices[0]) return;
            var content = d.choices[0].message.content;
            var emailMatch = content.match(/<EMAIL\s+subject="([^"]*)">([\s\S]*?)<\/EMAIL>/i);
            if (!emailMatch) return;
            var freshData = getAccData();
            var email = {
                id: 'email_' + genId(),
                from: charEmail,
                to: userEmail,
                subject: emailMatch[1],
                body: emailMatch[2].trim(),
                time: Date.now(),
                read: false,
                starred: false,
                folder: 'inbox',
                replyTo: null,
                isProactive: true
            };
            freshData.emails.push(email);
            save();
            showNotify([{
                name: char.displayName || char.realName,
                avatar: char.avatar,
                content: '📧 ' + emailMatch[1],
                time: Date.now(),
                accId: D.currentAccId,
                type: 'email'
            }]);
            updateEmailBadge();
            var emailPage = document.getElementById('emailPage');
            if (emailPage && emailPage.classList.contains('active')) {
                renderEmailFolders();
                renderEmailList();
            }
        })
        .catch(function(e) { console.log('聊后邮件失败', e); });
    }, delay);
}

// ========== 聊天中检测用户询问AI邮箱 ==========
function detectEmailInquiry(aiReplyContent, char) {
    if (!char) return;
    var charEmail = char.emailAddress || char.email;
    if (!charEmail) return;
    // 检测AI回复中是否包含邮箱地址
    var emailRegex = /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/g;
    var found = aiReplyContent.match(emailRegex);
    if (!found) return;
    found.forEach(function(addr) {
        if (addr === charEmail) {
            // AI说出了自己的邮箱，提示用户已记录
            setTimeout(function() {
                toast('已记录 ' + (char.displayName || char.realName) + ' 的邮箱：' + addr);
            }, 800);
        }
    });
}

// ========== AI邮箱注入到系统提示词 ==========
// 在构建系统提示词时调用，把角色邮箱信息注入
function getEmailPromptAddition(char) {
    var charEmail = char.emailAddress || char.email;
    if (!charEmail) return '';
    var userEmail = getUserEmail();
    return '\n\n【邮箱信息】\n你的邮箱地址是：' + charEmail + '\n用户的邮箱地址是：' + userEmail + '\n如果用户询问你的邮箱，直接告诉TA你的邮箱地址。';
}

// ========== badge ==========
function updateEmailBadge() {
    var data = getAccData();
    if (!data.emails) return;
    var unread = data.emails.filter(function(e) {
        return e.folder === 'inbox' && !e.read;
    }).length;
    var badge = $('emailBadge');
    if (badge) {
        if (unread > 0) {
            badge.textContent = unread > 99 ? '99+' : unread;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }
}

// ========== 随机生成邮件 ==========
function generateRandomEmails() {
    if (!D.api.key) return toast('请先配置API');
    var count = 4 + Math.floor(Math.random() * 6);
    toast('正在生成 ' + count + ' 封邮件...');
    var data = getAccData();
    var charsWithEmail = data.chars.filter(function(c) { return c.emailAddress || c.email; });
    var sysPrompt = '你是一个邮件生成助手。请生成' + count + '封邮件，包括：\n';
    sysPrompt += '- 角色邮件（如果有角色）\n- 正常邮件（订单、快递、通知等）\n- 垃圾邮件（广告、诈骗等）\n\n';
    if (charsWithEmail.length) {
        sysPrompt += '【可用角色】\n';
        charsWithEmail.forEach(function(c) {
            var email = c.emailAddress || c.email;
            sysPrompt += '- ' + c.realName + ' (' + email + ')';
            if (c.persona) sysPrompt += '：' + c.persona.slice(0, 50);
            sysPrompt += '\n';
        });
        sysPrompt += '\n';
    }
    sysPrompt += '用以下格式输出每封邮件：\n<EMAIL>\n<FROM name="发件人名称" email="邮箱地址"/>\n<SUBJECT>主题</SUBJECT>\n<BODY>正文</BODY>\n<TYPE>inbox|spam</TYPE>\n</EMAIL>\n\n';
    sysPrompt += '注意：角色邮件用角色的邮箱地址，其他邮件自己编造邮箱地址，垃圾邮件TYPE用spam，其他用inbox';

    fetch(D.api.url.replace(/\/+$/, '') + '/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + D.api.key },
        body: JSON.stringify({
            model: D.api.model,
            messages: [
                { role: 'system', content: sysPrompt },
                { role: 'user', content: '生成' + count + '封邮件' }
            ],
            temperature: 1.2
        })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (d.error) throw new Error(d.error.message || d.error);
        if (!d.choices || !d.choices[0]) throw new Error('无响应');
        var content = d.choices[0].message.content;
        var emails = parseGeneratedEmails(content, data);
        if (emails.length === 0) throw new Error('未能解析邮件');
        emails.forEach(function(e) { data.emails.push(e); });
        save();
        renderEmailFolders();
        renderEmailList();
        updateEmailBadge();
        toast('已生成 ' + emails.length + ' 封邮件');
    })
    .catch(function(e) { toast('生成失败：' + e.message); });
}

function parseGeneratedEmails(content, data) {
    var emails = [];
    var emailRegex = /<EMAIL>([\s\S]*?)<\/EMAIL>/gi;
    var match;
    while ((match = emailRegex.exec(content)) !== null) {
        var emailContent = match[1];
        var fromMatch = emailContent.match(/<FROM\s+name="([^"]*)"\s+email="([^"]*)"\s*\/>/i);
        var subjectMatch = emailContent.match(/<SUBJECT>([\s\S]*?)<\/SUBJECT>/i);
        var bodyMatch = emailContent.match(/<BODY>([\s\S]*?)<\/BODY>/i);
        var typeMatch = emailContent.match(/<TYPE>([\s\S]*?)<\/TYPE>/i);
        if (fromMatch && subjectMatch && bodyMatch) {
            var fromEmail = fromMatch[2].trim();
            var folder = typeMatch && typeMatch[1].trim() === 'spam' ? 'spam' : 'inbox';
            if (!findCharByEmail(fromEmail) && !data.externalEmails[fromEmail]) {
                data.externalEmails[fromEmail] = { name: fromMatch[1].trim(), type: folder === 'spam' ? 'spam' : 'normal' };
            }
            emails.push({
                id: 'email_' + genId(),
                from: fromEmail,
                to: getUserEmail(),
                subject: subjectMatch[1].trim(),
                body: bodyMatch[1].trim(),
                time: Date.now() - Math.random() * 604800000,
                read: Math.random() > 0.6,
                starred: false,
                folder: folder,
                replyTo: null
            });
        }
    }
    return emails;
}

// ========== 邮件转发气泡渲染 ==========
function renderEmailForwardBubble(msg) {
    var h = '<div style="background:white;border:1px solid #e8e8e8;border-radius:12px;overflow:hidden;max-width:300px;box-shadow:0 2px 10px rgba(0,0,0,0.08)">';
    h += '<div style="background:#f5f5f5;border-bottom:1px solid #eee;padding:8px 12px;display:flex;align-items:center;gap:6px">';
    h += '<span style="font-size:14px">📧</span>';
    h += '<span style="font-size:12px;color:#888;font-weight:500">邮件</span>';
    h += '</div>';
    h += '<div style="padding:12px">';
    h += '<div style="font-size:14px;font-weight:600;color:#222;margin-bottom:8px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">';
    h += esc(msg.emailSubject || '(无主题)');
    h += '</div>';
    h += '<div style="font-size:12px;color:#666;margin-bottom:3px">';
    h += '<span style="color:#999">发件人：</span>' + esc(msg.emailFrom || '未知');
    h += '</div>';
    h += '<div style="font-size:12px;color:#999;margin-top:8px;padding-top:8px;border-top:1px solid #f0f0f0;line-height:1.6;overflow:hidden;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical">';
    h += esc((msg.emailBody || '(无内容)').slice(0, 120));
    h += '</div>';
    h += '</div></div>';
    return h;
}