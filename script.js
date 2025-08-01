// バージョン情報
const VERSION = "1.0.2";

// DOM要素
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');
const splitFileInput = document.getElementById('split-file');
const mergeFileInput = document.getElementById('merge-file');
const splitSizeSelect = document.getElementById('split-size');
const customSizeContainer = document.getElementById('custom-size-container');
const customSizeInput = document.getElementById('custom-size');
const encryptionSelect = document.getElementById('encryption');
const passwordContainer = document.getElementById('password-container');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirm-password');
const decryptContainer = document.getElementById('decrypt-container');
const decryptPasswordInput = document.getElementById('decrypt-password');
const startSplitButton = document.getElementById('start-split');
const startMergeButton = document.getElementById('start-merge');
const splitProgressBar = document.getElementById('split-progress');
const mergeProgressBar = document.getElementById('merge-progress');
const splitStatus = document.getElementById('split-status');
const mergeStatus = document.getElementById('merge-status');
const splitResults = document.getElementById('split-results');
const mergeResults = document.getElementById('merge-results');
const splitFileInfo = document.getElementById('split-file-info');
const mergeFileInfo = document.getElementById('merge-file-info');
const previewContent = document.getElementById('preview-content');
const downloadAllButton = document.getElementById('download-all');
const copyLinksButton = document.getElementById('copy-links');
const resetSplitButton = document.getElementById('reset-split');
const downloadMergedButton = document.getElementById('download-merged');
const resetMergeButton = document.getElementById('reset-merge');

// タブ切り替え
tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const tabId = button.getAttribute('data-tab');
        
        // タブボタンの状態更新
        tabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        
        // タブコンテンツの表示切り替え
        tabContents.forEach(content => content.classList.remove('active'));
        document.getElementById(`${tabId}-tab`).classList.add('active');
        
        // URLハッシュを更新
        window.location.hash = tabId;
    });
});

// ページ読み込み時のタブ設定
if (window.location.hash) {
    const tabId = window.location.hash.substring(1);
    const tabButton = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
    if (tabButton) tabButton.click();
}

// 分割サイズ選択の変更
splitSizeSelect.addEventListener('change', () => {
    if (splitSizeSelect.value === 'custom') {
        customSizeContainer.classList.remove('hidden');
    } else {
        customSizeContainer.classList.add('hidden');
    }
});

// 暗号化オプションの変更
encryptionSelect.addEventListener('change', () => {
    if (encryptionSelect.value === 'aes256') {
        passwordContainer.classList.remove('hidden');
    } else {
        passwordContainer.classList.add('hidden');
    }
});

// ファイル選択の変更
splitFileInput.addEventListener('change', updateSplitButtonState);
mergeFileInput.addEventListener('change', updateMergeButtonState);

function updateSplitButtonState() {
    startSplitButton.disabled = !splitFileInput.files[0];
}

function updateMergeButtonState() {
    startMergeButton.disabled = !mergeFileInput.files[0];
}

