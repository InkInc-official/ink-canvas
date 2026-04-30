# Ink Canvas

**AI Image Generation Studio — by Ink Inc.**

> AI Creation, Human Care. The Future Drawn Together.

Pollinations.ai（完全無料）と Google Gemini API（任意・ユーザー提供キー）を搭載した  
高精細AI素材生成スタジオです。

---

## Features

- **Pollinations Flux** — APIキー不要・完全無料で画像生成
- **Gemini Flash / Imagen 4 / Imagen 4 Ultra** — 自前のGemini APIキーで高品質生成
- **Veo 2.0** — 画像→動画 / テキスト→動画（Gemini APIキー必要）
- リファレンス画像アップロード（Image-to-Image）
- 6種のアスペクト比（立ち絵・YouTube・スマホ縦動画など）
- PNG/MP4ダウンロード

---

## Quick Start

```bash
git clone https://github.com/InkInc-official/ink-canvas.git
cd ink-canvas
npm install
npm run dev
```

ブラウザで `http://localhost:3000` を開いてください。

---

## Gemini APIキーについて

Pollinations エンジンはキー不要・完全無料で動作します。

Gemini モデル（Flash Image / Imagen 4 / Veo）を使用する場合は、  
アプリのサイドバーから Gemini API キーを入力してください。

- キーはブラウザの `localStorage` に保存されます（サーバーには送信されません）
- Google側の[利用料金](https://ai.google.dev/pricing)が発生します。無料枠を超えた場合は課金されます
- APIキー取得: https://aistudio.google.com/app/apikey

---

## Tech Stack

| レイヤー | 技術 |
|---|---|
| フレームワーク | React 19 + TypeScript |
| スタイリング | TailwindCSS v4 |
| アニメーション | Motion (motion/react) |
| ビルド | Vite |
| 画像生成（無料） | Pollinations.ai |
| 画像生成（有料） | Google Gemini API（Imagen 4） |
| 動画生成（有料） | Google Gemini API（Veo 2.0） |

---

## Deploy

Vercel / Netlify / Google Cloud Run など静的ホスティングに対応しています。

```bash
npm run build
# dist/ フォルダをデプロイ
```

環境変数の設定は不要です。APIキーはユーザーがブラウザ上で入力します。

---

## License

Apache-2.0

© 2025-2026 黒井葉跡 / Ink Inc.  
https://inkinc-hp.vercel.app/
