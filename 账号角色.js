// ========== 账号管理 ==========
function createAccount() {
    var persona = $('newAccPersona').value.trim();
    var nick = $('newAccNick').value.trim();
    if (!persona) return toast('请输入人设名字');
    if (!nick) return toast('请输入网名');
    
    var avatar = $('newAccAvatar').dataset.val || '';
    var acc = { 
        id: genId('acc'), 
        avatar: avatar, 
        persona: persona, 
        nick: nick, 
        desc: $('newAccDesc').value.trim() 
    };
    
    D.accounts.push(acc);
    D.currentAccId = acc.id;
    D.accData[acc.id] = { 
        chars: [], 
        groups: [], 
        chats: {}, 
        hearts: {}, 
        memories: {}, 
        moments: [] 
    };
    save();
    
    // 先清空表单
    $('newAccPersona').value = '';
    $('newAccNick').value = '';
    $('newAccDesc').value = '';
    $('newAccAvatar').dataset.val = '';
    $('newAccAvatar').innerHTML = '👤';
    
    closeModal('createAccModal');
    if ($('switchAccPage').classList.contains('active')) renderAccList();
    checkAccAndRender();
    toast('账号创建成功');
}

function openEditAcc() {
    var acc = getCurAcc(); if (!acc) return;
    $('editAccPersona').value = acc.persona;
    $('editAccNick').value = acc.nick;
    $('editAccDesc').value = acc.desc || '';
    $('editAccAvatar').dataset.val = acc.avatar || '';
    $('editAccAvatar').innerHTML = acc.avatar && acc.avatar.length > 2 ? '<img src="'+acc.avatar+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">' : (acc.avatar || acc.persona.charAt(0));
    openModal('editAccModal');
}

function saveAccount() {
    var acc = getCurAcc(); if (!acc) return;
    var persona = $('editAccPersona').value.trim();
    var nick = $('editAccNick').value.trim();
    if (!persona) return toast('请输入人设名字');
    if (!nick) return toast('请输入网名');
    acc.persona = persona;
    acc.nick = nick;
    acc.desc = $('editAccDesc').value.trim();
    acc.avatar = $('editAccAvatar').dataset.val || '';
    save(); closeModal('editAccModal'); renderMyPage();
    toast('已保存');
}

// ========== 账号切换 ==========
function openSwitchAcc() {
    selectedAccId = null; isEditAccMode = false;
    renderAccList(); updateAccBtns();
    $('switchAccPage').classList.add('active');
}

function closeSwitchAcc() { $('switchAccPage').classList.remove('active'); }

function renderAccList() {
    var h = '';
    for (var i = 0; i < D.accounts.length; i++) {
        var a = D.accounts[i];
        var cur = a.id === D.currentAccId ? ' current' : '';
        var sel = a.id === selectedAccId ? ' selected' : '';
        h += '<div class="account-item'+cur+sel+'" onclick="selectAcc(\''+a.id+'\')">';
        h += '<div class="account-avatar">';
        h += a.avatar && a.avatar.length > 2 ? '<img src="'+a.avatar+'">' : (a.avatar || a.persona.charAt(0));
        h += '</div><div class="account-info">';
        h += '<div class="account-nickname">'+esc(a.nick)+'</div>';
        h += '<div class="account-persona">人设：'+esc(a.persona)+'</div>';
        h += '</div></div>';
    }
    $('accountList').innerHTML = h;
}

function selectAcc(id) {
    if (isEditAccMode) {
        selectedAccId = selectedAccId === id ? null : id;
    } else {
        if (id === D.currentAccId) return;
        selectedAccId = id;
    }
    renderAccList(); updateAccBtns();
}

function updateAccBtns() {
    var show1 = !selectedAccId || isEditAccMode;
    var show2 = selectedAccId && !isEditAccMode;
    document.querySelector('.btn-new-acc').style.display = show1 ? 'block' : 'none';
    document.querySelector('.btn-edit-acc').style.display = show1 ? 'block' : 'none';
    $('btnConfirmAcc').style.display = show2 ? 'block' : 'none';
    $('btnCancelAcc').style.display = show2 ? 'block' : 'none';
}

function cancelSelectAcc() { selectedAccId = null; renderAccList(); updateAccBtns(); }

function confirmSwitchAcc() {
    if (!selectedAccId) return;
    D.currentAccId = selectedAccId; save();
    closeSwitchAcc(); checkAccAndRender();
    toast('已切换账号');
}

function enterEditAccMode() {
    isEditAccMode = true; selectedAccId = null;
    renderAccList();
    $('accBtns').innerHTML = '<button class="btn-danger" style="flex:1" onclick="delSelectedAcc()">删除选中</button><button class="btn-cancel" style="flex:1" onclick="exitEditAccMode()">完成</button>';
}

