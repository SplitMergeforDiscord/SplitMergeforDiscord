const VERSION = "1.0.2";

// DOM要素
const fileToSplit = document.getElementById('fileToSplit');
const splitSize = document.getElementById('splitSize');
const encryptOption = document.getElementById('encryptOption');
const encryptPassword = document.getElementById('encryptPassword');
const encryptPasswordConfirm = document.getElementById('encryptPasswordConfirm');
const passwordContainer = document.getElementById('passwordContainer');
const passwordStrength = document.getElementById('password-strength');
const splitButton = document.getElementById('splitButton');
const splitProgress = document.getElementById('splitProgress');
const splitStatus = document.getElementById('splitStatus');
const splitResults = document.getElementById('splitResults');
const splitFilesList = document.getElementById('splitFilesList');
const downloadAllButton = document.getElementById('downloadAllButton');
const zipToMerge = document.getElementById('zipToMerge');
const decryptPassword = document.getElementById('decryptPassword');
const decryptContainer = document.getElementById('decryptContainer');
const mergeButton = document.getElementById('mergeButton');
const mergeProgress = document.getElementById('mergeProgress');
const mergeStatus = document.getElementById('mergeStatus');
const mergeResults = document.getElementById('mergeResults');
const filePreviewContainer = document.getElementById('filePreviewContainer');
const downloadMergedButton = document.getElementById('downloadMergedButton');

