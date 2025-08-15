// app.js - 動作確認用最小版
console.log('app.js loaded');

// DOM読み込み後に実行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

function init() {
    console.log('Initializing app...');
    
    const loginBtn = document.getElementById('loginBtn');
    if (loginBtn) {
        console.log('Login button found');
        loginBtn.onclick = handleLogin;
    } else {
        console.error('Login button not found!');
    }
}

async function handleLogin() {
    console.log('Login button clicked');
    
    const userId = document.getElementById('userId').value;
    const password = document.getElementById('password').value;
    
    console.log('User ID:', userId);
    
    // ハードコードでテスト
    if (userId === 'admin' && password === 'Bn@7QcX9') {
        console.log('Login successful!');
        document.getElementById('authScreen').classList.add('hidden');
        document.getElementById('mainScreen').classList.remove('hidden');
        alert('ログイン成功！');
    } else if (userId === 'expert1' && password === 'expert2024') {
        console.log('Login successful!');
        document.getElementById('authScreen').classList.add('hidden');
        document.getElementById('mainScreen').classList.remove('hidden');
        alert('ログイン成功！');
    } else if (userId === 'user1' && password === 'user2024') {
        console.log('Login successful!');
        document.getElementById('authScreen').classList.add('hidden');
        document.getElementById('mainScreen').classList.remove('hidden');
        alert('ログイン成功！');
    } else {
        alert('ログイン失敗\nID: ' + userId + '\nPassword: ' + password);
    }
}
