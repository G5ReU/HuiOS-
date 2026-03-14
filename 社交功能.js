// ========== 朋友圈通知红点 ==========
function updateMomentBadge() {
    var data = getAccData();
    var count = data.momentNotifs ? data.momentNotifs.length : 0;
    var el = $('momentBadge');
    if (count > 0) { el.style.display = 'flex'; el.textContent = count > 99 ? '99+' : count; }
    else { el.style.display = 'none'; }
}

function addMomentNotif(msg) {
    var data = getAccData();
    if (!data.momentNotifs) data.momentNotifs = [];
    data.momentNotifs.push({ msg: msg, time: Date.now() });
    save(); updateMomentBadge();
}

function clearMomentNotifs() {
    var data = getAccData();
    if (data.momentNotifs && data.momentNotifs.length) {
        data.momentNotifs = [];
    save(); updateMomentBadge();
    }
}

// ========== 表情包核心拉取功能（给AI回复用） ==========
function getStickersForAI(charId) {
    var data = getAccData();
    // 数据兼容性检查
    if (!data.stickerSettings) data.stickerSettings = { aiEnabled: false, charStickerGroups: {} };
    if (!data.stickers) data.stickers = [];
    
    if (!data.stickerSettings.aiEnabled) return '';
    var available = getAvailableStickersForChat(charId, 'ai');
    if (!available.length) return '';
    var info = '\n【可用表情包】\n你可以通过 <STICKER>表情包含义</STICKER> 发送表情包。可以一轮发送多个表情包，随心所欲即可。不可胡乱编造任何含义。可用的表情包：\n';
    for (var i = 0; i < Math.min(available.length, 30); i++) info += '- ' + available[i].desc + '\n';
    if (available.length > 30) info += '...等共' + available.length + '个\n';
    return info;
}

// 获取可用的表情包
function getAvailableStickersForChat(charId, role) {
    var data = getAccData();
    if (!data.stickers) return [];
    
    // 返回所有表情包
    return data.stickers;
}

// ========== 表情包管理器页面 ==========
var currentStickerGroup = 'all';

function openMyStickersPage() {
    $('myStickersPage').classList.add('active');
    renderStickerGroupTabs();
    renderStickerGrid();
}

function closeMyStickersPage() {
    $('myStickersPage').classList.remove('active');
}

function renderStickerGroupTabs() {
    var data = getAccData();
    var h = '<div class="sticker-group-tab '+(currentStickerGroup==='all'?'active':'')+'" onclick="shiftStickerGroup(\'all\')">全部</div>';
    data.stickerGroups.forEach(function(g) {
        h += '<div class="sticker-group-tab '+(currentStickerGroup===g.id?'active':'')+'" onclick="shiftStickerGroup(\''+g.id+'\')">'+esc(g.name)+'</div>';
    });
    $('stickerGroupTabs').innerHTML = h;
}

function shiftStickerGroup(id) {
    currentStickerGroup = id;
    renderStickerGroupTabs();
    renderStickerGrid();
}

function renderStickerGrid() {
    var data = getAccData();
    var list = data.stickers || [];
    if (currentStickerGroup !== 'all') {
        list = list.filter(function(s) { return s.groupId === currentStickerGroup; });
}
    
    var h = '';
    if (!list.length) {
        h = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--text-light)">暂无表情包</div>';
    } else {
        list.forEach(function(s) {
            h += '<div class="sticker-item" onclick="openEditSticker(\''+s.id+'\')">';
            h += '<img src="'+s.url+'">';
            h += '</div>';
        });
    }
    $('stickerGrid').innerHTML = h;
}

// ========== 新增表情包 ==========
function openAddSticker() {
    var data = getAccData();
    $('stickerUrl').value = '';
    $('stickerDesc').value = '';
    $('stickerPreview').innerHTML = '';
    
    var h = '<option value="">无分组</option>';
    data.stickerGroups.forEach(function(g) { h += '<option value="'+g.id+'">'+esc(g.name)+'</option>'; });
    $('stickerGroupSelect').innerHTML = h;
    
    openModal('addStickerModal');
}

$('stickerUrl')?.addEventListener('input', function() {
    var url = this.value.trim();
    if (url) {
        $('stickerPreview').innerHTML = '<img src="'+url+'" style="max-width:100px;max-height:100px;border-radius:8px" onerror="this.outerHTML=\'<div style=color:red;font-size:12px>无法加载图片</div>\'">';
    } else {
        $('stickerPreview').innerHTML = '';
    }
});

function saveSticker() {
    var url = $('stickerUrl').value.trim();
    var desc = $('stickerDesc').value.trim();
    var groupId = $('stickerGroupSelect').value;
    
    if (!url) return toast('请输入图片URL');
    if (!desc) return toast('请输入表情含义');
    
    var data = getAccData();
    data.stickers.push({
        id: genId('stk'), url: url, desc: desc, groupId: groupId, time: Date.now()
    });
    
    save(); closeModal('addStickerModal'); renderStickerGrid(); toast('已添加');
}

