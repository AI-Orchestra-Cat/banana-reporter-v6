// バナナレポーター v6.6 - 修正版
(function() {
    'use strict';
    
    console.log('app.js loaded - 修正版');
    
    // SHA-256ハッシュ関数
    async function hashPassword(password) {
        const msgBuffer = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    
    // 認証データ
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
    
    let currentUser = null;
    
    // DOMContentLoaded
    document.addEventListener('DOMContentLoaded', function() {
        console.log('DOM loaded');
        initializeApp();
    });
    
    function initializeApp() {
        // ログインボタン
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            loginBtn.onclick = handleLogin;
        }
        
        // パスワードフィールドでEnterキー
        const passwordField = document.getElementById('password');
        if (passwordField) {
            passwordField.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') handleLogin();
            });
        }
        
        // その他のボタン
        setupButtons();
        
        // 初期値設定
        setupInitialValues();
    }
    
    async function handleLogin() {
        console.log('Login attempt');
        
        const userId = document.getElementById('userId').value.trim();
        const password = document.getElementById('password').value;
        
        if (!userId || !password) {
            showError('ユーザーIDとパスワードを入力してください');
            return;
        }
        
        const passwordHash = await hashPassword(password);
        console.log('Password hash:', passwordHash);
        
        const user = AUTH_CONFIG.users.find(u => 
            u.id === userId && u.passHash === passwordHash
        );
        
        if (user) {
            console.log('Login successful');
            currentUser = user;
            sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
            showMainScreen();
        } else {
            showError('ユーザーIDまたはパスワードが正しくありません');
        }
    }
    
    function showMainScreen() {
        document.getElementById('authScreen').classList.add('hidden');
        document.getElementById('mainScreen').classList.remove('hidden');
        
        const roleDisplay = {
            'admin': '管理者',
            'expert': 'エキスパート',
            'user': '一般'
        };
        
        const userDisplay = document.getElementById('currentUserDisplay');
        if (userDisplay) {
            userDisplay.textContent = `${currentUser.id}（${roleDisplay[currentUser.role]}）`;
        }
        
        document.body.className = `role-${currentUser.role}`;
    }
    
    function showError(message) {
        const errorEl = document.getElementById('loginError');
        if (errorEl) {
            errorEl.textContent = message;
            errorEl.classList.remove('hidden');
            setTimeout(() => errorEl.classList.add('hidden'), 3000);
        }
    }
    
    function setupButtons() {
        // ログアウト
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.onclick = function() {
                if (confirm('ログアウトしますか？')) {
                    sessionStorage.clear();
                    location.reload();
                }
            };
        }
        
        // リセット
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.onclick = function() {
                if (confirm('すべてリセットしますか？')) {
                    location.reload();
                }
            };
        }
        
        // カメラ
        const cameraBtn = document.getElementById('cameraBtn');
        if (cameraBtn) {
            cameraBtn.onclick = function() {
                document.getElementById('cameraInput').click();
            };
        }
        
        // ファイル
        const fileBtn = document.getElementById('fileBtn');
        if (fileBtn) {
            fileBtn.onclick = function() {
                document.getElementById('fileInput').click();
            };
        }
    }
    
    function setupInitialValues() {
        // 日付の初期値
        const today = new Date().toISOString().split('T')[0];
        
        const deliveryDate = document.getElementById('deliveryDate');
        if (deliveryDate) {
            deliveryDate.value = today;
            console.log('納品日設定:', today);
        }
        
        const captureDate = document.getElementById('captureDate');
        if (captureDate) {
            captureDate.value = today;
            console.log('撮影日設定:', today);
        }
        
        // クレーム種別
        const claimTypes = [
            '過熟',
            '未熟',
            'くされ',
            'おされ＆傷',
            'カビ',
            '青ぶく',
            '黄ぶく',
            'その他'
        ];
        
        const claimSelect = document.getElementById('claimType');
        if (claimSelect) {
            claimSelect.innerHTML = '<option value="">選択してください</option>';
            claimTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                claimSelect.appendChild(option);
            });
            console.log('クレーム種別設定完了');
        }
        
        // 単位
        const units = [
            '本（個別）',
            '房（束）',
            '袋（パック）',
            '箱（ボックス）',
            'ケース',
            'パレット',
            'コンテナ',
            'キログラム',
            'その他'
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
            unitSelect.value = '袋（パック）';
            console.log('単位設定完了、初期値:', unitSelect.value);
        }
    }
    
    // セッション確認
    const savedUser = sessionStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        document.addEventListener('DOMContentLoaded', function() {
            showMainScreen();
        });
    }
    
})();
