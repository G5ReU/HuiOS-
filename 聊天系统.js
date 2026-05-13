// ===== 风控接入（最小版）=====
(function(){
    var s = document.createElement('style');
    s.textContent = '.msg-card-type{background:transparent !important;padding:0 !important;}.msg-card-type .msg-bubble-wrap{background:transparent !important;padding:0 !important;}';
    document.head.appendChild(s);
})();
const RISK_API = "https://huios-push.onrender.com";

function getRiskUserId() {
  if (typeof getUnifiedUserId === "function") return getUnifiedUserId();

  if (typeof D !== "undefined" && D.currentAccId) return String(D.currentAccId);
  var k = "huios_uid";
  var id = localStorage.getItem(k);
  if (!id) {
    id = "u_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    localStorage.setItem(k, id);
  }
  return id;
}

async function riskStatusCheck() {
  try {
    var uid = getRiskUserId();
    var apiUrl = (window.D && D.api && D.api.url) ? D.api.url : "";
    var res = await fetch(
      RISK_API + "/client/status?userId=" + encodeURIComponent(uid) +
      "&apiUrl=" + encodeURIComponent(apiUrl)
    );
    var d = await res.json();
    window.__RISK_BANNED__ = !!(d && d.banned);
window.__RISK_BAN_MSG__ = (d && (d.message || d.reason)) || "账号已被封禁";
    return !window.__RISK_BANNED__;
  } catch (e) {
    return true;
  }
}

function riskLog(role, text) {
  try {
    var uid = getRiskUserId();
    var t = String(text || "").trim();
    if (!t) return;
    fetch(RISK_API + "/client/ai-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: uid,
        role: role === "assistant" ? "assistant" : "user",
        text: t.slice(0, 500)
      })
    }).catch(function(){});
  } catch (e) {}
}

// 页面启动先登记一次用户 + 拿封禁状态
setTimeout(function() { riskStatusCheck(); }, 0);

function switchNav(idx) {
    document.querySelectorAll('.nav-item').forEach(function(el, i) { el.classList.toggle('active', i === idx); });
    document.querySelectorAll('.nav-pane').forEach(function(el, i) { el.classList.toggle('active', i === idx); });
    var importBtn = $('importBtn');
    if (importBtn) importBtn.style.display = idx === 0 ? 'flex' : 'none';
    if (idx === 1) { renderMoments(); clearMomentNotifs(); }
    if (idx === 2) renderMyPage();
}

function renderMyPage() {
    var acc = getCurAcc(); if (!acc) return;
    var h = '<div class="my-profile">';
    h += '<div class="my-avatar">';
    h += acc.avatar && acc.avatar.length > 2 ? '<img src="'+acc.avatar+'">' : (acc.avatar || acc.persona.charAt(0));
    h += '</div><div class="my-info">';
    h += '<div class="my-nickname">'+esc(acc.nick)+'</div>';
    h += '<div class="my-persona">人设：'+esc(acc.persona)+'</div>';
    h += '</div><button class="my-edit-btn" onclick="openEditAcc()">编辑资料</button></div>';
    
    h += '<div class="my-menu">';
    h += '<div class="my-menu-item" onclick="openMyMoments()"><div class="my-menu-icon" style="background:var(--accent-pink)">📷</div><div class="my-menu-text">我的朋友圈</div><div class="my-menu-arrow">›</div></div>';
    h += '<div class="my-menu-item" onclick="openWallet()"><div class="my-menu-icon" style="background:var(--accent-yellow)">💰</div><div class="my-menu-text">我的钱包</div><span style="font-size:13px;color:#4CAF50;font-weight:600" id="myWalletPreview">¥0.00</span><div class="my-menu-arrow">›</div></div>';
    h += '<div class="my-menu-item" onclick="openMyStickersPage()"><div class="my-menu-icon" style="background:var(--accent-mint)">😀</div><div class="my-menu-text">我的表情包</div><div class="my-menu-arrow">›</div></div>';
    h += '<div class="my-menu-item" onclick="openSwitchAcc()"><div class="my-menu-icon" style="background:var(--accent-lavender)">🔄</div><div class="my-menu-text">切换账号</div><div class="my-menu-arrow">›</div></div>';
    h += '</div>';
    $('myPane').innerHTML = h;
    if (typeof refreshWalletPreview === 'function') refreshWalletPreview();
}

function renderMoments() {
    var data = getAccData(); if (!data) return;
var h = '<div style="padding:10px 10px 0;display:flex;justify-content:flex-end;gap:8px">';
h += '<button class="empty-btn" style="padding:8px 14px;font-size:13px;background:#f0f0f0;color:var(--text-dark)" onclick="openMomentCleanMenu()">🧹 清理</button>';
h += '<button class="empty-btn" style="padding:8px 18px;font-size:13px" onclick="openPublish()">+ 发朋友圈</button>';
h += '</div>';
    
    if (!data.moments.length) {
        h += '<div class="empty-state" style="padding-top:40px"><div class="empty-icon">📷</div><div class="empty-title">还没有动态</div></div>';
    } else {
        h += '<div class="moment-list">';
        for (var i = data.moments.length - 1; i >= 0; i--) {
            h += renderMomentItem(data.moments[i]);
        }
        h += '</div>';
    }
    $('momentsPane').innerHTML = h;
}

function renderMomentItem(m) {
    var data = getAccData(); var acc = getCurAcc();
    var author = m.authorType === 'user' ? acc : data.chars.find(function(c) { return c.id === m.authorId; });
    if (!author) return '';

    var swipeCls = swipedMomentId === m.id ? ' swiped' : '';
    var h = '<div class="moment-item'+swipeCls+'" data-mid="'+m.id+'" ontouchstart="momTouchStart(event)" ontouchmove="momTouchMove(event,\''+m.id+'\')" ontouchend="momTouchEnd()">';

    h += '<div class="moment-actions-slide">';
    h += '<div class="moment-action-btn forward" onclick="event.stopPropagation();forwardMoment(\''+m.id+'\')"><span>↗️</span>转发</div>';
    h += '<div class="moment-action-btn delete" onclick="event.stopPropagation();deleteMoment(\''+m.id+'\')"><span>🗑️</span>删除</div>';
    h += '</div>';

    h += '<div class="moment-item-content" onclick="swipedMomentId=null">';

    h += '<div class="moment-header">';
    h += '<div class="moment-avatar">';
    if (m.authorType === 'user') h += acc.avatar && acc.avatar.length > 2 ? '<img src="'+acc.avatar+'">' : (acc.avatar || acc.persona.charAt(0));
    else h += author.avatar && author.avatar.length > 2 ? '<img src="'+author.avatar+'">' : (author.avatar || author.realName.charAt(0));
    h += '</div>';
    h += '<div class="moment-info">';
    h += '<div class="moment-name">'+esc(m.authorType === 'user' ? acc.nick : author.displayName)+'</div>';
    h += '<div class="moment-time">'+fmtTime(m.time)+'</div>';
    h += '</div>';
    h += '</div>';

    if (m.content) h += '<div class="moment-content">'+esc(m.content)+'</div>';

    if (m.images && m.images.length) {
        h += '<div class="moment-images c'+m.images.length+'">';
        for (var i = 0; i < m.images.length; i++) {
            if (m.images[i].url) h += '<img class="moment-img" src="'+m.images[i].url+'" onclick="viewMomentImg(\''+m.images[i].url+'\',\''+esc(m.images[i].desc||'图片')+'\')" title="'+esc(m.images[i].desc||'图片')+'">';
            else h += '<div class="moment-img" onclick="toast(\''+esc(m.images[i].desc||'无描述')+'\')" style="background:#e0e0e0;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:4px;cursor:pointer"><span style="font-size:20px">🖼️</span><span style="font-size:10px;color:#999;text-align:center;padding:0 4px">[图片加载中]</span></div>';
        }
        h += '</div>';
    }

    if (m.location) h += '<div class="moment-location">📍 '+esc(m.location)+'</div>';

    var liked = (m.likes || []).indexOf('user') >= 0;
    h += '<div class="moment-actions">';
    h += '<div class="moment-action'+(liked?' liked':'')+'" onclick="toggleLike(\''+m.id+'\')">❤️</div>';
    h += '<div class="moment-action" onclick="openComment(\''+m.id+'\')">💬</div>';
    h += '</div>';

    if (m.likes && m.likes.length) {
        var likeNames = m.likes.map(function(lid) {
            if (lid === 'user') return acc.nick;
            var c = data.chars.find(function(x) { return x.id === lid; });
            return c ? c.displayName : '未知';
        });
        h += '<div style="font-size:12px;color:var(--text-gray);padding:6px 0">❤️ '+likeNames.join('、')+'</div>';
    }

    if (m.comments && m.comments.length) {
        h += '<div class="moment-comments">';
        for (var j = 0; j < m.comments.length; j++) {
            var c = m.comments[j];
            var cAuthor = c.authorId === 'user' ? acc.nick : ((data.chars.find(function(x){return x.id===c.authorId;})||{}).displayName||'未知');
            var commentText = '';
            if (c.replyToAuthor) {
                var replyName = c.replyToAuthor === 'user' ? acc.nick : ((data.chars.find(function(x){return x.id===c.replyToAuthor;})||{}).displayName||'未知');
                commentText = '<span class="moment-comment-author">'+esc(cAuthor)+'</span> 回复 <span class="moment-comment-author">'+esc(replyName)+'</span>: '+esc(c.content);
            } else {
                commentText = '<span class="moment-comment-author">'+esc(cAuthor)+'</span>: '+esc(c.content);
            }
            h += '<div class="moment-comment" onclick="openComment(\''+m.id+'\',\''+c.id+'\',\''+c.authorId+'\')">'+commentText+'</div>';
        }
        h += '</div>';
    }

    h += '</div>';
    h += '</div>';
    return h;
}

function viewMomentImg(url, desc) { 
    $('viewerImg').src = url; 
    $('viewerImg').title = desc || '图片';
    $('imageViewer').classList.add('active'); 
}
function closeImageViewer() { $('imageViewer').classList.remove('active'); }

function toggleLike(id) {
    var data = getAccData();
    var m = data.moments.find(function(x) { return x.id === id; });
    if (!m) return;
    if (!m.likes) m.likes = [];
    var idx = m.likes.indexOf('user');
    if (idx >= 0) m.likes.splice(idx, 1); else m.likes.push('user');
    save(); renderMoments();
}

function openComment(id, replyId, replyAuthor) {
    commentMomentId = id;
    replyToCommentId = replyId || null;
    replyToAuthorId = replyAuthor || null;
    $('commentInput').value = '';
    
    var title = '💬 评论';
    if (replyToAuthorId) {
        var data = getAccData();
        var acc = getCurAcc();
        var authorName = replyToAuthorId === 'user' ? acc.nick : (data.chars.find(function(c) { return c.id === replyToAuthorId; })?.displayName || '未知');
        title = '💬 回复 ' + authorName;
    }
    $('commentModal').querySelector('h2').textContent = title;
    
    openModal('commentModal');
}

function submitComment() {
    var content = $('commentInput').value.trim();
    if (!content) return toast('请输入评论');
    var data = getAccData();
    var m = data.moments.find(function(x) { return x.id === commentMomentId; });
    if (!m) return;
    if (!m.comments) m.comments = [];
    
    var comment = {
        id: genId('cmt'),
        authorId: 'user',
        content: content,
        time: Date.now(),
        replyTo: replyToCommentId || null,
        replyToAuthor: replyToAuthorId || null
    };
    m.comments.push(comment);
    
    replyToCommentId = null;
    replyToAuthorId = null;
    
    save(); closeModal('commentModal'); renderMoments(); toast('已评论');
}

function openPublish() {
    pubImages = []; pubLoc = ''; pubVisGroups = [];
    $('publishText').value = '';
    $('pubLocVal').textContent = '未填写 ›';
    $('pubVisVal').textContent = '公开 ›';
    renderPubImages(); checkPublish();
    $('publishPage').classList.add('active');
}

function closePublish() { $('publishPage').classList.remove('active'); }

function renderPubImages() {
    var h = '';
    for (var i = 0; i < pubImages.length; i++) {
        h += '<div class="publish-img-item">';
        if (pubImages[i].url) h += '<img src="'+pubImages[i].url+'">';
        else h += '<div class="placeholder">'+esc(pubImages[i].desc||'文字图')+'</div>';
        h += '<button class="publish-img-remove" onclick="removePubImg('+i+')">×</button></div>';
    }
    if (pubImages.length < 9) h += '<div class="publish-add-img" onclick="openImgChoice()">+</div>';
    $('publishImages').innerHTML = h;
}

function removePubImg(i) { pubImages.splice(i, 1); renderPubImages(); checkPublish(); }

function checkPublish() {
    var ready = $('publishText').value.trim() || pubImages.length;
    $('publishBtn').className = 'publish-submit ' + (ready ? 'enabled' : 'disabled');
}

function confirmLoc() { pubLoc = $('locInput').value.trim(); $('pubLocVal').textContent = pubLoc || '未填写 ›'; closeModal('locModal'); }

function openVisModal() {
    var data = getAccData();
    var h = '<div style="padding:12px;border-bottom:1px solid #f0f0f0"><label style="display:flex;align-items:center;gap:10px;cursor:pointer"><input type="checkbox" id="vis_pub" '+(pubVisGroups.length?'':'checked')+' onchange="toggleVisPub()" style="width:18px;height:18px"><span>🌐 公开</span></label></div>';
    for (var i = 0; i < data.groups.length; i++) {
        var g = data.groups[i];
        var chk = pubVisGroups.indexOf(g.id) >= 0 ? ' checked' : '';
        h += '<div style="padding:12px;border-bottom:1px solid #f0f0f0"><label style="display:flex;align-items:center;gap:10px;cursor:pointer"><input type="checkbox" class="vis-grp" data-id="'+g.id+'"'+chk+' style="width:18px;height:18px"><span>📁 '+esc(g.name)+'</span></label></div>';
    }
    $('visGroupList').innerHTML = h;
    openModal('visModal');
}

function toggleVisPub() {
    var pub = $('vis_pub').checked;
    document.querySelectorAll('.vis-grp').forEach(function(el) { el.checked = false; el.disabled = pub; });
}

function confirmVis() {
    pubVisGroups = [];
    if (!$('vis_pub').checked) {
        document.querySelectorAll('.vis-grp:checked').forEach(function(el) { pubVisGroups.push(el.dataset.id); });
    }
    $('pubVisVal').textContent = pubVisGroups.length ? pubVisGroups.length + '个分组 ›' : '公开 ›';
    closeModal('visModal');
}

function submitMoment() {
    var text = $('publishText').value.trim();
    if (!text && !pubImages.length) return toast('请输入内容或图片');
    var data = getAccData();
    data.moments.push({
        id: genId('mom'), authorId: 'user', authorType: 'user',
        content: text, images: pubImages.slice(), location: pubLoc,
        visibleGroups: pubVisGroups.slice(), likes: [], comments: [], time: Date.now()
    });
    save(); closePublish(); renderMoments(); toast('发布成功');
}

function openMyMoments() {
    var data = getAccData();
    var myMoms = data.moments.filter(function(m) { return m.authorType === 'user'; });
    var h = '';
    if (!myMoms.length) {
        h = '<div class="empty-state"><div class="empty-icon">📷</div><div class="empty-title">还没有发过朋友圈</div></div>';
    } else {
        h = '<div class="moment-list">';
        for (var i = myMoms.length - 1; i >= 0; i--) h += renderMomentItem(myMoms[i]);
        h += '</div>';
    }
    $('myMomentList').innerHTML = h;
    $('myMomentsPage').classList.add('active');
}

function closeMyMoments() { $('myMomentsPage').classList.remove('active'); }

// ========== 多选消息删除 ==========
var isMsgBatchMode = false;
var selectedMsgIndices = [];

function enterMsgBatchMode() {
    hideMsgMenu();
    isMsgBatchMode = true;
    selectedMsgIndices = [selectedMsgIdx];
    renderMsgs(false);
    showMsgBatchBar();
}

function toggleMsgSelect(idx) {
    if (!isMsgBatchMode) return;
    var pos = selectedMsgIndices.indexOf(idx);
    if (pos >= 0) selectedMsgIndices.splice(pos, 1);
    else selectedMsgIndices.push(idx);
    renderMsgs(false);
    updateMsgBatchBar();
}

function showMsgBatchBar() {
    var bar = $('msgBatchBar');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'msgBatchBar';
        bar.style.cssText = 'position:absolute;bottom:0;left:0;right:0;background:rgba(255,255,255,0.95);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);padding:12px 20px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 -2px 10px rgba(0,0,0,0.05);z-index:999;border-top:1px solid #eee;padding-bottom:calc(12px + env(safe-area-inset-bottom));';
        $('chatroom').appendChild(bar);
    }
    bar.style.display = 'flex';
    updateMsgBatchBar();
}

function updateMsgBatchBar() {
    var bar = $('msgBatchBar');
    if (!bar) return;
    bar.innerHTML = '<button onclick="exitMsgBatchMode()" style="padding:8px 20px;border:none;background:#f0f0f0;border-radius:20px;color:#333;font-size:14px;cursor:pointer">取消</button>' +
                    '<div style="font-size:13px;color:#666">已选 '+selectedMsgIndices.length+' 条</div>' +
                    '<button onclick="confirmMsgBatchDelete()" style="padding:8px 20px;border:none;background:#FFE0E0;border-radius:20px;color:#FF6B6B;font-size:14px;cursor:pointer;font-weight:bold">删除</button>';
}

function exitMsgBatchMode() {
    isMsgBatchMode = false;
    selectedMsgIndices = [];
    var bar = $('msgBatchBar');
    if (bar) bar.style.display = 'none';
    renderMsgs(false);
}