// ========== 聊天界面发送表情包选择器 ==========
var pickerCurrentGroup = 'all';

function openStickerPicker() {
    closeFunc();
    var data = getAccData();
    if (!data.stickers || !data.stickers.length) {
        return toast('请先在"我的"->"我的表情包"中添加');
    }
    
    pickerCurrentGroup = 'all';
    renderStickerPickerTabs();
    renderStickerPickerGrid();
    openModal('stickerPickerModal');
}

function renderStickerPickerTabs() {
    var data = getAccData();
    var h = '<div class="sticker-group-tab '+(pickerCurrentGroup==='all'?'active':'')+'" onclick="shiftPickerGroup(\'all\')">全部</div>';
    data.stickerGroups.forEach(function(g) {
        h += '<div class="sticker-group-tab '+(pickerCurrentGroup===g.id?'active':'')+'" onclick="shiftPickerGroup(\''+g.id+'\')">'+esc(g.name)+'</div>';
    });
    $('stickerPickerTabs').innerHTML = h;
}

function shiftPickerGroup(id) {
    pickerCurrentGroup = id;
    renderStickerPickerTabs();
    renderStickerPickerGrid();
}

function renderStickerPickerGrid() {
    var data = getAccData();
    // 用户可用所有表情包
    var list = data.stickers || [];
    if (pickerCurrentGroup !== 'all') {
        list = list.filter(function(s) { return s.groupId === pickerCurrentGroup; });
    }
    
    var h = '';
    if (!list.length) {
        h = '<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--text-light);font-size:12px">暂无表情包</div>';
    } else {
        list.forEach(function(s) {
            h += '<div class="sticker-item" onclick="sendStickerMsg(\''+s.id+'\')" title="'+esc(s.desc)+'">';
            h += '<img src="'+s.url+'">';
            h += '</div>';
        });
    }
$('stickerPickerGrid').innerHTML = h;
}

function sendStickerMsg(id) {
    var data = getAccData();
    var s = data.stickers.find(function(x) { return x.id === id; });
    if (!s) return;
    
    closeModal('stickerPickerModal');
    appendMsg({ role: 'user', type: 'sticker', stickerUrl: s.url, stickerDesc: s.desc, time: Date.now() });
    
    // 触发自动回复
    if (typeof triggerAutoReply === 'function') {
        triggerAutoReply();
    } else if (typeof triggerReply === 'function') {
        triggerReply();
    }
}

function viewStickerFull(url) {
    $('viewerImg').src = url;
    $('imageViewer').classList.add('active');
}
// 备忘录的空兜底函数，防止当前阶段报错卡死
function getMemoForAI() {
    return '';
}
function openEditSticker(id) {
    var data = getAccData();
    var s = data.stickers.find(function(x) { return x.id === id; });
    if (!s) return;
    $('editStickerUrl').value = s.url;
    $('editStickerDesc').value = s.desc;
    $('editStickerPreview').innerHTML = '<img src="' + s.url + '" style="max-width:100px;border-radius:8px">';
    var h = '<option value="">无分组</option>';
    data.stickerGroups.forEach(function(g) {
        h += '<option value="' + g.id + '"' + (s.groupId === g.id ? ' selected' : '') + '>' + esc(g.name) + '</option>';
    });
    $('editStickerGroupSelect').innerHTML = h;
    editingStickerModal = id;
    openModal('editStickerModal');
}

var editingStickerModal = null;

function updateSticker() {
    if (!editingStickerModal) return;
    var data = getAccData();
    var s = data.stickers.find(function(x) { return x.id === editingStickerModal; });
    if (!s) return;
    s.url = $('editStickerUrl').value.trim();
    s.desc = $('editStickerDesc').value.trim();
    s.groupId = $('editStickerGroupSelect').value;
    save(); closeModal('editStickerModal'); renderStickerGrid(); toast('已保存');
}

function deleteEditingSticker() {
    if (!editingStickerModal) return;
    if (!confirm('删除这个表情包？')) return;
    var data = getAccData();
    data.stickers = data.stickers.filter(function(s) { return s.id !== editingStickerModal; });
    save(); closeModal('editStickerModal'); renderStickerGrid(); toast('已删除');
}

function openStickerSettings() {
    var data = getAccData();
    $('aiStickerEnabled').checked = data.stickerSettings ? data.stickerSettings.aiEnabled : false;
    var charSection = $('charStickerSettings');
    if (charSection) charSection.style.display = data.stickerSettings && data.stickerSettings.aiEnabled ? 'block' : 'none';
    renderStickerGroupListInSettings();
    openModal('stickerSettingsModal');
}

function toggleAiStickerEnabled() {
    var data = getAccData();
    if (!data.stickerSettings) data.stickerSettings = { aiEnabled: false, charStickerGroups: {} };
    data.stickerSettings.aiEnabled = $('aiStickerEnabled').checked;
    save();
    var charSection = $('charStickerSettings');
    if (charSection) charSection.style.display = data.stickerSettings.aiEnabled ? 'block' : 'none';
}