// タブ切り替え
function openTab(evt, tabName) {
    const tabcontent = document.getElementsByClassName("tabcontent");
    for (let i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    
    const tablinks = document.getElementsByClassName("tablinks");
    for (let i = 0; i < tablinks.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}

// 暗号化オプション変更
encryptOption.addEventListener('change', function() {
    passwordContainer.style.display = this.value === 'aes256' ? 'block' : 'none';
    passwordStrength.style.display = 'none';
});

// パスワード強度チェック
encryptPassword.addEventListener('input', function() {
    const strength = calculatePasswordStrength(this.value);
    passwordStrength.style.display = 'block';
    passwordStrength.style.width = `${strength}%`;
    
    if (strength < 40) {
        passwordStrength.className = 'password-strength-meter weak';
    } else if (strength < 70) {
        passwordStrength.className = 'password-strength-meter medium';
    } else {
        passwordStrength.className = 'password-strength-meter strong';
    }
});

// パスワード強度計算
function calculatePasswordStrength(password) {
    let strength = 0;
    if (password.length > 8) strength += 30;
    if (/[A-Z]/.test(password)) strength += 20;
    if (/[0-9]/.test(password)) strength += 20;
    if (/[^A-Za-z0-9]/.test(password)) strength += 30;
    return Math.min(strength, 100);
}

// ダウンロードリンク生成
function generateDownloadLink(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.className = 'download-link';
    link.innerHTML = `<i class="fas fa-download"></i> ${filename}`;
    return link;
}

// 分割処理
splitButton.addEventListener('click', async function() {
    if (!fileToSplit.files[0]) {
        updateStatus(splitStatus, 'ファイルを選択してください', 'error');
        return;
    }
    
    const file = fileToSplit.files[0];
    const fileName = file.name;
    const fileSize = file.size;
    const splitSizeBytes = parseInt(splitSize.value) * 1024 * 1024;
    const useEncryption = encryptOption.value === 'aes256';
    
    if (useEncryption) {
        if (!encryptPassword.value || !encryptPasswordConfirm.value) {
            updateStatus(splitStatus, 'パスワードを入力してください', 'error');
            return;
        }
        
        if (encryptPassword.value !== encryptPasswordConfirm.value) {
            updateStatus(splitStatus, 'パスワードが一致しません', 'error');
            return;
        }
        
        const strength = calculatePasswordStrength(encryptPassword.value);
        if (strength < 40) {
            updateStatus(splitStatus, 'パスワードが弱すぎます。もっと強いパスワードを使用してください', 'error');
            return;
        }
    }
    
    try {
        updateStatus(splitStatus, 'ファイルを処理中...', 'info');
        splitProgress.style.width = '0%';
        
        const fileData = await readFileAsArrayBuffer(file);
        let processedData = fileData;
        
        if (useEncryption) {
            updateStatus(splitStatus, 'ファイルを暗号化中...', 'info');
            processedData = await encryptData(fileData, encryptPassword.value);
        }
        
        const fileHash = await calculateSHA256(processedData);
        const chunkCount = Math.ceil(processedData.byteLength / splitSizeBytes);
        
        updateStatus(splitStatus, `ファイルを分割中 (${chunkCount}部分)...`, 'info');
        const chunks = [];
        
        for (let i = 0; i < chunkCount; i++) {
            const start = i * splitSizeBytes;
            const end = Math.min(start + splitSizeBytes, processedData.byteLength);
            const chunk = processedData.slice(start, end);
            chunks.push(chunk);
            
            const progress = ((i + 1) / chunkCount) * 100;
            splitProgress.style.width = `${progress}%`;
        }
        
        updateStatus(splitStatus, 'ZIPファイルを作成中...', 'info');
        const zip = new JSZip();
        const metaData = {
            originalName: fileName,
            chunkCount: chunkCount,
            fileSize: fileSize,
            hash: fileHash,
            encrypted: useEncryption,
            timestamp: new Date().toISOString()
        };
        
        zip.file("metadata.json", JSON.stringify(metaData));
        chunks.forEach((chunk, index) => {
            zip.file(`part${index + 1}.bin`, chunk);
        });
        
        const zipContent = await zip.generateAsync({type: 'blob'}, (metadata) => {
            splitProgress.style.width = `${metadata.percent}%`;
        });
        
        updateStatus(splitStatus, '分割が完了しました！', 'success');
        splitResults.style.display = 'block';
        
        splitFilesList.innerHTML = `
            <p>元ファイル: ${fileName}</p>
            <p>サイズ: ${formatFileSize(fileSize)}</p>
            <p>分割数: ${chunkCount}部分</p>
            <p>ハッシュ: ${fileHash}</p>
            <p>暗号化: ${useEncryption ? 'AES-256' : 'なし'}</p>
        `;
        
        // ダウンロードリンク直接表示
        const downloadLink = generateDownloadLink(
            zipContent, 
            `${fileName.replace(/\.[^/.]+$/, "")}_split.zip`
        );
        splitFilesList.appendChild(downloadLink);
        
        downloadAllButton.onclick = function() {
            downloadLink.click();
        };
        
    } catch (error) {
        console.error('分割エラー:', error);
        updateStatus(splitStatus, `エラーが発生しました: ${error.message}`, 'error');
    }
});

// 結合処理
mergeButton.addEventListener('click', async function() {
    if (!zipToMerge.files[0]) {
        updateStatus(mergeStatus, 'ZIPファイルを選択してください', 'error');
        return;
    }
    
    try {
        updateStatus(mergeStatus, 'ZIPファイルを処理中...', 'info');
        mergeProgress.style.width = '0%';
        
        const zipFile = zipToMerge.files[0];
        const zip = await JSZip.loadAsync(zipFile);
        const metaData = JSON.parse(await zip.file("metadata.json").async('text'));
        const isEncrypted = metaData.encrypted || false;
        
        decryptContainer.style.display = isEncrypted ? 'block' : 'none';
        
        if (isEncrypted && !decryptPassword.value) {
            updateStatus(mergeStatus, '復号パスワードを入力してください', 'error');
            return;
        }
        
        updateStatus(mergeStatus, 'ファイルを結合中...', 'info');
        let combinedData = new Uint8Array(metaData.fileSize);
        let offset = 0;
        
        for (let i = 1; i <= metaData.chunkCount; i++) {
            const partName = `part${i}.bin`;
            const chunk = await zip.file(partName).async('arraybuffer');
            
            combinedData.set(new Uint8Array(chunk), offset);
            offset += chunk.byteLength;
            
            const progress = ((i) / metaData.chunkCount) * 50;
            mergeProgress.style.width = `${progress}%`;
        }
        
        if (isEncrypted) {
            updateStatus(mergeStatus, 'ファイルを復号中...', 'info');
            try {
                combinedData = await decryptData(combinedData.buffer, decryptPassword.value);
            } catch (decryptError) {
                updateStatus(mergeStatus, '復号失敗: パスワードが間違っているかファイルが破損しています', 'error');
                return;
            }
            mergeProgress.style.width = '75%';
        }
        
        updateStatus(mergeStatus, 'ファイルを検証中...', 'info');
        const combinedHash = await calculateSHA256(combinedData.buffer);
        
        if (combinedHash !== metaData.hash) {
            throw new Error('ファイルの整合性チェックに失敗しました。ファイルが破損している可能性があります。');
        }
        
        mergeProgress.style.width = '100%';
        updateStatus(mergeStatus, 'ファイルの結合が完了しました！', 'success');
        mergeResults.style.display = 'block';
        
        const blob = new Blob([combinedData], {type: getMimeType(metaData.originalName)});
        const url = URL.createObjectURL(blob);
        filePreviewContainer.innerHTML = '';
        
        // プレビュー表示
        if (blob.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = url;
            img.id = 'filePreview';
            filePreviewContainer.appendChild(img);
        } else if (blob.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = url;
            video.controls = true;
            video.id = 'filePreview';
            filePreviewContainer.appendChild(video);
        } else if (blob.type.startsWith('audio/')) {
            const audio = document.createElement('audio');
            audio.src = url;
            audio.controls = true;
            audio.id = 'filePreview';
            filePreviewContainer.appendChild(audio);
        } else {
            filePreviewContainer.innerHTML = `
                <p>プレビュー非対応ファイル: ${metaData.originalName}</p>
                <p>サイズ: ${formatFileSize(metaData.fileSize)}</p>
                <p>タイプ: ${blob.type}</p>
            `;
        }
        
        // ダウンロードリンク直接表示
        const downloadLink = generateDownloadLink(blob, metaData.originalName);
        filePreviewContainer.appendChild(downloadLink);
        
        downloadMergedButton.onclick = function() {
            downloadLink.click();
        };
        
    } catch (error) {
        console.error('結合エラー:', error);
        updateStatus(mergeStatus, `エラーが発生しました: ${error.message}`, 'error');
    }
});

// ユーティリティ関数
function updateStatus(element, message, type) {
    element.textContent = message;
    element.style.color = type === 'error' ? '#f04747' : type === 'success' ? '#43b581' : '#ffffff';
    if (type === 'error') element.classList.add('error');
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
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        {name: 'PBKDF2'},
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
        {name: 'AES-CBC', length: 256},
        false,
        ['encrypt', 'decrypt']
    );

    const iv = crypto.getRandomValues(new Uint8Array(16));
    const encryptedData = await crypto.subtle.encrypt(
        {
            name: 'AES-CBC',
            iv: iv
        },
        key,
        data
    );

    const result = new Uint8Array(salt.length + iv.length + encryptedData.byteLength);
    result.set(salt, 0);
    result.set(iv, salt.length);
    result.set(new Uint8Array(encryptedData), salt.length + iv.length);
    
    return result.buffer;
}

async function decryptData(data, password) {
    const dataArray = new Uint8Array(data);
    const salt = dataArray.slice(0, 16);
    const iv = dataArray.slice(16, 32);
    const encryptedData = dataArray.slice(32);

    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(password),
        {name: 'PBKDF2'},
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
        {name: 'AES-CBC', length: 256},
        false,
        ['encrypt', 'decrypt']
    );

    return await crypto.subtle.decrypt(
        {
            name: 'AES-CBC',
            iv: iv
        },
        key,
        encryptedData
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
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'webp': 'image/webp',
        'mp4': 'video/mp4',
        'webm': 'video/webm',
        'ogg': 'video/ogg',
        'mp3': 'audio/mpeg',
        'wav': 'audio/wav',
        'ogg': 'audio/ogg',
        'pdf': 'application/pdf',
        'zip': 'application/zip',
        'svg': 'image/svg+xml',
        'mid': 'audio/midi',
        'midi': 'audio/midi',
        'txt': 'text/plain',
        'html': 'text/html',
        'css': 'text/css',
        'js': 'text/javascript',
        'sql': 'application/sql',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'm4a': 'audio/mp4',
        'avi': 'video/x-msvideo'
    };
    return mimeTypes[extension] || 'application/octet-stream';
}