function confirmMsgBatchDelete() {
    if (selectedMsgIndices.length === 0) return toast('请选择要删除的消息');
    if (!confirm('确定删除选中的 ' + selectedMsgIndices.length + ' 条消息吗？')) return;

    var data = getAccData();
    var charId = curChar ? curChar.id : respondingCharId;
    var msgs = data.chats[charId];

    selectedMsgIndices.sort(function(a, b) { return b - a; });

    selectedMsgIndices.forEach(function(idx) {
        if (idx >= 0 && idx < msgs.length) {
            msgs.splice(idx, 1);
        }
    });

    save();
    exitMsgBatchMode();
    toast('已删除');
}


function openChat(id) {
    var data = getAccData();
    curChar = data.chars.find(function(c) { return c.id === id; });
    if (!curChar) return;
    backfillChatMsgMeta(id);
    data = getAccData();

    lastInteract[id] = Date.now();
    
    $('crName').textContent = curChar.displayName;
    $('crStatus').textContent = '在线';
    $('crStatus').classList.remove('typing');
    
    var av = $('crAvatar');
    av.innerHTML = curChar.avatar && curChar.avatar.length > 2 ? '<img src="'+curChar.avatar+'">' : (curChar.avatar || curChar.realName.charAt(0));
    
    var wp = curChar.chatWp || D.theme.globalWp || '';
    $('messages').style.backgroundImage = wp ? 'url('+wp+')' : '';
    
    $('messages').innerHTML = '';
    $('chatroom').classList.add('active');
    $('chatroom').classList.add('active');
    
    if (timer) { clearTimeout(timer); timer = null; }
    if (delayTimer) { clearInterval(delayTimer); delayTimer = null; }
    responding = false;
    cancelQuote();
    closeFunc();
    updateWaitBtn();
    
    // 根据头像模式显示/隐藏拍一拍按钮
    var avatarMode2 = D.theme.avatarMode || 'none';
    var patItem = $('patFuncItem');
    if (patItem) {
        var showPat = avatarMode2 === 'none' || avatarMode2 === 'user';
        patItem.style.display = showPat ? 'block' : 'none';
    }
    setTimeout(function() { renderMsgs(true); }, 50);
}

function closeChat() {
    if (typeof exitMsgBatchMode === 'function' && isMsgBatchMode) exitMsgBatchMode();
    $('chatroom').classList.remove('active');
    if (curChar) lastInteract[curChar.id] = Date.now();
    curChar = null;
    if (timer) { clearTimeout(timer); timer = null; }
    if (delayTimer) { clearInterval(delayTimer); delayTimer = null; }
    cancelQuote();
    renderContacts();
}
function updateWaitBtn() {
    var btn = $('waitBtn');
    if (D.settings.autoReply) btn.classList.remove('show');
    else { btn.classList.add('show'); btn.disabled = responding; }
}

function renderMsgs(scroll) {
    var data = getAccData();
    var charId = curChar ? curChar.id : respondingCharId;
    if (!charId) return;
    var msgs = data.chats[charId] || [];
    var el = $('messages');
    
    if (!msgs.length) {
        var charData = data.chars.find(function(c) { return c.id === charId; });
        el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-light)">开始和 '+esc(charData ? charData.displayName : '角色')+' 聊天吧！</div>';
        return;
    }
    
    var h = '';
    var lastNonSysMsg = null;
    for (var i = 0; i < msgs.length; i++) {
        var m = msgs[i];
        if (m.type !== 'sys' && !m.recalled) {
            if (needTimeLabel(lastNonSysMsg, m)) {
                h += renderTimeLabel(m.time);
            }
            lastNonSysMsg = m;
        }
        h += renderMsg(m, i);
    }
    el.innerHTML = h;
    bindMsgTouchEvents();
    
    if (scroll !== false) setTimeout(function() { el.scrollTop = el.scrollHeight; }, 50);
}

function renderMsg(m, idx) {
    var h = _renderMsgRaw(m, idx);
    if (!h) return '';

    // 如果处于批量选择模式，给非系统消息包裹一个选择复选框
    if (typeof isMsgBatchMode !== 'undefined' && isMsgBatchMode && m.type !== 'sys') {
        var isSel = selectedMsgIndices.indexOf(idx) >= 0;
        var chkStyle = 'width:20px;height:20px;border-radius:50%;border:1.5px solid ' + (isSel ? '#4CAF50' : '#ccc') + ';background:' + (isSel ? '#4CAF50' : 'transparent') + ';margin:auto 8px auto 4px;flex-shrink:0;display:flex;align-items:center;justify-content:center;color:white;font-size:12px;transition:all 0.2s;';
        var wrapperHtml = '<div class="msg-batch-row" style="display:flex;align-items:center;width:100%;padding:4px 0;background:' + (isSel ? 'rgba(76,175,80,0.08)' : 'transparent') + ';cursor:pointer" onclick="toggleMsgSelect(' + idx + ')">';
        wrapperHtml += '<div style="' + chkStyle + '">' + (isSel ? '✓' : '') + '</div>';
        wrapperHtml += '<div style="flex:1;pointer-events:none;">' + h + '</div>';
        wrapperHtml += '</div>';
        return wrapperHtml;
    }
    return h;
}

function _renderMsgRaw(m, idx) {
    if (m.type === 'sys') {
        if (D.theme.showFuncTips === false) {
            var tipKeywords = ['发了一条朋友圈', '赞了你的朋友圈', '评论了你的朋友圈', '回复了你的评论', '删除了一条朋友圈'];
            for (var i = 0; i < tipKeywords.length; i++) {
                if (m.content && m.content.indexOf(tipKeywords[i]) >= 0) return '';
            }
        }
        return '<div class="sys-msg">'+esc(m.content)+'</div>';
    }
    
    if (m.recalled) return '<div class="msg center"><div class="msg-recalled" onclick="viewRecalled('+idx+')">消息已撤回，点击查看</div></div>';
    
    var avatarMode = D.theme.avatarMode || 'none';
    var showAiAvatar = avatarMode === 'ai' || avatarMode === 'both';
    var showUserAvatar = avatarMode === 'user' || avatarMode === 'both';
    
    var data = getAccData();
    var acc = getCurAcc();
    var charId = curChar ? curChar.id : respondingCharId;
    var charData = data ? data.chars.find(function(c) { return c.id === charId; }) : null;
    
    var bubblePos = getBubblePosition(idx, m.role);
    var bubbleClass = 'bubble-' + bubblePos;
    
    var needAiAvatar = m.role === 'ai' && showAiAvatar && (bubblePos === 'first' || bubblePos === 'single');
    var needUserAvatar = m.role === 'user' && showUserAvatar && (bubblePos === 'first' || bubblePos === 'single');
    var useAvatarLayout = (m.role === 'ai' && showAiAvatar) || (m.role === 'user' && showUserAvatar);
    
    if (useAvatarLayout) {
        var h = '<div class="msg-with-avatar '+m.role+' '+bubbleClass+'" data-idx="'+idx+'" data-msgid="'+esc(m.id || '')+'">';
        
        if (m.role === 'ai' && showAiAvatar) {
            if (needAiAvatar) {
                var aiAv = charData ? (charData.avatar && charData.avatar.length > 2 ? '<img src="'+charData.avatar+'">' : (charData.avatar || charData.realName.charAt(0))) : '🤖';
                h += '<div class="msg-avatar" onclick="onMsgAvatarClick(event,\'ai\')" ondblclick="onMsgAvatarDblClick(\'ai\')">'+aiAv+'</div>';
            } else {
                h += '<div class="msg-avatar-placeholder"></div>';
            }
        }
        
        if (m.role === 'user' && showUserAvatar) {
            if (needUserAvatar) {
                var userAv = acc ? (acc.avatar && acc.avatar.length > 2 ? '<img src="'+acc.avatar+'">' : (acc.avatar || acc.persona.charAt(0))) : '👤';
                h += '<div class="msg-avatar" onclick="onMsgAvatarClick(event,\'user\')" ondblclick="onMsgAvatarDblClick(\'user\')">'+userAv+'</div>';
            } else {
                h += '<div class="msg-avatar-placeholder"></div>';
            }
        }
        
        var isCard2 = m.type === 'link' || m.type === 'location' || m.type === 'invite' || m.type === 'call' || m.type === 'call_invite' || m.type === 'transfer';
        h += '<div class="msg-bubble-wrap' + (isCard2 ? ' msg-card-type' : '') + '" data-msgidx="'+idx+'" oncontextmenu="showMsgMenu(event,'+idx+')">';
        
        if (m.quoteContent) {
            var quoteJump = getQuoteJumpAction(m);
            h += '<div class="msg-quote" onclick="' + quoteJump + '">' + esc(m.quoteContent.slice(0,30)) + (m.quoteContent.length > 30 ? '...' : '') + '</div>';
        }
        
        h += '<div class="msg-content-wrap">' + renderMsgContent(m, idx) + '</div>';
        h += '</div></div>';
        return h;
    }
    
    var isCard = m.type === 'link' || m.type === 'location' || m.type === 'invite' || m.type === 'call' || m.type === 'call_invite' || m.type === 'transfer';
    var cls = 'msg ' + m.role + ' ' + bubbleClass + (isCard ? ' msg-card-type' : '');
    var h = '<div class="'+cls+'" data-idx="'+idx+'" data-msgidx="'+idx+'" data-msgid="'+esc(m.id || '')+'" oncontextmenu="showMsgMenu(event,'+idx+')">';
    
        if (m.quoteContent) {
            var quoteJump = getQuoteJumpAction(m);
            h += '<div class="msg-quote" onclick="' + quoteJump + '">' + esc(m.quoteContent.slice(0,30)) + (m.quoteContent.length > 30 ? '...' : '') + '</div>';
        }
    
    h += '<div class="msg-content-wrap">' + renderMsgContent(m, idx) + '</div>';
    h += '</div>';
    return h;
}

function getBubblePosition(idx, role) {
    var data = getAccData();
    var charId = curChar ? curChar.id : respondingCharId;
    var msgs = data.chats[charId] || [];

    var prevMsg = null, nextMsg = null;

    for (var i = idx - 1; i >= 0; i--) {
        var prev = msgs[i];
        if (prev.type === 'sys' || prev.recalled) continue;
        prevMsg = prev;
        break;
    }

    for (var i = idx + 1; i < msgs.length; i++) {
        var next = msgs[i];
        if (next.type === 'sys' || next.recalled) continue;
        nextMsg = next;
        break;
    }

    var curMsg = msgs[idx];

    var samePrev = prevMsg && prevMsg.role === role
        && get5MinSlot(prevMsg.time) === get5MinSlot(curMsg.time);
    var sameNext = nextMsg && nextMsg.role === role
        && get5MinSlot(nextMsg.time) === get5MinSlot(curMsg.time);

    if (!samePrev && !sameNext) return 'single';
    if (!samePrev && sameNext) return 'first';
    if (samePrev && sameNext) return 'middle';
    if (samePrev && !sameNext) return 'last';

    return 'single';
}

function renderMsgContent(m, idx) {
    var h = '';
        if (m.type === 'call_invite') {
        var isFromAI = m.callFromAI;
        var icon = m.callType === 'video' ? '📹' : '📞';
        var label = m.callType === 'video' ? '视频通话' : '语音通话';
        var data = getAccData();
        var charIdForCheck = isFromAI ? m.charId : (curChar ? curChar.id : null);
        var isFinished = (data.callLogs || []).some(function(l) {
            return l.charId === charIdForCheck && l.startTime >= m.time;
        });
var callHtml = '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(168,216,234,0.1);border-radius:12px;min-width:220px">';
        callHtml += '<span style="font-size:22px">' + icon + '</span>';
        callHtml += '<div style="flex:1"><div style="font-size:14px;font-weight:500">' + label + '</div>';
        if (isFinished) {
            callHtml += '<div style="font-size:12px;color:var(--text-gray);margin-top:2px">通话已完成</div>';
            callHtml += '</div></div>';
        } else if (isFromAI) {
            callHtml += '<div style="font-size:12px;color:var(--text-gray);margin-top:2px">' + (m.callReason || '邀请你通话') + '</div>';
            callHtml += '</div></div>';
            callHtml += '<div ontouchstart="event.stopPropagation()" style="display:flex;gap:8px;margin-top:8px">';
callHtml += '<button ontouchstart="event.stopPropagation()" onclick="acceptAICall(\'' + esc(m.id) + '\')" style="flex:1;padding:14px 8px;border:none;border-radius:10px;background:#4CAF50;color:white;font-size:14px;cursor:pointer">接听</button>';
callHtml += '<button ontouchstart="event.stopPropagation()" onclick="rejectAICall(\'' + esc(m.id) + '\')" style="flex:1;padding:14px 8px;border:none;border-radius:10px;background:#f0f0f0;color:#666;font-size:14px;cursor:pointer">拒绝</button>';
            callHtml += '</div>';
        } else {
            callHtml += '<div style="font-size:12px;color:var(--text-gray);margin-top:2px">等待接听...</div>';
            callHtml += '</div></div>';
        }
        return callHtml;
    }

    if (m.type === 'call') {
        var callIcon = m.callType === 'video' ? '📹' : '📞';
        var callLabel = m.callType === 'video' ? '视频通话' : '语音通话';
        return '<div class="msg-call-bubble" onclick="viewCallDetail(\'' + (m.callLogId||'') + '\')" style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(168,216,234,0.15);border-radius:12px;cursor:pointer;min-width:160px">'
            + '<span style="font-size:22px">' + callIcon + '</span>'
            + '<div><div style="font-size:14px;font-weight:500">' + callLabel + '</div>'
            + '<div style="font-size:12px;color:var(--text-gray);margin-top:2px">' + esc(m.callDuration || '已结束') + '</div></div>'
            + '<span style="margin-left:auto;color:var(--text-light);font-size:12px">›</span>'
            + '</div>';
    }
    if (m.type === 'transfer') {
        return typeof renderTransferBubble === 'function' ? renderTransferBubble(m) : '';
    }
    if (m.type === 'image') {
        // 增加 -webkit-touch-callout 阻止 iOS 原生菜单
        if (m.imageUrl) h += '<img class="msg-image" src="'+m.imageUrl+'" onclick="handleImgClick(event,'+idx+')" style="-webkit-touch-callout: none; -webkit-user-select: none;">';
        else h += '<div class="msg-image-placeholder">[图片: '+esc(m.imageDesc||'')+']</div>';
    } else if (m.type === 'sticker') {
        h += '<div class="msg-sticker" onclick="viewStickerFull(\''+esc(m.stickerUrl)+'\')" title="'+esc(m.stickerDesc||'')+'">';
        h += '<img src="'+esc(m.stickerUrl)+'">';
        h += '</div>';
    } else if (m.type === 'location') {
        var locIcon = (typeof placeIcons !== 'undefined' && placeIcons[m.placeType]) ? placeIcons[m.placeType] : '📍';
        h += '<div class="msg-location-card" onclick="openLocationFromMsg(\'' + esc(m.mapId||'') + '\',\'' + esc(m.placeId||'') + '\')">';
        h += '<div class="loc-card-header">';
        h += '<span class="loc-card-icon">' + locIcon + '</span>';
        h += '<span class="loc-card-title">' + esc(m.placeName||'位置') + '</span>';
        h += '</div>';
        if (m.content) h += '<div class="loc-card-msg">' + esc(m.content) + '</div>';
        h += '<div class="loc-card-footer">';
        h += '<span>📍 ' + esc(m.mapName || '地图') + '</span>';
        h += '<span class="loc-card-action">查看位置 ›</span>';
        h += '</div>';
        h += '</div>';
    } else if (m.type === 'invite') {
        var invIcon = (typeof placeIcons !== 'undefined' && placeIcons[m.placeType]) ? placeIcons[m.placeType] : '📍';
        h += '<div class="msg-invite-card" onclick="openLocationFromMsg(\'' + esc(m.mapId||'') + '\',\'' + esc(m.placeId||'') + '\')">';
        h += '<div class="invite-card-header">📨 邀请你去</div>';
        h += '<div class="invite-card-place">';
        h += '<span class="invite-card-icon">' + invIcon + '</span>';
        h += '<span>' + esc(m.placeName||'某地') + '</span>';
        h += '</div>';
        if (m.content) h += '<div class="invite-card-msg">"' + esc(m.content) + '"</div>';
        h += '<div class="invite-card-actions">';
        h += '<button class="invite-btn-accept" onclick="event.stopPropagation();acceptInvite(\'' + esc(m.mapId||'') + '\',\'' + esc(m.placeId||'') + '\')">✓ 接受</button>';
        h += '<button class="invite-btn-view" onclick="event.stopPropagation();openLocationFromMsg(\'' + esc(m.mapId||'') + '\',\'' + esc(m.placeId||'') + '\')">查看地点</button>';
        h += '</div>';
        h += '</div>';
    } else if (m.type === 'voice') {
        var dur = m.duration || Math.ceil((m.content||'').length / 5);
        var waves = '';
        var waveCount = Math.min(Math.max(dur, 4), 8);
        for (var w = 0; w < waveCount; w++) {
            waves += '<div class="voice-wave" style="height:'+(4+Math.random()*8)+'px"></div>';
        }
        h += '<div class="msg-voice" data-duration="'+dur+'" onclick="playVoice(this,'+idx+','+dur+')">';
        h += '<div class="voice-icon">🔊</div>';
        h += '<div class="voice-waves">'+waves+'</div>';
        h += '<span class="voice-dur">'+dur+'\'\'</span></div>';
        h += '<div class="voice-text" id="vt'+idx+'">'+esc(m.content)+'</div>';
    } else if (m.type === 'email_forward') {
        h += typeof renderEmailForwardBubble === 'function' ? renderEmailForwardBubble(m) : '<div class="msg-bubble">📧 ' + esc(m.emailSubject || '邮件') + '</div>';
               } else if (m.type === 'link') {
        var linkDisplayText = getDisplayContent(m);
        if (linkDisplayText) h += '<div class="msg-bubble" style="margin-bottom:6px">' + esc(linkDisplayText) + '</div>';
        if (typeof renderLinkCard === 'function') {
            var linkCopy = {};
            for (var k in m) linkCopy[k] = m[k];
            linkCopy.content = '';
            h += renderLinkCard(linkCopy);
        } else {
            h += '<div class="msg-bubble">[链接: ' + esc(m.linkUrl) + ']</div>';
        }
    } else {
        if (m.content) {
            h += '<div class="msg-bubble">'+esc(m.content)+'</div>';
        }
    }
    return h;
}
    