// 分割処理
startSplitButton.addEventListener('click', async () => {
    if (!splitFileInput.files[0]) {
        showStatus(splitStatus, 'ファイルを選択してください', 'error');
        return;
    }
    
    const file = splitFileInput.files[0];
    const fileName = file.name;
    const fileSize = file.size;
    
    // 分割サイズを決定 (MB → bytes)
    let splitSizeMB;
    if (splitSizeSelect.value === 'custom') {
        splitSizeMB = parseInt(customSizeInput.value);
        if (isNaN(splitSizeMB) || splitSizeMB <= 0) {
            showStatus(splitStatus, '有効なサイズを入力してください', 'error');
            return;
        }
    } else {
        splitSizeMB = parseInt(splitSizeSelect.value);
    }
    
    const splitSize = splitSizeMB * 1024 * 1024;
    
    // 暗号化オプションの確認
    const useEncryption = encryptionSelect.value === 'aes256';
    let password = null;
    
    if (useEncryption) {
        password = passwordInput.value;
        const confirmPassword = confirmPasswordInput.value;
        
        if (!password || !confirmPassword) {
            showStatus(splitStatus, 'パスワードを入力してください', 'error');
            return;
        }
        
        if (password !== confirmPassword) {
            showStatus(splitStatus, 'パスワードが一致しません', 'error');
            return;
        }
    }
    
    try {
        showStatus(splitStatus, 'ファイルを処理中...', 'info');
        splitProgressBar.style.width = '0%';
        
        // ファイルを読み込み
        const fileData = await readFileAsArrayBuffer(file);
        
        // 暗号化処理
        let processedData = fileData;
        let encryptionInfo = null;
        
        if (useEncryption) {
            showStatus(splitStatus, 'ファイルを暗号化中...', 'info');
            const { encryptedData, iv, salt } = await encryptData(fileData, password);
            processedData = encryptedData;
            encryptionInfo = { iv, salt };
        }
        
        // ハッシュ計算
        showStatus(splitStatus, 'ファイルの整合性を確認中...', 'info');
        const fileHash = await calculateSHA256(processedData);
        
        // 分割処理
        const chunkCount = Math.ceil(processedData.byteLength / splitSize);
        showStatus(splitStatus, `ファイルを分割中 (${chunkCount}部分)...`, 'info');
        
        const chunks = [];
        for (let i = 0; i < chunkCount; i++) {
            const start = i * splitSize;
            const end = Math.min(start + splitSize, processedData.byteLength);
            const chunk = processedData.slice(start, end);
            chunks.push(chunk);
            
            // 進捗更新
            const progress = ((i + 1) / chunkCount) * 100;
            splitProgressBar.style.width = `${progress}%`;
        }
        
        // ZIP作成
        showStatus(splitStatus, 'ZIPファイルを作成中...', 'info');
        const zip = new JSZip();
        
        // メタデータ
        const metaData = {
            version: VERSION,
            originalName: fileName,
            originalSize: fileSize,
            chunkCount: chunkCount,
            hash: fileHash,
            encrypted: useEncryption,
            encryptionInfo: encryptionInfo,
            mimeType: file.type || getMimeType(fileName),
            timestamp: new Date().toISOString()
        };
        
        zip.file("metadata.json", JSON.stringify(metaData));
        
        // チャンクを追加
        chunks.forEach((chunk, index) => {
            zip.file(`part${index + 1}.bin`, chunk);
        });
        
        // ZIP生成
        const zipContent = await zip.generateAsync(
            { type: 'blob', streamFiles: true },
            metadata => {
                splitProgressBar.style.width = `${metadata.percent.toFixed(2)}%`;
            }
        );
        
        // 結果表示
        showStatus(splitStatus, '分割が完了しました！', 'success');
        splitResults.classList.remove('hidden');
        
        // ファイル情報表示
        splitFileInfo.innerHTML = `
            <p><strong><i class="fas fa-file"></i> ファイル名:</strong> ${fileName}</p>
            <p><strong><i class="fas fa-weight-hanging"></i> サイズ:</strong> ${formatFileSize(fileSize)}</p>
            <p><strong><i class="fas fa-puzzle-piece"></i> 分割数:</strong> ${chunkCount} 部分</p>
            <p><strong><i class="fas fa-ruler"></i> 分割サイズ:</strong> ${splitSizeMB} MB</p>
            <p><strong><i class="fas fa-fingerprint"></i> ハッシュ (SHA-256):</strong> ${fileHash}</p>
            <p><strong><i class="fas fa-lock"></i> 暗号化:</strong> ${useEncryption ? 'AES-256' : 'なし'}</p>
        `;
        
        // ダウンロードボタンの設定
        downloadAllButton.onclick = () => {
            downloadFile(zipContent, `${fileName.replace(/\.[^/.]+$/, "")}_split.zip`);
        };
        
        // Discordリンクコピーボタン
        copyLinksButton.onclick = async () => {
            try {
                const zipFile = new File([zipContent], `${fileName.replace(/\.[^/.]+$/, "")}_split.zip`, { type: 'application/zip' });
                
                await navigator.clipboard.writeText(`分割ファイル: ${fileName} (${chunkCount}部分)`);
                
                showStatus(splitStatus, 'Discordに貼り付ける準備ができました！', 'success');
            } catch (error) {
                console.error('クリップボードコピーエラー:', error);
                showStatus(splitStatus, 'リンクのコピーに失敗しました', 'error');
            }
        };
        
        // リセットボタン
        resetSplitButton.onclick = resetSplit;
        
    } catch (error) {
        console.error('分割エラー:', error);
        showStatus(splitStatus, `エラーが発生しました: ${error.message}`, 'error');
    }
});