function exitEditAccMode() {
    isEditAccMode = false; selectedAccId = null;
    $('accBtns').innerHTML = '<button class="btn-new-acc" onclick="openModal(\'createAccModal\')">+ 新增</button><button class="btn-edit-acc" onclick="enterEditAccMode()">编辑</button><button class="btn-confirm-acc" id="btnConfirmAcc" onclick="confirmSwitchAcc()" style="display:none">确认登录</button><button class="btn-cancel-acc" id="btnCancelAcc" onclick="cancelSelectAcc()" style="display:none">取消</button>';
    renderAccList();
}

function delSelectedAcc() {
    if (!selectedAccId) return toast('请选择账号');
    if (!confirm('确定删除该账号？不可恢复！')) return;
    D.accounts = D.accounts.filter(function(a) { return a.id !== selectedAccId; });
    delete D.accData[selectedAccId];
    if (D.currentAccId === selectedAccId) D.currentAccId = D.accounts.length ? D.accounts[0].id : null;
    save(); selectedAccId = null; renderAccList();
    toast('已删除');
}

// ========== 页面渲染逻辑 (桥接) ==========
function checkAccAndRender() {
    if (!D.accounts.length || !D.currentAccId) {
        $('noAccView').style.display = 'flex';
        $('chatContent').style.display = 'none';
    } else {
        $('noAccView').style.display = 'none';
        $('chatContent').style.display = 'flex';
        // 这些函数在其他JS文件中，但在运行时会存在
        if(typeof renderContacts === 'function') renderContacts();
        if(typeof renderMoments === 'function') renderMoments();
        renderMyPage();
        if(typeof refreshWalletPreview === 'function') refreshWalletPreview();
        if(typeof updateMomentBadge === 'function') updateMomentBadge();
    }
}

function openMyAvatar() {
    var acc = getCurAcc(); if (!acc) return;
    // 先把当前头像同步到编辑弹窗的隐藏元素，以便 applyUpload 的 editAccAvatar 分支能直接保存
    var el = $('editAccAvatar');
    if (el) {
        el.dataset.val = acc.avatar || '';
        el.innerHTML = acc.avatar && acc.avatar.length > 2
            ? '<img src="'+acc.avatar+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">'
            : (acc.avatar || '👤');
    }
    openUpload('editAccAvatar');
}

function openMyAvatar() {
    var acc = getCurAcc(); if (!acc) return;
    var el = $('editAccAvatar');
    if (el) {
        el.dataset.val = acc.avatar || '';
        el.innerHTML = acc.avatar && acc.avatar.length > 2
            ? '<img src="'+acc.avatar+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%">'
            : (acc.avatar || '👤');
    }
    openUpload('editAccAvatar');
}

function renderMyPage() {
    var acc = getCurAcc(); if (!acc) return;
    var h = '<div class="my-profile">';
h += '<div class="my-avatar" onclick="openMyAvatar()" style="cursor:pointer;position:relative">';
h += acc.avatar && acc.avatar.length > 2 ? '<img src="'+acc.avatar+'">' : (acc.avatar || acc.persona.charAt(0));
h += '<div style="position:absolute;bottom:0;right:0;background:rgba(0,0,0,0.5);border-radius:50%;width:20px;height:20px;display:flex;align-items:center;justify-content:center;font-size:11px">✏️</div>';
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
}

// ========== 角色管理 ==========
function openCreateChar() {
    editCharId = null;
    $('charModalTitle').textContent = '✨ 创建角色';
    $('charRealName').value = ''; $('charDisplayName').value = ''; $('charPersona').value = '';
    $('charAvatar').dataset.val = ''; $('charAvatar').innerHTML = '🤖';
    $('delCharBtn').style.display = 'none';
    openModal('charModal');
}

function saveChar() {
    var realName = $('charRealName').value.trim();
    var displayName = $('charDisplayName').value.trim();
    if (!realName) return toast('请输入原名');
    if (!displayName) return toast('请输入备注名');
    var data = getAccData();
    var avatar = $('charAvatar').dataset.val || '';
    var persona = $('charPersona').value.trim();
    
    if (editCharId) {
        var c = data.chars.find(function(x) { return x.id === editCharId; });
        if (c) { c.realName = realName; c.displayName = displayName; c.persona = persona; c.avatar = avatar; }
    } else {
        var nc = { id: genId('char'), avatar: avatar, realName: realName, displayName: displayName, persona: persona, memoryCount: 20, wbIds: [], chatWp: '', autoSummary: false, summaryInterval: 20, bgEnabled: false, pinned: false, lastMomentCheckTime: 0, emailAddress: '' };
        data.chars.push(nc);
        data.chats[nc.id] = []; data.hearts[nc.id] = []; data.memories[nc.id] = [];
    }
    save(); closeModal('charModal'); renderContacts(); toast('已保存');
}