function bindMsgTouchEvents() {
    var el = $('messages');
    if (!el) return;
    var nodes = el.querySelectorAll('[data-msgidx]');
    nodes.forEach(function(node) {
        if (node._touchBound) return;
        node._touchBound = true;
        var idx = parseInt(node.getAttribute('data-msgidx'));
node.addEventListener('touchstart', function(e) {
    if (typeof isMsgBatchMode !== 'undefined' && isMsgBatchMode) return; // 多选模式下拦截长按
    var t = e.target;

    // 删除了 t.closest('.msg-image')，让图片可以触发长按
    if (t.closest('.msg-voice') ||
        t.closest('.msg-location-card') ||
        t.closest('.msg-invite-card') ||
        t.closest('.invite-btn-accept') ||
        t.closest('.invite-btn-view') ||
        t.closest('.msg-call-bubble') ||
        t.closest('button') ||
        t.closest('a')) {
        return;
    }

    if (!e.touches || !e.touches[0]) return;
    longPressSaved = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        idx: idx
    };
    longPressTimer = setTimeout(function() {
        if (longPressSaved !== null) {
            window._isLongPressingImg = true; // 标记正在长按
            showMsgMenuAt(longPressSaved.x, longPressSaved.y, longPressSaved.idx);
            setTimeout(function(){ window._isLongPressingImg = false; }, 500); // 500ms后解除拦截
        }
    }, 500);
}, { passive: true });
        node.addEventListener('touchend', function() {
            if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
            longPressSaved = null;
        });
        node.addEventListener('touchmove', function() {
            if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
            longPressSaved = null;
        });
    });
}

var avatarClickTimer = null;
var avatarClickCount = 0;

function onMsgAvatarClick(e, type) {
    e.stopPropagation();
    avatarClickCount++;
    if (avatarClickCount === 1) {
        avatarClickTimer = setTimeout(function() {
            avatarClickCount = 0;
            if (type === 'ai') openHearts();
        }, 300);
    }
}

function onMsgAvatarDblClick(type) {
    clearTimeout(avatarClickTimer);
    avatarClickCount = 0;
    doPatByType(type);
}

function doPatByType(type) {
    if (!curChar) return;
    var acc = getCurAcc();
    var content = '';
    if (type === 'ai') {
        content = (acc ? acc.nick : '你') + ' 拍了拍 ' + curChar.displayName;
    } else {
        content = (acc ? acc.nick : '你') + ' 拍了拍自己';
    }
    appendMsg({ role: 'sys', type: 'sys', content: content, time: Date.now() });
}
function appendMsgToChat(charId, msg) {
    if (msg && msg.role === 'ai' && typeof msg.content === 'string' && !msg.type) {
        msg.content = String(msg.content)
            .replace(/\r\n/g, '\n')
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .replace(/[ \t]+\n/g, '\n')
            .replace(/\n[ \t]+\n/g, '\n')
            .replace(/\n{2,}/g, '\n')
            .trim();
    }

    if (typeof exitMsgBatchMode === 'function' && isMsgBatchMode) exitMsgBatchMode();
    var data = getAccData();
    if (!charId || !data || !data.chats[charId]) return -1;

    msg = prepareMsgForStorage(msg);
    data.chats[charId].push(msg);
    save();

    // 风控日志
    if (msg && (msg.role === 'ai' || msg.role === 'user') && msg.type !== 'sys' && !msg.recalled) {
        var contentForLog = msg.content || msg.imageDesc || msg.stickerDesc || (msg.type === 'voice' ? '[语音]' : '');
        if (contentForLog) {
            riskLog(msg.role === 'ai' ? 'assistant' : 'user', contentForLog);
        }
    }

    var idx = data.chats[charId].length - 1;

    if (curChar && curChar.id === charId) {
        var el = $('messages');
        var msgs = data.chats[charId];

        if (msgs.length <= 1 || !el.querySelector('[data-idx]')) {
            renderMsgs(true);
        } else {
            updatePrevBubbleStyle(charId, idx);

            var timeLabelHtml = '';
            if (msg.type !== 'sys' && !msg.recalled) {
                var prevNonSys = null;
                for (var pi = idx - 1; pi >= 0; pi--) {
                    var pm = msgs[pi];
                    if (pm.type !== 'sys' && !pm.recalled) { prevNonSys = pm; break; }
                }
                if (needTimeLabel(prevNonSys, msg)) {
                    timeLabelHtml = renderTimeLabel(msg.time);
                }
            }

            var newHtml = renderMsg(msg, idx);
            if (newHtml || timeLabelHtml) {
                el.insertAdjacentHTML('beforeend', timeLabelHtml + newHtml);
                bindMsgTouchEvents();

                var lastChild = el.lastElementChild;
                if (lastChild) {
                    lastChild.classList.add('msg-new');
                    setTimeout(function() {
                        if (lastChild) lastChild.classList.remove('msg-new');
                    }, 350);
                }
            }
            el.scrollTop = el.scrollHeight;
        }
    } else {
        if (msg.role === 'ai' && msg.type !== 'sys') {
            if (!unreadCounts[charId]) unreadCounts[charId] = 0;
            unreadCounts[charId]++;
            if ($('chatPage').classList.contains('active')) renderContacts();
        }
    }

    // 统一触发自动总结（关键）
    if (typeof checkAutoSummary === 'function') checkAutoSummary(charId);
        if (msg.type === 'link') {
        if (msg.role === 'ai' && !msg._aiVerified) {
            setTimeout(function() { processAiLinkMsg(charId, idx); }, 200);
        } else if (msg.role === 'user' && msg.linkUrl && !msg._userFetched) {
            setTimeout(function() { processUserLinkMsg(charId, idx); }, 200);
        }
    }
    return idx;
}
function appendMsg(msg) {
    if (msg && msg.role === 'ai' && typeof msg.content === 'string' && !msg.type) {
        msg.content = String(msg.content)
            .replace(/\r\n/g, '\n')
            .replace(/[\u200B-\u200D\uFEFF]/g, '')
            .replace(/[ \t]+\n/g, '\n')
            .replace(/\n[ \t]+\n/g, '\n')
            .replace(/\n{2,}/g, '\n')
            .trim();
    }

    if (typeof exitMsgBatchMode === 'function' && isMsgBatchMode) exitMsgBatchMode();
    var data = getAccData();
    var charId = curChar ? curChar.id : respondingCharId;
    if (!charId || !data || !data.chats[charId]) return -1;

    msg = prepareMsgForStorage(msg);
    data.chats[charId].push(msg);
    save();

    if (msg && (msg.role === 'ai' || msg.role === 'user') && msg.type !== 'sys' && !msg.recalled) {
        var contentForLog = msg.content || msg.imageDesc || msg.stickerDesc || (msg.type === 'voice' ? '[语音]' : '');
        if (contentForLog) riskLog(msg.role === 'ai' ? 'assistant' : 'user', contentForLog);
    }

    var idx = data.chats[charId].length - 1;

    if (curChar && curChar.id === charId) {
        var el = $('messages');
        var msgs = data.chats[charId];

        if (msgs.length <= 1 || !el.querySelector('[data-idx]')) {
            renderMsgs(true);
        } else {
            updatePrevBubbleStyle(charId, idx);

            var timeLabelHtml = '';
            if (msg.type !== 'sys' && !msg.recalled) {
                var prevNonSys = null;
                for (var pi = idx - 1; pi >= 0; pi--) {
                    var pm = msgs[pi];
                    if (pm.type !== 'sys' && !pm.recalled) { prevNonSys = pm; break; }
                }
                if (needTimeLabel(prevNonSys, msg)) timeLabelHtml = renderTimeLabel(msg.time);
            }

            var newHtml = renderMsg(msg, idx);
            if (newHtml || timeLabelHtml) {
                el.insertAdjacentHTML('beforeend', timeLabelHtml + newHtml);
                bindMsgTouchEvents();

                var lastChild = el.lastElementChild;
                if (lastChild) {
                    lastChild.classList.add('msg-new');
                    setTimeout(function() {
                        if (lastChild) lastChild.classList.remove('msg-new');
                    }, 350);
                }
            }
            el.scrollTop = el.scrollHeight;
        }
    } else {
        if (msg.role === 'ai' && msg.type !== 'sys') {
            if (!unreadCounts[charId]) unreadCounts[charId] = 0;
            unreadCounts[charId]++;
            if ($('chatPage').classList.contains('active')) renderContacts();
        }
    }

    if (typeof checkAutoSummary === 'function') checkAutoSummary(charId);
    if (msg.type === 'link') {
        if (msg.role === 'ai' && !msg._aiVerified) {
            setTimeout(function() { processAiLinkMsg(charId, idx); }, 200);
        } else if (msg.role === 'user' && msg.linkUrl && !msg._userFetched) {
            setTimeout(function() { processUserLinkMsg(charId, idx); }, 200);
        }
    }
    return idx;
}

function checkAutoSummary(charId) {
    setTimeout(function() {
        if (typeof autoSummaryIfNeeded === 'function') autoSummaryIfNeeded(charId);
    }, 500);
}

function checkAutoSummary(charId) {
    setTimeout(function() {
        if (typeof autoSummaryIfNeeded === 'function') autoSummaryIfNeeded(charId);
    }, 500);
}

var voicePlayTimer = null;

function playVoice(el, idx, duration) {
    var textEl = $('vt' + idx);

    if (el.classList.contains('playing')) {
        // 正在播放：停止动画，收起转文字
        el.classList.remove('playing');
        if (voicePlayTimer) { clearTimeout(voicePlayTimer); voicePlayTimer = null; }
        if (textEl) textEl.classList.remove('show');
        return;
    }

    // 停止其他正在播放的语音动画（不收起其他的转文字）
    document.querySelectorAll('.msg-voice.playing').forEach(function(v) {
        v.classList.remove('playing');
    });
    if (voicePlayTimer) { clearTimeout(voicePlayTimer); voicePlayTimer = null; }

    // 展开/收起当前转文字（切换）
    if (textEl) {
        if (textEl.classList.contains('show')) {
            textEl.classList.remove('show');
        } else {
            textEl.classList.add('show');
        }
    }

    el.classList.add('playing');
    voicePlayTimer = setTimeout(function() {
        el.classList.remove('playing');
        voicePlayTimer = null;
    }, duration * 1000);
}

function toggleVoice(idx) {
    var el = $('vt' + idx);
    if (el) el.classList.toggle('show');
}

function handleImgClick(e, idx) {
    if (window._isLongPressingImg) return; // 如果刚刚触发了长按，忽略这次单击
    e.preventDefault(); e.stopPropagation();
    imgClickCount++;
    if (imgClickCount === 1) {
        imgClickTimer = setTimeout(function() {
            imgClickCount = 0;
            showImgDesc(idx);
        }, 300);
    } else if (imgClickCount >= 2) {
        clearTimeout(imgClickTimer);
        imgClickCount = 0;
        viewImgFull(idx);
    }
}

function viewImgFull(idx) {
    var data = getAccData();
    var charId = curChar ? curChar.id : respondingCharId;
    var msg = data.chats[charId][idx];
    if (msg && msg.imageUrl) { $('viewerImg').src = msg.imageUrl; $('imageViewer').classList.add('active'); }
}

function showImgDesc(idx) {
    var data = getAccData();
    var charId = curChar ? curChar.id : respondingCharId;
    var msg = data.chats[charId][idx];
    if (msg) toast(msg.imageDesc || '无描述');
}
function jumpToQuoteByTime(time) {
    if (!time) return toast('无法定位该消息');
    
    var data = getAccData();
    var charId = curChar ? curChar.id : null;
    if (!charId) return toast('请先打开聊天');
    
    var msgs = data.chats[charId] || [];
    
    // 精确匹配时间戳
    var targetIdx = -1;
    for (var i = 0; i < msgs.length; i++) {
        if (msgs[i].time === time) {
            targetIdx = i;
            break;
        }
    }
    
    // 如果精确匹配失败，找时间最接近的（容差10秒）
    if (targetIdx < 0) {
        var minDiff = 10000;
        for (var i = 0; i < msgs.length; i++) {
            var diff = Math.abs(msgs[i].time - time);
            if (diff < minDiff) {
                minDiff = diff;
                targetIdx = i;
            }
        }
    }
    
    if (targetIdx < 0) return toast('原消息已被删除');
    
    // 查找DOM元素（兼容多种class）
    var el = document.querySelector('[data-idx="'+targetIdx+'"]');
    
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('highlight');
        setTimeout(function() { el.classList.remove('highlight'); }, 2000);
    } else {
        toast('消息不在当前视图中');
    }
}

// 保留旧函数兼容
function jumpToQuote(idx) {
    var el = document.querySelector('.msg-with-avatar[data-idx="'+idx+'"]') || 
             document.querySelector('.msg[data-idx="'+idx+'"]');
    if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('highlight');
        setTimeout(function() { el.classList.remove('highlight'); }, 600);
    }
}

var longPressTimer = null;
var longPressSaved = null;

function msgTouchStart(e, idx) {
    if (isMsgBatchMode) return;
    // 阻止iOS系统长按菜单
    e.preventDefault();
    // 保存坐标，因为异步回调里 e.touches 会消失
    longPressSaved = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        idx: idx
    };
    longPressTimer = setTimeout(function() {
        if (longPressSaved !== null) {
            showMsgMenuAt(longPressSaved.x, longPressSaved.y, longPressSaved.idx);
        }
    }, 500);
}

function msgTouchEnd() {
    if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
    longPressSaved = null;
}

function showMsgMenu(e, idx) {
    e.preventDefault();
    selectedMsgIdx = idx;
    var data = getAccData();
    var charId = curChar ? curChar.id : respondingCharId;
    var msg = data.chats[charId][idx];
    if (!msg || msg.type === 'sys') return;
    
    var menu = $('msgMenu');
    var h = '';
    if (msg.recalled) {
        h = '<div class="msg-menu-item" onclick="viewRecalled('+idx+')">查看</div>';
        h += '<div class="msg-menu-item" onclick="enterMsgBatchMode()">多选</div>';
    } else {
        h += '<div class="msg-menu-item" onclick="copyMsg()">复制</div>';
        if (msg.type === 'link' && msg.linkUrl) h += '<div class="msg-menu-item" onclick="copyLinkUrl()">复制链接</div>';
        h += '<div class="msg-menu-item" onclick="quoteThisMsg()">引用</div>';
        h += '<div class="msg-menu-item" onclick="enterMsgBatchMode()">多选</div>';
        if (msg.type === 'image') h += '<div class="msg-menu-item" onclick="retryRecognizeImage()">重新识图</div>';
        if (msg.type !== 'image' && msg.type !== 'voice') h += '<div class="msg-menu-item" onclick="editMsgContent()">编辑</div>';
        h += '<div class="msg-menu-item" onclick="recallMsg()">撤回</div>';
        h += '<div class="msg-menu-item danger" onclick="deleteMsg()">删除</div>';
    }
    menu.innerHTML = h;
    
    var x = e.touches ? e.touches[0].clientX : e.clientX;
    var y = e.touches ? e.touches[0].clientY : e.clientY;
    menu.style.visibility = 'hidden';
    menu.classList.add('active');
    var mw = menu.offsetWidth, mh = menu.offsetHeight;
    x = Math.max(10, Math.min(x, window.innerWidth - mw - 10));
    y = Math.max(10, Math.min(y, window.innerHeight - mh - 10));
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.style.visibility = 'visible';
}

function showMsgMenuAt(x, y, idx) {
    selectedMsgIdx = idx;
    var data = getAccData();
    var charId = curChar ? curChar.id : respondingCharId;
    var msg = data.chats[charId][idx];
    if (!msg || msg.type === 'sys') return;

    var menu = $('msgMenu');
    var h = '';
    if (msg.recalled) {
        h = '<div class="msg-menu-item" onclick="viewRecalled('+idx+')">查看</div>';
        h += '<div class="msg-menu-item" onclick="enterMsgBatchMode()">多选</div>';
    } else {
        h += '<div class="msg-menu-item" onclick="copyMsg()">复制</div>';
                if (msg.type === 'link' && msg.linkUrl) h += '<div class="msg-menu-item" onclick="copyLinkUrl()">复制链接</div>';
        h += '<div class="msg-menu-item" onclick="quoteThisMsg()">引用</div>';
        h += '<div class="msg-menu-item" onclick="enterMsgBatchMode()">多选</div>';
        if (msg.type === 'image') h += '<div class="msg-menu-item" onclick="retryRecognizeImage()">重新识图</div>';
        if (msg.type !== 'image' && msg.type !== 'voice') h += '<div class="msg-menu-item" onclick="editMsgContent()">编辑</div>';
        h += '<div class="msg-menu-item" onclick="recallMsg()">撤回</div>';
        h += '<div class="msg-menu-item danger" onclick="deleteMsg()">删除</div>';
    }
    menu.innerHTML = h;

    menu.style.visibility = 'hidden';
    menu.classList.add('active');
    var mw = menu.offsetWidth, mh = menu.offsetHeight;
    x = Math.max(10, Math.min(x, window.innerWidth - mw - 10));
    y = Math.max(10, Math.min(y, window.innerHeight - mh - 10));
    menu.style.left = x + 'px';
    menu.style.top = y + 'px';
    menu.style.visibility = 'visible';
}

function hideMsgMenu() { $('msgMenu').classList.remove('active'); selectedMsgIdx = -1; }

function copyMsg() {
    var data = getAccData();
    var charId = curChar ? curChar.id : respondingCharId;
    var msg = data.chats[charId][selectedMsgIdx];
    if (msg) {
        var text = msg.type === 'link' ? getDisplayContent(msg) : (msg.content || msg.imageDesc || '');
        navigator.clipboard.writeText(text).then(function() { toast('已复制'); });
    }
    hideMsgMenu();
}

