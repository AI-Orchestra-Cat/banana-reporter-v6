// app.js - シンプル動作確認版 v6.7
console.log('app.js loaded - v6.7');

// グローバル変数
let currentUser = null;

// SHA-256ハッシュ関数
async function hashPassword(password) {
    const msgBuffer = new TextEncoder().encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 認証データ（正しいハッシュ値）
const AUTH_CONFIG = {
    users: [
        {
            id: 'admin',
            passHash: '5f24eab8e0e8aa6ea81c6af7a38e6a5cd8a17aff0ce70e81b3e88f574b45602c', // Bn@7QcX9
            role: 'admin'
        }
    ]
};

// ログイン処理
async function handleLogin() {
    console.log('Login button clicked');
    
    const userId = document.getElementById('userId').value.trim();
    const password = document.getElementById('password').value;
    
    if (!userId || !password) {
        alert('ユーザーIDとパスワードを入力してください');
        return;
    }
    
    const passwordHash = await hashPassword(password);
    console.log('Hash:', passwordHash);
    
    const user = AUTH_CONFIG.users.find(u => 
        u.id === userId && u.passHash === passwordHash
    );
    
    if (user) {
        console.log('Login success!');
        currentUser = user;
        
        // 画面切り替え
        document.getElementById('authScreen').classList.add('hidden');
        document.getElementById('mainScreen').classList.remove('hidden');
        
        // ユーザー表示
        const display = document.getElementById('currentUserDisplay');
        if (display) {
            display.textContent = userId + '（管理者）';
        }
        
        alert('ログイン成功！');
    } else {
        alert('ログイン失敗：IDまたはパスワードが違います');
    }
}

// ログアウト処理
function handleLogout() {
    if (confirm('ログアウトしますか？')) {
        location.reload();
    }
}

// 初期化
function initApp() {
    console.log('Initializing app...');
    
    // ログインボタン
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        loginBtn.onclick = handleLogin;
        console.log('Login button ready');
    } else {
        console.error('Login button not found');
    }
    
    // ログアウトボタン
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.onclick = handleLogout;
    }
    
    // 日付初期値
    const today = new Date().toISOString().split('T')[0];
    const deliveryDate = document.getElementById('deliveryDate');
    if (deliveryDate) {
        deliveryDate.value = today;
    }
    const captureDate = document.getElementById('captureDate');
    if (captureDate) {
        captureDate.value = today;
    }
    
    // クレーム種別
    const claimTypes = ['過熟', '未熟', 'くされ', 'おされ＆傷', 'カビ', '青ぶく', '黄ぶく', 'その他'];
    const claimSelect = document.getElementById('claimType');
    if (claimSelect) {
        claimSelect.innerHTML = '<option value="">選択してください</option>';
        claimTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            claimSelect.appendChild(option);
        });
    }
    
    // 単位
    const units = ['本（個別）', '房（束）', '袋（パック）', '箱（ボックス）', 'ケース', 'パレット', 'コンテナ', 'キログラム', 'その他'];
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

// DOM読み込み後に実行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
