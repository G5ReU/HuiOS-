// ========== 地图数据初始化 ==========
if (typeof D.maps === 'undefined') {
    D.maps = { list: [] };
}

// ========== 地点类型图标 ==========
var placeIcons = {
    home: '🏠',
    cafe: '☕',
    office: '🏢',
    shop: '🛒',
    park: '🌳',
    hospital: '🏥',
    school: '🏫',
    entertainment: '🎮',
    transport: '🚇',
    other: '📍'
};

// ========== 获取角色对应的地图 ==========
function getMapForChar(charId) {
    if (!D.maps || !D.maps.list) return null;
    
    // 查找角色绑定的地图
    for (var i = 0; i < D.maps.list.length; i++) {
        var map = D.maps.list[i];
        if (map.charBindings && map.charBindings.indexOf(charId) >= 0) {
            return map;
        }
    }
    
    // 如果没有绑定，返回第一个地图
    return D.maps.list.length > 0 ? D.maps.list[0] : null;
}

// ========== Perlin噪声生成（地形用） ==========
function perlinNoise(x, y, seed, scale) {
    // 简化版Perlin噪声
    var s = seed || 12345;
    x = x / scale;
    y = y / scale;
    
    var n = Math.sin(x * 12.9898 + y * 78.233 + s) * 43758.5453;
    return (n - Math.floor(n));
}

// ========== 打开地图页面 ==========
function openHuyMap() {
    $('huyMapPage').classList.add('active');
    initMap();
}

function closeHuyMap() {
    $('huyMapPage').classList.remove('active');
}

// ========== 从消息打开位置 ==========
function openLocationFromMsg(mapId, placeId) {
    toast('位置查看功能开发中');
}

// ========== 接受邀请 ==========
function acceptInvite(mapId, placeId) {
    if (!mapId || !placeId) return toast('位置信息无效');
    
    var data = getAccData();
    if (!data.userLocation) data.userLocation = {};
    
    data.userLocation = {
        mapId: mapId,
        placeId: placeId,
        time: Date.now()
    };
    
    save();
    toast('已接受邀请');
}

// ========== 位置选择器 ==========
function openLocationPicker() {
    toast('位置功能开发中');
}

// ========== 数据结构检查 ==========
function checkMapDataStructure() {
    if (!D.maps) D.maps = { list: [] };
    var data = getAccData();
    if (data && !data.charLocations) data.charLocations = {};
    if (data && !data.userLocation) data.userLocation = null;
}
function initMap() {
    if (!D.maps) D.maps = { list: [] };
    
    // 渲染地图选择器
    var sel = $('currentMapSelect');
    if (!sel) return;
    
    if (!D.maps.list.length) {
        sel.innerHTML = '<option value="">暂无地图</option>';
        $('mapContainer') && ($('mapContainer').innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-light)">还没有地图，点击"新建"创建一个</div>');
        return;
    }
    
    sel.innerHTML = D.maps.list.map(function(m) {
        return '<option value="' + m.id + '">' + m.name + '</option>';
    }).join('');
    
    if (D.maps.list.length) renderMap(D.maps.list[0]);
}

var mapScale = 1;
var mapOffsetX = 0;
var mapOffsetY = 0;
var mapPanX = 0;
var mapPanY = 0;
var mapPanStartX = 0;
var mapPanStartY = 0;
var mapPanOriginX = 0;
var mapPanOriginY = 0;
var mapIsPanning = false;

function renderMap(map) {
    if (!map) return;
    var container = $('mapContainer');
    if (!container) return;

    var w = container.offsetWidth || 360;
    var h = container.offsetHeight || 280;

    // 重置平移缩放
    mapScale = 1;
    mapPanX = 0;
    mapPanY = 0;
    var slider = $('mapZoomSlider');
    if (slider) slider.value = 1;

    // 清空并建立内层（transform作用在这里，不裁切）
    container.innerHTML = '';
    container.style.cursor = 'grab';
    container.style.overflow = 'hidden';

    var inner = document.createElement('div');
    inner.id = 'mapInner';
    inner.style.cssText = 'position:absolute;top:0;left:0;width:' + w + 'px;height:' + h + 'px;transform-origin:center center;will-change:transform';
    container.appendChild(inner);

    var canvas = document.createElement('canvas');
    canvas.id = 'mapCanvas';
    canvas.width = w;
    canvas.height = h;
    canvas.style.cssText = 'position:absolute;top:0;left:0;';
    inner.appendChild(canvas);

    var placesDiv = document.createElement('div');
    placesDiv.id = 'mapPlaces';
    placesDiv.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;';
    inner.appendChild(placesDiv);

    drawTerrain(canvas, map.seed || 12345, w, h);
    renderMapPlaces(map, placesDiv, w, h);
    initMapPan(container);
}