function escJsStr(s) {
    return String(s || '')
        .replace(/\\/g, '\\\\')
        .replace(/'/g, "\\'");
}

function getMsgPlainTextForQuote(msg) {
    if (!msg) return '';
    if (msg.type === 'link') return getDisplayContent(msg) || msg.linkTitle || msg.linkDesc || '';
    if (msg.type === 'image') return msg.imageDesc || '[图片]';
    if (msg.type === 'voice') return msg.content || '[语音]';
    if (msg.type === 'sticker') return msg.stickerDesc || '[表情包]';
    if (msg.type === 'location') return msg.content || msg.placeName || '[位置]';
    if (msg.type === 'invite') return msg.content || msg.placeName || '[邀请]';
    if (msg.type === 'transfer') return msg.content || '[转账]';
    return msg.content || '';
}

function buildQuoteAnchorsFromText(text, msgId, msgTime) {
    text = String(text || '').replace(/\r\n/g, '\n').trim();
    if (!text) return [];

    var anchors = [];
    var seen = {};

    function addExact(t) {
        t = String(t || '').replace(/\r\n/g, '\n').trim();
        if (!t) return;
        if (seen[t]) return;
        seen[t] = true;
        anchors.push({
            id: genId('qa'),
            msgId: msgId,
            time: msgTime,
            text: t
        });
    }

    addExact(text);

    var sentenceSegs = text.match(/[^。！？!?；;…\n]+[。！？!?；;…]?/g) || [];
    sentenceSegs.forEach(function(seg) {
        seg = String(seg || '').trim();
        if (seg && seg.length <= 60) addExact(seg);
    });

    var commaSegs = text.match(/[^，,、\n]+/g) || [];
    commaSegs.forEach(function(seg) {
        seg = String(seg || '').trim();
        if (seg && seg.length >= 2 && seg.length <= 20) addExact(seg);
    });

    return anchors.slice(0, 12);
}

function prepareMsgForStorage(msg) {
    msg = msg || {};

    if (!msg.id) msg.id = genId('msg');
    if (!msg.time) msg.time = Date.now();

    if (!Array.isArray(msg.quoteAnchors)) {
        var plain = getMsgPlainTextForQuote(msg);
        msg.quoteAnchors = buildQuoteAnchorsFromText(plain, msg.id, msg.time);
    } else {
        msg.quoteAnchors.forEach(function(a) {
            if (!a.id) a.id = genId('qa');
            if (!a.msgId) a.msgId = msg.id;
            if (!a.time) a.time = msg.time;
        });
    }

    return msg;
}

function backfillChatMsgMeta(charId) {
    var data = getAccData();
    if (!data || !data.chats || !data.chats[charId]) return;

    var changed = false;
    var msgs = data.chats[charId];

    msgs.forEach(function(msg) {
        if (!msg.id || !Array.isArray(msg.quoteAnchors)) {
            prepareMsgForStorage(msg);
            changed = true;
        }

        if (msg.quoteMsgId && !msg.quoteTime) {
            var ref = msgs.find(function(x) { return x.id === msg.quoteMsgId; });
            if (ref) {
                msg.quoteTime = ref.time;
                changed = true;
            }
        }
    });

    if (changed) save();
}

function pickBestQuoteAnchor(msg) {
    var anchors = (msg && msg.quoteAnchors) || [];
    if (!anchors.length) return null;

    for (var i = 0; i < anchors.length; i++) {
        var t = anchors[i].text || '';
        if (t.length >= 2 && t.length <= 6) return anchors[i];
    }

    return anchors[anchors.length - 1] || anchors[0];
}

function getQuoteJumpAction(msg) {
    if (msg.quoteMsgId || msg.quoteAnchorId) {
        return "jumpToQuoteAnchor('" + escJsStr(msg.quoteMsgId || '') + "','" + escJsStr(msg.quoteAnchorId || '') + "')";
    }
    return 'jumpToQuoteByTime(' + (msg.quoteTime || 0) + ')';
}

function findQuoteAnchorInChat(charId, anchorId) {
    var data = getAccData();
    var msgs = (data.chats[charId] || []);

    for (var i = 0; i < msgs.length; i++) {
        var m = msgs[i];
        var anchors = m.quoteAnchors || [];
        for (var j = 0; j < anchors.length; j++) {
            if (anchors[j] && anchors[j].id === anchorId) {
                return {
                    idx: i,
                    msg: m,
                    anchor: anchors[j]
                };
            }
        }
    }
    return null;
}

function jumpToQuoteAnchor(msgId, anchorId) {
    var data = getAccData();
    var charId = curChar ? curChar.id : null;
    if (!charId) return toast('请先打开聊天');

    var msgs = data.chats[charId] || [];
    var targetIdx = -1;
    var anchorText = '';

    if (msgId) {
        for (var i = 0; i < msgs.length; i++) {
            if (msgs[i].id === msgId) {
                targetIdx = i;
                break;
            }
        }
    }

    if (targetIdx < 0 && anchorId) {
        var found = findQuoteAnchorInChat(charId, anchorId);
        if (found) {
            targetIdx = found.idx;
            msgId = found.msg.id;
            anchorText = found.anchor.text || '';
        }
    } else if (targetIdx >= 0 && anchorId) {
        var msg = msgs[targetIdx];
        var anchors = msg.quoteAnchors || [];
        for (var k = 0; k < anchors.length; k++) {
            if (anchors[k].id === anchorId) {
                anchorText = anchors[k].text || '';
                break;
            }
        }
    }

    if (targetIdx < 0) return toast('原消息已被删除');

    var el = document.querySelector('[data-idx="' + targetIdx + '"]');
    if (!el) return toast('消息不在当前视图中');

    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('highlight');
    setTimeout(function() { el.classList.remove('highlight'); }, 2000);

    if (anchorText) {
        toast('引用：' + anchorText);
    }
}

function getRecentQuoteAnchorsForAI(charId, limit) {
    limit = limit || 30;
    var data = getAccData();
    var msgs = (data.chats[charId] || []).slice(-40);
    var list = [];

    msgs.forEach(function(m) {
        if (!m || m.type === 'sys' || m.recalled) return;

        (m.quoteAnchors || []).forEach(function(a) {
            if (a && a.id && a.text) {
                list.push({
                    id: a.id,
                    text: a.text,
                    msgId: m.id,
                    time: m.time,
                    role: m.role
                });
            }
        });
    });

    return list.slice(-limit);
}

function quoteThisMsg() {
    var data = getAccData();
    var charId = curChar ? curChar.id : respondingCharId;
    var msg = data.chats[charId][selectedMsgIdx];
    if (msg) {
        quotedMsg = msg;
        quotedIdx = selectedMsgIdx;

        var bestAnchor = pickBestQuoteAnchor(msg);
        var rawText = msg.type === 'link' ? getDisplayContent(msg) : (msg.content || '');
        var text = '';

        if (msg.type === 'image') text = '[图片]';
        else if (msg.type === 'voice') text = '[语音]';
        else if (msg.type === 'sticker') text = '[表情包: ' + (msg.stickerDesc || '') + ']';
        else text = bestAnchor ? bestAnchor.text : rawText.slice(0, 30);

        $('quotePreviewText').textContent = text;
        $('quotePreview').classList.add('show');
    }
    hideMsgMenu();
    $('msgInput').focus();
}

function cancelQuote() { quotedMsg = null; quotedIdx = -1; $('quotePreview').classList.remove('show'); }

function recallMsg() {
    var data = getAccData();
    var charId = curChar ? curChar.id : respondingCharId;
    var msg = data.chats[charId][selectedMsgIdx];
    if (msg) {
        msg.recalled = true;
        msg.recalledContent = msg.content || msg.imageDesc || '[语音]';
        save(); renderMsgs(false); toast('已撤回');
    }
    hideMsgMenu();
}

function viewRecalled(idx) {
    var data = getAccData();
    var charId = curChar ? curChar.id : respondingCharId;
    var msg = data.chats[charId][idx];
    if (msg && msg.recalledContent) {
        $('recalledContent').textContent = msg.recalledContent;
        openModal('recalledModal');
    }
    hideMsgMenu();
}

function deleteMsg() {
    if (!confirm('删除这条消息？')) { hideMsgMenu(); return; }
    var data = getAccData();
    var charId = curChar ? curChar.id : respondingCharId;
    data.chats[charId].splice(selectedMsgIdx, 1);
    save(); renderMsgs(false); hideMsgMenu(); toast('已删除');
}

// ========== 链接抓取进度面板 ==========
function showFetchProgress() {
    var old = document.getElementById('fetchProgressPanel');
    if (old) old.remove();
    var panel = document.createElement('div');
    panel.id = 'fetchProgressPanel';
    panel.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);width:min(340px,90vw);background:rgba(0,0,0,0.6);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px);border-radius:14px;padding:14px 16px;z-index:99999;color:white;font-size:13px;box-shadow:0 8px 30px rgba(0,0,0,0.3);transition:opacity 0.3s;';
    panel.innerHTML = '<div style="font-weight:600;margin-bottom:8px">🔗 正在抓取网页内容...</div><div id="fetchProgressList"></div>';
    document.body.appendChild(panel);
}

function updateFetchProgress(idx, name, status, detail) {
    var list = document.getElementById('fetchProgressList');
    if (!list) return;
    var icon = status === 'loading' ? '⏳' : status === 'ok' ? '✅' : '❌';
    var color = status === 'ok' ? '#4CAF50' : status === 'fail' ? '#FF6B6B' : '#FFD54F';
    var detailHtml = detail ? ' <span style="color:#999;font-size:11px">(' + detail + ')</span>' : '';
    
    var existing = document.getElementById('fp_row_' + idx);
    if (existing) {
        existing.innerHTML = '<span style="color:' + color + '">' + icon + ' ' + name + '</span>' + detailHtml;
    } else {
        var row = document.createElement('div');
        row.id = 'fp_row_' + idx;
        row.style.cssText = 'padding:3px 0;';
        row.innerHTML = '<span style="color:' + color + '">' + icon + ' ' + name + '</span>' + detailHtml;
        list.appendChild(row);
    }
}

function closeFetchProgress(success, length) {
    var panel = document.getElementById('fetchProgressPanel');
    if (!panel) return;
    var list = document.getElementById('fetchProgressList');
    if (list) {
        var msg = success 
            ? '<div style="color:#4CAF50;font-weight:600;margin-top:6px">✨ 抓取成功！共 ' + length + ' 字</div>'
            : '<div style="color:#FF6B6B;font-weight:600;margin-top:6px">😢 全部失败，将使用有限信息</div>';
        list.insertAdjacentHTML('beforeend', msg);
    }
    setTimeout(function() {
        if (panel) { panel.style.opacity = '0'; setTimeout(function() { if (panel.parentNode) panel.remove(); }, 300); }
    }, success ? 2000 : 3000);
}

async function sendMsg() {
    var input = $('msgInput');
    var text = input.value.trim();
    if (!text || !curChar) return;
    if (!D.api.key) return toast('请先配置API');

    if (window.__RISK_BANNED__) {
        toast(window.__RISK_BAN_MSG__ || '账号已被封禁');
        return;
    }

    var urls = typeof detectUrls === 'function' ? detectUrls(text) : [];
    var msg;

    if (urls.length > 0) {
        var textOnly = text;
        urls.forEach(function(u) { textOnly = textOnly.replace(u, '').trim(); });
        var url = urls[0];
        var domain = '';
        try { domain = new URL(url).hostname; } catch(e) { domain = url; }

        msg = {
            id: genId('link'),
            role: 'user',
            type: 'link',
            content: textOnly,
            linkUrl: url,
            linkTitle: domain,
            linkDesc: '正在加载网页...',
            linkFavicon: 'https://www.google.com/s2/favicons?domain=' + domain + '&sz=64',
            linkImage: '',
            linkFullText: '', 
            linkVirtual: false,
            _userFetched: true,
            time: Date.now()
        };

        if (quotedMsg) {
            var qAnchor = pickBestQuoteAnchor(quotedMsg);
            msg.quoteMsgId = quotedMsg.id || '';
            msg.quoteAnchorId = qAnchor ? qAnchor.id : '';
            msg.quoteTime = quotedMsg.time;
            msg.quoteContent = qAnchor
                ? qAnchor.text
                : (quotedMsg.type === 'image' ? '[图片]' :
                   quotedMsg.type === 'voice' ? '[语音]' :
                   quotedMsg.type === 'sticker' ? '[表情包: ' + (quotedMsg.stickerDesc || '表情') + ']' :
                   (quotedMsg.content || '').slice(0, 50));
        }

        appendMsg(msg);
        if (typeof queueBgSync === "function") queueBgSync(200);

        input.value = '';
        autoGrow(input);
        cancelQuote();
        closeFunc();
        lastInteract[curChar.id] = Date.now();

        if (timer) clearTimeout(timer);
        if (delayTimer) clearInterval(delayTimer);
        removeDelay();

        if (D.settings.autoReply) {
            if ($('crStatus')) {
                $('crStatus').textContent = '正在阅读链接...';
                $('crStatus').classList.add('typing');
            }
        } else {
            updateWaitBtn();
        }

        // 让统一引擎处理抓取，不在这里重复做
        setTimeout(function() {
            var freshData = getAccData();
            var cid = curChar ? curChar.id : null;
            if (cid && freshData.chats[cid]) {
                processUserLinkMsg(cid, freshData.chats[cid].length - 1);
            }
        }, 300);

        if (D.settings.autoReply) {
            var fetchDelay = Math.max((D.settings.delay || 0) * 1000, 8000);
            if ($('crStatus')) {
                $('crStatus').textContent = '正在阅读链接...';
                $('crStatus').classList.add('typing');
            }
            showDelay(Math.ceil(fetchDelay / 1000));
            timer = setTimeout(function() {
                removeDelay();
                doResponse();
            }, fetchDelay);
        } else {
            updateWaitBtn();
        }

        return; 
    } else {
        msg = { role: 'user', content: text, time: Date.now() };
    }

    if (quotedMsg) {
        var qAnchor2 = pickBestQuoteAnchor(quotedMsg);
        msg.quoteMsgId = quotedMsg.id || '';
        msg.quoteAnchorId = qAnchor2 ? qAnchor2.id : '';
        msg.quoteTime = quotedMsg.time;
        msg.quoteContent = qAnchor2
            ? qAnchor2.text
            : (quotedMsg.type === 'image' ? '[图片]' :
               quotedMsg.type === 'voice' ? '[语音]' :
               quotedMsg.type === 'sticker' ? '[表情包: ' + (quotedMsg.stickerDesc || '表情') + ']' :
               (quotedMsg.content || '').slice(0, 50));
    }

    appendMsg(msg);
    if (typeof queueBgSync === "function") queueBgSync(200);

    input.value = '';
    autoGrow(input);
    cancelQuote();
    closeFunc();

    lastInteract[curChar.id] = Date.now();

    if (timer) clearTimeout(timer);
    if (delayTimer) clearInterval(delayTimer);
    removeDelay();

    if (D.settings.autoReply) {
        var delay = D.settings.delay * 1000;
        if (delay > 0) {
            showDelay(D.settings.delay);
            timer = setTimeout(function() { removeDelay(); doResponse(); }, delay);
        } else doResponse();
    } else updateWaitBtn();
}

function onMsgKey(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); } }
function autoGrow(el) { el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 90) + 'px'; }
function triggerReply() { if (responding || !curChar) return; if (!D.api.key) return toast('请先配置API'); if (timer) clearTimeout(timer); removeDelay(); doResponse(); }

function showDelay(sec) {
    removeDelay();
    var el = $('messages');
    var d = document.createElement('div');
    d.className = 'delay-msg'; d.id = 'delayMsg';
    d.textContent = curChar.displayName + ' 将在 ' + sec + ' 秒后回复...';
    el.appendChild(d); el.scrollTop = el.scrollHeight;
    
    var rem = sec;
    delayTimer = setInterval(function() {
        rem--;
        var notice = $('delayMsg');
        if (notice && rem > 0) notice.textContent = curChar.displayName + ' 将在 ' + rem + ' 秒后回复...';
        else { clearInterval(delayTimer); delayTimer = null; }
    }, 1000);
}

function removeDelay() { var el = $('delayMsg'); if (el) el.remove(); if (delayTimer) { clearInterval(delayTimer); delayTimer = null; } }
function openChatEdit() {
    if (!curChar) return;
    $('editChatRealName').value = curChar.realName;
    $('editChatDisplayName').value = curChar.displayName;
    $('editChatPersona').value = curChar.persona || '';
    $('editChatMemory').value = curChar.memoryCount || 20;
    $('autoSummaryOn').checked = curChar.autoSummary || false;
    $('injectHeartOn').checked = curChar.injectHeart || false;
    $('showHeartRateOn').checked = curChar.showHeartRate || false;
    $('summaryInterval').value = curChar.summaryInterval || 20;
    $('editChatEmailAddress').value = curChar.emailAddress || '';
    $('callMemoryCount').value = curChar.callMemoryCount !== undefined ? curChar.callMemoryCount : 3;
    
    var av = $('editChatAvatar');
    av.dataset.val = curChar.avatar || '';
    av.innerHTML = curChar.avatar && curChar.avatar.length > 2 ? '<img src="'+curChar.avatar+'" style="width:100%;height:100%;object-fit:cover;border-radius:12px">' : (curChar.avatar || curChar.realName.charAt(0));
    
    updateWpPreview('chatWpPreview', curChar.chatWp);
    renderWbSelect();
    updateTokenStats();
    openModal('chatEditModal');
}

