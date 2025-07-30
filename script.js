const VERSION = "1.0.2";

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

function openTab(evt, tabName) {
    const tabcontents = document.getElementsByClassName("tabcontent");
    for (let i = 0; i < tabcontents.length; i++) {
 tabcontents[i].style.display = "none";
    }
    
    const tablinks = document.getElementsByClassName("tablinks");
    for (let i = 0; i < tablinks.length; i++) {
 tablinks[i].className = tablinks[i].className.replace(" active", "");
    }
    
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";
}

document.getElementById('encryptOption').addEventListener('change', function() {
    const passwordContainer = document.getElementById('passwordContainer');
    passwordContainer.style.display = this.value === 'aes256' ? 'block' : 'none';
});

document.getElementById('splitButton').addEventListener('click', async function() {
    const fileInput = document.getElementById('fileToSplit');
    const splitSize = parseInt(document.getElementById('splitSize').value) * 1024 * 1024;
    const encryptOption = document.getElementById('encryptOption').value;
    const password = encryptOption === 'aes256' ? document.getElementById('encryptPassword').value : null;
    
    if (!fileInput.files[0]) {
 updateStatus('splitStatus', 'ファイルを選択してください', 'error');
 return;
    }
    
    if (encryptOption === 'aes256' && (!password || password !== document.getElementById('encryptPasswordConfirm').value)) {
 updateStatus('splitStatus', 'パスワードが一致しません', 'error');
 return;
    }
    
    try {
 updateStatus('splitStatus', 'ファイルを処理中...', 'info');
 
 const file = fileInput.files[0];
 const fileName = file.name;
 const fileSize = file.size;
 const chunkCount = Math.ceil(fileSize / splitSize);
 
 let fileData = await readFileAsArrayBuffer(file);

 if (encryptOption === 'aes256') {
     updateStatus('splitStatus', 'ファイルを暗号化中...', 'info');
     fileData = await encryptData(fileData, password);
 }

 const fileHash = await calculateSHA256(fileData);

 updateStatus('splitStatus', `ファイルを分割中 (${chunkCount}部分)...`, 'info');
 const chunks = [];
 for (let i = 0; i < chunkCount; i++) {
     const start = i * splitSize;
     const end = Math.min(start + splitSize, fileData.byteLength);
     const chunk = fileData.slice(start, end);
     chunks.push(chunk);

     const progress = ((i + 1) / chunkCount) * 100;
     document.getElementById('splitProgress').style.width = `${progress}%`;
 }

 updateStatus('splitStatus', 'ZIPファイルを作成中...', 'info');
 const zip = new JSZip();
 const metaData = {
     originalName: fileName,
     chunkCount: chunkCount,
     fileSize: fileSize,
     hash: fileHash,
     encrypted: encryptOption === 'aes256',
     timestamp: new Date().toISOString()
 };
 
 zip.file("metadata.json", JSON.stringify(metaData));
 
 chunks.forEach((chunk, index) => {
     zip.file(`part${index + 1}.bin`, chunk);
 });
 
 const zipContent = await zip.generateAsync({type: 'blob'}, (metadata) => {
     document.getElementById('splitProgress').style.width = `${metadata.percent}%`;
 });

 updateStatus('splitStatus', '分割が完了しました！', 'success');
 document.getElementById('splitResults').style.display = 'block';
 
 const splitFilesList = document.getElementById('splitFilesList');
 splitFilesList.innerHTML = `
     <p>元ファイル: ${fileName}</p>
     <p>サイズ: ${formatFileSize(fileSize)}</p>
     <p>分割数: ${chunkCount}部分</p>
     <p>ハッシュ: ${fileHash}</p>
 `;

 document.getElementById('downloadAllButton').onclick = function() {
     const url = URL.createObjectURL(zipContent);
     const a = document.createElement('a');
     a.href = url;
     a.download = `${fileName.replace(/\.[^/.]+$/, "")}_split.zip`;
     document.body.appendChild(a);
     a.click();
     setTimeout(() => {
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
     }, 100);
 };
 
    } catch (error) {
 console.error('分割エラー:', error);
 updateStatus('splitStatus', `エラーが発生しました: ${error.message}`, 'error');
    }
});

