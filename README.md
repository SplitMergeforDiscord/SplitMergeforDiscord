# SplitMerge for Discord (v1.1.0)

Discordのファイルサイズ制限を超えるファイルを安全に分割・結合するWebアプリケーション

![SplitMerge for Discord]([https://i.imgur.com/5Xkz7gP.png](https://github.com/organizations/SplitMergeforDiscord/settings/profile))

## ✨ 特徴

- **スマートなファイル分割**
  - Discord無料プラン向け: 10MB分割
  - Nitroプラン向け: 500MB分割
  - カスタムサイズ指定可能
- **軍事級暗号化**
  - AES-256暗号化でファイルを保護
  - パスワードベースのセキュアな復号
- **マルチフォーマット対応**
  - 画像、動画、音声、ドキュメントなど幅広いファイル形式をサポート
  - 自動プレビュー機能付き
- **完全クライアントサイド処理**
  - サーバーにファイルをアップロードしない
  - ブラウザ内で完結する安全な設計
- **強化されたUI/UX**
  - Font Awesomeアイコン統合
  - レスポンシブデザインで全デバイス対応
  - 直感的なタブインターフェース

## 🚀 使い方

### ファイル分割
1. 「ファイル分割」タブを選択
2. 分割したいファイルを選択
3. 分割サイズを指定 (10MB/500MB/カスタム)
4. 必要に応じて暗号化を有効化
5. 「分割を開始」をクリック
6. 完了後、ZIPをダウンロードまたはDiscordに共有

### ファイル結合
1. 「ファイル結合」タブを選択
2. SplitMergeで作成されたZIPファイルを選択
3. 暗号化されたファイルの場合はパスワードを入力
4. 「結合を開始」をクリック
5. プレビューを確認し、元のファイルをダウンロード

## 📋 対応ファイル形式
| カテゴリ       | 対応形式例                          |
|----------------|-----------------------------------|
| 画像          | JPG, PNG, GIF, SVG, WEBP, BMP, ICO |
| 動画          | MP4, WEBM, AVI, MOV, WMV         |
| 音声          | MP3, WAV, OGG, M4A, MIDI, FLAC   |
| ドキュメント   | PDF, DOCX, XLSX, PPTX, TXT, SQL  |
| その他        | ZIP, RAR, 7Z, JSON, HTML, CSS    |

## ⚙ 技術仕様
- **フロントエンド**: HTML5, CSS3, JavaScript (ES6)
- **主要ライブラリ**: 
  - JSZip 3.10.1 (ファイル圧縮/解凍)
  - Web Crypto API (暗号化/復号)
  - Font Awesome 6.4.0 (アイコン)
- **ブラウザサポート**: Chrome, Firefox, Edge, Safariの最新版
- **レスポンシブデザイン**: スマホ/タブレット/デスクトップ対応

## ⚠ 注意事項
- 暗号化パスワードを忘れるとファイルを復元できません
- 4GB以上の超大容量ファイルはブラウザのメモリ制限に注意
- Safariでは一部機能に制限がある場合があります
- 分割ファイルはすべて揃っている必要があります

## 📜 バージョン履歴

### V1.1.0 (最新)
- 解説ページを追加
- UIデザインの改善
- Font Awesomeアイコンの導入
- レスポンシブデザインの強化
- マイナーなバグ修正

### V1.0.1
- 追加ファイル形式のサポート (SVG, MIDI, SQLなど)
- プレビュー機能の改善
- 進捗表示の精度向上

### V1.0.0
- 初版リリース
- 基本的分割/結合機能
- AES-256暗号化サポート
- SHA-256ハッシュ検証

## 📜 ライセンス
BSD-2-Clause license

## 🌐 デモ
[SplitMerge for Discordを今すぐ使う](https://splitmergefordiscord.github.io/SplitMergeforDiscord/#guide)