// 結合処理
startMergeButton.addEventListener('click', async () => {
    if (!mergeFileInput.files[0]) {
        showStatus(mergeStatus, 'ZIPファイルを選択してください', 'error');
        return;
    }
    
    try {
        showStatus(mergeStatus, 'ZIPファイルを処理中...', 'info');
        mergeProgressBar.style.width = '0%';
        
        const zipFile = mergeFileInput.files[0];
        const zip = await JSZip.loadAsync(zipFile);
        
        // メタデータ読み込み
        const metaData = JSON.parse(await zip.file("metadata.json").async('text'));
        
        // バージョンチェック
        if (!metaData.version || metaData.version !== VERSION) {
            showStatus(mergeStatus, 'このZIPファイルは互換性のないバージョンで作成されています', 'error');
            return;
        }
        
        // 復号が必要か確認
        const needsDecryption = metaData.encrypted;
        
        if (needsDecryption) {
            decryptContainer.classList.remove('hidden');
            
            if (!decryptPasswordInput.value) {
                showStatus(mergeStatus, '復号パスワードを入力してください', 'error');
                return;
            }
        } else {
            decryptContainer.classList.add('hidden');
        }
        
        // ファイル結合
        showStatus(mergeStatus, 'ファイルを結合中...', 'info');
        let combinedData = new Uint8Array(metaData.originalSize);
        let offset = 0;
        
        for (let i = 1; i <= metaData.chunkCount; i++) {
            const partName = `part${i}.bin`;
            const chunk = await zip.file(partName).async('arraybuffer');
            
            combinedData.set(new Uint8Array(chunk), offset);
            offset += chunk.byteLength;
            
            // 進捗更新
            const progress = (i / metaData.chunkCount) * 50;
            mergeProgressBar.style.width = `${progress}%`;
        }
        
        // 復号処理
        if (needsDecryption) {
            showStatus(mergeStatus, 'ファイルを復号中...', 'info');
            const password = decryptPasswordInput.value;
            
            try {
                combinedData = new Uint8Array(await decryptData(
                    combinedData.buffer,
                    password,
                    metaData.encryptionInfo.iv,
                    metaData.encryptionInfo.salt
                ));
            } catch (decryptError) {
                showStatus(mergeStatus, '復号に失敗しました。パスワードが間違っています', 'error');
                return;
            }
            
            mergeProgressBar.style.width = '75%';
        }
        
        // ハッシュ検証
        showStatus(mergeStatus, 'ファイルを検証中...', 'info');
        const combinedHash = await calculateSHA256(combinedData.buffer);
        
        if (combinedHash !== metaData.hash) {
            throw new Error('ファイルの整合性チェックに失敗しました。ファイルが破損している可能性があります。');
        }
        
        mergeProgressBar.style.width = '100%';
        
        // 結果表示
        showStatus(mergeStatus, 'ファイルの結合が完了しました！', 'success');
        mergeResults.classList.remove('hidden');
        
        // プレビュー表示
        const blob = new Blob([combinedData], { type: metaData.mimeType });
        const url = URL.createObjectURL(blob);
        
        // ファイル情報表示
        mergeFileInfo.innerHTML = `
            <p><strong><i class="fas fa-file"></i> ファイル名:</strong> ${metaData.originalName}</p>
            <p><strong><i class="fas fa-weight-hanging"></i> サイズ:</strong> ${formatFileSize(metaData.originalSize)}</p>
            <p><strong><i class="fas fa-file-code"></i> タイプ:</strong> ${metaData.mimeType}</p>
            <p><strong><i class="fas fa-fingerprint"></i> ハッシュ (SHA-256):</strong> ${metaData.hash}</p>
            <p><strong><i class="fas fa-lock"></i> 暗号化:</strong> ${metaData.encrypted ? 'AES-256' : 'なし'}</p>
            <p><strong><i class="fas fa-calendar"></i> 作成日時:</strong> ${new Date(metaData.timestamp).toLocaleString()}</p>
        `;
        
        // プレビュー表示
        previewContent.innerHTML = '';
        
        if (metaData.mimeType.startsWith('image/')) {
            // 画像プレビュー
            const img = document.createElement('img');
            img.src = url;
            img.className = 'preview-content';
            img.alt = metaData.originalName;
            previewContent.appendChild(img);
        } else if (metaData.mimeType.startsWith('video/')) {
            // 動画プレビュー
            const video = document.createElement('video');
            video.src = url;
            video.controls = true;
            video.className = 'preview-content';
            previewContent.appendChild(video);
        } else if (metaData.mimeType.startsWith('audio/')) {
            // 音声プレビュー
            const audio = document.createElement('audio');
            audio.src = url;
            audio.controls = true;
            audio.className = 'preview-content';
            previewContent.appendChild(audio);
        } else if (metaData.mimeType === 'text/plain' || 
                   metaData.originalName.endsWith('.txt') || 
                   metaData.originalName.endsWith('.html') || 
                   metaData.originalName.endsWith('.css') || 
                   metaData.originalName.endsWith('.js') || 
                   metaData.originalName.endsWith('.sql')) {
            // テキストプレビュー
            const text = await blob.text();
            const textarea = document.createElement('textarea');
            textarea.id = 'textPreview';
            textarea.readOnly = true;
            textarea.value = text;
            previewContent.appendChild(textarea);
        } else if (metaData.mimeType === 'image/svg+xml') {
            // SVGプレビュー
            const svgText = await blob.text();
            const svgContainer = document.createElement('div');
            svgContainer.innerHTML = svgText;
            svgContainer.className = 'svg-preview';
            previewContent.appendChild(svgContainer);
        } else {
            // その他のファイルタイプ
            const icon = document.createElement('div');
            icon.innerHTML = `
                <i class="fas fa-file fa-4x" style="color: var(--discord-blurple); margin-bottom: 15px;"></i>
                <p>${metaData.originalName}</p>
            `;
            previewContent.appendChild(icon);
        }
        
        // ダウンロードボタンの設定
        downloadMergedButton.onclick = () => {
            downloadFile(blob, metaData.originalName);
        };
        
        // リセットボタン
        resetMergeButton.onclick = resetMerge;
        
    } catch (error) {
        console.error('結合エラー:', error);
        showStatus(mergeStatus, `エラーが発生しました: ${error.message}`, 'error');
    }
});