function renderWbSelect() {
    var h = '';
    for (var i = 0; i < D.worldbooks.length; i++) {
        var wb = D.worldbooks[i];
        var chk = (curChar.wbIds || []).indexOf(wb.id) >= 0 ? ' checked' : '';
        h += '<div style="padding:8px 10px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;gap:8px">';
        h += '<input type="checkbox" id="wbs_'+wb.id+'"'+chk+' style="width:16px;height:16px">';
        h += '<label for="wbs_'+wb.id+'" style="flex:1;cursor:pointer;font-size:13px">📖 '+esc(wb.name)+'</label></div>';
    }
    $('wbSelectList').innerHTML = h || '<div style="padding:12px;text-align:center;color:var(--text-light);font-size:12px">暂无世界书</div>';
}

function saveChatEdit() {
    curChar.realName = $('editChatRealName').value.trim() || curChar.realName;
    curChar.displayName = $('editChatDisplayName').value.trim() || curChar.displayName;
    curChar.persona = $('editChatPersona').value.trim();
    curChar.memoryCount = parseInt($('editChatMemory').value) || 20;
    curChar.autoSummary = $('autoSummaryOn').checked;
    curChar.summaryInterval = Math.max(20, parseInt($('summaryInterval').value) || 20);
    curChar.injectHeart = $('injectHeartOn').checked;
    curChar.showHeartRate = $('showHeartRateOn').checked;
    curChar.avatar = $('editChatAvatar').dataset.val || '';
    curChar.callMemoryCount = parseInt($('callMemoryCount').value) || 0;
    
      // 保存AI邮箱号
    var newEmail = $('editChatEmailAddress').value.trim();
    curChar.emailAddress = newEmail;
    curChar.email = newEmail;
    // 同步写入 data.chars
    var _data = getAccData();
    var _syncChar = _data.chars.find(function(c) { return c.id === curChar.id; });
    if (_syncChar) { _syncChar.emailAddress = newEmail; _syncChar.email = newEmail; }
    
    curChar.wbIds = [];
    D.worldbooks.forEach(function(wb) { if ($('wbs_'+wb.id)?.checked) curChar.wbIds.push(wb.id); });
    
    save();
    $('crName').textContent = curChar.displayName;
    var av = $('crAvatar');
    var avatarMode = D.theme.avatarMode || 'none';
    var hideTopAvatar = avatarMode === 'ai' || avatarMode === 'both';
    
    if (hideTopAvatar) {
        av.classList.add('hidden');
    } else {
        av.classList.remove('hidden');
        av.innerHTML = curChar.avatar && curChar.avatar.length > 2 ? '<img src="'+curChar.avatar+'">' : (curChar.avatar || curChar.realName.charAt(0));
    }
    toast('已保存');
}

// ✅ 修复代码
function clearChat() {
    if (!confirm('确定清空聊天记录？长期记忆会保留。')) return;

    var data = getAccData();
    var charId = curChar ? curChar.id : respondingCharId;
    if (!charId) return toast('无法确定角色');

    // 只清空聊天记录
    data.chats[charId] = [];

    // 如果你也想保留“心声/心率/状态”，把下面这行也删掉
    // data.hearts[charId] = [];

    // 重置自动总结计数，避免后面累计逻辑错位
    var charData = data.chars.find(function(c) { return c.id === charId; });
    if (charData) {
        charData.lastSummarizedCount = 0;
        charData.summaryRunning = false;
    }

    save();
    renderMsgs(true);
    closeModal('chatEditModal');
    toast('已清空聊天记录，长期记忆已保留');
}
function updateTokenStats() {
    var sys = estTokens(buildSysPrompt());
    var char = estTokens(curChar.persona || '');
    var acc = getCurAcc();
    var user = estTokens(acc?.desc || '');
    var data = getAccData();
    var hist = 0;
    (data.chats[curChar.id] || []).slice(-(curChar.memoryCount || 20)).forEach(function(m) { hist += estTokens(m.content || ''); });
    var wb = estTokens(getWbContent(curChar));
    
    $('tkSys').textContent = sys;
    $('tkChar').textContent = char;
    $('tkUser').textContent = user;
    $('tkHist').textContent = hist;
    $('tkWb').textContent = wb;
    $('tkTotal').textContent = (sys + char + user + hist + wb) + ' tokens';
}
function toggleFunc() { $('funcPanel').classList.toggle('active'); }
function closeFunc() { $('funcPanel').classList.remove('active'); }

function openImgChoice() { closeFunc(); $('imageTypeChoice').classList.add('active'); }

function selectImageType(type) {
    closeChoice('imageTypeChoice');
    imgType = type;
    if (type === 'album') {
        $('imageInput').click();
    } else if (type === 'text') {
        $('imgDescTitle').textContent = '📝 纯文字图描述';
        $('imgDescInput').value = '';
        openModal('imgDescModal');
    } else if (type === 'ai') {
        $('aiImgDescInput').value = '';
        openModal('aiImgChoiceModal');
    }
}

function confirmImgDesc() {
    var desc = $('imgDescInput').value.trim();
    if (!desc) return toast('请输入描述');
    closeModal('imgDescModal');
    
    if (imgType === 'text') {
        if ($('publishPage').classList.contains('active')) {
            pubImages.push({ url: '', desc: desc });
            renderPubImages(); checkPublish();
        } else if (curChar) {
            appendMsg({ role: 'user', type: 'image', imageUrl: '', imageDesc: desc, time: Date.now() });
            triggerAutoReply();
        }
    }
}

function aiImgUseAI() {
    var desc = $('aiImgDescInput').value.trim();
    if (!desc) return toast('请输入描述');
    closeModal('aiImgChoiceModal');
    translateAndGen(desc);
}

function aiImgUseDirect() {
    var desc = $('aiImgDescInput').value.trim();
    if (!desc) return toast('请输入描述');
    closeModal('aiImgChoiceModal');
    // 直接用用户填的描述生图，不再弹提示词框
    $('aiImgPrompt').value = desc;
    genAiImage();
}

function translateAndGen(desc) {
    if (!D.api.key) return toast('请先配置API');
    toast('正在生成提示词...');
    
    fetch(D.api.url.replace(/\/+$/, '') + '/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + D.api.key },
        body: JSON.stringify({
            model: D.api.model,
            messages: [
                { role: 'system', content: '将中文描述翻译成英文Stable Diffusion提示词，只输出英文。' },
                { role: 'user', content: desc }
            ]
        })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (d.error) throw new Error(d.error.message);
        $('aiImgPrompt').value = d.choices[0].message.content.trim();
        openModal('aiImgModal');
    })
    .catch(function(e) { toast('失败：' + e.message); });
}

function genAiImage() {
    var prompt = $('aiImgPrompt').value.trim();
    if (!prompt) return toast('提示词不能为空');
    closeModal('aiImgModal');
    toast('正在生成图片...');
    
    var url = 'https://gen.pollinations.ai/image/' + encodeURIComponent(prompt) + '?model=' + D.settings.polliModel + '&seed=' + Math.floor(Math.random() * 9999) + '&nologo=true';
    if (D.settings.polliKey) url += '&key=' + encodeURIComponent(D.settings.polliKey);
    
    var img = new Image();
    img.onload = function() {
        if ($('publishPage').classList.contains('active')) {
            pubImages.push({ url: url, desc: prompt });
            renderPubImages(); checkPublish();
        } else if (curChar) {
            appendMsg({ role: 'user', type: 'image', imageUrl: url, imageDesc: prompt, time: Date.now() });
            triggerAutoReply();
        }
        toast('图片已生成');
    };
    img.onerror = function() { toast('生成失败'); };
    img.src = url;
}

async function onImageSelect(e) {
    var f = e.target.files[0];
    if (!f) return;
    e.target.value = '';

    // 新增：封禁检查（图片发送前）
    var ok = await riskStatusCheck();
    if (!ok) {
        toast(window.__RISK_BAN_MSG__ || '账号已被封禁');
        return;
    }

    toast('处理中...');

    var reader = new FileReader();
    reader.onload = function(ev) {
        compressImg(ev.target.result, function(compressed) {
            if ($('publishPage').classList.contains('active')) {
                // 朋友圈：先添加base64，然后后台识图生成描述
                pubImages.push({ url: compressed, desc: '' });
                renderPubImages();
                checkPublish();
                toast('图片已添加，正在识别...');

                recognizeImage(compressed, function(desc) {
                    if (pubImages.length > 0) {
                        pubImages[pubImages.length - 1].desc = desc;
                        renderPubImages();
                    }
                });
            } else if (curChar) {
                var msgIdx = appendMsg({ role: 'user', type: 'image', imageUrl: compressed, imageDesc: '', time: Date.now() });
                toast('正在识别图片...');
                recognizeImage(compressed, function(desc) {
                    var data = getAccData();
                    var charId = curChar ? curChar.id : null;
                    if (!charId) return;
                    if (data.chats[charId] && data.chats[charId][msgIdx]) {
                        data.chats[charId][msgIdx].imageDesc = desc;
                        save();
                        renderMsgs(false);
                    }
                    toast('图片已识别');
                    triggerAutoReply();
                });
            }
        });
    };
    reader.readAsDataURL(f);
}

function compressImg(dataUrl, cb) {
    var img = new Image();
    img.onload = function() {
        var canvas = document.createElement('canvas');
        var maxSize = D.settings.imgSize || 512;
        var quality = D.settings.imgQuality || 0.6;
        var w = img.width, h = img.height;
        if (w > maxSize || h > maxSize) {
            if (w > h) { h = h * maxSize / w; w = maxSize; }
            else { w = w * maxSize / h; h = maxSize; }
        }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        cb(canvas.toDataURL('image/jpeg', quality));
    };
    img.src = dataUrl;
}

function triggerAutoReply() {
    if (!D.settings.autoReply || responding) return;
    var delay = D.settings.delay * 1000;
    if (delay > 0) { showDelay(D.settings.delay); timer = setTimeout(function() { removeDelay(); doResponse(); }, delay); }
    else doResponse();
}

function openVoice() { closeFunc(); $('voiceText').value = ''; openModal('voiceModal'); }

async function sendVoice() {
    var text = $('voiceText').value.trim();
    if (!text) return toast('请输入内容');

    var ok = await riskStatusCheck();
    if (!ok) return toast(window.__RISK_BAN_MSG__ || '账号已被封禁');

    closeModal('voiceModal');
    appendMsg({ role: 'user', type: 'voice', content: text, duration: Math.ceil(text.length / 5), time: Date.now() });
    triggerAutoReply();
}

function doPat() {
    closeFunc();
    if (!curChar) return;
    var acc = getCurAcc();
    appendMsg({ role: 'sys', type: 'sys', content: (acc ? acc.nick : '你') + ' 拍了拍 ' + curChar.displayName, time: Date.now() });
}
function editMsgContent() {
    var data = getAccData();
    var charId = curChar ? curChar.id : respondingCharId;
    var msg = data.chats[charId][selectedMsgIdx];
    if (!msg) { hideMsgMenu(); return; }
    
    // ✅ 关键修复：先保存索引到弹窗的dataset，再关闭菜单
    $('editMsgModal').dataset.msgIdx = selectedMsgIdx;
    $('editMsgModal').dataset.charId = charId;
    $('editMsgText').value = msg.content || '';
    hideMsgMenu();
    openModal('editMsgModal');
}

function saveEditMsg() {
    var content = $('editMsgText').value.trim();
    if (!content) return toast('内容不能为空');
    
    var data = getAccData();
    // ✅ 关键修复：从dataset读取保存的索引
    var charId = $('editMsgModal').dataset.charId;
    var msgIdx = parseInt($('editMsgModal').dataset.msgIdx);
    
    if (isNaN(msgIdx) || msgIdx < 0) {
        closeModal('editMsgModal');
        return toast('保存失败：索引无效');
    }
    
    if (data.chats[charId] && data.chats[charId][msgIdx]) {
        data.chats[charId][msgIdx].content = content;
        save();
        renderMsgs(false);
        toast('已保存');
    } else {
        toast('保存失败：消息不存在');
    }
    closeModal('editMsgModal');
}

function recognizeImage(imageData, callback) {
    var api = getApi2();
    // 如果副API不可用，降级到主API
    if (!api.key || !api.model) {
        api = D.api;
    }
    if (!api.key) {
        callback('图片');
        return;
    }
    
    // 判断是base64还是URL
    var isBase64 = imageData.startsWith('data:image');
    var msgContent;
    
    if (isBase64) {
        // base64格式
        msgContent = [
            { 
                type: 'image_url', 
                image_url: { url: imageData }
            }
        ];
    } else {
        // URL格式（兼容旧代码）
        msgContent = [
            { 
                type: 'image_url', 
                image_url: { url: imageData }
            }
        ];
    }
    
    fetch(api.url.replace(/\/+$/, '') + '/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + api.key },
        body: JSON.stringify({
            model: api.model,
            messages: [
                { 
                    role: 'system', 
                    content: '你是专业的图片内容分析助手。请详细分析用户发送的图片，输出准确的中文描述。\n\n【分析要求】\n- 描述图片中的主要内容、人物、物体、场景\n- 包括颜色、风格、氛围等视觉特征\n- 如果有文字，请转录文字内容\n- 如果是截图或表情包，描述其含义\n- 描述要具体详细，如果有文字内容必须全部写出，便于AI理解图片内容\n\n【输出格式】\n- 只输出描述内容，不要任何开头语如"好的"、"这是"、"图片显示"等\n- 不要说"我看到"、"我为您"等词\n- 直接输出描述，一段话即可，可以多句但不超过3句\n\n【示例】\n输入：一张猫的照片\n输出：一只橙色虎纹猫，坐在白色窗台上，阳光照在它身上，背景是模糊的室外景色，猫咪眯着眼睛看向镜头，表情温和。' 
                },
                { 
                    role: 'user', 
                    content: msgContent
                }
            ],
            temperature: 0.3,
            max_tokens: 99999
        })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (d.error) throw new Error(d.error.message);
        if (!d.choices || !d.choices[0]) throw new Error('无响应');
        var desc = d.choices[0].message.content.trim();
        desc = cleanResponsePrefix(desc);
        callback(desc);
    })
    .catch(function(e) {
        console.log('识图失败', e);
        callback('图片');
    });
}
function renderContacts() {
    var data = getAccData(); if (!data) return;
    var el = $('contactsPane');
    
    if (!data.chars.length) {
        el.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><div class="empty-title">还没有联系人</div><div class="empty-desc">点击右上角📥导入角色卡<br>或点击下方创建</div><button class="empty-btn" onclick="openCreateChar()">+ 创建角色</button></div>';
        return;
    }
    
    var sorted = data.chars.slice().sort(function(a, b) {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        var at = (data.chats[a.id] || []).slice(-1)[0]?.time || 0;
        var bt = (data.chats[b.id] || []).slice(-1)[0]?.time || 0;
        return bt - at;
    });
    
    var h = '<div class="contact-list">';
    h += '<div style="display:flex;justify-content:space-between;padding:0 2px 10px">';
    h += '<button class="empty-btn" style="padding:8px 16px;font-size:12px" onclick="openCreateChar()">+ 创建</button>';
    h += '<button style="padding:8px 16px;font-size:12px;background:var(--primary-light);color:var(--primary-dark);border:none;border-radius:16px;cursor:pointer" onclick="openGroupPage()">🔗 分组</button>';
    h += '</div>';
    
    for (var i = 0; i < sorted.length; i++) {
        var c = sorted[i];
        var msgs = (data.chats[c.id] || []).filter(function(m) { return m.type !== 'sys' && !m.recalled; });
        var last = msgs[msgs.length - 1];
        var preview = '点击开始聊天', time = '';
        if (last) {
            time = fmtTime(last.time);
            var rawPreview = last.type === 'image' ? '[图片]' : last.type === 'voice' ? '[语音]' : last.type === 'link' ? (getDisplayContent(last) || '[链接]') : (last.content || '');
            preview = rawPreview.length > 16 ? rawPreview.slice(0, 16) + '…' : rawPreview;
            if (last.role === 'user') preview = '我: ' + preview;
        }
        var pinCls = c.pinned ? ' pinned' : '';
        var swipeCls = swipedId === c.id ? ' swiped' : '';
        
        h += '<div class="contact-item'+pinCls+swipeCls+'" data-id="'+c.id+'" ontouchstart="cTouchStart(event)" ontouchmove="cTouchMove(event,\''+c.id+'\')" ontouchend="cTouchEnd()" onclick="cClick(\''+c.id+'\')">';
        h += '<div class="contact-avatar">';
        h += c.avatar && c.avatar.length > 2 ? '<img src="'+c.avatar+'">' : (c.avatar || c.realName.charAt(0));
        h += '</div><div class="contact-info">';
        h += '<div class="contact-name">'+esc(c.displayName)+'</div>';
        h += '<div class="contact-preview">'+esc(preview)+'</div>';
        h += '</div>';
        var unread = unreadCounts[c.id] || 0;
h += '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">';
        if (time) h += '<div class="contact-time">'+time+'</div>';
        if (unread > 0) h += '<div style="min-width:18px;height:18px;background:#FF6B6B;color:white;font-size:10px;border-radius:9px;display:flex;align-items:center;justify-content:center;padding:0 5px">'+(unread > 99 ? '99+' : unread)+'</div>';
        h += '</div>';
        h += '<div class="contact-actions">';
        h += '<div class="contact-action action-pin" onclick="event.stopPropagation();togglePin(\''+c.id+'\')"><span>'+(c.pinned?'📍':'📌')+'</span>'+(c.pinned?'取消':'置顶')+'</div>';
        h += '<div class="contact-action action-delete" onclick="event.stopPropagation();delCharFromList(\''+c.id+'\')"><span>🗑️</span>删除</div>';
        h += '</div></div>';
    }
    el.innerHTML = h + '</div>';
}

var touchStartX = 0, touchStartY = 0;
var momTouchStartX = 0, momTouchStartY = 0;

function cTouchStart(e) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
}

