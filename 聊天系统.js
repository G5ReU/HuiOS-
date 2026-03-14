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
    var h = '<div style="padding:10px 10px 0;text-align:right"><button class="empty-btn" style="padding:8px 18px;font-size:13px" onclick="openPublish()">+ 发朋友圈</button></div>';
    
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
function openChat(id) {
    var data = getAccData();
    curChar = data.chars.find(function(c) { return c.id === id; });
    if (!curChar) return;
    
      lastInteract[id] = Date.now();
    unreadCounts[id] = 0;
    
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
    
    if (scroll !== false) setTimeout(function() { el.scrollTop = el.scrollHeight; }, 50);
}

function renderMsg(m, idx) {
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
    
    // 判断气泡位置
    var bubblePos = getBubblePosition(idx, m.role);
    var bubbleClass = 'bubble-' + bubblePos;
    
    // 判断是否需要显示头像（只在first或single时显示）
    var needAiAvatar = m.role === 'ai' && showAiAvatar && (bubblePos === 'first' || bubblePos === 'single');
    var needUserAvatar = m.role === 'user' && showUserAvatar && (bubblePos === 'first' || bubblePos === 'single');
    
    // 判断当前消息是否需要头像布局
    var useAvatarLayout = (m.role === 'ai' && showAiAvatar) || (m.role === 'user' && showUserAvatar);
    
    if (useAvatarLayout) {
        var h = '<div class="msg-with-avatar '+m.role+' '+bubbleClass+'" data-idx="'+idx+'">';
        
        // AI消息：头像在左
        if (m.role === 'ai' && showAiAvatar) {
            if (needAiAvatar) {
                var aiAv = charData ? (charData.avatar && charData.avatar.length > 2 ? '<img src="'+charData.avatar+'">' : (charData.avatar || charData.realName.charAt(0))) : '🤖';
                h += '<div class="msg-avatar" onclick="onMsgAvatarClick(event,\'ai\')" ondblclick="onMsgAvatarDblClick(\'ai\')">'+aiAv+'</div>';
            } else {
                h += '<div class="msg-avatar-placeholder"></div>';
            }
        }
        
        // 用户消息：头像在右
        if (m.role === 'user' && showUserAvatar) {
            if (needUserAvatar) {
                var userAv = acc ? (acc.avatar && acc.avatar.length > 2 ? '<img src="'+acc.avatar+'">' : (acc.avatar || acc.persona.charAt(0))) : '👤';
                h += '<div class="msg-avatar" onclick="onMsgAvatarClick(event,\'user\')" ondblclick="onMsgAvatarDblClick(\'user\')">'+userAv+'</div>';
            } else {
                h += '<div class="msg-avatar-placeholder"></div>';
            }
        }
        
        h += '<div class="msg-bubble-wrap" ontouchstart="msgTouchStart(event,'+idx+')" ontouchend="msgTouchEnd()" oncontextmenu="showMsgMenu(event,'+idx+')">';
        
        if (m.quoteContent) {
    h += '<div class="msg-quote" onclick="jumpToQuoteByTime('+(m.quoteTime||0)+')">'+esc(m.quoteContent.slice(0,30))+(m.quoteContent.length>30?'...':'')+'</div>';
}
        
        h += '<div class="msg-content-wrap">' + renderMsgContent(m, idx) + '</div>';
        h += '</div></div>';
        return h;
    }
    
      // 无头像模式
    var cls = 'msg ' + m.role + ' ' + bubbleClass;
    var h = '<div class="'+cls+'" data-idx="'+idx+'" ontouchstart="msgTouchStart(event,'+idx+')" ontouchend="msgTouchEnd()" oncontextmenu="showMsgMenu(event,'+idx+')">';
    
    if (m.quoteContent) {
    h += '<div class="msg-quote" onclick="jumpToQuoteByTime('+(m.quoteTime||0)+')">'+esc(m.quoteContent.slice(0,30))+(m.quoteContent.length>30?'...':'')+'</div>';
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

    // 跨5分钟区间则视为不连续
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

    // 判断这次通话是否已完成：检查callLogs里有没有对应记录
    var data = getAccData();
    var charIdForCheck = isFromAI ? m.charId : (curChar ? curChar.id : null);
    var callLogs = (data.callLogs || []);
    var isFinished = callLogs.some(function(l) {
        return l.charId === charIdForCheck && l.startTime >= m.time;
    });

    var h = '<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:rgba(168,216,234,0.1);border-radius:12px;min-width:180px">';
    h += '<span style="font-size:22px">' + icon + '</span>';
    h += '<div style="flex:1"><div style="font-size:14px;font-weight:500">' + label + '</div>';

    if (isFinished) {
        h += '<div style="font-size:12px;color:var(--text-gray);margin-top:2px">通话已完成</div>';
        h += '</div></div>';
    } else if (isFromAI) {
        h += '<div style="font-size:12px;color:var(--text-gray);margin-top:2px">' + (m.callReason || '邀请你通话') + '</div>';
        h += '</div></div>';
        h += '<div style="display:flex;gap:8px;margin-top:8px">';
        h += '<button onclick="acceptAICall(\'' + esc(m.id) + '\')" style="flex:1;padding:8px;border:none;border-radius:10px;background:#4CAF50;color:white;font-size:13px;cursor:pointer">接听</button>';
        h += '<button onclick="rejectAICall(\'' + esc(m.id) + '\')" style="flex:1;padding:8px;border:none;border-radius:10px;background:#f0f0f0;color:#666;font-size:13px;cursor:pointer">拒绝</button>';
        h += '</div>';
    } else {
        h += '<div style="font-size:12px;color:var(--text-gray);margin-top:2px">等待接听...</div>';
        h += '</div></div>';
    }
    return h;
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
        if (m.imageUrl) h += '<img class="msg-image" src="'+m.imageUrl+'" onclick="handleImgClick(event,'+idx+')">';
        else h += '<div class="msg-image-placeholder">[图片: '+esc(m.imageDesc||'')+']</div>';
    } else if (m.type === 'sticker') {
        h += '<div class="msg-sticker" onclick="viewStickerFull(\''+esc(m.stickerUrl)+'\')" title="'+esc(m.stickerDesc||'')+'">';
        h += '<img src="'+esc(m.stickerUrl)+'">';
        h += '</div>';
    } else if (m.type === 'location') {
        // 🗺️ 位置分享卡片
        var locIcon = (typeof placeIcons !== 'undefined' && placeIcons[m.placeType]) ? placeIcons[m.placeType] : '📍';
        h += '<div class="msg-location-card" onclick="openLocationFromMsg(\'' + esc(m.mapId||'') + '\',\'' + esc(m.placeId||'') + '\')">';
        h += '<div class="loc-card-header">';
        h += '<span class="loc-card-icon">' + locIcon + '</span>';
        h += '<span class="loc-card-title">' + esc(m.placeName||'位置') + '</span>';
        h += '</div>';
        if (m.content) {
            h += '<div class="loc-card-msg">' + esc(m.content) + '</div>';
        }
        h += '<div class="loc-card-footer">';
        h += '<span>📍 ' + esc(m.mapName || '地图') + '</span>';
        h += '<span class="loc-card-action">查看位置 ›</span>';
        h += '</div>';
        h += '</div>';
    } else if (m.type === 'invite') {
        // 🗺️ 邀请卡片
        var invIcon = (typeof placeIcons !== 'undefined' && placeIcons[m.placeType]) ? placeIcons[m.placeType] : '📍';
        h += '<div class="msg-invite-card" onclick="openLocationFromMsg(\'' + esc(m.mapId||'') + '\',\'' + esc(m.placeId||'') + '\')">';
        h += '<div class="invite-card-header">📨 邀请你去</div>';
        h += '<div class="invite-card-place">';
        h += '<span class="invite-card-icon">' + invIcon + '</span>';
        h += '<span>' + esc(m.placeName||'某地') + '</span>';
        h += '</div>';
        if (m.content) {
            h += '<div class="invite-card-msg">"' + esc(m.content) + '"</div>';
        }
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
    } else {
        h += '<div class="msg-bubble">'+esc(m.content)+'</div>';
    }
    return h;
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
    var data = getAccData();
    if (!charId || !data || !data.chats[charId]) return -1;
    
    data.chats[charId].push(msg);
    save();
    
    var idx = data.chats[charId].length - 1;
    
    if (curChar && curChar.id === charId) {
        var el = $('messages');
        var msgs = data.chats[charId];
        
        if (msgs.length <= 1 || !el.querySelector('[data-idx]')) {
            renderMsgs(true);
if (typeof checkAutoSummary === 'function') checkAutoSummary(charId);
            return idx;
        }
        
        // ★ 更新前一条消息的气泡样式
updatePrevBubbleStyle(charId, idx);
        
// 判断是否需要在新消息前插时间戳
var timeLabelHtml = '';
if (msg.type !== 'sys' && !msg.recalled) {
    // 找前一条非sys、非recalled消息
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

            var lastChild = el.lastElementElement;
            if (lastChild) {
                lastChild.classList.add('msg-new');
                setTimeout(function() { 
                    if (lastChild) lastChild.classList.remove('msg-new'); 
                }, 350);
            }
        }
        el.scrollTop = el.scrollHeight;
    } else {
        if (msg.role === 'ai' && msg.type !== 'sys') {
            if (!unreadCounts[charId]) unreadCounts[charId] = 0;
            unreadCounts[charId]++;
            if ($('chatPage').classList.contains('active')) {
                renderContacts();
            }
        }
    }
    
    return idx;
}