// ユーティリティ関数
function showStatus(element, message, type) {
    const icon = {
        info: 'info-circle',
        success: 'check-circle',
        error: 'exclamation-circle'
    }[type];
    
    element.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;
    element.className = `status ${type}`;
}

function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

async function calculateSHA256(data) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function encryptData(data, password) {
    // ソルト生成
    const salt = crypto.getRandomValues(new Uint8Array(16));
    
    // パスワードから鍵を導出
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );
    
    const key = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-CBC', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
    
    // IV生成
    const iv = crypto.getRandomValues(new Uint8Array(16));
    
    // データ暗号化
    const encryptedData = await crypto.subtle.encrypt(
        {
            name: 'AES-CBC',
            iv: iv
        },
        key,
        data
    );
    
    return {
        encryptedData: encryptedData,
        iv: iv,
        salt: salt
    };
}

async function decryptData(data, password, iv, salt) {
    // パスワードから鍵を導出
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );
    
    const key = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        keyMaterial,
        { name: 'AES-CBC', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
    
    // データ復号
    return await crypto.subtle.decrypt(
        {
            name: 'AES-CBC',
            iv: iv
        },
        key,
        data
    );
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getMimeType(filename) {
    const extension = filename.split('.').pop().toLowerCase();
    const mimeTypes = {
        // 画像
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'bmp': 'image/bmp',
        'ico': 'image/x-icon',
        
        // 動画
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'ogg': 'video/ogg',
        'avi': 'video/x-msvideo',
        'mov': 'video/quicktime',
        'wmv': 'video/x-ms-wmv',
        
        // 音声
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg',
        'm4a': 'audio/mp4',
        'flac': 'audio/flac',
        'mid': 'audio/midi',
        'midi': 'audio/midi',
        
        // ドキュメント
        'pdf': 'application/pdf',
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        
        // テキスト
        'txt': 'text/plain',
        'html': 'text/html',
        'htm': 'text/html',
        'css': 'text/css',
        'js': 'text/javascript',
        'json': 'application/json',
        'xml': 'application/xml',
        'csv': 'text/csv',
        'sql': 'application/sql',
        
        // アーカイブ
        'zip': 'application/zip',
        'rar': 'application/x-rar-compressed',
        '7z': 'application/x-7z-compressed',
        'tar': 'application/x-tar',
        'gz': 'application/gzip'
    };
    
    return mimeTypes[extension] || 'application/octet-stream';
}

function downloadFile(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }, 100);
}

function resetSplit() {
    splitFileInput.value = '';
    splitProgressBar.style.width = '0%';
    splitResults.classList.add('hidden');
    showStatus(splitStatus, '準備ができました', 'info');
    updateSplitButtonState();
}

function resetMerge() {
    mergeFileInput.value = '';
    decryptPasswordInput.value = '';
    decryptContainer.classList.add('hidden');
    mergeProgressBar.style.width = '0%';
    mergeResults.classList.add('hidden');
    showStatus(mergeStatus, 'ZIPファイルを選択してください', 'info');
    updateMergeButtonState();
}