document.getElementById('mergeButton').addEventListener('click', async function() {
    const fileInput = document.getElementById('zipToMerge');
    
    if (!fileInput.files[0]) {
 updateStatus('mergeStatus', 'ZIPファイルを選択してください', 'error');
 return;
    }
    
    try {
 updateStatus('mergeStatus', 'ZIPファイルを処理中...', 'info');
 document.getElementById('mergeProgress').style.width = '0%';
 
 const zipFile = fileInput.files[0];
 const zip = await JSZip.loadAsync(zipFile);

 const metaData = JSON.parse(await zip.file("metadata.json").async('text'));
 const isEncrypted = metaData.encrypted || false;

 const decryptContainer = document.getElementById('decryptContainer');
 decryptContainer.style.display = isEncrypted ? 'block' : 'none';
 
 if (isEncrypted && !document.getElementById('decryptPassword').value) {
     updateStatus('mergeStatus', '復号パスワードを入力してください', 'error');
     return;
 }

 updateStatus('mergeStatus', 'ファイルを結合中...', 'info');
 let combinedData = new Uint8Array(metaData.fileSize);
 let offset = 0;
 
 for (let i = 1; i <= metaData.chunkCount; i++) {
     const partName = `part${i}.bin`;
     const chunk = await zip.file(partName).async('arraybuffer');
     
     combinedData.set(new Uint8Array(chunk), offset);
     offset += chunk.byteLength;

     const progress = ((i) / metaData.chunkCount) * 50;
     document.getElementById('mergeProgress').style.width = `${progress}%`;
 }

 if (isEncrypted) {
     updateStatus('mergeStatus', 'ファイルを復号中...', 'info');
     const password = document.getElementById('decryptPassword').value;
     combinedData = await decryptData(combinedData.buffer, password);
     document.getElementById('mergeProgress').style.width = '75%';
 }

 updateStatus('mergeStatus', 'ファイルを検証中...', 'info');
 const combinedHash = await calculateSHA256(combinedData.buffer);
 
 if (combinedHash !== metaData.hash) {
     throw new Error('ファイルの整合性チェックに失敗しました。ファイルが破損している可能性があります。');
 }
 
 document.getElementById('mergeProgress').style.width = '100%';

 updateStatus('mergeStatus', 'ファイルの結合が完了しました！', 'success');
 document.getElementById('mergeResults').style.display = 'block';

 const blob = new Blob([combinedData], {type: getMimeType(metaData.originalName)});
 const url = URL.createObjectURL(blob);
 const previewContainer = document.getElementById('filePreviewContainer');
 previewContainer.innerHTML = '';
 
 if (blob.type.startsWith('image/')) {
     const img = document.createElement('img');
     img.src = url;
     img.id = 'filePreview';
     previewContainer.appendChild(img);
 } else if (blob.type.startsWith('video/')) {
     const video = document.createElement('video');
     video.src = url;
     video.controls = true;
     video.id = 'filePreview';
     previewContainer.appendChild(video);
 } else if (blob.type.startsWith('audio/')) {
     const audio = document.createElement('audio');
     audio.src = url;
     audio.controls = true;
     audio.id = 'filePreview';
     previewContainer.appendChild(audio);
 } else {
     previewContainer.innerHTML = `
  <p>プレビュー非対応ファイル: ${metaData.originalName}</p>
  <p>サイズ: ${formatFileSize(metaData.fileSize)}</p>
  <p>タイプ: ${blob.type}</p>
     `;
 }

 document.getElementById('downloadMergedButton').onclick = function() {
     const a = document.createElement('a');
     a.href = url;
     a.download = metaData.originalName;
     document.body.appendChild(a);
     a.click();
     setTimeout(() => {
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
     }, 100);
 };
 
    } catch (error) {
 console.error('結合エラー:', error);
 updateStatus('mergeStatus', `エラーが発生しました: ${error.message}`, 'error');
    }
});

function updateStatus(elementId, message, type) {
    const statusElement = document.getElementById(elementId);
    statusElement.textContent = message;
    statusElement.style.color = type === 'error' ? '#f04747' : type === 'success' ? '#43b581' : '#ffffff';
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

    const decryptedData = await crypto.subtle.decrypt(
 {
     name: 'AES-CBC',
     iv: iv
 },
 key,
 encryptedData
    );
    
    return decryptedData;
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
 'zip': 'application/zip'
    };
    return mimeTypes[extension] || 'application/octet-stream';
}