function renderStickerGroupListInSettings() {
    var data = getAccData();
    var h = '';
    if (!data.stickerGroups.length) {
        h = '<div style="color:var(--text-light);font-size:12px;padding:8px">暂无分组</div>';
    } else {
        data.stickerGroups.forEach(function(g) {
            h += '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px;border-bottom:1px solid #f0f0f0">';
            h += '<span>' + esc(g.name) + '</span>';
            h += '<button onclick="deleteStickerGroup(\'' + g.id + '\')" style="padding:4px 10px;border:none;border-radius:6px;background:#FFE0E0;color:#FF6B6B;font-size:12px;cursor:pointer">删除</button>';
            h += '</div>';
        });
    }
    if ($('stickerGroupList')) $('stickerGroupList').innerHTML = h;
}

function openCreateStickerGroup() {
    editingStickerGroupId = null;
    $('stickerGroupModalTitle').textContent = '📁 创建分组';
    $('stickerGroupName').value = '';
    $('delStickerGroupBtn').style.display = 'none';
    openModal('stickerGroupModal');
}

var editingStickerGroupId = null;

function saveStickerGroup() {
    var name = $('stickerGroupName').value.trim();
    if (!name) return toast('请输入名称');
    var data = getAccData();
    if (editingStickerGroupId) {
        var g = data.stickerGroups.find(function(x) { return x.id === editingStickerGroupId; });
        if (g) g.name = name;
    } else {
        data.stickerGroups.push({ id: genId('sgrp'), name: name });
    }
    save(); closeModal('stickerGroupModal');
    renderStickerGroupTabs(); renderStickerGrid();
    renderStickerGroupListInSettings();
    toast('已保存');
}

function deleteStickerGroup(id) {
    if (!confirm('删除分组？表情包不会删除')) return;
    var data = getAccData();
    data.stickerGroups = data.stickerGroups.filter(function(g) { return g.id !== id; });
    data.stickers.forEach(function(s) { if (s.groupId === id) s.groupId = ''; });
    save(); renderStickerGroupListInSettings(); renderStickerGroupTabs(); renderStickerGrid(); toast('已删除');
}

function exportStickers() {
    var data = getAccData();
    var json = JSON.stringify({ stickers: data.stickers, stickerGroups: data.stickerGroups }, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'stickers.json';
    a.click();
}

function importStickers() { $('stickerImportInput').click(); }

function onStickerImport(e) {
    var f = e.target.files[0]; if (!f) return;
    var reader = new FileReader();
    reader.onload = function(ev) {
        try {
            var imported = JSON.parse(ev.target.result);
            var data = getAccData();
            if (imported.stickers) data.stickers = data.stickers.concat(imported.stickers);
            if (imported.stickerGroups) data.stickerGroups = data.stickerGroups.concat(imported.stickerGroups);
            save(); renderStickerGrid(); renderStickerGroupTabs(); toast('导入成功');
        } catch(e) { toast('导入失败'); }
    };
    reader.readAsText(f);
}

function openBatchDeleteSticker() {
    var data = getAccData();
    var h = '';
    data.stickers.forEach(function(s) {
        h += '<div class="sticker-item" id="bstk_' + s.id + '" onclick="toggleBatchSticker(\'' + s.id + '\')">';
        h += '<img src="' + s.url + '">';
        h += '<div class="sticker-check">✓</div></div>';
    });
    $('batchStickerGrid').innerHTML = h || '<div style="grid-column:1/-1;text-align:center;color:var(--text-light);padding:20px">暂无表情包</div>';
    openModal('batchDeleteStickerModal');
}

function toggleBatchSticker(id) {
    var el = $('bstk_' + id);
    if (el) el.classList.toggle('selected');
}

function confirmBatchDelete() {
    var selected = document.querySelectorAll('#batchStickerGrid .sticker-item.selected');
    if (!selected.length) return toast('请选择要删除的表情包');
    if (!confirm('删除选中的 ' + selected.length + ' 个表情包？')) return;
    var data = getAccData();
    selected.forEach(function(el) {
        var id = el.id.replace('bstk_', '');
        data.stickers = data.stickers.filter(function(s) { return s.id !== id; });
    });
    save(); closeModal('batchDeleteStickerModal'); renderStickerGrid(); toast('已删除');
}
function momTouchStart(e) { momTouchStartX = e.touches[0].clientX; }
function momTouchMove(e, id) {
    var diff = momTouchStartX - e.touches[0].clientX;
    if (diff > 50) {
        if (swipedMomentId && swipedMomentId !== id) {
            var old = document.querySelector('.moment-item[data-mid="'+swipedMomentId+'"]');
            if (old) old.classList.remove('swiped');
        }
        swipedMomentId = id;
        var el = document.querySelector('.moment-item[data-mid="'+id+'"]');
        if (el) el.classList.add('swiped');
    } else if (diff < -30 && swipedMomentId === id) {
        var el = document.querySelector('.moment-item[data-mid="'+id+'"]');
        if (el) el.classList.remove('swiped');
        swipedMomentId = null;
    }
}
function momTouchEnd() {}