// ★ 新增函数：更新前一条消息的气泡样式
function updatePrevBubbleStyle(charId, newIdx) {
    if (newIdx < 1) return;
    
    var data = getAccData();
    var msgs = data.chats[charId] || [];
    var newMsg = msgs[newIdx];
    if (!newMsg || newMsg.type === 'sys') return;
    
    // 找前一条有效消息
    var prevIdx = -1;
    for (var i = newIdx - 1; i >= 0; i--) {
        var m = msgs[i];
        if (m.type !== 'sys' && !m.recalled) {
            prevIdx = i;
            break;
        }
    }
    if (prevIdx < 0) return;
    
    var prevMsg = msgs[prevIdx];
    
    // 如果前一条和新消息是同一个角色，需要更新前一条的样式
    if (prevMsg.role === newMsg.role) {
        var prevEl = document.querySelector('[data-idx="' + prevIdx + '"]');
        if (prevEl) {
            // 移除旧的bubble类
            prevEl.classList.remove('bubble-single', 'bubble-first', 'bubble-middle', 'bubble-last');
            
            // 计算新的位置
            var newPos = getBubblePosition(prevIdx, prevMsg.role);
            prevEl.classList.add('bubble-' + newPos);
        }
    }
}

function appendMsg(msg) {
    var data = getAccData();
    var charId = curChar ? curChar.id : respondingCharId;
    if (!charId || !data.chats[charId]) return -1;
    
    data.chats[charId].push(msg);
    save();
    
    var idx = data.chats[charId].length - 1;
    
    if (curChar && curChar.id === charId) {
        var el = $('messages');
        var msgs = data.chats[charId];
        
        if (msgs.length <= 1 || !el.querySelector('[data-idx]')) {
            renderMsgs(true);
            return idx;
        }
        
        // ★ 关键：更新前一条消息的气泡样式
        updatePrevBubbleStyle(charId, idx);
        
        // 判断是否需要在新消息前插时间戳
var timeLabelHtml = '';
if (msg.type !== 'sys' && !msg.recalled) {
    // 找前一条非sys、非recalled消息
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

            var lastChild = el.lastElementChild;
            if (lastChild) {
                lastChild.classList.add('msg-new');
                setTimeout(function() { 
                    if (lastChild) lastChild.classList.remove('msg-new'); 
                }, 350);
            }
        }
        el.scrollTop = el.scrollHeight;
    } else {
        if (msg.role === 'ai' && msg.type !== 'sys') {
            if (!unreadCounts[charId]) unreadCounts[charId] = 0;
            unreadCounts[charId]++;
            if ($('chatPage').classList.contains('active')) {
                renderContacts();
            }
        }
    }
    
    checkAutoSummary(charId);
    return idx;
}

