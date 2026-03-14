var D = {
    api: { url: 'https://api.openai.com', key: '', model: '', temp: 1, topP: 1 },
    api2: { url: '', key: '', model: '', temp: 0.7, topP: 1 },
    presets: [],
    worldbooks: [],
        theme: { tz: 8, color: '#B8A9C9', colorDark: '#9D8BB8', homeWp: '', globalWp: '', avatarMode: 'none', showFuncTips: true },
    settings: { stream: true, autoReply: true, delay: 3, segment: true, polliOn: false, polliKey: '', polliModel: 'flux', bgOn: false, bgInterval: 120, bgDmOn: true, bgMomentOn: true, imgSize: 512, imgQuality: 0.6 },
    accounts: [],
    currentAccId: null,
    accData: {}
};

var curChar = null, editCharId = null, editGroupId = null, editMemoryId = null, editWbId = null, editWbEntryId = null, curWbId = null;
var selectedAccId = null, isEditAccMode = false;
var quotedMsg = null, quotedIdx = -1, selectedMsgIdx = -1, longPressTimer = null;
var uploadTarget = null, imgType = null, pubImages = [], pubLoc = '', pubVisGroups = [];
var swipedId = null, touchStartX = 0, swipedMomentId = null, momTouchStartX = 0;
var imgClickTimer = null, imgClickCount = 0;
var responding = false, respondingCharId = null, timer = null, delayTimer = null;
var streamReader = null, streamCharId = null, streamFull = '';
var unreadCounts = {};
var bgTimer = null, lastInteract = {};
var notifyQueue = [], commentMomentId = null, replyToCommentId = null, replyToAuthorId = null;
var regenCustomPrompt = null;

var VOICE_ICON = 'https://i.postimg.cc/DztbxrRZ/IMG-8005.png';
var COLORS = [
    {c:'#B8A9C9',d:'#9D8BB8'},{c:'#FFCEC7',d:'#F5A9B8'},{c:'#B5EAD7',d:'#7DC8A8'},
    {c:'#FFEAA7',d:'#FDCB6E'},{c:'#A8D8EA',d:'#7BB4C9'},{c:'#DDD6F3',d:'#B8A9C9'},
    {c:'#F8B4B4',d:'#E88A8A'},{c:'#98D8C8',d:'#6BBF9F'},{c:'#F7DC6F',d:'#D4AC0D'},{c:'#D7BDE2',d:'#AF7AC5'}
];
function $(id) { return document.getElementById(id); }
function esc(s) { if (!s) return ''; var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function genId(p) { return (p||'id') + '_' + Date.now() + '_' + Math.random().toString(36).substr(2,4); }
function toast(m) { var t = $('toast'); t.textContent = m; t.classList.add('show'); setTimeout(function() { t.classList.remove('show'); }, 2000); }

function fmtTime(ts) {
    var d = new Date(ts), n = Date.now(), diff = n - ts;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff/60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff/3600000) + '小时前';
    return (d.getMonth()+1) + '/' + d.getDate();
}

function estTokens(s) {
    if (!s) return 0;
    var cn = (s.match(/[\u4e00-\u9fa5]/g)||[]).length;
    return Math.ceil(cn * 1.8 + (s.length - cn) * 0.25);
}
var db = new Dexie('AIChatDB');

db.version(1).stores({
    appData: 'id'  // 只需要一个表存储所有数据
});

// ========== 保存函数 ==========
async function save() {
    try {
        await db.appData.put({
            id: 'main',
            api: D.api,
            api2: D.api2,
            presets: D.presets,
            worldbooks: D.worldbooks,
            theme: D.theme,
            settings: D.settings,
            accounts: D.accounts,
            currentAccId: D.currentAccId,
            accData: D.accData,
            maps: D.maps,
            memos: D.memos,
            memoSettings: D.memoSettings
        });
    } catch(e) {
        console.error('保存失败:', e);
    }
}

// ========== 加载函数 ==========
async function load() {
    try {
        var d = await db.appData.get('main');
        if (d) {
            D.api = Object.assign({}, D.api, d.api || {});
            D.api2 = Object.assign({}, D.api2, d.api2 || {});
            D.presets = d.presets || [];
            D.worldbooks = d.worldbooks || [];
            D.theme = Object.assign({}, D.theme, d.theme || {});
            D.settings = Object.assign({}, D.settings, d.settings || {});
            D.accounts = d.accounts || [];
            D.currentAccId = d.currentAccId;
            D.accData = d.accData || {};
            if (d.maps) D.maps = d.maps;
            if (d.memos) D.memos = d.memos;
            if (d.memoSettings) D.memoSettings = d.memoSettings;
        }
    } catch(e) {
        console.error('加载失败:', e);
    }
}
function cleanResponsePrefix(text) {
    if (!text) return '';
    // 清理常见的AI开头语
    return text
        .replace(/^(好的|好的，|我为您|为您|让我|我来|以下是|这是)[，,、：:\s]*/gi, '')
        .replace(/^(OK|Sure|Here)[,\s]*/gi, '')
        .trim();
}
function getCurAcc() { return D.accounts.find(function(a) { return a.id === D.currentAccId; }); }
function getAccData() {
    if (!D.currentAccId) return null;
    if (!D.accData[D.currentAccId]) {
        D.accData[D.currentAccId] = { chars: [], groups: [], chats: {}, hearts: {}, memories: {}, moments: [], momentNotifs: [], stickers: [], stickerGroups: [], stickerSettings: { aiEnabled: false, charStickerGroups: {} } };
    }
    var data = D.accData[D.currentAccId];
    if (!data.momentNotifs) data.momentNotifs = [];
    if (!data.stickers) data.stickers = [];
    if (!data.stickerGroups) data.stickerGroups = [];
    if (!data.stickerSettings) data.stickerSettings = { aiEnabled: false, charStickerGroups: {} };
    if (!data.callLogs) data.callLogs = [];
    return data;
}
// ========== 数据导出导入 ==========

