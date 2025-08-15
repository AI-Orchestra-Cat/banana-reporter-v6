// app.js - SHA-256ハッシュ版
console.log('app.js v2 loaded');

// SHA-256ハッシュ関数
async function hashPassword(password) {
    try {
        const msgBuffer = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
        console.error('Hash error:', error);
        return null;
    }
}

// 認証データ（ハッシュ値のみ）
const AUTH_CONFIG = {
    users: [
        {
            id: 'admin',
            passHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
            role: 'admin'
        },
        {
            id: 'expert1',
            passHash: '4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce',
            role: 'expert'
        },
        {
            id: 'user1',
            passHash: '7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730',
            role: 'user'
        }
    ]
};

// グローバル変数
let currentUser = null;

// DOM読み込み後に実行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

function init() {
    console.log('Initializing app...');
    
    // ログインボタン
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.onclick = handleLogin;
    }
    
    // Enterキーでログイン
    const passwordField = document.getElementById('password');
    if (passwordField) {
        passwordField.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') handleLogin();
        });
    }
    
    // その他のボタン設定
    setupButtons();
    
    // 初期値設定
    setupInitialValues();
}

async function handleLogin() {
    console.log('Login attempt...');
    
    const userId = document.getElementById('userId').value.trim();
    const password = document.getElementById('password').value;
    
    if (!userId || !password) {
        alert('ユーザーIDとパスワードを入力してください');
        return;
    }
    
    // パスワードをハッシュ化
    const passwordHash = await hashPassword(password);
    console.log('Password hash:', passwordHash);
    
    // ユーザー検証
    const user = AUTH_CONFIG.users.find(u => 
        u.id === userId && u.passHash === passwordHash
    );
    
    if (user) {
        console.log('Login successful!');
        currentUser = {
            id: user.id,
            role: user.role
        };
        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
        showMainScreen();
    } else {
        alert('ユーザーIDまたはパスワードが正しくありません');
    }
}

function showMainScreen() {
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('mainScreen').classList.remove('hidden');
    
    // ユーザー情報表示
    const roleDisplay = {
        'admin': '管理者',
        'expert': 'エキスパート',
        'user': '一般'
    };
    
    const userDisplay = document.getElementById('currentUserDisplay');
    if (userDisplay) {
        userDisplay.textContent = `${currentUser.id}（${roleDisplay[currentUser.role] || currentUser.role}）`;
    }
    
    // ロールに応じた表示制御
    document.body.className = `role-${currentUser.role}`;
}

function setupButtons() {
    // ログアウト
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = function() {
            if (confirm('ログアウトしますか？')) {
                sessionStorage.removeItem('currentUser');
                currentUser = null;
                location.reload();
            }
        };
    }
    
    // カメラボタン
    const cameraBtn = document.getElementById('cameraBtn');
    if (cameraBtn) {
        cameraBtn.onclick = function() {
            const input = document.getElementById('cameraInput');
            if (input) input.click();
        };
    }
    
    // ファイルボタン
    const fileBtn = document.getElementById('fileBtn');
    if (fileBtn) {
        fileBtn.onclick = function() {
            const input = document.getElementById('fileInput');
            if (input) input.click();
        };
    }
    
    // リセットボタン
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.onclick = function() {
            if (confirm('すべての入力をリセットしますか？')) {
                location.reload();
            }
        };
    }
}

function setupInitialValues() {
    // 日付の初期値
    const today = new Date().toISOString().split('T')[0];
    
    const deliveryDate = document.getElementById('deliveryDate');
    if (deliveryDate) deliveryDate.value = today;
    
    const captureDate = document.getElementById('captureDate');
    if (captureDate) captureDate.value = today;
    
    // クレーム種別
    const claimTypes = [
        '過熟', '未熟', 'くされ', 'おされ＆傷',
        'カビ', '青ぶく', '黄ぶく', 'その他'
    ];
    
    const claimTypeSelect = document.getElementById('claimType');
    if (claimTypeSelect) {
        claimTypeSelect.innerHTML = '<option value="">選択してください</option>';
        claimTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            claimTypeSelect.appendChild(option);
        });
    }
    
    // 単位
    const units = [
        '本（個別）', '房（束）', '袋（パック）', '箱（ボックス）',
        'ケース', 'パレット', 'コンテナ', 'キログラム', 'その他'
    ];
    
    const unitSelect = document.getElementById('claimUnit');
    if (unitSelect) {
        unitSelect.innerHTML = '<option value="">選択してください</option>';
        units.forEach(unit => {
            const option = document.createElement('option');
            option.value = unit;
            option.textContent = unit;
            if (unit === '袋（パック）') {
                option.selected = true;
            }
            unitSelect.appendChild(option);
        });
    }
}

// セッション確認
const savedUser = sessionStorage.getItem('currentUser');
if (savedUser) {
    currentUser = JSON.parse(savedUser);
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            showMainScreen();
        });
    } else {
        showMainScreen();
    }
}