function drawTerrain(canvas, seed, w, h) {
    var ctx = canvas.getContext('2d');
    var scale = 60;
    var imgData = ctx.createImageData(w, h);
    
    for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
            var n = noise2d(x / scale, y / scale, seed);
var n2 = noise2d(x / (scale * 0.5) + 100, y / (scale * 0.5) + 100, seed + 1) * 0.3;
var raw = n * 0.7 + n2;
// 压低整体高度，让高值区间更稀少
var val = Math.min(1, Math.max(0, raw * 0.85));
            
            var r, g, b;
            if (val < 0.15) {
                // 深水（占15%）
                var t = val / 0.15;
                r = Math.floor(30 + t * 40);
                g = Math.floor(80 + t * 60);
                b = Math.floor(160 + t * 40);
            } else if (val < 0.22) {
                // 浅水/海岸（占7%）
                var t = (val - 0.15) / 0.07;
                r = Math.floor(100 + t * 60);
                g = Math.floor(160 + t * 40);
                b = Math.floor(180);
            } else if (val < 0.28) {
                // 沙滩（占6%）
                var t = (val - 0.22) / 0.06;
                r = Math.floor(220 + t * 20);
                g = Math.floor(200 + t * 10);
                b = Math.floor(140);
            } else if (val < 0.62) {
                // 草地（占34%，最广）
                var t = (val - 0.28) / 0.34;
                r = Math.floor(60 + t * 40);
                g = Math.floor(130 + t * 40);
                b = Math.floor(55 + t * 30);
            } else if (val < 0.88) {
                // 山地（占26%，第二广）
                var t = (val - 0.62) / 0.26;
                r = Math.floor(110 + t * 70);
                g = Math.floor(95 + t * 55);
                b = Math.floor(75 + t * 45);
            } else if (val < 0.96) {
                // 高山岩石（占8%）
                var t = (val - 0.88) / 0.08;
                r = Math.floor(180 + t * 30);
                g = Math.floor(170 + t * 25);
                b = Math.floor(160 + t * 20);
            } else {
                // 雪山（占4%，最少）
                var t = (val - 0.96) / 0.04;
                r = Math.floor(220 + t * 35);
                g = Math.floor(230 + t * 25);
                b = Math.floor(240 + t * 15);
            }
            
            var idx = (y * w + x) * 4;
            imgData.data[idx] = r;
            imgData.data[idx + 1] = g;
            imgData.data[idx + 2] = b;
            imgData.data[idx + 3] = 255;
        }
    }
    
    ctx.putImageData(imgData, 0, 0);
}