function checkAutoSummary(charId) {
    setTimeout(function() {
        if (typeof autoSummaryIfNeeded === 'function') autoSummaryIfNeeded(charId);
    }, 500);
}

var voicePlayTimer = null;

function playVoice(el, idx, duration) {
    var textEl = $('vt' + idx);
    
    // 如果正在播放，停止并收起文字
    if (el.classList.contains('playing')) {
        el.classList.remove('playing');
        if (voicePlayTimer) {
            clearTimeout(voicePlayTimer);
            voicePlayTimer = null;
        }
        // 收起转文字气泡
        if (textEl) textEl.classList.remove('show');
        return;
    }
    
    // 停止其他正在播放的语音
    document.querySelectorAll('.msg-voice.playing').forEach(function(v) {
        v.classList.remove('playing');
    });
    // 收起其他转文字气泡
    document.querySelectorAll('.voice-text.show').forEach(function(t) {
        t.classList.remove('show');
    });
    if (voicePlayTimer) {
        clearTimeout(voicePlayTimer);
        voicePlayTimer = null;
    }
    
    // 显示当前转文字
    if (textEl) textEl.classList.add('show');
    
    // 开始播放动画
    el.classList.add('playing');
    
    // 根据时长定时停止（但不收起文字，让用户手动收）
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

function msgTouchStart(e, idx) { longPressTimer = setTimeout(function() { showMsgMenu(e, idx); }, 500); }
function msgTouchEnd() { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } }

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
    } else {
        h += '<div class="msg-menu-item" onclick="copyMsg()">复制</div>';
        h += '<div class="msg-menu-item" onclick="quoteThisMsg()">引用</div>';
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

function hideMsgMenu() { $('msgMenu').classList.remove('active'); selectedMsgIdx = -1; }

function copyMsg() {
    var data = getAccData();
    var charId = curChar ? curChar.id : respondingCharId;
    var msg = data.chats[charId][selectedMsgIdx];
    if (msg) navigator.clipboard.writeText(msg.content || msg.imageDesc || '').then(function() { toast('已复制'); });
    hideMsgMenu();
}

function quoteThisMsg() {
    var data = getAccData();
    var charId = curChar ? curChar.id : respondingCharId;
    var msg = data.chats[charId][selectedMsgIdx];
    if (msg) {
        quotedMsg = msg;
        quotedIdx = selectedMsgIdx;
        var text = msg.type === 'image' ? '[图片]' : msg.type === 'voice' ? '[语音]' : msg.type === 'sticker' ? '[表情包: ' + (msg.stickerDesc || '') + ']' : (msg.content || '').slice(0, 30);
        $('quotePreviewText').textContent = text;
        $('quotePreview').classList.add('show');
    }
    hideMsgMenu();
    $('msgInput').focus();
}

function cancelQuote() { quotedMsg = null; quotedIdx = -1; $('quotePreview').classList.remove('show'); }

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
function sendMsg() {
    var input = $('msgInput');
    var text = input.value.trim();
    if (!text || !curChar) return;
    if (!D.api.key) return toast('请先配置API');
    
    var msg = { role: 'user', content: text, time: Date.now() };
        if (quotedMsg) {
    msg.quoteTime = quotedMsg.time;
    msg.quoteContent = quotedMsg.type === 'image' ? '[图片]' : 
                       quotedMsg.type === 'voice' ? '[语音]' : 
                       quotedMsg.type === 'sticker' ? '[表情包: ' + (quotedMsg.stickerDesc || '表情') + ']' : 
                       (quotedMsg.content || '').slice(0, 50);
}
    
    appendMsg(msg);
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
        if (delay > 0) { showDelay(D.settings.delay); timer = setTimeout(function() { removeDelay(); doResponse(); }, delay); }
        else doResponse();
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
    if (!confirm('确定清空聊天记录？')) return;
    var data = getAccData();
    var charId = curChar ? curChar.id : respondingCharId;
    if (!charId) return toast('无法确定角色');
    
    data.chats[charId] = [];
    data.hearts[charId] = [];
    data.memories[charId] = []; // 新增：同时清空记忆
    save();
    
    // 改动：先渲染消息，再关闭弹窗，确保顺序正确
    renderMsgs(true);
    closeModal('chatEditModal');
    toast('已清空');
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

function onImageSelect(e) {
    var f = e.target.files[0]; if (!f) return;
    e.target.value = '';
    toast('处理中...');
    
    var reader = new FileReader();
    reader.onload = function(ev) {
        compressImg(ev.target.result, function(compressed) {
                        if ($('publishPage').classList.contains('active')) {
                // ✅ 朋友圈：先添加base64，然后后台识图生成描述
                pubImages.push({ url: compressed, desc: '' });
                renderPubImages(); checkPublish();
                toast('图片已添加，正在识别...');
                
                // 后台识图
                recognizeImage(compressed, function(desc) {
                    // 找到最后一张图片并更新描述
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

function sendVoice() {
    var text = $('voiceText').value.trim();
    if (!text) return toast('请输入内容');
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
            var rawPreview = last.type === 'image' ? '[图片]' : last.type === 'voice' ? '[语音]' : (last.content || '');
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

function cTouchStart(e) { touchStartX = e.touches[0].clientX; }

function cTouchMove(e, id) {
    var diff = touchStartX - e.touches[0].clientX;
    if (diff > 50) {
        if (swipedId && swipedId !== id) document.querySelector('.contact-item[data-id="'+swipedId+'"]')?.classList.remove('swiped');
        swipedId = id;
        document.querySelector('.contact-item[data-id="'+id+'"]')?.classList.add('swiped');
    } else if (diff < -30 && swipedId === id) {
        document.querySelector('.contact-item[data-id="'+id+'"]')?.classList.remove('swiped');
        swipedId = null;
    }
}

function cTouchEnd() {}

function cClick(id) {
    if (swipedId) { document.querySelector('.contact-item[data-id="'+swipedId+'"]')?.classList.remove('swiped'); swipedId = null; return; }
    openChat(id);
}
// ========== 语音气泡收起修复 ==========
function playVoice(el, idx, duration) {
    var textEl = $('vt' + idx);
    if (el.classList.contains('playing')) {
        el.classList.remove('playing');
        if (voicePlayTimer) { clearTimeout(voicePlayTimer); voicePlayTimer = null; }
        if (textEl) textEl.classList.remove('show');
        return;
    }
    document.querySelectorAll('.msg-voice.playing').forEach(function(v) { v.classList.remove('playing'); });
    document.querySelectorAll('.voice-text.show').forEach(function(t) { t.classList.remove('show'); });
    if (voicePlayTimer) { clearTimeout(voicePlayTimer); voicePlayTimer = null; }
    if (textEl) textEl.classList.add('show');
    el.classList.add('playing');
    voicePlayTimer = setTimeout(function() {
        el.classList.remove('playing');
        voicePlayTimer = null;
    }, duration * 1000);
}
// ========== 编辑本轮回复 ==========
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
    var d = new Date(ts);
    var now = new Date();
    var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
    var hm = pad(d.getHours()) + ':' + pad(d.getMinutes());
    // 今天
    if (d.toDateString() === now.toDateString()) return hm;
    // 昨天
    var yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return '昨天 ' + hm;
    // 今年
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
function fmtTimeLabel(ts) {
    var d = new Date(ts);
    var now = new Date();
    var pad = function(n) { return n < 10 ? '0' + n : '' + n; };
    var hm = pad(d.getHours()) + ':' + pad(d.getMinutes());
    if (d.toDateString() === now.toDateString()) return hm;
    var yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return '昨天 ' + hm;
    if (d.getFullYear() === now.getFullYear()) return (d.getMonth()+1) + '月' + d.getDate() + '日 ' + hm;
    return d.getFullYear() + '年' + (d.getMonth()+1) + '月' + d.getDate() + '日 ' + hm;
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