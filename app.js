// バナナレポーター v6.6 - セキュリティ強化最終版
(function() {
    'use strict';
    
    // システム設定
    const CONFIG = {
        version: 'v6.6',
        maxImageSize: 800,
        jpegQuality: 0.7,
        analysisDelay: 2000,
        csvColumns: 28,
        defaultSettings: {
            requiredFields: ['deliveryDate', 'captureDate', 'productName', 'chainName', 'storeName', 'claimType'],
            claimTypes: ['変色', '形状異常', '腐敗', '外傷', 'その他'],
            units: ['kg', 'g', '個', '房', 'パック']
        }
    };

    // 認証システム
    const AUTH = {
        users: {
            '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918': {id: 'admin', role: 'admin'},
            '4e07408562bedb8b60ce05c1decfe3ad16b72230967de01f640b7e4729b49fce': {id: 'expert1', role: 'expert'},
            '7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730': {id: 'user1', role: 'user'}
        },
        currentUser: null,

        async hashPassword(value) {
            const encoder = new TextEncoder();
            const data = encoder.encode(value);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        },

        async login(userId, pass) {
            const hashedPass = await this.hashPassword(pass);
            const user = this.users[hashedPass];
            if (user && user.id === userId) {
                this.currentUser = user;
                document.body.className = `user-${user.role}`;
                return true;
            }
            return false;
        },

        logout() {
            this.currentUser = null;
            document.body.className = '';
        },

        isRole(role) {
            return this.currentUser && this.currentUser.role === role;
        }
    };

    // カラー解析システム
    const COLOR_ANALYZER = {
        levels: {
            2: { name: '極緑', rgb: [47, 125, 50], description: '未熟', recommendation: '数日待つ' },
            3: { name: '緑黄', rgb: [76, 175, 80], description: '若干未熟', recommendation: '1-2日待つ' },
            4: { name: '黄緑', rgb: [139, 195, 74], description: '適度', recommendation: '適切な状態' },
            5: { name: '黄色', rgb: [205, 220, 57], description: '良好', recommendation: '食べ頃' },
            6: { name: '黄橙', rgb: [255, 235, 59], description: '完熟', recommendation: '早めに消費' },
            7: { name: '橙色', rgb: [255, 193, 7], description: '過熟気味', recommendation: '即座に消費' },
            8: { name: '茶橙', rgb: [255, 152, 0], description: '過熟', recommendation: '加工推奨' },
            9: { name: '茶色', rgb: [255, 87, 34], description: '変色', recommendation: '廃棄検討' }
        },

        async analyzeImage(imageData) {
            await new Promise(resolve => setTimeout(resolve, CONFIG.analysisDelay));
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            return new Promise((resolve) => {
                img.onload = () => {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);
                    
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const pixels = imageData.data;
                    const colorCounts = {};
                    
                    for (let i = 0; i < pixels.length; i += 4) {
                        const r = pixels[i];
                        const g = pixels[i + 1];
                        const b = pixels[i + 2];
                        const level = this.classifyPixel(r, g, b);
                        colorCounts[level] = (colorCounts[level] || 0) + 1;
                    }
                    
                    const dominantLevel = Object.keys(colorCounts).reduce((a, b) => 
                        colorCounts[a] > colorCounts[b] ? a : b
                    );
                    
                    resolve({
                        dominantLevel: parseInt(dominantLevel),
                        distribution: colorCounts,
                        totalPixels: pixels.length / 4,
                        analysis: this.levels[dominantLevel]
                    });
                };
                img.src = imageData;
            });
        },

        classifyPixel(r, g, b) {
            const [h, s, v] = this.rgbToHsv(r, g, b);
            
            if (v < 0.3) return 9;
            if (h >= 30 && h <= 60) {
                if (s > 0.7 && v > 0.7) return h < 40 ? 6 : 5;
                if (s > 0.5) return h < 45 ? 7 : 4;
                return h < 50 ? 8 : 3;
            }
            if (h < 30) return s > 0.6 ? 7 : 8;
            if (h > 60 && h < 120) return s > 0.5 ? 3 : 2;
            return 9;
        },

        rgbToHsv(r, g, b) {
            r /= 255; g /= 255; b /= 255;
            const max = Math.max(r, g, b);
            const min = Math.min(r, g, b);
            const diff = max - min;
            
            let h = 0;
            if (diff !== 0) {
                if (max === r) h = ((g - b) / diff) % 6;
                else if (max === g) h = (b - r) / diff + 2;
                else h = (r - g) / diff + 4;
            }
            h = Math.round(h * 60);
            if (h < 0) h += 360;
            
            const s = max === 0 ? 0 : diff / max;
            const v = max;
            
            return [h, s, v];
        }
    };

    // データ管理
    const DATA_MANAGER = {
        currentData: {},
        
        reset() {
            this.currentData = {};
            document.querySelectorAll('.form-control, .form-select').forEach(el => {
                if (el.type === 'file') return;
                el.value = '';
            });
            document.getElementById('imagePreview').innerHTML = '<div class="image-placeholder">画像が選択されていません</div>';
            document.getElementById('resultCard').classList.add('hidden');
            document.getElementById('visualJudgment').classList.add('hidden');
            this.updateButtons();
        },

        updateData(key, value) {
            this.currentData[key] = value;
            this.updateButtons();
        },

        updateButtons() {
            const hasImage = this.currentData.imageData;
            const hasAnalysis = this.currentData.analysisResult;
            const requiredFilled = this.checkRequiredFields();
            
            document.getElementById('analyzeBtn').disabled = !hasImage;
            document.getElementById('exportBtn').disabled = !hasAnalysis || !requiredFilled;
        },

        checkRequiredFields() {
            const settings = SETTINGS_MANAGER.getSettings();
            return settings.requiredFields.every(field => {
                const element = document.getElementById(field);
                return element && element.value.trim() !== '';
            });
        },

        exportToCSV() {
            const data = this.currentData;
            const analysis = data.analysisResult;
            const visual = data.visualJudgment;
            
            const now = new Date();
            const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, -5);
            
            const row = [
                document.getElementById('deliveryDate').value,
                document.getElementById('captureDate').value, 
                document.getElementById('productName').value,
                document.getElementById('code1').value,
                document.getElementById('code2').value,
                document.getElementById('code3').value,
                document.getElementById('chainName').value,
                document.getElementById('storeName').value,
                document.getElementById('claimQuantity').value,
                document.getElementById('claimUnit').value,
                document.getElementById('claimAmount').value,
                document.getElementById('claimType').value,
                analysis ? analysis.dominantLevel : '',
                analysis ? analysis.analysis.name : '',
                analysis ? analysis.analysis.description : '',
                analysis ? analysis.analysis.recommendation : '',
                analysis ? Math.round(analysis.totalPixels) : '',
                analysis ? Object.keys(analysis.distribution).length : '',
                visual ? visual.level : '',
                visual ? visual.name : '',
                visual ? visual.memo : '',
                AUTH.currentUser ? AUTH.currentUser.id : '',
                AUTH.currentUser ? AUTH.currentUser.role : '',
                now.toLocaleDateString('ja-JP'),
                now.toLocaleTimeString('ja-JP'),
                visual && analysis ? (visual.level === analysis.dominantLevel ? '一致' : '不一致') : '',
                CONFIG.version,
                timestamp
            ];
            
            const csv = row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',');
            const bom = '\uFEFF';
            const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `banana_report_${timestamp}.csv`;
            link.click();
        }
    };

    // 設定管理
    const SETTINGS_MANAGER = {
        getSettings() {
            const stored = localStorage.getItem('bananaReporter_settings');
            return stored ? JSON.parse(stored) : CONFIG.defaultSettings;
        },

        saveSettings(settings) {
            localStorage.setItem('bananaReporter_settings', JSON.stringify(settings));
        },

        updateCodeLabel(index, label) {
            const settings = this.getSettings();
            settings[`code${index}Label`] = label;
            this.saveSettings(settings);
            this.applyCodeLabels();
        },

        applyCodeLabels() {
            const settings = this.getSettings();
            for (let i = 1; i <= 3; i++) {
                const labelKey = `code${i}Label`;
                if (settings[labelKey]) {
                    document.getElementById(`code${i}Label`).textContent = settings[labelKey];
                }
            }
        }
    };

    // UI管理
    const UI_MANAGER = {
        init() {
            this.setupEventListeners();
            this.initializeColorChart();
            this.initializeSelects();
            this.setCurrentDate();
            SETTINGS_MANAGER.applyCodeLabels();
        },

        setupEventListeners() {
            // 認証
            document.getElementById('loginBtn').addEventListener('click', this.handleLogin);
            document.getElementById('logoutBtn').addEventListener('click', this.handleLogout);
            
            // 画像入力
            document.getElementById('cameraBtn').addEventListener('click', () => {
                document.getElementById('cameraInput').click();
            });
            document.getElementById('fileBtn').addEventListener('click', () => {
                document.getElementById('fileInput').click();
            });
            document.getElementById('cameraInput').addEventListener('change', this.handleImageSelect);
            document.getElementById('fileInput').addEventListener('change', this.handleImageSelect);
            
            // 解析とエクスポート
            document.getElementById('analyzeBtn').addEventListener('click', this.handleAnalyze);
            document.getElementById('exportBtn').addEventListener('click', () => DATA_MANAGER.exportToCSV());
            document.getElementById('resetBtn').addEventListener('click', () => DATA_MANAGER.reset());
            
            // 設定
            document.getElementById('settingsBtn').addEventListener('click', this.showAdminPanel);
            document.getElementById('closeAdminBtn').addEventListener('click', this.hideAdminPanel);
            
            // フォーム変更監視
            document.querySelectorAll('.form-control, .form-select').forEach(el => {
                el.addEventListener('input', () => DATA_MANAGER.updateButtons());
            });
        },

        async handleLogin() {
            const userId = document.getElementById('userId').value;
            const password = document.getElementById('password').value;
            const errorEl = document.getElementById('loginError');
            
            if (!userId || !password) {
                this.showError(errorEl, 'ユーザーIDとパスワードを入力してください');
                return;
            }
            
            if (await AUTH.login(userId, password)) {
                document.getElementById('authScreen').classList.add('hidden');
                document.getElementById('mainScreen').classList.remove('hidden');
                document.getElementById('currentUserDisplay').textContent = `${AUTH.currentUser.id} (${AUTH.currentUser.role})`;
                this.updateRoleVisibility();
            } else {
                this.showError(errorEl, 'ログインに失敗しました');
            }
        },

        handleLogout() {
            AUTH.logout();
            DATA_MANAGER.reset();
            document.getElementById('authScreen').classList.remove('hidden');
            document.getElementById('mainScreen').classList.add('hidden');
            document.getElementById('userId').value = '';
            document.getElementById('password').value = '';
            document.getElementById('loginError').classList.add('hidden');
        },

        updateRoleVisibility() {
            const role = AUTH.currentUser.role;
            document.querySelectorAll('.admin-only').forEach(el => {
                el.style.display = role === 'admin' ? 'block' : 'none';
            });
            document.querySelectorAll('.admin-expert').forEach(el => {
                el.style.display = ['admin', 'expert'].includes(role) ? 'block' : 'none';
            });
        },

        async handleImageSelect(event) {
            const file = event.target.files[0];
            if (!file) return;
            
            const compressedImage = await this.compressImage(file);
            const preview = document.getElementById('imagePreview');
            preview.innerHTML = `<img src="${compressedImage}" alt="選択された画像">`;
            
            DATA_MANAGER.updateData('imageData', compressedImage);
            document.getElementById('visualJudgment').classList.remove('hidden');
            this.initializeVisualJudgment();
        },

        async compressImage(file) {
            return new Promise((resolve) => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const img = new Image();
                
                img.onload = () => {
                    const maxSize = CONFIG.maxImageSize;
                    let { width, height } = img;
                    
                    if (width > height && width > maxSize) {
                        height = (height * maxSize) / width;
                        width = maxSize;
                    } else if (height > maxSize) {
                        width = (width * maxSize) / height;
                        height = maxSize;
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    resolve(canvas.toDataURL('image/jpeg', CONFIG.jpegQuality));
                };
                
                img.src = URL.createObjectURL(file);
            });
        },

        async handleAnalyze() {
            const analyzeBtn = document.getElementById('analyzeBtn');
            const originalText = analyzeBtn.textContent;
            
            analyzeBtn.textContent = '🔍 解析中...';
            analyzeBtn.disabled = true;
            analyzeBtn.classList.add('analyzing');
            
            try {
                const result = await COLOR_ANALYZER.analyzeImage(DATA_MANAGER.currentData.imageData);
                DATA_MANAGER.updateData('analysisResult', result);
                this.displayAnalysisResult(result);
                this.highlightDominantColor(result.dominantLevel);
            } catch (error) {
                console.error('解析エラー:', error);
                alert('画像解析中にエラーが発生しました');
            } finally {
                analyzeBtn.textContent = originalText;
                analyzeBtn.disabled = false;
                analyzeBtn.classList.remove('analyzing');
            }
        },

        displayAnalysisResult(result) {
            const resultCard = document.getElementById('resultCard');
            const resultContent = document.getElementById('resultContent');
            
            const level = result.dominantLevel;
            const analysis = result.analysis;
            
            resultContent.innerHTML = `
                <div class="result-item">
                    <span class="result-label">判定レベル</span>
                    <span class="result-value">レベル ${level}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">色分類</span>
                    <span class="result-value">${analysis.name}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">状態</span>
                    <span class="result-value">${analysis.description}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">推奨アクション</span>
                    <span class="result-value">${analysis.recommendation}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">総ピクセル数</span>
                    <span class="result-value">${Math.round(result.totalPixels).toLocaleString()}</span>
                </div>
            `;
            
            resultCard.classList.remove('hidden');
        },

        highlightDominantColor(level) {
            document.querySelectorAll('.color-item').forEach(item => {
                item.classList.remove('app-selected');
            });
            const dominantItem = document.querySelector(`[data-level="${level}"]`);
            if (dominantItem) {
                dominantItem.classList.add('app-selected');
            }
        },

        initializeColorChart() {
            const chart = document.getElementById('colorChart');
            chart.innerHTML = '';
            
            Object.entries(COLOR_ANALYZER.levels).forEach(([level, info]) => {
                const item = document.createElement('div');
                item.className = 'color-item';
                item.dataset.level = level;
                item.innerHTML = `
                    <div class="color-circle color-${level}"></div>
                    <div class="color-info">
                        <div class="color-level">${level}</div>
                        <div class="color-name">${info.name}</div>
                    </div>
                `;
                chart.appendChild(item);
            });
        },

        initializeVisualJudgment() {
            const chart = document.getElementById('visualColorChart');
            chart.innerHTML = '';
            
            Object.entries(COLOR_ANALYZER.levels).forEach(([level, info]) => {
                const item = document.createElement('div');
                item.className = 'visual-color-item';
                item.dataset.level = level;
                item.innerHTML = `
                    <div class="color-circle color-${level}"></div>
                    <div class="color-level">${level}</div>
                    <div class="color-name">${info.name}</div>
                `;
                item.addEventListener('click', () => this.selectVisualJudgment(level, info));
                chart.appendChild(item);
            });
        },

        selectVisualJudgment(level, info) {
            document.querySelectorAll('.visual-color-item').forEach(item => {
                item.classList.remove('selected');
            });
            event.target.closest('.visual-color-item').classList.add('selected');
            
            const memo = document.getElementById('visualJudgmentMemo').value;
            DATA_MANAGER.updateData('visualJudgment', {
                level: parseInt(level),
                name: info.name,
                memo: memo
            });
        },

        initializeSelects() {
            const settings = SETTINGS_MANAGER.getSettings();
            
            // クレーム種別
            const claimTypeSelect = document.getElementById('claimType');
            claimTypeSelect.innerHTML = '<option value="">選択してください</option>';
            settings.claimTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type;
                option.textContent = type;
                claimTypeSelect.appendChild(option);
            });
            
            // 単位
            const unitSelect = document.getElementById('claimUnit');
            unitSelect.innerHTML = '<option value="">選択してください</option>';
            settings.units.forEach(unit => {
                const option = document.createElement('option');
                option.value = unit;
                option.textContent = unit;
                unitSelect.appendChild(option);
            });
        },

        setCurrentDate() {
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('captureDate').value = today;
        },

        showAdminPanel() {
            document.getElementById('adminPanel').classList.remove('hidden');
            this.loadUserTable();
            this.initializeTagInputs();
        },

        hideAdminPanel() {
            document.getElementById('adminPanel').classList.add('hidden');
        },

        loadUserTable() {
            const container = document.getElementById('userTableContainer');
            const users = [
                { id: 'admin', role: 'admin', status: 'アクティブ' },
                { id: 'expert1', role: 'expert', status: 'アクティブ' },
                { id: 'user1', role: 'user', status: 'アクティブ' }
            ];
            
            container.innerHTML = `
                <table class="user-table">
                    <thead>
                        <tr>
                            <th>ユーザーID</th>
                            <th>ロール</th>
                            <th>ステータス</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(user => `
                            <tr>
                                <td>${user.id}</td>
                                <td><span class="role-badge role-${user.role}">${user.role}</span></td>
                                <td>${user.status}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        },

        initializeTagInputs() {
            this.createTagInput('requiredFields', 'requiredFields');
            this.createTagInput('claimTypeManager', 'claimTypes');
        },

        createTagInput(containerId, settingKey) {
            const container = document.getElementById(containerId);
            const settings = SETTINGS_MANAGER.getSettings();
            const items = settings[settingKey] || [];
            
            container.innerHTML = `
                <div class="tags">
                    ${items.map(item => `
                        <span class="tag">
                            ${item}
                            <span class="remove" onclick="UI_MANAGER.removeTag('${settingKey}', '${item}')">&times;</span>
                        </span>
                    `).join('')}
                </div>
                <input type="text" placeholder="Enterで追加" onkeypress="UI_MANAGER.handleTagInput(event, '${settingKey}')">
            `;
        },

        handleTagInput(event, settingKey) {
            if (event.key === 'Enter' && event.target.value.trim()) {
                this.addTag(settingKey, event.target.value.trim());
                event.target.value = '';
            }
        },

        addTag(settingKey, value) {
            const settings = SETTINGS_MANAGER.getSettings();
            if (!settings[settingKey].includes(value)) {
                settings[settingKey].push(value);
                SETTINGS_MANAGER.saveSettings(settings);
                this.createTagInput(
                    settingKey === 'requiredFields' ? 'requiredFields' : 'claimTypeManager',
                    settingKey
                );
                if (settingKey === 'claimTypes') {
                    this.initializeSelects();
                }
            }
        },

        removeTag(settingKey, value) {
            const settings = SETTINGS_MANAGER.getSettings();
            settings[settingKey] = settings[settingKey].filter(item => item !== value);
            SETTINGS_MANAGER.saveSettings(settings);
            this.createTagInput(
                settingKey === 'requiredFields' ? 'requiredFields' : 'claimTypeManager',
                settingKey
            );
            if (settingKey === 'claimTypes') {
                this.initializeSelects();
            }
        },

        showError(element, message) {
            element.textContent = message;
            element.classList.remove('hidden');
            setTimeout(() => element.classList.add('hidden'), 3000);
        }
    };

    // グローバル関数
    window.editCodeLabel = function(index) {
        const currentLabel = document.getElementById(`code${index}Label`).textContent;
        const newLabel = prompt('新しいラベル名を入力してください:', currentLabel);
        if (newLabel && newLabel !== currentLabel) {
            SETTINGS_MANAGER.updateCodeLabel(index, newLabel);
        }
    };

    window.UI_MANAGER = UI_MANAGER;

    // アプリケーション初期化
    document.addEventListener('DOMContentLoaded', () => {
        UI_MANAGER.init();
        DATA_MANAGER.updateButtons();
    });

})();