function noise2d(x, y, seed) {
    // 简单的伪随机噪声（不需要外部库）
    var s = seed || 1;
    function rnd(nx, ny) {
        var n = Math.sin(nx * 127.1 + ny * 311.7 + s * 74.3) * 43758.5453;
        return n - Math.floor(n);
    }
    function smoothstep(t) { return t * t * (3 - 2 * t); }
    
    var ix = Math.floor(x), iy = Math.floor(y);
    var fx = x - ix, fy = y - iy;
    var ux = smoothstep(fx), uy = smoothstep(fy);
    
    var a = rnd(ix, iy);
    var b = rnd(ix + 1, iy);
    var c = rnd(ix, iy + 1);
    var d = rnd(ix + 1, iy + 1);
    
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

function renderMapPlaces(map, container, w, h) {
    if (!map.places || !map.places.length) return;
    
    container.style.pointerEvents = 'auto';
    var frag = document.createDocumentFragment();
    
    map.places.forEach(function(p) {
        var icon = placeIcons[p.type] || '📍';
        
        // 坐标归一化到画布大小
        var px = Math.min(Math.max(p.x || 150, 20), w - 20);
        var py = Math.min(Math.max(p.y || 150, 30), h - 10);
        
        var el = document.createElement('div');
        el.className = 'map-place';
        el.style.cssText = 'position:absolute;left:' + px + 'px;top:' + py + 'px;transform:translate(-50%,-100%);cursor:pointer;text-align:center;z-index:10;';
        el.innerHTML = '<div class="map-place-icon" style="font-size:22px;filter:drop-shadow(0 2px 3px rgba(0,0,0,0.4))">' + icon + '</div>' +
            '<div class="map-place-name" style="font-size:10px;background:rgba(255,255,255,0.92);padding:2px 6px;border-radius:4px;white-space:nowrap;margin-top:2px;box-shadow:0 1px 3px rgba(0,0,0,0.2);max-width:80px;overflow:hidden;text-overflow:ellipsis">' + p.name + '</div>';
        
(function(pid, m) {
    el.onclick = function(e) {
        e.stopPropagation();
        openEditPlaceModal(pid, m);
    };
})(p.id, map);
        frag.appendChild(el);
    });
    
    container.appendChild(frag);
}

function openEditPlaceModal(placeId, map) {
    var place = map.places.find(function(p) { return p.id === placeId; });
    if (!place) return;
    
    $('editPlaceName').value = place.name;
    $('editPlaceType').value = place.type || 'other';
    $('editPlaceDesc').value = place.desc || '';
if ($('editPlaceNote')) $('editPlaceNote').value = place.note || '';
    
    // 把当前地图和地点id存起来
    $('editPlaceModal').dataset.placeId = placeId;
    $('editPlaceModal').dataset.mapId = map.id;
    
    openModal('editPlaceModal');
}

function updatePlace() {
    var placeId = $('editPlaceModal').dataset.placeId;
    var mapId = $('editPlaceModal').dataset.mapId;
    if (!placeId || !mapId) return;
    
    var map = D.maps.list.find(function(m) { return m.id === mapId; });
    if (!map) return;
    
    var place = map.places.find(function(p) { return p.id === placeId; });
    if (!place) return;
    
    place.name = $('editPlaceName').value.trim() || place.name;
    place.type = $('editPlaceType').value;
    place.desc = $('editPlaceDesc').value.trim();
if ($('editPlaceNote')) place.note = $('editPlaceNote').value.trim();
    
    save();
    closeModal('editPlaceModal');
    renderMap(map);
    toast('已保存');
}

function deletePlace() {
    var placeId = $('editPlaceModal').dataset.placeId;
    var mapId = $('editPlaceModal').dataset.mapId;
    if (!confirm('删除这个地点？')) return;
    
    var map = D.maps.list.find(function(m) { return m.id === mapId; });
    if (!map) return;
    
    map.places = map.places.filter(function(p) { return p.id !== placeId; });
    save();
    closeModal('editPlaceModal');
    renderMap(map);
    toast('已删除');
}

function switchMap(id) {
    if (!D.maps) return;
    var map = D.maps.list.find(function(m) { return m.id === id; });
    if (map) renderMap(map);
}

function openCreateMap() {
    if (!$('newMapGroup')) return;
    var data = getAccData();
    var h = '<option value="">不绑定</option>';
    if (data) {
        data.groups.forEach(function(g) {
            h += '<option value="' + g.id + '">' + g.name + '</option>';
        });
    }
    $('newMapGroup').innerHTML = h;
    $('newMapName').value = '';
    $('newMapSeed').value = Math.floor(Math.random() * 9999);
setTimeout(previewSeed, 50);
openModal('createMapModal');
}

function createMap() {
    var name = $('newMapName').value.trim();
    if (!name) return toast('请输入地图名称');
    if (!D.maps) D.maps = { list: [] };
    var newMap = {
        id: genId('map'),
        name: name,
        seed: parseInt($('newMapSeed').value) || 12345,
        places: [],
        charBindings: [],
        groupBinding: $('newMapGroup').value || ''
    };
    D.maps.list.push(newMap);
    save();
    closeModal('createMapModal');
    initMap();
    toast('地图创建成功');
}

function openAddPlace() {
    if (!D.maps || !D.maps.list.length) return toast('请先创建地图');
    $('placeName').value = '';
    $('placeDesc').value = '';
    $('placeX').value = Math.floor(50 + Math.random() * 300);
    $('placeY').value = Math.floor(50 + Math.random() * 300);
    openModal('addPlaceModal');
}

function savePlace() {
    var name = $('placeName').value.trim();
    if (!name) return toast('请输入地点名称');
    if (!D.maps || !D.maps.list.length) return toast('请先创建地图');
    var sel = $('currentMapSelect');
    var mapId = sel ? sel.value : D.maps.list[0].id;
    var map = D.maps.list.find(function(m) { return m.id === mapId; }) || D.maps.list[0];
    if (!map) return;
    if (!map.places) map.places = [];
    
    var px = parseInt($('placeX').value) || 150;
    var py = parseInt($('placeY').value) || 150;
    var container = $('mapContainer');
    var cw = container ? container.offsetWidth || 360 : 360;
    var ch = container ? container.offsetHeight || 280 : 280;
    var tv = getTerrainVal(map.seed, px, py, cw, ch);
    if (tv < 0.28) {
        if (!confirm('该坐标位于水域，确定要放在这里吗？')) return;
    }
    
    map.places.push({
        id: genId('place'),
        name: name,
        type: $('placeType').value || 'other',
        desc: $('placeDesc').value.trim(),
        x: px,
        y: py,
        addedAt: Date.now()
    });
    save();
    closeModal('addPlaceModal');
    renderMap(map);
    toast('地点已添加');
}

function openPlaceList() {
    if (!D.maps || !D.maps.list.length) return toast('暂无地图');
    var sel = $('currentMapSelect');
    var mapId = sel ? sel.value : D.maps.list[0].id;
    var map = D.maps.list.find(function(m) { return m.id === mapId; }) || D.maps.list[0];
    if (!map) return;
    var h = '';
    if (!map.places || !map.places.length) {
        h = '<div style="text-align:center;padding:20px;color:var(--text-light)">暂无地点</div>';
    } else {
        map.places.forEach(function(p) {
            var icon = (typeof placeIcons !== 'undefined' && placeIcons[p.type]) ? placeIcons[p.type] : '📍';
            h += '<div class="place-list-item">';
            h += '<span class="place-list-icon">' + icon + '</span>';
            h += '<div class="place-list-info"><div class="place-list-name">' + p.name + '</div>';
            if (p.desc) h += '<div class="place-list-desc">' + p.desc + '</div>';
            h += '</div></div>';
        });
    }
    $('placeListContent').innerHTML = h;
    openModal('placeListModal');
}

function openMapSettings() {
    openModal('mapSettingsModal');
}

function previewSeed() {
    var seed = parseInt($('newMapSeed').value) || 12345;
    var canvas = $('seedPreviewCanvas');
    if (!canvas) return;
    drawTerrain(canvas, seed, 150, 100);
}
function pickPlaceOnMap() { toast('请手动输入坐标'); }
function onMapSearch(val) {
    var resultsEl = $('mapSearchResults');
    if (!resultsEl) return;
    if (!val || !val.trim()) {
        resultsEl.style.display = 'none';
        return;
    }
    var map = getCurrentMap();
    if (!map || !map.places || !map.places.length) {
        resultsEl.style.display = 'none';
        return;
    }
    var keyword = val.trim().toLowerCase();
    var matched = map.places.filter(function(p) {
        return p.name.toLowerCase().indexOf(keyword) >= 0 ||
               (p.desc && p.desc.toLowerCase().indexOf(keyword) >= 0);
    });
    if (!matched.length) {
        resultsEl.innerHTML = '<div style="padding:12px;color:var(--text-light);font-size:13px;text-align:center">没有找到匹配地点</div>';
        resultsEl.style.display = 'block';
        return;
    }
    var h = '';
    matched.forEach(function(p) {
        var icon = placeIcons[p.type] || '📍';
        h += '<div class="search-result-item" onclick="highlightPlace(\'' + p.id + '\')">';
        h += '<span style="font-size:20px">' + icon + '</span>';
        h += '<div><div style="font-size:13px;font-weight:500">' + esc(p.name) + '</div>';
        if (p.desc) h += '<div style="font-size:11px;color:var(--text-gray)">' + esc(p.desc) + '</div>';
        h += '</div></div>';
    });
    resultsEl.innerHTML = h;
    resultsEl.style.display = 'block';
}

function highlightPlace(placeId) {
    // 关闭搜索结果
    var resultsEl = $('mapSearchResults');
    if (resultsEl) resultsEl.style.display = 'none';
    var searchInput = $('mapSearchInput');
    if (searchInput) searchInput.value = '';

    // 找到对应地点元素并高亮
    var map = getCurrentMap();
    if (!map) return;
    var place = map.places.find(function(p) { return p.id === placeId; });
    if (!place) return;

    // 找到DOM里对应的地点元素（按name匹配）
    var placesDiv = $('mapPlaces');
    if (!placesDiv) return;
    var items = placesDiv.querySelectorAll('.map-place');
    items.forEach(function(el) {
        var nameEl = el.querySelector('.map-place-name');
        if (nameEl && nameEl.textContent === place.name) {
            el.scrollIntoView && el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.style.animation = 'placeHighlight 1.2s ease-out';
            setTimeout(function() { el.style.animation = ''; }, 1200);
        }
    });

    toast('已定位：' + place.name);
}

function mapZoom(delta) {
    var slider = $('mapZoomSlider');
    if (!slider) return;
    var newVal = Math.min(3, Math.max(0.5, parseFloat(slider.value) + delta));
    slider.value = newVal;
    setMapZoom(newVal);
}

function setMapZoom(val) {
    mapScale = parseFloat(val) || 1;
    applyMapTransform();
    var slider = $('mapZoomSlider');
    if (slider) slider.value = mapScale;
}

function applyMapTransform() {
    var inner = $('mapInner');
    if (!inner) return;
    inner.style.transform = 'translate(' + mapPanX + 'px,' + mapPanY + 'px) scale(' + mapScale + ')';
}

function initMapPan(container) {
    // touch拖动
    container.addEventListener('touchstart', function(e) {
        if (e.touches.length !== 1) return;
        mapIsPanning = true;
        mapPanStartX = e.touches[0].clientX;
        mapPanStartY = e.touches[0].clientY;
        mapPanOriginX = mapPanX;
        mapPanOriginY = mapPanY;
    }, { passive: true });

    container.addEventListener('touchmove', function(e) {
        if (!mapIsPanning || e.touches.length !== 1) return;
        var dx = e.touches[0].clientX - mapPanStartX;
        var dy = e.touches[0].clientY - mapPanStartY;
        var cw = container.offsetWidth;
        var ch = container.offsetHeight;
        var maxX = Math.max(0, (cw * mapScale - cw) / 2);
        var maxY = Math.max(0, (ch * mapScale - ch) / 2);
        mapPanX = Math.min(maxX, Math.max(-maxX, mapPanOriginX + dx));
        mapPanY = Math.min(maxY, Math.max(-maxY, mapPanOriginY + dy));
        applyMapTransform();
    }, { passive: true });

    container.addEventListener('touchend', function() {
        mapIsPanning = false;
    });

    // 鼠标拖动（桌面端）
    container.addEventListener('mousedown', function(e) {
        mapIsPanning = true;
        mapPanStartX = e.clientX;
        mapPanStartY = e.clientY;
        mapPanOriginX = mapPanX;
        mapPanOriginY = mapPanY;
        container.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', function(e) {
        if (!mapIsPanning) return;
        var dx = e.clientX - mapPanStartX;
        var dy = e.clientY - mapPanStartY;
        var cw = container.offsetWidth;
        var ch = container.offsetHeight;
        var maxX = Math.max(0, (cw * mapScale - cw) / 2);
        var maxY = Math.max(0, (ch * mapScale - ch) / 2);
        mapPanX = Math.min(maxX, Math.max(-maxX, mapPanOriginX + dx));
        mapPanY = Math.min(maxY, Math.max(-maxY, mapPanOriginY + dy));
        applyMapTransform();
    });

    document.addEventListener('mouseup', function() {
        if (mapIsPanning) {
            mapIsPanning = false;
            container.style.cursor = 'grab';
        }
    });
}
// ========== 获取当前选中地图 ==========
function getCurrentMap() {
    if (!D.maps || !D.maps.list.length) return null;
    var sel = $('currentMapSelect');
    var mapId = sel ? sel.value : '';
    return D.maps.list.find(function(m) { return m.id === mapId; }) || D.maps.list[0];
}

// ========== 重绘地形 ==========
function regenerateTerrain() {
    var map = getCurrentMap();
    if (!map) return toast('请先选择地图');
    var hasPlaces = map.places && map.places.length > 0;
    var msg = hasPlaces
        ? '重绘地形会生成新的随机种子，地形改变但地点坐标保留。确定重绘？'
        : '确定重绘地形？';
    if (!confirm(msg)) return;
    map.seed = Math.floor(Math.random() * 99999);
    save();
    renderMap(map);
    toast('地形已重绘，种子：' + map.seed);
}

// ========== 随机生成（保留空函数防止报错） ==========
function openRandomPlaceGenerator() {}

// ========== 导出地图 ==========
function exportMap() {
    var map = getCurrentMap();
    if (!map) return toast('请先选择地图');
    var exportData = {
        exportTime: new Date().toISOString(),
        exportVersion: '1.0',
        map: {
            name: map.name,
            seed: map.seed,
            places: (map.places || []).map(function(p) {
                return {
                    name: p.name,
                    type: p.type,
                    desc: p.desc || '',
                    note: p.note || '',
                    x: p.x,
                    y: p.y
                };
            })
        }
    };
    var json = JSON.stringify(exportData, null, 2);
    var blob = new Blob([json], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = map.name + '_地图.json';
    a.click();
    toast('已导出：' + map.name);
}

// ========== 导入地图 ==========
function importMap() {
    $('mapImportInput').click();
}

function onMapImport(e) {
    var f = e.target.files[0];
    if (!f) return;
    e.target.value = '';
    var reader = new FileReader();
    reader.onload = function(ev) {
        try {
            var imported = JSON.parse(ev.target.result);
            if (!imported.map || !imported.map.name) throw new Error('格式不正确');
            var mapData = imported.map;
            if (!D.maps) D.maps = { list: [] };
            var existName = mapData.name;
            var suffix = 1;
            while (D.maps.list.some(function(m) { return m.name === existName; })) {
                existName = mapData.name + '_' + suffix++;
            }
            var newMap = {
                id: genId('map'),
                name: existName,
                seed: mapData.seed || Math.floor(Math.random() * 99999),
                places: (mapData.places || []).map(function(p) {
                    return {
                        id: genId('place'),
                        name: p.name,
                        type: p.type || 'other',
                        desc: p.desc || '',
                        note: p.note || '',
                        x: p.x || 150,
                        y: p.y || 150,
                        addedAt: Date.now()
                    };
                }),
                charBindings: [],
                groupBinding: ''
            };
            D.maps.list.push(newMap);
            save();
            initMap();
            var sel = $('currentMapSelect');
            if (sel) { sel.value = newMap.id; renderMap(newMap); }
            toast('导入成功：' + existName + '，共' + newMap.places.length + '个地点');
        } catch(e) {
            toast('导入失败：' + e.message);
        }
    };
    reader.readAsText(f);
}

// ========== AI生成地点 ==========
function openAIPlaceGenerator() {
    var map = getCurrentMap();
    if (!map) return toast('请先选择地图');
    if (!D.api.key) return toast('请先配置API');
    $('aiPlaceMapName').textContent = map.name;
    $('aiPlacePrompt').value = '';
    $('aiPlaceResult').innerHTML = '';
    openModal('aiPlaceGeneratorModal');
}

function doAIGeneratePlaces() {
    var map = getCurrentMap();
    if (!map) return;
    var prompt = $('aiPlacePrompt').value.trim();
    var resultEl = $('aiPlaceResult');
    resultEl.innerHTML = '<div style="text-align:center;padding:16px;color:var(--text-gray)">AI生成中...</div>';

    var sysMsg = '你是一个世界构建助手，根据用户描述为地图生成地点列表。\n' +
        '输出格式为JSON数组，每个地点包含：name(名称)、type(类型，只能是home/cafe/office/shop/park/hospital/school/entertainment/transport/other之一)、desc(描述，20字以内)。\n' +
        '生成5-8个地点，直接输出JSON数组，不要任何其他内容。\n' +
        '示例：[{"name":"魔法学院","type":"school","desc":"培养魔法师的古老学府"}]';

    var userMsg = '地图名称：' + map.name + '\n';
    if (prompt) userMsg += '描述：' + prompt + '\n';
    userMsg += '请生成适合这个世界的地点列表。';

    fetch(D.api.url.replace(/\/+$/, '') + '/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + D.api.key },
        body: JSON.stringify({
            model: D.api.model,
            messages: [{ role: 'system', content: sysMsg }, { role: 'user', content: userMsg }],
            temperature: 1
        })
    })
    .then(function(r) { return r.json(); })
    .then(function(d) {
        if (d.error) throw new Error(d.error.message);
        var text = d.choices[0].message.content.trim();
        var match = text.match(/\[[\s\S]*\]/);
        if (!match) throw new Error('格式错误');
        var places = JSON.parse(match[0]);
        renderAIPlaceResult(places);
    })
    .catch(function(e) {
        resultEl.innerHTML = '<div style="color:#FF6B6B;padding:12px">生成失败：' + esc(e.message) + '</div>';
    });
}

function renderAIPlaceResult(places) {
    var resultEl = $('aiPlaceResult');
    if (!places || !places.length) {
        resultEl.innerHTML = '<div style="color:var(--text-gray);padding:12px">没有生成结果</div>';
        return;
    }
    var h = '<div style="font-size:12px;color:var(--text-gray);margin-bottom:8px">勾选要添加的地点：</div>';
    places.forEach(function(p, i) {
        var icon = placeIcons[p.type] || '📍';
        h += '<div style="display:flex;align-items:center;gap:10px;padding:10px;background:#f8f8f8;border-radius:10px;margin-bottom:6px">';
        h += '<input type="checkbox" id="aip_' + i + '" checked style="width:18px;height:18px">';
        h += '<label for="aip_' + i + '" style="flex:1;cursor:pointer">';
        h += '<div style="font-size:14px">' + icon + ' ' + esc(p.name) + '</div>';
        h += '<div style="font-size:11px;color:var(--text-gray)">' + esc(p.desc || '') + '</div>';
        h += '</label></div>';
    });
    window._aiGeneratedPlaces = places;
    h += '<button onclick="confirmAddAIPlaces()" style="width:100%;margin-top:10px;padding:12px;border:none;border-radius:10px;background:var(--primary);color:white;font-size:14px;cursor:pointer">添加选中地点</button>';
    resultEl.innerHTML = h;
}

function confirmAddAIPlaces() {
    var places = window._aiGeneratedPlaces;
    if (!places) return;
    var map = getCurrentMap();
    if (!map) return;
    if (!map.places) map.places = [];
    var container = $('mapContainer');
    var w = container ? container.offsetWidth || 360 : 360;
    var h = container ? container.offsetHeight || 280 : 280;
    var added = 0;
    places.forEach(function(p, i) {
        var cb = $('aip_' + i);
        if (!cb || !cb.checked) return;
        if (map.places.some(function(x) { return x.name === p.name; })) return;
        var pos = findLandPos(map.seed, w, h, p.type);
        map.places.push({
            id: genId('place'),
            name: p.name,
            type: p.type || 'other',
            desc: p.desc || '',
            x: pos.x,
            y: pos.y,
            addedAt: Date.now()
        });
        added++;
    });
    save();
    closeModal('aiPlaceGeneratorModal');
    renderMap(map);
    toast('已添加 ' + added + ' 个地点');
}

// ========== 发送位置 ==========
function openLocationPicker() {
    if (!curChar) return;
    var map = getMapForChar(curChar.id);
    if (!map || !map.places || !map.places.length) return toast('当前角色没有绑定地图或地图无地点');
    closeFunc();
    var h = '<div style="font-size:13px;color:var(--text-gray);margin-bottom:12px">选择要分享的地点：</div>';
    map.places.forEach(function(p) {
        var icon = placeIcons[p.type] || '📍';
        h += '<div onclick="sendLocationMsg(\'' + map.id + '\',\'' + p.id + '\')" style="display:flex;align-items:center;gap:12px;padding:12px;background:#f8f8f8;border-radius:10px;margin-bottom:8px;cursor:pointer">';
        h += '<span style="font-size:22px">' + icon + '</span>';
        h += '<div><div style="font-size:14px;font-weight:500">' + esc(p.name) + '</div>';
        if (p.desc) h += '<div style="font-size:11px;color:var(--text-gray)">' + esc(p.desc) + '</div>';
        h += '</div></div>';
    });
    $('locationPickerList').innerHTML = h;
    openModal('locationPickerModal');
}

function sendLocationMsg(mapId, placeId) {
    closeModal('locationPickerModal');
    var map = D.maps.list.find(function(m) { return m.id === mapId; });
    if (!map) return;
    var place = map.places.find(function(p) { return p.id === placeId; });
    if (!place) return;
    appendMsg({
        role: 'user',
        type: 'location',
        placeName: place.name,
        placeType: place.type,
        placeId: place.id,
        mapId: map.id,
        mapName: map.name,
        content: '',
        time: Date.now()
    });
    triggerAutoReply();
}

// ========== 查看位置详情 ==========
function openLocationFromMsg(mapId, placeId) {
    if (!mapId || !placeId) return toast('位置信息无效');
    var map = D.maps && D.maps.list.find(function(m) { return m.id === mapId; });
    if (!map) return toast('地图不存在');
    var place = map.places && map.places.find(function(p) { return p.id === placeId; });
    if (!place) return toast('地点不存在');

    var icon = placeIcons[place.type] || '📍';
    var h = '<div style="text-align:center;margin-bottom:16px;font-size:40px">' + icon + '</div>';
    h += '<div style="font-size:18px;font-weight:600;text-align:center;margin-bottom:6px">' + esc(place.name) + '</div>';
    h += '<div style="font-size:12px;color:var(--text-gray);text-align:center;margin-bottom:16px">📍 ' + esc(map.name) + '</div>';
    if (place.desc) {
        h += '<div style="background:#f8f8f8;border-radius:10px;padding:12px;font-size:13px;line-height:1.6;margin-bottom:10px">' + esc(place.desc) + '</div>';
    }
    if (place.note) {
        h += '<div style="background:#FFF9E6;border-radius:10px;padding:12px;font-size:13px;line-height:1.6;color:#8B6914;border-left:3px solid #FFD700">' + esc(place.note) + '</div>';
    }
    h += '<div id="locDetailMapThumb" style="margin-top:14px;border-radius:10px;overflow:hidden;height:120px;position:relative"></div>';

    $('locDetailContent').innerHTML = h;
    openModal('locDetailModal');

    setTimeout(function() {
        var thumb = $('locDetailMapThumb');
        if (!thumb) return;
        var tw = thumb.offsetWidth || 300;
        var canvas = document.createElement('canvas');
        canvas.width = tw;
        canvas.height = 120;
        canvas.style.cssText = 'width:100%;height:120px;display:block';
        thumb.appendChild(canvas);
        drawTerrain(canvas, map.seed || 12345, tw, 120);

        // 标注红点
        var ctx = canvas.getContext('2d');
        var mapW = ($('mapContainer') && $('mapContainer').offsetWidth) || 360;
        var mapH = ($('mapContainer') && $('mapContainer').offsetHeight) || 280;
        var tx = (place.x || 150) / mapW * tw;
        var ty = (place.y || 150) / mapH * 120;
        ctx.fillStyle = '#FF4444';
        ctx.beginPath();
        ctx.arc(tx, ty, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
    }, 50);
}

// ========== 接受邀请 ==========
function acceptInvite(mapId, placeId) {
    if (!mapId || !placeId) return toast('位置信息无效');
    var data = getAccData();
    if (!data.userLocation) data.userLocation = {};
    data.userLocation = { mapId: mapId, placeId: placeId, time: Date.now() };
    save();
    toast('已接受邀请，已移动到该地点');
}
function getTerrainVal(seed, px, py, w, h) {
    var scale = 60;
    var x = px, y = py;
    var n = noise2d(x / scale, y / scale, seed);
    var n2 = noise2d(x / (scale * 0.5) + 100, y / (scale * 0.5) + 100, seed + 1) * 0.3;
    var raw = n * 0.7 + n2;
    return Math.min(1, Math.max(0, raw * 0.85));
}

function findLandPos(seed, w, h, type) {
    // 水系地点允许靠近水边，陆地地点只放在草地/山地
    var waterTypes = ['transport']; // 港口类可以靠近水
    var beachTypes = ['park', 'entertainment'];
    var tries = 0;
    while (tries < 200) {
        var x = Math.floor(20 + Math.random() * (w - 40));
        var y = Math.floor(20 + Math.random() * (h - 40));
        var val = getTerrainVal(seed, x, y, w, h);
        var ok = false;
        if (waterTypes.indexOf(type) >= 0) {
            // 港口：允许在浅水/沙滩附近（0.15~0.35）
            ok = val >= 0.15 && val <= 0.35;
        } else if (beachTypes.indexOf(type) >= 0) {
            // 公园娱乐：沙滩到草地都行（0.25~0.65）
            ok = val >= 0.25 && val <= 0.65;
        } else {
            // 其他所有：只放在草地和山地（0.28~0.88）
            ok = val >= 0.28 && val <= 0.88;
        }
        if (ok) return { x: x, y: y };
        tries++;
    }
    // 200次找不到就放中间（兜底）
    return { x: Math.floor(w / 2), y: Math.floor(h / 2) };
}