function delChar() {
    if (!confirm('删除该角色？')) return;
    var data = getAccData();
    data.chars = data.chars.filter(function(c) { return c.id !== editCharId; });
    delete data.chats[editCharId]; delete data.hearts[editCharId]; delete data.memories[editCharId];
    save(); closeModal('charModal'); renderContacts();
    if (curChar && curChar.id === editCharId) closeChat();
    toast('已删除');
}

function togglePin(id) {
    var data = getAccData();
    var c = data.chars.find(function(x) { return x.id === id; });
    if (c) { c.pinned = !c.pinned; save(); swipedId = null; renderContacts(); toast(c.pinned ? '已置顶' : '已取消'); }
}

function delCharFromList(id) {
    if (!confirm('删除该角色及聊天记录？')) return;
    var data = getAccData();
    data.chars = data.chars.filter(function(c) { return c.id !== id; });
    delete data.chats[id]; delete data.hearts[id]; delete data.memories[id];
    save(); swipedId = null; renderContacts(); toast('已删除');
}

// ========== 分组管理 ==========
function openGroupPage() { renderGroups(); $('groupPage').classList.add('active'); }
function closeGroupPage() { $('groupPage').classList.remove('active'); }

function renderGroups() {
    var data = getAccData(); if (!data) return;
    var h = '';
    if (!data.groups.length) {
        h = '<div class="empty-state"><div class="empty-icon">📁</div><div class="empty-title">还没有分组</div><div class="empty-desc">点击右上角+创建</div></div>';
    } else {
        for (var i = 0; i < data.groups.length; i++) {
            var g = data.groups[i];
            h += '<div class="group-item"><div class="group-header">';
            h += '<div class="group-name">📁 '+esc(g.name)+'</div>';
            h += '<button class="group-edit-btn" onclick="editGroup(\''+g.id+'\')">编辑</button>';
            h += '</div><div class="group-members">';
            if (!g.charIds.length) h += '<span style="color:var(--text-light);font-size:12px">暂无成员</span>';
            else {
                for (var j = 0; j < g.charIds.length; j++) {
                    var c = data.chars.find(function(x) { return x.id === g.charIds[j]; });
                    if (c) h += '<div class="group-member"><span style="font-size:14px">'+(c.avatar&&c.avatar.length<=2?c.avatar:c.realName.charAt(0))+'</span>'+esc(c.displayName)+'</div>';
                }
            }
            h += '</div></div>';
        }
    }
    $('groupList').innerHTML = h;
}

function openCreateGroup() {
    editGroupId = null;
    $('groupModalTitle').textContent = '📁 创建分组';
    $('groupName').value = '';
    $('delGroupBtn').style.display = 'none';
    renderGroupMembers([]);
    openModal('groupModal');
}

function editGroup(id) {
    var data = getAccData();
    var g = data.groups.find(function(x) { return x.id === id; });
    if (!g) return;
    editGroupId = id;
    $('groupModalTitle').textContent = '✏️ 编辑分组';
    $('groupName').value = g.name;
    $('delGroupBtn').style.display = 'block';
    renderGroupMembers(g.charIds);
    openModal('groupModal');
}

function renderGroupMembers(selIds) {
    var data = getAccData(); var h = '';
    for (var i = 0; i < data.chars.length; i++) {
        var c = data.chars[i];
        var chk = selIds.indexOf(c.id) >= 0 ? ' checked' : '';
        h += '<div style="padding:10px 12px;border-bottom:1px solid #f0f0f0;display:flex;align-items:center;gap:10px">';
        h += '<input type="checkbox" id="gm_'+c.id+'"'+chk+' style="width:18px;height:18px">';
        h += '<label for="gm_'+c.id+'" style="flex:1;cursor:pointer;display:flex;align-items:center;gap:6px">';
        h += '<span style="font-size:16px">'+(c.avatar&&c.avatar.length<=2?c.avatar:'🤖')+'</span>'+esc(c.displayName)+'</label></div>';
    }
    $('groupMemberList').innerHTML = h || '<div style="padding:16px;text-align:center;color:var(--text-light)">暂无角色</div>';
}

