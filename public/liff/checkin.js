// API Endpoint
const API_BASE = window.location.origin;

// 全域狀態
let LIFF_ID = null;
let STORE_LOCATION = null;
let userProfile = null;
let employeeData = null;
let todayRecords = [];
let currentLocation = null;

/**
 * 載入 LIFF 設定
 */
async function loadConfig() {
    try {
        const response = await fetch(`${API_BASE}/api/liff-config`);
        if (!response.ok) {
            throw new Error('無法載入 LIFF 設定');
        }
        const config = await response.json();
        LIFF_ID = config.liffId;
        STORE_LOCATION = config.storeLocation;
        console.log('LIFF 設定載入成功:', config);
        return config;
    } catch (error) {
        console.error('載入 LIFF 設定失敗:', error);
        throw error;
    }
}

/**
 * 初始化 LIFF
 */
async function initializeLiff() {
    try {
        // 先載入設定
        await loadConfig();

        if (!LIFF_ID) {
            throw new Error('LIFF ID 未設定');
        }

        await liff.init({ liffId: LIFF_ID });

        if (!liff.isLoggedIn()) {
            liff.login();
            return;
        }

        // 取得使用者資料
        userProfile = await liff.getProfile();
        console.log('User Profile:', userProfile);

        // 載入頁面
        await loadPage();

    } catch (error) {
        console.error('LIFF 初始化失敗:', error);
        showError(`系統初始化失敗：${error.message}`);
    }
}

/**
 * 載入頁面
 */
async function loadPage() {
    try {
        // 檢查員工資料
        employeeData = await checkEmployee();

        if (!employeeData) {
            showError('您尚未註冊，請先在聊天室輸入「註冊 [姓名]」進行註冊');
            return;
        }

        // 取得今日打卡紀錄
        todayRecords = await getTodayRecords();

        // 取得位置
        await getCurrentLocation();

        // 渲染頁面
        renderPage();

    } catch (error) {
        console.error('載入頁面失敗:', error);
        showError(`載入失敗：${error.message}`);
    }
}

/**
 * 檢查員工資料
 */
async function checkEmployee() {
    try {
        const response = await fetch(`${API_BASE}/api/employee/${userProfile.userId}`);
        if (response.ok) {
            const data = await response.json();
            return data.employee;
        }
        return null;
    } catch (error) {
        console.error('檢查員工失敗:', error);
        return null;
    }
}

/**
 * 取得今日打卡紀錄
 */
async function getTodayRecords() {
    try {
        const response = await fetch(`${API_BASE}/api/records/${userProfile.userId}`);
        if (response.ok) {
            const data = await response.json();
            return data.records || [];
        }
        return [];
    } catch (error) {
        console.error('取得紀錄失敗:', error);
        return [];
    }
}

/**
 * 取得當前位置
 */
async function getCurrentLocation() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            console.warn('瀏覽器不支援定位');
            resolve(null);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                currentLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy
                };
                console.log('目前位置:', currentLocation);
                resolve(currentLocation);
            },
            (error) => {
                console.warn('無法取得位置:', error);
                resolve(null);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
            }
        );
    });
}

/**
 * 計算兩點距離（公尺）
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // 地球半徑（公尺）
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

/**
 * 檢查位置是否在範圍內
 */
function checkLocationValid() {
    if (!currentLocation) {
        return { valid: false, message: '⚠️ 無法取得位置資訊，請允許瀏覽器存取位置' };
    }

    if (!STORE_LOCATION) {
        return { valid: false, message: '⚠️ 店家位置未設定' };
    }

    const distance = calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        STORE_LOCATION.lat,
        STORE_LOCATION.lng
    );

    if (distance <= STORE_LOCATION.radius) {
        return {
            valid: true,
            message: `✅ 位置驗證成功（距離店家 ${Math.round(distance)} 公尺）`
        };
    } else {
        return {
            valid: false,
            message: `❌ 您不在店家附近（距離 ${Math.round(distance)} 公尺，需在 ${STORE_LOCATION.radius} 公尺內）`
        };
    }
}

/**
 * 打卡
 */
async function checkin(type) {
    try {
        const btn = event.target;
        btn.disabled = true;
        btn.textContent = '打卡中...';

        // 檢查位置
        const locationCheck = checkLocationValid();
        if (!locationCheck.valid) {
            alert(locationCheck.message);
            btn.disabled = false;
            btn.textContent = type === 'in' ? '🟢 上班打卡' : '🔴 下班打卡';
            return;
        }

        // 發送打卡請求
        const response = await fetch(`${API_BASE}/api/checkin`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userId: userProfile.userId,
                employeeName: employeeData.name,
                type: type,
                location: currentLocation
            })
        });

        if (response.ok) {
            const data = await response.json();
            alert(`✅ ${type === 'in' ? '上班' : '下班'}打卡成功！\n時間：${data.time}`);

            // 重新載入紀錄
            todayRecords = await getTodayRecords();
            renderPage();
        } else {
            const error = await response.json();
            alert(`❌ 打卡失敗：${error.error || error.message}`);
            btn.disabled = false;
            btn.textContent = type === 'in' ? '🟢 上班打卡' : '🔴 下班打卡';
        }

    } catch (error) {
        console.error('打卡失敗:', error);
        alert('打卡失敗，請稍後再試');
        const btn = event.target;
        btn.disabled = false;
        btn.textContent = type === 'in' ? '🟢 上班打卡' : '🔴 下班打卡';
    }
}

/**
 * 渲染頁面
 */
function renderPage() {
    const locationCheck = checkLocationValid();

    const html = `
        <div class="header">
            <h1>📍 LINE 打卡系統</h1>
            <div class="user-info">
                <img src="${userProfile.pictureUrl}" alt="avatar" class="user-avatar">
                <div class="user-name">${employeeData.name}</div>
            </div>
        </div>

        <div class="content">
            <div class="status-card">
                <div class="status-label">今日打卡次數</div>
                <div class="status-value">${todayRecords.length}</div>
            </div>

            <div class="location-info ${locationCheck.valid ? 'success' : 'error'}">
                ${locationCheck.message}
            </div>

            ${!locationCheck.valid && !currentLocation ? `
                <div style="text-align: center; margin-bottom: 20px;">
                    <button class="btn btn-checkin" onclick="location.reload()" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
                        🔄 重新取得位置
                    </button>
                </div>
            ` : ''}

            <div class="btn-group">
                <button class="btn btn-checkin" onclick="checkin('in')" ${!locationCheck.valid ? 'disabled' : ''}>
                    🟢 上班打卡
                </button>
                <button class="btn btn-checkout" onclick="checkin('out')" ${!locationCheck.valid ? 'disabled' : ''}>
                    🔴 下班打卡
                </button>
            </div>

            ${todayRecords.length > 0 ? `
                <div class="records">
                    <div class="records-title">📋 今日打卡紀錄</div>
                    ${todayRecords.map(record => `
                        <div class="record-item">
                            <span class="record-type ${record.type}">${record.type === 'in' ? '🟢 上班' : '🔴 下班'}</span>
                            <span class="record-time">${record.time}</span>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
        </div>
    `;

    document.getElementById('app').innerHTML = html;
}

/**
 * 顯示錯誤
 */
function showError(message) {
    document.getElementById('app').innerHTML = `
        <div class="content">
            <div class="error-message">
                ❌ ${message}
            </div>
            <button class="btn btn-checkin" onclick="location.reload()" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); margin-top: 20px;">
                🔄 重新載入
            </button>
        </div>
    `;
}

// 初始化
initializeLiff();