function openExportModal() {
    openModal('exportModal');
}

function openImportFile() {
    document.getElementById('importDataInput').click();
}

function doExportData() {
    const exp = {};

    if (document.getElementById('exp_accounts').checked) {
        // 账号与角色，剔除每个账号的 phoneData
        const accounts = D.accounts || [];
        const accData = {};
        Object.keys(D.accData || {}).forEach(accId => {
            const raw = D.accData[accId];
            if (!raw) return;
            // 深拷贝后删掉 phoneData
            const cleaned = JSON.parse(JSON.stringify(raw));
            delete cleaned.phoneData;
            accData[accId] = cleaned;
        });
        exp.accounts = accounts;
        exp.currentAccId = D.currentAccId || null;
        exp.accData = accData;
    }

    if (document.getElementById('exp_worldbooks').checked) {
        exp.worldbooks = D.worldbooks || [];
    }

    if (document.getElementById('exp_maps').checked) {
        exp.maps = D.maps || [];
    }

    if (document.getElementById('exp_memos').checked) {
        exp.memos = D.memos || {};
        exp.memoSettings = D.memoSettings || {};
    }

    if (document.getElementById('exp_api').checked) {
        exp.api = D.api || {};
        exp.api2 = D.api2 || {};
        exp.presets = D.presets || [];
    }

    if (document.getElementById('exp_theme').checked) {
        exp.theme = D.theme || {};
        exp.settings = D.settings || {};
    }

    if (Object.keys(exp).length === 0) {
        return toast('请至少选择一项');
    }

    exp._exportedAt = new Date().toISOString();
    exp._version = 'HuIOS_1.0';

    const json = JSON.stringify(exp, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // 生成文件名：HuIOS_2026-03-14.json
    const today = new Date();
    const dateStr = today.getFullYear() + '-' +
        String(today.getMonth() + 1).padStart(2, '0') + '-' +
        String(today.getDate()).padStart(2, '0');
    const filename = `HuIOS_${dateStr}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    closeModal('exportModal');
    toast('导出成功：' + filename);
}

function onImportData(event) {
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = '';

    const reader = new FileReader();
    reader.onload = function(e) {
        let data;
        try {
            data = JSON.parse(e.target.result);
        } catch(err) {
            return showError('文件格式错误，请选择正确的 JSON 备份文件');
        }

        // 验证是否是 HuIOS 导出的文件
        if (!data._version || !data._version.startsWith('HuIOS')) {
            return showError('不是有效的 HuIOS 备份文件');
        }

        const items = [];
        if (data.accounts)   items.push('账号与角色');
        if (data.worldbooks) items.push('世界书');
        if (data.maps)       items.push('地图');
        if (data.memos)      items.push('备忘录');
        if (data.api)        items.push('API配置');
        if (data.theme)      items.push('外观与功能设置');

        const confirmMsg = `即将导入以下内容：\n\n${items.join('、')}\n\n⚠️ 导入会覆盖当前对应数据，无法撤销。\n\n确认导入吗？`;

        if (!confirm(confirmMsg)) return;

        // 开始写入
        if (data.accounts !== undefined) {
            D.accounts = data.accounts;
            D.currentAccId = data.currentAccId || null;
            D.accData = data.accData || {};
        }
        if (data.worldbooks !== undefined) {
            D.worldbooks = data.worldbooks;
        }
        if (data.maps !== undefined) {
            D.maps = data.maps;
        }
        if (data.memos !== undefined) {
            D.memos = data.memos;
            D.memoSettings = data.memoSettings || {};
        }
        if (data.api !== undefined) {
            D.api = data.api;
            D.api2 = data.api2 || {};
            D.presets = data.presets || [];
        }
        if (data.theme !== undefined) {
            D.theme = data.theme;
            D.settings = data.settings || {};
        }

        save();
        toast('导入成功，即将刷新...');
        setTimeout(() => location.reload(), 1200);
    };
    reader.readAsText(file, 'utf-8');
}