function saveGroup() {
    var name = $('groupName').value.trim();
    if (!name) return toast('请输入名称');
    var data = getAccData();
    var charIds = [];
    data.chars.forEach(function(c) { if ($('gm_'+c.id)?.checked) charIds.push(c.id); });
    
    if (editGroupId) {
        var g = data.groups.find(function(x) { return x.id === editGroupId; });
        if (g) { g.name = name; g.charIds = charIds; }
    } else {
        data.groups.push({ id: genId('grp'), name: name, charIds: charIds });
    }
    save(); closeModal('groupModal'); renderGroups(); toast('已保存');
}

function delGroup() {
    if (!confirm('删除该分组？')) return;
    var data = getAccData();
    data.groups = data.groups.filter(function(g) { return g.id !== editGroupId; });
    save(); closeModal('groupModal'); renderGroups(); toast('已删除');
}

// ========== 导入功能 ==========
function importCharCard() { $('charCardInput').click(); }

function onCharCardSelect(e) {
    var f = e.target.files[0]; if (!f) return;
    e.target.value = '';
    
    if (f.name.endsWith('.json')) {
        var reader = new FileReader();
        reader.onload = function(ev) {
            try { importFromJson(JSON.parse(ev.target.result)); }
            catch(e) { toast('解析失败：' + e.message); }
        };
        reader.readAsText(f);
    } else if (f.name.endsWith('.png')) {
        var reader = new FileReader();
        reader.onload = function(ev) { parsePngCharCard(ev.target.result); };
        reader.readAsArrayBuffer(f);
    } else {
        toast('请选择JSON或PNG文件');
    }
}

function parsePngCharCard(buffer) {
    try {
        var bytes = new Uint8Array(buffer);
        if (bytes[0] !== 0x89 || bytes[1] !== 0x50) throw new Error('不是有效的PNG');
        
        var offset = 8;
        while (offset < bytes.length) {
            var len = (bytes[offset] << 24) | (bytes[offset+1] << 16) | (bytes[offset+2] << 8) | bytes[offset+3];
            var type = String.fromCharCode(bytes[offset+4], bytes[offset+5], bytes[offset+6], bytes[offset+7]);
            
            if (type === 'tEXt' || type === 'iTXt') {
                var data = bytes.slice(offset + 8, offset + 8 + len);
                var nullIdx = 0;
                for (var i = 0; i < data.length; i++) {
                    if (data[i] === 0) { nullIdx = i; break; }
                }
                var keyword = new TextDecoder('utf-8').decode(data.slice(0, nullIdx));
                
                if (keyword === 'chara') {
                    var base64Data = new TextDecoder('utf-8').decode(data.slice(nullIdx + 1));
                    var jsonStr = decodeURIComponent(escape(atob(base64Data)));
                    importFromJson(JSON.parse(jsonStr));
                    return;
                }
            }
            offset += 12 + len;
        }
        throw new Error('未找到角色数据');
    } catch(e) {
        toast('PNG解析失败：' + e.message);
        console.error(e);
    }
}

function importFromJson(data) {
    var accData = getAccData();
    if (!accData) return toast('请先创建账号');
    
    var realName = data.name || data.char_name || '未命名';
    var persona = data.description || data.personality || data.char_persona || '';
    if (data.scenario) persona += '\n\n【场景】\n' + data.scenario;
    if (data.mes_example) persona += '\n\n【对话示例】\n' + data.mes_example;
    
    var avatar = '';
    if (data.avatar && data.avatar.startsWith('data:')) avatar = data.avatar;
    
    var char = {
        id: genId('char'), avatar: avatar, realName: realName, displayName: realName,
        persona: persona, memoryCount: 20, wbIds: [], chatWp: '',
        autoSummary: false, summaryInterval: 20, bgEnabled: false, pinned: false
    };
    
    var charBook = data.data?.character_book || data.character_book;
    if (charBook && charBook.entries && charBook.entries.length) {
        var wbName = charBook.name || realName + '的世界书';
        var entries = charBook.entries.map(function(e) {
            return {
                id: genId('wbe'),
                name: e.comment || e.name || '条目',
                keys: e.keys || e.key || [],
                content: e.content || '',
                enabled: e.enabled !== false
            };
        });
        
        var existWb = D.worldbooks.find(function(w) { return w.name === wbName; });
        if (existWb) {
            if (confirm('世界书"'+wbName+'"已存在，是否覆盖？')) {
                existWb.entries = entries;
                char.wbIds = [existWb.id];
            }
        } else {
            var newWb = { id: genId('wb'), name: wbName, entries: entries };
            D.worldbooks.push(newWb);
            char.wbIds = [newWb.id];
        }
    }
    
    accData.chars.push(char);
    accData.chats[char.id] = [];
    accData.hearts[char.id] = [];
    accData.memories[char.id] = [];
    
    save();
    renderContacts();
    renderWorldbooks();
    toast('导入成功：' + realName);
}