function cTouchMove(e, id) {
    var dx = touchStartX - e.touches[0].clientX;
    var dy = Math.abs(touchStartY - e.touches[0].clientY);

    // 关键：纵向滚动优先，不处理横滑
    if (dy > Math.abs(dx)) return;

    if (dx > 50) {
        if (swipedId && swipedId !== id) document.querySelector('.contact-item[data-id="'+swipedId+'"]')?.classList.remove('swiped');
        swipedId = id;
        document.querySelector('.contact-item[data-id="'+id+'"]')?.classList.add('swiped');
    } else if (dx < -30 && swipedId === id) {
        document.querySelector('.contact-item[data-id="'+id+'"]')?.classList.remove('swiped');
        swipedId = null;
    }
}

function momTouchStart(e) {
    momTouchStartX = e.touches[0].clientX;
    momTouchStartY = e.touches[0].clientY;
}

function momTouchMove(e, id) {
    var dx = momTouchStartX - e.touches[0].clientX;
    var dy = Math.abs(momTouchStartY - e.touches[0].clientY);

    // 关键：纵向滚动优先
    if (dy > Math.abs(dx)) return;

    if (dx > 50) {
        if (swipedMomentId && swipedMomentId !== id) {
            var old = document.querySelector('.moment-item[data-mid="'+swipedMomentId+'"]');
            if (old) old.classList.remove('swiped');
        }
        swipedMomentId = id;
        var el = document.querySelector('.moment-item[data-mid="'+id+'"]');
        if (el) el.classList.add('swiped');
    } else if (dx < -30 && swipedMomentId === id) {
        var el2 = document.querySelector('.moment-item[data-mid="'+id+'"]');
        if (el2) el2.classList.remove('swiped');
        swipedMomentId = null;
    }
}

function cTouchEnd() {
    touchStartX = 0;
    touchStartY = 0;
}

function momTouchEnd() {
    momTouchStartX = 0;
    momTouchStartY = 0;
}

function cClick(id) {
    if (swipedId) { document.querySelector('.contact-item[data-id="'+swipedId+'"]')?.classList.remove('swiped'); swipedId = null; return; }
    openChat(id);
}
// ========== 编辑本轮回复 ==========
var editAiRoundData = []; // 存储当前编辑的消息

function openEditAiRound() {
    if (!curChar) return;
    var data = getAccData();
    var msgs = data.chats[curChar.id] || [];
    
    // 从后往前找最后一轮AI消息
    editAiRoundData = [];
    for (var i = msgs.length - 1; i >= 0; i--) {
        var m = msgs[i];
        if (m.type === 'sys' || m.recalled) continue;
        if (m.role === 'user') break;
        if (m.role === 'ai') editAiRoundData.unshift({ idx: i, content: m.content || '', type: m.type || 'text', imageDesc: m.imageDesc || '', stickerDesc: m.stickerDesc || '', isNew: false });
    }
    
    if (!editAiRoundData.length) return toast('没有可编辑的AI回复');
    
    renderEditAiRoundList();
    openModal('editAiRoundModal');
}

function renderEditAiRoundList() {
    var h = '';
    
    // 第一条前面可以插入新消息
    h += '<div style="text-align:center;margin-bottom:8px">';
    h += '<button onclick="insertEditAiMsg(0)" style="padding:6px 16px;border:none;border-radius:16px;background:var(--accent-mint);color:#2D7A5F;font-size:12px;cursor:pointer">＋ 在最前面插入消息</button>';
    h += '</div>';
    
    for (var i = 0; i < editAiRoundData.length; i++) {
        var item = editAiRoundData[i];
        h += '<div id="edit_ai_item_' + i + '" style="margin-bottom:8px;border:1.5px solid #eee;border-radius:12px;padding:12px;background:' + (item.isNew ? '#F0FFF4' : '#fff') + '">';
        
        // 标题栏
        h += '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">';
        h += '<span style="font-size:11px;color:var(--text-light);font-weight:500">' + (item.isNew ? '✨ 新增消息' : '💬 第' + (i+1) + '条') + '</span>';
        h += '<button onclick="deleteEditAiMsg(' + i + ')" style="padding:3px 10px;border:none;border-radius:10px;background:#FFE0E0;color:#FF6B6B;font-size:11px;cursor:pointer">🗑 删除</button>';
        h += '</div>';
        
        // 文本框
        if (item.type === 'image') {
            h += '<div style="font-size:11px;color:var(--text-gray);margin-bottom:4px">图片描述：</div>';
            h += '<textarea onchange="editAiRoundData[' + i + '].imageDesc=this.value" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:13px;min-height:60px;resize:vertical;font-family:inherit;box-sizing:border-box">' + (item.imageDesc || '') + '</textarea>';
        } else if (item.type === 'sticker') {
            h += '<div style="font-size:12px;color:var(--text-gray);padding:8px;background:#f8f8f8;border-radius:8px">[表情包: ' + (item.stickerDesc || '') + ']<br><span style="font-size:11px;color:var(--text-light)">表情包不可编辑内容</span></div>';
        } else {
            h += '<div style="font-size:11px;color:var(--text-gray);margin-bottom:4px">消息内容（可包含格式词如 &lt;SPLIT&gt;）：</div>';
            h += '<textarea onchange="editAiRoundData[' + i + '].content=this.value" style="width:100%;padding:8px;border:1px solid #ddd;border-radius:8px;font-size:13px;min-height:80px;resize:vertical;font-family:inherit;box-sizing:border-box">' + (item.content || '') + '</textarea>';
        }
        
        // 在此条后面插入
        h += '<div style="text-align:center;margin-top:8px">';
        h += '<button onclick="insertEditAiMsg(' + (i+1) + ')" style="padding:4px 14px;border:none;border-radius:16px;background:var(--primary-light);color:var(--primary-dark);font-size:11px;cursor:pointer">＋ 在此后插入消息</button>';
        h += '</div>';
        
        h += '</div>';
    }
    
    $('editAiRoundList').innerHTML = h;
}

function insertEditAiMsg(pos) {
    editAiRoundData.splice(pos, 0, { idx: -1, content: '', type: 'text', imageDesc: '', stickerDesc: '', isNew: true });
    renderEditAiRoundList();
    // 滚动到新增位置
    var el = $('edit_ai_item_' + pos);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function deleteEditAiMsg(pos) {
    if (editAiRoundData.length <= 1) return toast('至少保留一条消息');
    editAiRoundData.splice(pos, 1);
    renderEditAiRoundList();
}

function saveEditAiRound() {
    if (!curChar) return;
    var data = getAccData();
    var msgs = data.chats[curChar.id] || [];
    
    // 收集所有textarea的最新值（onchange有时候触发不及时）
    for (var i = 0; i < editAiRoundData.length; i++) {
        var ta = $('editAiRoundList').querySelectorAll('textarea')[i === 0 ? 0 : i];
    }
    // 重新读取所有textarea值
    var textareas = $('editAiRoundList').querySelectorAll('textarea');
    var taIdx = 0;
    for (var i = 0; i < editAiRoundData.length; i++) {
        var item = editAiRoundData[i];
        if (item.type !== 'sticker' && taIdx < textareas.length) {
            if (item.type === 'image') {
                item.imageDesc = textareas[taIdx].value;
            } else {
                item.content = textareas[taIdx].value;
            }
            taIdx++;
        }
    }
    
    // 找到原来这轮消息的位置范围，全部删除
    var origIndices = editAiRoundData.filter(function(x) { return !x.isNew && x.idx >= 0; }).map(function(x) { return x.idx; });
    
    if (origIndices.length) {
        var minIdx = Math.min.apply(null, origIndices);
        // 删除原来这轮的所有AI消息（从minIdx开始到末尾的AI消息）
        var i = msgs.length - 1;
        while (i >= minIdx) {
            var m = msgs[i];
            if (m.type === 'sys' || m.recalled) { i--; continue; }
            if (m.role === 'user') break;
            if (m.role === 'ai') msgs.splice(i, 1);
            i--;
        }
    }
    
    // 插入编辑后的消息
    var now = Date.now();
    editAiRoundData.forEach(function(item, i) {
        if (!item.content && item.type === 'text') return; // 跳过空文字消息
        var newMsg = {
            role: 'ai',
            type: item.type === 'text' ? undefined : item.type,
            content: item.content,
            time: now + i
        };
        if (item.type === 'image') newMsg.imageDesc = item.imageDesc;
        if (item.type === 'sticker') { newMsg.stickerUrl = item.stickerUrl; newMsg.stickerDesc = item.stickerDesc; }
        // 清理undefined
        if (!newMsg.type) delete newMsg.type;
        msgs.push(newMsg);
    });
    
    // 同步更新记忆：把这轮修改后的内容更新到最近的记忆摘要里
    syncEditToMemory(curChar.id, editAiRoundData);
    
    save();
    renderMsgs(false);
    closeModal('editAiRoundModal');
    toast('已保存');
}

function syncEditToMemory(charId, editedItems) {
    // 把编辑内容追加到记忆末尾作为修正记录
    var data = getAccData();
    if (!data.memories[charId]) data.memories[charId] = [];
    var summary = editedItems.filter(function(x) { return x.content && x.type === 'text'; }).map(function(x) { return x.content; }).join('；');
    if (!summary) return;
    // 检查最后一条记忆是不是已经是这次的修正
    var mems = data.memories[charId];
    var lastMem = mems.length ? mems[mems.length - 1] : null;
    if (lastMem && lastMem.isEditCorrection) {
        // 更新而不是新增
        lastMem.content = '[本轮回复已编辑] ' + summary.slice(0, 100);
        lastMem.time = Date.now();
    } else {
        mems.push({
            id: genId('mem'),
            content: '[本轮回复已编辑] ' + summary.slice(0, 100),
            time: Date.now(),
            isEditCorrection: true
        });
    }
}
function deleteMoment(id) {
    var data = getAccData();
    var m = data.moments.find(function(x) { return x.id === id; });
    if (!m) return;
    
    // 只有作者可以删除
    var isOwner = m.authorType === 'user' || m.authorId === 'user';
    if (!isOwner && !confirm('删除这条朋友圈？')) return;
    if (isOwner && !confirm('删除这条朋友圈？')) return;
    
    data.moments = data.moments.filter(function(x) { return x.id !== id; });
    swipedMomentId = null;
    save();
    renderMoments();
    toast('已删除');
}

function forwardMoment(id) {
    var data = getAccData();
    var m = data.moments.find(function(x) { return x.id === id; });
    if (!m) return;
    swipedMomentId = null;
    
    // 把朋友圈内容填入发布页
    pubImages = m.images ? m.images.slice() : [];
    pubLoc = m.location || '';
    pubVisGroups = [];
    $('publishText').value = m.content || '';
    $('pubLocVal').textContent = pubLoc || '未填写 ›';
    $('pubVisVal').textContent = '公开 ›';
    renderPubImages();
    checkPublish();
    $('publishPage').classList.add('active');
    renderMoments();
    toast('已填入发布页，可修改后发布');
}
// ========== 记忆页面 ==========
function openMemoryPage() {
    if (!curChar) return;
    var data = getAccData();
    var mems = data.memories[curChar.id] || [];
    $('memoryPageTitle').textContent = curChar.displayName + ' 的记忆';
    var h = '';
    if (!mems.length) {
        h = '<div style="text-align:center;padding:40px;color:var(--text-light)">暂无记忆，点击下方按钮手动添加或总结</div>';
    } else {
        for (var i = mems.length - 1; i >= 0; i--) {
            var m = mems[i];
            h += '<div style="background:white;border-radius:12px;padding:14px;margin:8px 16px;box-shadow:0 1px 4px rgba(0,0,0,0.06)">';
            h += '<div style="font-size:13px;color:#333;line-height:1.6">' + esc(m.content) + '</div>';
            h += '<div style="font-size:11px;color:#bbb;margin-top:6px;display:flex;justify-content:space-between;align-items:center">';
            h += '<span>' + fmtTime(m.time) + (m.auto ? ' · 自动总结' : '') + '</span>';
            h += '<span onclick="deleteMemory(\'' + curChar.id + '\',' + i + ')" style="color:#FF6B6B;cursor:pointer;padding:2px 8px">删除</span>';
            h += '</div></div>';
        }
    }
    $('memoryList').innerHTML = h;
    $('memoryPage').classList.add('active');
}

function closeMemoryPage() {
    $('memoryPage').classList.remove('active');
}

function openAddMemory() {
    $('memoryModalTitle').textContent = '📝 添加记忆';
    $('memoryContent').value = '';
    openModal('memoryModal');
}

function saveMemory() {
    var content = $('memoryContent').value.trim();
    if (!content) return toast('请输入内容');
    if (!curChar) return toast('请先选择角色');
    var data = getAccData();
    if (!data.memories[curChar.id]) data.memories[curChar.id] = [];
    data.memories[curChar.id].push({
        id: genId('mem'),
        content: content,
        time: Date.now(),
        auto: false
    });
    save();
    closeModal('memoryModal');
    openMemoryPage();
    toast('已添加');
}

function deleteMemory(charId, idx) {
    if (!confirm('删除这条记忆？')) return;
    var data = getAccData();
    if (data.memories[charId]) {
        data.memories[charId].splice(idx, 1);
        save();
        openMemoryPage();
        toast('已删除');
    }
}

function mergeMemories() {
    if (!curChar) return;
    if (!D.api || !D.api.key) return toast('请先配置API');
    var maxLen = parseInt($('mergeCount').value) || 500;
    var data = getAccData();
    var mems = data.memories[curChar.id] || [];
    if (!mems.length) return toast('暂无记忆可合并');
    if (mems.length === 1) return toast('只有一条记忆，无需合并');

    toast('正在合并记忆...');

    var api = (typeof getApi2 === 'function') ? getApi2() : D.api;
    if (!api || !api.key) api = D.api;

    var allContent = mems.map(function(m, i) {
        return (i + 1) + '. ' + m.content;
    }).join('\n');

    fetch(api.url.replace(/\/+$/, '') + '/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + api.key },
        body: JSON.stringify({
            model: api.model,
            messages: [
                { role: 'system', content: '请将以下多条记忆摘要整合为一篇连贯的长篇记忆。要求：去除重复内容；按时间顺序整理；保留所有重要事件、情感变化、关键细节；字数控制在' + maxLen + '字以内；用中文输出；直接输出整合后的内容，不要任何开头语、标题、编号。' },
                { role: 'user', content: allContent }
            ],
            temperature: 0.3,
            max_tokens: 2000
        })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (d.error) throw new Error(d.error.message);
        var merged = d.choices[0].message.content.trim();
        var freshData = getAccData();
        // 用合并后的一条替换所有原来的记忆
        freshData.memories[curChar.id] = [{
            id: genId('mem'),
            content: merged,
            time: Date.now(),
            auto: false
        }];
        save();
        openMemoryPage();
        toast('合并完成');
    })
    .catch(function(e) { toast('合并失败：' + e.message); });
}
// 获取该时间戳所属的5分钟区间编号
function get5MinSlot(ts) {
    return Math.floor(ts / (5 * 60 * 1000));
}

// 格式化时间戳为显示文字
function fmtTimeLabel(ts) {
    var d = getDateInThemeTz(ts);
    var now = getDateInThemeTz(Date.now());

    var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
    var hm = pad(d.getHours()) + ':' + pad(d.getMinutes());

    function sameYMD(a, b) {
        return a.getFullYear() === b.getFullYear() &&
               a.getMonth() === b.getMonth() &&
               a.getDate() === b.getDate();
    }

    if (sameYMD(d, now)) return hm;

    var yesterday = new Date(now.getTime());
    yesterday.setDate(now.getDate() - 1);
    if (sameYMD(d, yesterday)) return '昨天 ' + hm;

    if (d.getFullYear() === now.getFullYear()) return (d.getMonth()+1) + '月' + d.getDate() + '日 ' + hm;
    return d.getFullYear() + '年' + (d.getMonth()+1) + '月' + d.getDate() + '日 ' + hm;
}

// 渲染时间戳div的html
function renderTimeLabel(ts) {
    return '<div class="msg-time-label">' + fmtTimeLabel(ts) + '</div>';
}

// 判断两条消息之间是否需要插时间戳
// 规则：上一条消息和当前消息不在同一个5分钟区间
function needTimeLabel(prevMsg, curMsg) {
    if (!prevMsg) return true; // 第一条消息前总是显示
    // sys消息不参与判断（忽略它，用它前面最近的非sys消息）
    return get5MinSlot(prevMsg.time) !== get5MinSlot(curMsg.time);
}

function fmtDuration(ms) {
    var sec = Math.floor(ms / 1000);
    if (sec < 60) return sec + '秒';
    var min = Math.floor(sec / 60);
    if (min < 60) return min + '分钟';
    var hour = Math.floor(min / 60);
    if (hour < 24) return hour + '小时' + (min % 60 ? (min % 60) + '分钟' : '');
    var day = Math.floor(hour / 24);
    return day + '天' + (hour % 24 ? (hour % 24) + '小时' : '');
}
// 更新前一条消息的气泡样式（当新消息加入后）
function updatePrevBubbleStyle(charId, newIdx) {
    if (newIdx < 1) return;

    var data = getAccData();
    if (!data || !data.chats || !data.chats[charId]) return;

    var msgs = data.chats[charId];
    var newMsg = msgs[newIdx];
    if (!newMsg || newMsg.type === 'sys' || newMsg.recalled) return;

    // 找前一条有效消息（非sys、非撤回）
    var prevIdx = -1;
    for (var i = newIdx - 1; i >= 0; i--) {
        var m = msgs[i];
        if (m && m.type !== 'sys' && !m.recalled) {
            prevIdx = i;
            break;
        }
    }
    if (prevIdx < 0) return;

    var prevMsg = msgs[prevIdx];
    if (!prevMsg || prevMsg.role !== newMsg.role) return;

    // 只更新 DOM 中前一条的气泡类
    var prevEl = document.querySelector('[data-idx="' + prevIdx + '"]');
    if (!prevEl) return;

    prevEl.classList.remove('bubble-single', 'bubble-first', 'bubble-middle', 'bubble-last');
    var newPos = getBubblePosition(prevIdx, prevMsg.role);
    prevEl.classList.add('bubble-' + newPos);
}
function _isAiMoment(m) {
    return m && (m.authorType === 'ai' || (m.authorId && m.authorId !== 'user' && m.authorType !== 'user'));
}

function openMomentCleanMenu() {
    var data = getAccData();
    if (!data || !data.moments || !data.moments.length) return toast('暂无朋友圈可清理');

    __showIosActionSheet('🧹 朋友圈清理', [
        {
            text: '清空全部朋友圈',
            danger: true,
            onClick: function () {
                if (!confirm('确定清空【全部朋友圈】吗？')) return;
                doCleanMoments('all');
            }
        },
        {
            text: '清空全部AI朋友圈',
            danger: true,
            onClick: function () {
                if (!confirm('确定清空【全部AI朋友圈】吗？')) return;
                doCleanMoments('aiAll');
            }
        },
        {
            text: '按某个AI清空',
            onClick: function () {
                openMomentCleanCharSheet();
            }
        },
        {
            text: '清空我发的朋友圈',
            danger: true,
            onClick: function () {
                if (!confirm('确定清空【我发的朋友圈】吗？')) return;
                doCleanMoments('user');
            }
        }
    ]);
}
function __getTopModalZ() {
    var maxZ = 1000;
    document.querySelectorAll('.modal.active, .choice-modal.active, .error-modal.active').forEach(function(el) {
        var z = parseInt(window.getComputedStyle(el).zIndex, 10);
        if (isFinite(z) && z > maxZ) maxZ = z;
    });
    return maxZ;
}

function __closeIosActionSheet() {
    var mask = document.getElementById('iosActionSheetMask');
    if (!mask) return;
    mask.style.opacity = '0';
    var panel = mask.querySelector('.ios-action-sheet-panel');
    if (panel) panel.style.transform = 'translateY(20px)';
    setTimeout(function() {
        if (mask && mask.parentNode) mask.parentNode.removeChild(mask);
    }, 180);
}

function __showIosActionSheet(title, actions) {
    __closeIosActionSheet();

    var topZ = __getTopModalZ();
    var baseZ = Math.max(20000, topZ + 20); // 关键：永远盖在现有弹窗上

    var mask = document.createElement('div');
    mask.id = 'iosActionSheetMask';
    mask.style.cssText = [
        'position:fixed',
        'inset:0',
        'background:rgba(0,0,0,0.22)',
        'backdrop-filter:blur(4px)',
        '-webkit-backdrop-filter:blur(4px)',
        'display:flex',
        'align-items:flex-end',
        'justify-content:center',
        'padding:10px',
        'opacity:0',
        'transition:opacity .18s ease',
        'z-index:' + baseZ
    ].join(';');

    var panel = document.createElement('div');
    panel.className = 'ios-action-sheet-panel';
    panel.style.cssText = [
        'width:min(520px,96vw)',
        'transform:translateY(20px)',
        'transition:transform .2s ease',
        'font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","PingFang SC",sans-serif'
    ].join(';');

    var card = document.createElement('div');
    card.style.cssText = [
        'background:rgba(255,255,255,0.92)',
        'backdrop-filter:blur(22px)',
        '-webkit-backdrop-filter:blur(22px)',
        'border-radius:14px',
        'overflow:hidden',
        'box-shadow:0 12px 36px rgba(0,0,0,.18)'
    ].join(';');

    if (title) {
        var hd = document.createElement('div');
        hd.textContent = title;
        hd.style.cssText = 'padding:12px 14px;font-size:13px;color:#8a8a8f;text-align:center;border-bottom:1px solid rgba(60,60,67,.16)';
        card.appendChild(hd);
    }

    (actions || []).forEach(function(a, i) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.textContent = a.text || '操作';
        btn.style.cssText = [
            'width:100%',
            'border:none',
            'background:transparent',
            'padding:15px 12px',
            'font-size:17px',
            'line-height:1.2',
            'color:' + (a.danger ? '#ff3b30' : '#007aff'),
            'cursor:pointer',
            'border-top:' + (i > 0 ? '1px solid rgba(60,60,67,.16)' : 'none')
        ].join(';');
        btn.onclick = function(e) {
            e.stopPropagation();
            __closeIosActionSheet();
            setTimeout(function() {
                if (typeof a.onClick === 'function') a.onClick();
            }, 180);
        };
        card.appendChild(btn);
    });

    var cancelWrap = document.createElement('div');
    cancelWrap.style.cssText = 'height:8px';

    var cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.textContent = '取消';
    cancelBtn.style.cssText = [
        'width:100%',
        'border:none',
        'background:rgba(255,255,255,0.96)',
        'backdrop-filter:blur(22px)',
        '-webkit-backdrop-filter:blur(22px)',
        'padding:15px 12px',
        'font-size:17px',
        'font-weight:600',
        'color:#007aff',
        'border-radius:14px',
        'box-shadow:0 8px 22px rgba(0,0,0,.12)'
    ].join(';');
    cancelBtn.onclick = function(e) {
        e.stopPropagation();
        __closeIosActionSheet();
    };

    panel.appendChild(card);
    panel.appendChild(cancelWrap);
    panel.appendChild(cancelBtn);
    mask.appendChild(panel);

    mask.addEventListener('click', function(e) {
        if (e.target === mask) __closeIosActionSheet();
    });

    document.body.appendChild(mask);

    requestAnimationFrame(function() {
        mask.style.opacity = '1';
        panel.style.transform = 'translateY(0)';
    });
}
function openMomentCleanCharSheet() {
    var data = getAccData();
    var aiChars = (data.chars || []).filter(function(c) {
        return data.moments.some(function(m) { return _isAiMoment(m) && m.authorId === c.id; });
    });

    if (!aiChars.length) return toast('没有可清理的AI朋友圈');

    var actions = aiChars.map(function(c) {
        return {
            text: '清空 ' + (c.displayName || c.realName || c.id),
            danger: true,
            onClick: function () {
                if (!confirm('确定清空【' + (c.displayName || c.realName) + '】的朋友圈吗？')) return;
                doCleanMoments('char', c.id);
            }
        };
    });

    __showIosActionSheet('选择要清理的AI', actions);
}

function doCleanMoments(mode, charId) {
    var data = getAccData();
    if (!data || !Array.isArray(data.moments)) return;

    var before = data.moments.length;

    if (mode === 'all') {
        data.moments = [];
    } else if (mode === 'aiAll') {
        data.moments = data.moments.filter(function(m) { return !_isAiMoment(m); });
    } else if (mode === 'user') {
        data.moments = data.moments.filter(function(m) { return !(m.authorType === 'user' || m.authorId === 'user'); });
    } else if (mode === 'char') {
        data.moments = data.moments.filter(function(m) { return !(_isAiMoment(m) && m.authorId === charId); });
    }

    var removed = before - data.moments.length;
    if (removed <= 0) return toast('没有可清理内容');

    save();
    if (typeof queueBgSync === 'function') queueBgSync(0);
    renderMoments();
    if ($('myMomentsPage') && $('myMomentsPage').classList.contains('active')) openMyMoments();
    toast('已清理 ' + removed + ' 条朋友圈');
}
// ========== 重新识图功能 ==========
function retryRecognizeImage() {
    var data = getAccData();
    var charId = curChar ? curChar.id : respondingCharId;
    var msg = data.chats[charId][selectedMsgIdx];
    
    if (!msg || msg.type !== 'image' || !msg.imageUrl) {
        hideMsgMenu();
        return toast('无法识图，图片数据丢失');
    }

    hideMsgMenu();
    toast('正在重新识图，请稍候...');

    recognizeImage(msg.imageUrl, function(desc) {
        if (!desc || desc === '图片') {
            toast('识图失败：可能是 API 报错或超时，请稍后再试');
        } else {
            msg.imageDesc = desc;
            save();
            toast('✅ 识图成功！(单点图片可查看描述)');
        }
    });
}
// ========== 链接内容处理系统 ==========
var LINK_DATA_SEP = '\n\n{{FETCHED_LINK_DATA}}\n';

function getDisplayContent(m) {
    var c = m.content || '';
    var idx = c.indexOf('{{FETCHED_LINK_DATA}}');
    return idx >= 0 ? c.slice(0, idx).trim() : c;
}

function isBlockedContent(text) {
    if (!text || text.length < 80) return true;
    var bw = ['登录','验证码','请先登录','login required','sign in','captcha',
              '请完成验证','在App内打开','打开APP','下载App','异常流量',
              'unusual traffic','robot','are you human','access denied'];
    var lt = text.toLowerCase();
    var hit = 0;
    bw.forEach(function(w) { if (lt.indexOf(w.toLowerCase()) >= 0) hit++; });
    return hit >= 2 || (text.length < 500 && hit >= 1);
}

function toMobileUrl(u) {
    if (u.indexOf('zhihu.com') >= 0) return u.replace('www.zhihu.com', 'm.zhihu.com');
    if (u.indexOf('weibo.com') >= 0) return u.replace('weibo.com', 'm.weibo.cn');
    if (u.indexOf('xiaohongshu.com') >= 0) return u.replace('www.xiaohongshu.com', 'm.xiaohongshu.com');
    return u;
}

async function jinaSearch(query) {
    var results = [];
    try {
        var resp = await Promise.race([
            fetch('https://s.jina.ai/' + encodeURIComponent(query), {
                headers: { 'Accept': 'application/json' }
            }),
            new Promise(function(_, r) { setTimeout(function(){ r({ok:false}); }, 15000); })
        ]);
        if (resp.ok) {
            var json = await resp.json();
            (json.data || []).slice(0, 5).forEach(function(d) {
                if (d.url) results.push({
                    url: d.url,
                    title: d.title || '',
                    desc: (d.description || d.content || '').slice(0, 300)
                });
            });
        }
    } catch(e) {
        try {
            var resp2 = await Promise.race([
                fetch('https://s.jina.ai/' + encodeURIComponent(query)),
                new Promise(function(_, r) { setTimeout(function(){ r({ok:false}); }, 15000); })
            ]);
            if (resp2.ok) {
                var stext = await resp2.text();
                var blocks = stext.split(/\[\d+\]/);
                for (var i = 1; i < blocks.length && i <= 5; i++) {
                    var um = blocks[i].match(/URL:\s*(https?:\/\/[^\s\n]+)/i);
                    var tm = blocks[i].match(/Title:\s*(.+)/i);
                    if (um) results.push({
                        url: um[1].trim(),
                        title: tm ? tm[1].trim() : '',
                        desc: blocks[i].replace(/URL:.+/i,'').replace(/Title:.+/i,'').trim().slice(0,300)
                    });
                }
            }
        } catch(e2) {}
    }
    return results;
}

// 用jina读取页面内容（极速版）
async function jinaRead(url) {
    try {
        var resp = await Promise.race([
            fetch('https://r.jina.ai/' + url, {
                headers: { 'Accept': 'text/markdown', 'X-Timeout': '4', 'X-Return-Format': 'markdown' }
            }),
            new Promise(function(_, r) { setTimeout(function(){ r({ok:false}); }, 6000); })
        ]);
        if (resp.ok) {
            var text = await resp.text();
            if (text && text.length > 150 && !isBlockedContent(text)) return text;
        }
    } catch(e) {}
    return '';
}

// 通用页面抓取（直接读 → 移动版 → 搜索引擎缓存）
async function fetchPageContent(url) {
    if (!url) return { text: '', title: '', ok: false };

    showFetchProgress();
    
    var isHardSite = /xiaohongshu|xhslink|douyin|tiktok|weibo|bilibili|zhihu|baidu/.test(url);

    // ===== 8 大抓取通道 =====
    var _lastRawHtml = '';
    var _collectedImages = [];
    var channels = [
        {
            name: '① Jina读取',
            skip: isHardSite,
            run: function() {
                return Promise.race([
                    fetch('https://r.jina.ai/' + url, {
                        headers: { 'Accept': 'text/markdown', 'X-Timeout': '8', 'X-Return-Format': 'markdown', 'X-No-Cache': 'true' }
                    }).then(function(r) { return r.text(); }),
                    new Promise(function(_, rej) { setTimeout(function(){ rej(new Error('超时')); }, 10000); })
                ]);
            }
        },
        {
            name: '② Jina手机版',
            skip: isHardSite,
            run: function() {
                var mob = toMobileUrl(url);
                if (mob === url) return Promise.reject(new Error('无手机版'));
                return Promise.race([
                    fetch('https://r.jina.ai/' + mob, {
                        headers: { 'Accept': 'text/markdown', 'X-Timeout': '8', 'X-Return-Format': 'markdown' }
                    }).then(function(r) { return r.text(); }),
                    new Promise(function(_, rej) { setTimeout(function(){ rej(new Error('超时')); }, 10000); })
                ]);
            }
        },
        {
            name: '③ AllOrigins代理',
            run: function() {
                return Promise.race([
                    fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent(url))
                        .then(function(r) { if (!r.ok) throw new Error(r.status); return r.text(); })
                        .then(function(h) { _lastRawHtml = h; _collectedImages = _collectedImages.concat(extractImagesFromHtml(h)); return stripHtml(h); }),
                    new Promise(function(_, rej) { setTimeout(function(){ rej(new Error('超时')); }, 12000); })
                ]);
            }
        },
        {
            name: '④ CorsPrxy代理',
            run: function() {
                return Promise.race([
                    fetch('https://corsproxy.io/?' + encodeURIComponent(url))
                        .then(function(r) { if (!r.ok) throw new Error(r.status); return r.text(); })
                        .then(function(h) { _lastRawHtml = h; _collectedImages = _collectedImages.concat(extractImagesFromHtml(h)); return stripHtml(h); }),
                    new Promise(function(_, rej) { setTimeout(function(){ rej(new Error('超时')); }, 12000); })
                ]);
            }
        },
        {
            name: '⑤ CorsAnywhere',
            run: function() {
                return Promise.race([
                    fetch('https://api.codetabs.com/v1/proxy?quest=' + encodeURIComponent(url))
                        .then(function(r) { if (!r.ok) throw new Error(r.status); return r.text(); })
                        .then(function(h) { _lastRawHtml = h; _collectedImages = _collectedImages.concat(extractImagesFromHtml(h)); return stripHtml(h); }),
                    new Promise(function(_, rej) { setTimeout(function(){ rej(new Error('超时')); }, 12000); })
                ]);
            }
        },
        {
            name: '⑥ Microlink引擎',
            run: function() {
                return Promise.race([
                    fetch('https://api.microlink.io/?url=' + encodeURIComponent(url) + '&prerender=true')
                        .then(function(r) { return r.json(); })
                        .then(function(res) {
                            if (res.status === 'success' && res.data) {
                                var parts = [];
                                if (res.data.title) parts.push('# ' + res.data.title);
                                if (res.data.description) parts.push(res.data.description);
                                if (res.data.lang) parts.push('[语言: ' + res.data.lang + ']');
                                var combined = parts.join('\n\n');
                                if (combined.length > 30) return combined;
                            }
                            throw new Error('Microlink无内容');
                        }),
                    new Promise(function(_, rej) { setTimeout(function(){ rej(new Error('超时')); }, 15000); })
                ]);
            }
        },
        {
            name: '⑦ 搜索情报(URL)',
            run: function() {
                return jinaSearch(url).then(function(sr) {
                    if (sr.length > 0) {
                        return sr.slice(0, 3).map(function(s) {
                            return '【' + s.title + '】\n' + s.desc;
                        }).join('\n\n');
                    }
                    throw new Error('搜索无果');
                });
            }
        },
        {
            name: '⑧ 搜索情报(关键词)',
            run: function() {
                // 从URL中提取关键词进行搜索
                var keywords = url.replace(/https?:\/\//,'').replace(/[\/\?\#\&\=\_\-\.]/g, ' ').trim();
                return jinaSearch(keywords).then(function(sr) {
                    if (sr.length > 0) {
                        return sr.slice(0, 3).map(function(s) {
                            return '【' + s.title + '】\n' + s.desc;
                        }).join('\n\n');
                    }
                    throw new Error('搜索无果');
                });
            }
        },
        {
            name: '⑨ 图片专抓(og)',
            run: function() {
                // 专门抓og:image，不要求文字
                return Promise.race([
                    fetch('https://api.allorigins.win/get?url=' + encodeURIComponent(url))
                        .then(function(r) { return r.json(); })
                        .then(function(d) {
                            var h = d.contents || '';
                            var imgs = extractImagesFromHtml(h);
                            _collectedImages = _collectedImages.concat(imgs);
                            return stripHtml(h);
                        }),
                    new Promise(function(_, rej) { setTimeout(function(){ rej(new Error('超时')); }, 12000); })
                ]);
            }
        },
        {
            name: '⑩ Webcache代理',
            run: function() {
                return Promise.race([
                    fetch('https://api.allorigins.win/raw?url=' + encodeURIComponent('https://webcache.googleusercontent.com/search?q=cache:' + url))
                        .then(function(r) { if (!r.ok) throw new Error(r.status); return r.text(); })
                        .then(function(h) { _collectedImages = _collectedImages.concat(extractImagesFromHtml(h)); return stripHtml(h); }),
                    new Promise(function(_, rej) { setTimeout(function(){ rej(new Error('超时')); }, 10000); })
                ]);
            }
        }
    ];

    // 逐个尝试
    var bestText = '';
    var bestTitle = '';

    for (var i = 0; i < channels.length; i++) {
        var ch = channels[i];
        if (ch.skip) {
            updateFetchProgress(i, ch.name, 'fail', '跳过');
            continue;
        }
        updateFetchProgress(i, ch.name, 'loading', '请求中...');
        try {
            var text = await ch.run();
            if (text && text.length > 80 && !isBlockedContent(text)) {
                updateFetchProgress(i, ch.name, 'ok', text.length + '字');
                var titleMatch = text.match(/^#\s+(.+)/m) || text.match(/【(.+?)】/);
                closeFetchProgress(true, text.length);
                var extractedImages = extractImagesFromHtml(_lastRawHtml);
                // 合并所有通道收集到的图片
                var allImages = _collectedImages.concat(extractedImages);
                var uniqueImages = [];
                allImages.forEach(function(img) {
                    if (img && uniqueImages.indexOf(img) < 0) uniqueImages.push(img);
                });
                _lastRawHtml = '';
                _collectedImages = [];
                return { 
                    text: text, 
                    title: titleMatch ? titleMatch[1].trim() : '', 
                    ok: true,
                    images: uniqueImages
                };
            } else {
                var reason = !text ? '空内容' : text.length <= 80 ? '内容太短(' + text.length + '字)' : '被拦截';
                updateFetchProgress(i, ch.name, 'fail', reason);
                // 保留最长的结果作为备用
                if (text && text.length > bestText.length) {
                    bestText = text;
                    var tm = text.match(/^#\s+(.+)/m);
                    if (tm) bestTitle = tm[1].trim();
                }
            }
        } catch(e) {
            updateFetchProgress(i, ch.name, 'fail', (e && e.message) || '出错');
        }
    }

    // 全部失败，用最好的残次品
    if (bestText.length > 30) {
        closeFetchProgress(true, bestText.length);
        var fallbackImages = extractImagesFromHtml(_lastRawHtml);
        var allFbImages = _collectedImages.concat(fallbackImages);
        var uniqueFbImages = [];
        allFbImages.forEach(function(img) {
            if (img && uniqueFbImages.indexOf(img) < 0) uniqueFbImages.push(img);
        });
        _lastRawHtml = '';
        _collectedImages = [];
        return { text: bestText, title: bestTitle, ok: true, images: uniqueFbImages };
    }

    closeFetchProgress(false, 0);
    return { text: '', title: '', ok: false, images: [] };
}

// ===== 从HTML中提取图片URL =====
function extractImagesFromHtml(html) {
    if (!html) return [];
    var images = [];

    // 1. og:image（几乎所有网站都有）
    var ogImgs = html.match(/<meta[^>]*property\s*=\s*["']og:image(?::?\w*)["'][^>]*content\s*=\s*["']([^"']+)["']/gi) || [];
    ogImgs.forEach(function(tag) {
        var m = tag.match(/content\s*=\s*["']([^"']+)["']/i);
        if (m && m[1] && m[1].startsWith('http')) images.push(m[1]);
    });

    // 2. twitter:image
    var twImg = html.match(/<meta[^>]*name\s*=\s*["']twitter:image["'][^>]*content\s*=\s*["']([^"']+)["']/i);
    if (twImg && twImg[1]) images.push(twImg[1]);

    // 3. __INITIAL_STATE__（小红书笔记图片）
    var initState = html.match(/__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\})(?:\s*;)/);
    if (initState) {
        try {
            var state = JSON.parse(initState[1].replace(/undefined/g, 'null'));
            var noteData = state.note && state.note.noteDetailMap;
            if (noteData) {
                var noteKeys = Object.keys(noteData);
                if (noteKeys.length > 0) {
                    var nd = noteData[noteKeys[0]].note;
                    if (nd && nd.imageList && Array.isArray(nd.imageList)) {
                        nd.imageList.forEach(function(img) {
                            var u = img.urlDefault || img.url || img.originalUrl || '';
                            if (u && u.startsWith('http')) images.push(u);
                        });
                    }
                    // 视频封面
                    if (nd && nd.video && nd.video.image) {
                        var vu = nd.video.image.urlDefault || nd.video.image.url || '';
                        if (vu) images.push(vu);
                    }
                }
            }
        } catch (e) {}
    }

    // 4. B站视频封面
    var initData = html.match(/__INITIAL_DATA__\s*=\s*(\{[\s\S]*?\})(?:\s*;)/);
    if (initData) {
        try {
            var bd = JSON.parse(initData[1].replace(/undefined/g, 'null'));
            if (bd.videoData && bd.videoData.pic) images.push(bd.videoData.pic);
        } catch (e) {}
    }

    // 5. 大尺寸img标签（过滤小图标）
    var imgTags = html.match(/<img[^>]+src\s*=\s*["']([^"']{20,})["'][^>]*>/gi) || [];
    imgTags.forEach(function(tag) {
        var src = tag.match(/src\s*=\s*["']([^"']+)["']/i);
        if (!src || !src[1] || !src[1].startsWith('http')) return;
        var u = src[1];
        // 跳过小图标
        if (/icon|logo|avatar|emoji|badge|favicon|sprite|loading|placeholder/i.test(u)) return;
        // 只要看起来像图片的
        if (/\.(jpg|jpeg|png|webp|gif)/i.test(u) || u.indexOf('image') > 0) {
            images.push(u);
        }
    });

    // 去重
    var unique = [];
    images.forEach(function(img) {
        var clean = img.split('?')[0]; // 去参数后比较
        var isDup = unique.some(function(u) { return u.split('?')[0] === clean; });
        if (!isDup && img.startsWith('http')) unique.push(img);
    });

    return unique.slice(0, 5);
}

// 自动识别链接中的图片
function autoRecognizeLinkImages(charId, msgIdx, imageUrls) {
    if (!imageUrls || !imageUrls.length) return;
    if (typeof recognizeImage !== 'function') return;

    var toRecognize = imageUrls.slice(0, 3); // 最多识3张
    var descriptions = [];
    var done = 0;

    toRecognize.forEach(function(imgUrl, i) {
        recognizeImage(imgUrl, function(desc) {
            descriptions[i] = desc;
            done++;

            if (done >= toRecognize.length) {
                var fd = getAccData();
                var fm = fd.chats[charId] && fd.chats[charId][msgIdx];
                if (!fm) return;

                var validDescs = descriptions.filter(function(d) { return d && d !== '图片' && d.length > 5; });
                if (!validDescs.length) return;

                // 追加图片描述到消息内容
                var imgSection = '\n\n【链接中的图片内容描述】:\n';
                validDescs.forEach(function(d, j) {
                    imgSection += '图' + (j + 1) + ': ' + d + '\n';
                });
                fm.content = (fm.content || '') + imgSection;

                // 设置链接卡片封面
                if (!fm.linkImage && imageUrls[0]) {
                    fm.linkImage = imageUrls[0];
                }

                save();
                if (curChar && curChar.id === charId && !responding) renderMsgs(false);
                toast('✅ 链接图片识别完成');
            }
        });
    });
}

// HTML清洗工具函数
function stripHtml(html) {
    if (!html) return '';
    // 尝试提取 JSON-LD 结构化数据（很多网站都有）
    var jsonLd = html.match(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
    var extraInfo = '';
    if (jsonLd) {
        try {
            var ld = JSON.parse(jsonLd[1]);
            var parts = [];
            if (ld.headline || ld.name) parts.push('# ' + (ld.headline || ld.name));
            if (ld.description) parts.push(ld.description);
            if (ld.articleBody) parts.push(ld.articleBody.slice(0, 2000));
            if (ld.text) parts.push(ld.text.slice(0, 2000));
            if (ld.author) {
                var authorName = typeof ld.author === 'string' ? ld.author : (ld.author.name || '');
                if (authorName) parts.push('作者: ' + authorName);
            }
            extraInfo = parts.join('\n\n');
            if (extraInfo.length > 100) return extraInfo;
        } catch(e) {}
    }

    // 尝试提取 og/meta 标签
    var ogTitle = (html.match(/<meta[^>]*property\s*=\s*["']og:title["'][^>]*content\s*=\s*["']([^"']+)["']/i) || [])[1] || '';
    var ogDesc = (html.match(/<meta[^>]*property\s*=\s*["']og:description["'][^>]*content\s*=\s*["']([^"']+)["']/i) || [])[1] || '';
    var metaDesc = (html.match(/<meta[^>]*name\s*=\s*["']description["'][^>]*content\s*=\s*["']([^"']+)["']/i) || [])[1] || '';
    var titleTag = (html.match(/<title[^>]*>([^<]+)<\/title>/i) || [])[1] || '';

    var metaInfo = '';
    if (ogTitle || titleTag) metaInfo += '# ' + (ogTitle || titleTag) + '\n\n';
    if (ogDesc || metaDesc) metaInfo += (ogDesc || metaDesc) + '\n\n';

    // 尝试提取 __INITIAL_STATE__（小红书、B站等）
    var initState = html.match(/__INITIAL_STATE__\s*=\s*(\{[\s\S]*?\})(?:\s*;)/);
    if (initState) {
        try {
            var state = JSON.parse(initState[1].replace(/undefined/g, 'null'));
            var noteData = state.note && state.note.noteDetailMap;
            if (noteData) {
                var noteKeys = Object.keys(noteData);
                if (noteKeys.length > 0) {
                    var nd = noteData[noteKeys[0]].note;
                    if (nd) {
                        var parts2 = [];
                        if (nd.title) parts2.push('# ' + nd.title);
                        if (nd.desc) parts2.push(nd.desc);
                        if (nd.user && nd.user.nickname) parts2.push('作者: ' + nd.user.nickname);
                        if (nd.interactInfo) {
                            parts2.push('点赞: ' + (nd.interactInfo.likedCount || 0) + ' 收藏: ' + (nd.interactInfo.collectedCount || 0));
                        }
                        var stateText = parts2.join('\n');
                        if (stateText.length > 50) return metaInfo + stateText;
                    }
                }
            }
        } catch(e) {}
    }

    // 常规HTML清洗
    var cleaned = html
        .replace(/<script\b[\s\S]*?<\/script>/gi, '')
        .replace(/<style\b[\s\S]*?<\/style>/gi, '')
        .replace(/<nav\b[\s\S]*?<\/nav>/gi, '')
        .replace(/<footer\b[\s\S]*?<\/footer>/gi, '')
        .replace(/<header\b[\s\S]*?<\/header>/gi, '')
        .replace(/<!--[\s\S]*?-->/g, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s{3,}/g, '\n')
        .trim();

    if (metaInfo && metaInfo.length > 30) {
        return metaInfo + cleaned.slice(0, 2000);
    }
    return cleaned.slice(0, 3000);
}
// 将抓取内容写入消息的content字段（AI可见）
function writeFetchedContent(fm, url, pageText) {
    if (!pageText) return;
    fm.linkFullText = pageText.slice(0, 5000);
    var orig = getDisplayContent(fm);
    fm.content = orig + LINK_DATA_SEP
        + '[链接: ' + url + ']\n'
        + '[网页内容]\n' + pageText.slice(0, 2000);

    // 提取图片
    var imgM = pageText.match(/!\[.*?\]\((https?:\/\/[^\s\)]+(?:\.jpg|\.jpeg|\.png|\.webp|\.gif)[^\s\)]*)\)/i);
    if (imgM && !fm.linkImage) fm.linkImage = imgM[1];
}

// ===== AI发链接：搜索真实链接替换编造的 =====
async function processAiLinkMsg(charId, msgIdx) {
    var data = getAccData();
    var msg = data.chats[charId] && data.chats[charId][msgIdx];
    if (!msg || msg.type !== 'link' || msg._aiVerified) return;
    msg._aiVerified = true;
    save();

    // 提取AI想分享什么（搜索意图）
    var dispContent = getDisplayContent(msg);
    var intent = typeof normalizeAiLinkQuery === 'function'
        ? normalizeAiLinkQuery(msg.linkTitle, msg.linkDesc, dispContent)
        : [msg.linkTitle, msg.linkDesc, dispContent]
            .filter(function(s) { return s && s.trim(); })
            .join(' ')
            .trim();
    if (!intent) intent = 'interesting link';

    // 用搜索引擎搜索真实链接
    var results = await jinaSearch(intent);

    var fd = getAccData();
    var fm = fd.chats[charId] && fd.chats[charId][msgIdx];
    if (!fm) return;

    if (!results.length || !results[0].url) {
        // 搜索失败 → 降级为纯文字
        var fallback = getDisplayContent(fm) || '';
        delete fm.type; delete fm.linkUrl; delete fm.linkTitle; delete fm.linkDesc;
        delete fm.linkFavicon; delete fm.linkImage; delete fm.linkFullText;
        fm.content = (fallback ? fallback + '\n' : '') + '[未找到相关内容]';
        save();
        if (curChar && curChar.id === charId && !responding) renderMsgs(false);
        return;
    }

    // 用真实链接替换AI编造的
    var best = results[0];
    fm.linkUrl = best.url;
    fm.linkTitle = best.title || fm.linkTitle || '';
    fm.linkDesc = best.desc || '';
    try {
        fm.linkFavicon = 'https://www.google.com/s2/favicons?domain=' + new URL(best.url).hostname + '&sz=64';
    } catch(e) {}

    save();
    if (curChar && curChar.id === charId && !responding) renderMsgs(false);

    // 异步抓取完整内容
    var page = await fetchPageContent(best.url);
    fd = getAccData();
    fm = fd.chats[charId] && fd.chats[charId][msgIdx];
    if (!fm) return;

    if (page.ok) {
        if (page.title) fm.linkTitle = page.title;
        var descClean = page.text.replace(/^#.+\n/gm,'').replace(/!\[.*?\]\(.*?\)/g,'').trim();
        if (descClean.length > 10) fm.linkDesc = descClean.slice(0, 150);
        writeFetchedContent(fm, fm.linkUrl, page.text);
    } else {
        // 至少用搜索摘要
        writeFetchedContent(fm, fm.linkUrl, best.title + '\n' + best.desc);
    }

    save();
    if (curChar && curChar.id === charId && !responding) renderMsgs(false);
}

// ===== 用户发链接：抓取内容让AI可见 =====
async function processUserLinkMsg(charId, msgIdx) {
    var data = getAccData();
    var msg = data.chats[charId] && data.chats[charId][msgIdx];
    if (!msg || msg.type !== 'link' || !msg.linkUrl) return;
    // 如果已经有有效抓取内容，不重复抓
    if (msg.content && msg.content.indexOf('{{FETCHED_LINK_DATA}}') >= 0 && msg.linkFullText && msg.linkFullText.length > 100) return;

    var url = msg.linkUrl;

    // 先快速获取meta信息（图标、封面）
    if (typeof fetchLinkMeta === 'function') {
        fetchLinkMeta(url, function(meta) {
            var d2 = getAccData();
            var m2 = d2.chats[charId] && d2.chats[charId][msgIdx];
            if (m2) {
                if (meta.title) m2.linkTitle = meta.title;
                if (meta.desc) m2.linkDesc = meta.desc;
                if (meta.favicon) m2.linkFavicon = meta.favicon;
                if (meta.image) m2.linkImage = meta.image;
                save();
                if (curChar && curChar.id === charId && !responding) renderMsgs(false);
            }
        });
    }

    // 抓取完整内容
    var page = await fetchPageContent(url);

    var fd = getAccData();
    var fm = fd.chats[charId] && fd.chats[charId][msgIdx];
    if (!fm) return;

    if (page.ok && page.text) {
        if (page.title && (!fm.linkTitle || fm.linkTitle === new URL(url).hostname)) fm.linkTitle = page.title;
        if (!fm.linkDesc || fm.linkDesc === '正在加载网页...') {
            var dc = page.text.replace(/^#.+\n/gm,'').replace(/!\[.*?\]\(.*?\)/g,'').trim();
            if (dc.length > 10) fm.linkDesc = dc.slice(0, 150);
        }

        // 关键：喂饭格式，让AI必须看到
        fm.linkFullText = page.text.slice(0, 5000);
        var orig = getDisplayContent(fm);
        fm.content = orig + LINK_DATA_SEP
            + '[链接: ' + url + ']\n'
            + '\n--- [系统已自动提取网页内容，请阅读并回复] ---\n'
            + '【页面标题】: ' + (fm.linkTitle || '未知') + '\n'
            + '【正文内容】:\n' + page.text.slice(0, 4000)
            + '\n--- [提取结束] ---\n';

        // 提取图片
        var imgM = page.text.match(/!\[.*?\]\((https?:\/\/[^\s\)]+)\)/);
        if (imgM && !fm.linkImage) fm.linkImage = imgM[1];
        // 自动识别链接中的图片
        // 自动识别链接中的图片
        var linkImages = (page.images && page.images.length) ? page.images : [];
        if (!linkImages.length && fm.linkImage) linkImages = [fm.linkImage];
        
        // 如果还是没图片，最后单独尝试用Microlink抓封面
        if (!linkImages.length) {
            try {
                var mlResp = await Promise.race([
                    fetch('https://api.microlink.io/?url=' + encodeURIComponent(url)),
                    new Promise(function(_, rej) { setTimeout(function(){ rej(new Error('超时')); }, 8000); })
                ]);
                var mlData = await mlResp.json();
                if (mlData.status === 'success' && mlData.data) {
                    if (mlData.data.image && mlData.data.image.url) {
                        linkImages.push(mlData.data.image.url);
                    }
                    if (mlData.data.logo && mlData.data.logo.url) {
                        linkImages.push(mlData.data.logo.url);
                    }
                }
            } catch(e) {}
        }
        
        if (linkImages.length > 0) {
            if (!fm.linkImage) fm.linkImage = linkImages[0];
            save();
            if (curChar && curChar.id === charId && !responding) renderMsgs(false);
            autoRecognizeLinkImages(charId, msgIdx, linkImages);
        }
    } else {
        fm.linkDesc = fm.linkDesc || '内容暂时无法读取';
    }

    save();
    if (curChar && curChar.id === charId && !responding) renderMsgs(false);
    
    // 更新状态栏
    if ($('crStatus') && curChar && curChar.id === charId) {
        $('crStatus').textContent = '在线';
        $('crStatus').classList.remove('typing');
    }
}

// ===== 复制链接URL =====
function copyLinkUrl() {
    var data = getAccData();
    var charId = curChar ? curChar.id : respondingCharId;
    var msg = data.chats[charId] && data.chats[charId][selectedMsgIdx];
    var url = msg && msg.linkUrl;
    if (url && url !== 'undefined' && url.indexOf('http') === 0) {
        navigator.clipboard.writeText(url).then(function() { toast('链接已复制'); });
    } else {
        toast('链接暂不可用');
    }
    hideMsgMenu();
}