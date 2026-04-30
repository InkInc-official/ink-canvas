/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Ink Canvas — AI Image Generation Studio
 * by Ink Inc. / 黒井葉跡
 * https://inkinc-hp.vercel.app/
 *
 * Powered by Pollinations.ai (free) and Google Gemini API (optional, user-provided key).
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Video as VideoIcon,
  Download,
  Settings,
  Loader2,
  Upload,
  X,
  ArrowRightLeft,
  Key,
  Eye,
  EyeOff,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from '@google/genai';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type AspectRatio = '2:3' | '3:4' | '1:1' | '9:16' | '4:3' | '16:9';
type ModelType = 'pollinations' | 'flash-image' | 'imagen-4.0' | 'imagen-ultra';

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  aspectRatio: AspectRatio;
  model: ModelType;
  timestamp: number;
  referenceUrl?: string;
}

interface GeneratedVideo {
  id: string;
  url: string;
  sourceImageId: string;
  prompt: string;
  timestamp: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'ink_canvas_gemini_api_key';

const GEMINI_MODELS: { id: ModelType; name: string; requiresKey: boolean; note?: string }[] = [
  { id: 'pollinations',  name: 'Pollinations Flux',   requiresKey: false },
  { id: 'flash-image',   name: 'Gemini Flash Image',  requiresKey: true  },
  { id: 'imagen-4.0',    name: 'Imagen 4 Standard',   requiresKey: true  },
  { id: 'imagen-ultra',  name: 'Imagen 4 Ultra',      requiresKey: true, note: '高コスト' },
];

const LOADING_MESSAGES = [
  'TERMINAL: Adjusting light vectors...',
  'TERMINAL: Refining compositional geometry...',
  'TERMINAL: Enhancing high-frequency details...',
  'TERMINAL: Synchronizing color pallet of the executive suite...',
  'TERMINAL: Processing creative intent. Please standby...',
];

const ASPECT_RATIOS: AspectRatio[] = ['2:3', '3:4', '1:1', '9:16', '4:3', '16:9'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getPollinationsDimensions(ratio: AspectRatio) {
  const map: Record<AspectRatio, { w: number; h: number }> = {
    '1:1':  { w: 1024, h: 1024 },
    '2:3':  { w: 832,  h: 1248 },
    '3:4':  { w: 896,  h: 1152 },
    '9:16': { w: 720,  h: 1280 },
    '4:3':  { w: 1152, h: 896  },
    '16:9': { w: 1280, h: 720  },
  };
  return map[ratio] ?? { w: 1024, h: 1024 };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** APIキー入力パネル */
function ApiKeyPanel({
  apiKey,
  onSave,
  onClear,
}: {
  apiKey: string;
  onSave: (key: string) => void;
  onClear: () => void;
}) {
  const [input, setInput] = useState(apiKey);
  const [show, setShow] = useState(false);
  const [open, setOpen] = useState(false);
  const hasKey = apiKey.length > 0;

  return (
    <section>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-[10px] uppercase tracking-widest text-primary font-bold mb-2"
      >
        <span className="flex items-center gap-2">
          <Key className="w-3 h-3" />
          Gemini API Key
        </span>
        <span
          className={`px-2 py-0.5 rounded text-[8px] font-black tracking-widest ${
            hasKey ? 'bg-green-500/20 text-green-400' : 'bg-neutral-700/40 text-neutral-500'
          }`}
        >
          {hasKey ? 'SET' : 'NOT SET'}
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 pt-1 pb-2">
              {/* 料金注意 */}
              <div className="flex gap-2 p-3 bg-amber-950/30 border border-amber-700/30 rounded text-[10px] text-amber-400 leading-relaxed">
                <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                <span>
                  Gemini APIキーを使用すると、Google側の利用料金が発生します。
                  無料枠を超えた場合は課金されます。
                  <a
                    href="https://ai.google.dev/pricing"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-1 underline opacity-70 hover:opacity-100"
                  >
                    料金詳細 ↗
                  </a>
                </span>
              </div>

              {/* キー入力 */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={show ? 'text' : 'password'}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="AIza..."
                    className="w-full bg-black/40 border border-border-subtle rounded px-3 py-2 text-xs text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-primary font-mono pr-8"
                  />
                  <button
                    onClick={() => setShow((v) => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-600 hover:text-primary"
                  >
                    {show ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => { onSave(input.trim()); setOpen(false); }}
                  disabled={!input.trim()}
                  className="flex-1 py-2 bg-primary text-black text-[10px] uppercase tracking-widest font-black rounded hover:bg-accent transition-all disabled:opacity-30"
                >
                  Save
                </button>
                {hasKey && (
                  <button
                    onClick={() => { setInput(''); onClear(); }}
                    className="px-3 py-2 border border-white/10 text-[10px] uppercase tracking-widest text-neutral-500 rounded hover:text-red-400 hover:border-red-400/30 transition-all"
                  >
                    Clear
                  </button>
                )}
              </div>

              <p className="text-[9px] text-neutral-600 leading-relaxed">
                キーはブラウザのlocalStorageに保存されます。
                サーバーには送信されません。
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 text-primary/60 underline hover:text-primary"
                >
                  APIキーを取得 ↗
                </a>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main App
// ---------------------------------------------------------------------------
export default function App() {
  const [prompt, setPrompt]                         = useState('');
  const [aspectRatio, setAspectRatio]               = useState<AspectRatio>('1:1');
  const [generationMode, setGenerationMode]         = useState<'image' | 'video'>('image');
  const [model, setModel]                           = useState<ModelType>('pollinations');
  const [images, setImages]                         = useState<GeneratedImage[]>([]);
  const [videos, setVideos]                         = useState<GeneratedVideo[]>([]);
  const [isGenerating, setIsGenerating]             = useState(false);
  const [isVideoGenerating, setIsVideoGenerating]   = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage]         = useState('');
  const [error, setError]                           = useState<string | null>(null);

  // Quota
  const [usageCount, setUsageCount]                 = useState(0);
  const [showQuotaModal, setShowQuotaModal]         = useState(false);
  const [pendingAction, setPendingAction]           = useState<{ type: 'image' | 'video'; data?: GeneratedImage } | null>(null);

  // Upload
  const [uploadedFile, setUploadedFile]             = useState<{ url: string; base64: string } | null>(null);
  const [isDragging, setIsDragging]                 = useState(false);
  const fileInputRef                                = useRef<HTMLInputElement>(null);

  // API Key
  const [apiKey, setApiKey]                         = useState<string>(() => {
    try { return localStorage.getItem(STORAGE_KEY) ?? ''; } catch { return ''; }
  });

  const saveApiKey = (key: string) => {
    setApiKey(key);
    try { localStorage.setItem(STORAGE_KEY, key); } catch {}
  };
  const clearApiKey = () => {
    setApiKey('');
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };

  // Loading message rotation
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isGenerating || isVideoGenerating) {
      setLoadingMessage(LOADING_MESSAGES[0]);
      interval = setInterval(() => {
        setLoadingMessage((prev) => {
          const i = LOADING_MESSAGES.indexOf(prev);
          return LOADING_MESSAGES[(i + 1) % LOADING_MESSAGES.length];
        });
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [isGenerating, isVideoGenerating]);

  // ---------------------------------------------------------------------------
  // File upload
  // ---------------------------------------------------------------------------
  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) { setError('画像ファイルをアップロードしてください。'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const b64 = e.target?.result as string;
      setUploadedFile({ url: b64, base64: b64.split(',')[1] });
    };
    reader.readAsDataURL(file);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
  };

  // ---------------------------------------------------------------------------
  // Generation entry point
  // ---------------------------------------------------------------------------
  const handleGenerate = async () => {
    if (!prompt.trim() && !uploadedFile) return;

    const needsKey = model !== 'pollinations' || generationMode === 'video';
    if (needsKey && !apiKey) {
      setError('このモデルにはGemini APIキーが必要です。サイドバーで設定してください。');
      return;
    }

    const isPremium = model === 'imagen-ultra' || generationMode === 'video';
    const overThreshold = usageCount >= 5;

    if (needsKey && (overThreshold || isPremium)) {
      setPendingAction({ type: 'image' });
      setShowQuotaModal(true);
      return;
    }

    await executeGeneration();
  };

  const executeGeneration = async () => {
    setIsGenerating(true);
    setError(null);
    setUsageCount((c) => c + 1);

    try {
      if (generationMode === 'video') {
        uploadedFile ? await handleGenerateVideoFromUpload() : await handleGenerateVideoDirect();
        return;
      }

      if (model === 'pollinations') {
        await new Promise((r) => setTimeout(r, 6000));
        const { w, h } = getPollinationsDimensions(aspectRatio);
        const enc = encodeURIComponent(prompt || 'Stunning digital art masterpiece');
        const newImages: GeneratedImage[] = Array(4).fill(null).map(() => ({
          id: crypto.randomUUID(),
          url: `https://image.pollinations.ai/prompt/${enc}?width=${w}&height=${h}&seed=${Math.floor(Math.random() * 1_000_000)}&model=flux&nologo=true`,
          prompt: prompt || 'Visual interpretation',
          aspectRatio,
          model: 'pollinations',
          timestamp: Date.now(),
        }));
        setImages((prev) => [...newImages, ...prev]);
        return;
      }

      // Gemini models
      const ai = new GoogleGenAI({ apiKey });
      const promises = Array(4).fill(null).map(async (_, index) => {
        if (uploadedFile || model === 'flash-image') {
          const targetModel =
            model === 'imagen-ultra' || model === 'flash-image'
              ? 'gemini-2.0-flash-preview-image-generation'
              : 'gemini-2.5-flash-preview-05-20';

          const parts: any[] = [{ text: prompt || 'Visual artistic generation' }];
          if (uploadedFile) {
            parts.push({ inlineData: { data: uploadedFile.base64, mimeType: 'image/png' } });
          }

          const result = await ai.models.generateContent({
            model: targetModel,
            contents: { parts },
            config: {
              responseModalities: ['IMAGE', 'TEXT'],
              imageConfig: {
                aspectRatio: aspectRatio as any,
                imageSize: model === 'imagen-ultra' ? '2K' : '1K',
              },
            },
          });

          const part = result.candidates[0].content.parts.find((p: any) => p.inlineData);
          if (!part?.inlineData?.data) throw new Error(`Failed to generate image ${index + 1}`);

          return {
            id: crypto.randomUUID(),
            url: `data:image/png;base64,${part.inlineData.data}`,
            prompt: prompt || 'Visual interpretation',
            aspectRatio,
            model,
            timestamp: Date.now(),
            referenceUrl: uploadedFile?.url,
          } as GeneratedImage;
        } else {
          // Imagen 4
          const result = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt,
            config: {
              numberOfImages: 1,
              aspectRatio: (
                aspectRatio === '2:3' ? '3:4' :
                aspectRatio === '9:16' ? '9:16' :
                aspectRatio === '4:3' ? '4:3' :
                aspectRatio === '16:9' ? '16:9' : '1:1'
              ) as any,
            },
          });
          const base64 = result.generatedImages[0].image.imageBytes;
          if (!base64) throw new Error(`Failed to generate image ${index + 1}`);
          return {
            id: crypto.randomUUID(),
            url: `data:image/png;base64,${base64}`,
            prompt,
            aspectRatio,
            model,
            timestamp: Date.now(),
          } as GeneratedImage;
        }
      });

      const newImages = await Promise.all(promises);
      setImages((prev) => [...newImages, ...prev]);
    } catch (err: any) {
      console.error(err);
      setError(err.message || '生成に失敗しました。APIキーや利用制限を確認してください。');
    } finally {
      setIsGenerating(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Video generation
  // ---------------------------------------------------------------------------
  const handleGenerateVideoDirect = async () => {
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey });
      let op = await ai.models.generateVideos({
        model: 'veo-2.0-generate-001',
        prompt: `Create a cinematic 10 second video based on this prompt: ${prompt}`,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: ['9:16', '3:4', '2:3'].includes(aspectRatio) ? '9:16' : '16:9',
        },
      });
      while (!op.done) {
        await new Promise((r) => setTimeout(r, 10000));
        op = await ai.operations.getVideosOperation({ operation: op });
      }
      const uri = op.response?.generatedVideos?.[0]?.video?.uri;
      if (uri) {
        const blob = await (await fetch(uri, { headers: { 'x-goog-api-key': apiKey } })).blob();
        setVideos((prev) => [{ id: crypto.randomUUID(), url: URL.createObjectURL(blob), sourceImageId: 'text-to-video', prompt, timestamp: Date.now() }, ...prev]);
      }
    } catch (err: any) {
      setError('動画生成に失敗しました。プロンプトの内容や利用制限を確認してください。');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateVideoFromUpload = async () => {
    if (!uploadedFile) return;
    setError(null);
    try {
      const ai = new GoogleGenAI({ apiKey });
      let op = await ai.models.generateVideos({
        model: 'veo-2.0-generate-001',
        prompt: prompt || 'Animate this scene in a cinematic way, high detail masterpiece.',
        image: { imageBytes: uploadedFile.base64, mimeType: 'image/png' },
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: ['9:16', '3:4', '2:3'].includes(aspectRatio) ? '9:16' : '16:9',
        },
      });
      while (!op.done) {
        await new Promise((r) => setTimeout(r, 10000));
        op = await ai.operations.getVideosOperation({ operation: op });
      }
      const uri = op.response?.generatedVideos?.[0]?.video?.uri;
      if (uri) {
        const blob = await (await fetch(uri, { headers: { 'x-goog-api-key': apiKey } })).blob();
        setVideos((prev) => [{ id: crypto.randomUUID(), url: URL.createObjectURL(blob), sourceImageId: 'uploaded-video', prompt: prompt || 'Uploaded Image Animation', timestamp: Date.now() }, ...prev]);
      }
    } catch (err: any) {
      setError('アップロード画像からの動画生成に失敗しました。');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateVideo = (image: GeneratedImage) => {
    if (!apiKey) { setError('動画生成にはGemini APIキーが必要です。'); return; }
    if (usageCount >= 5) { setPendingAction({ type: 'video', data: image }); setShowQuotaModal(true); return; }
    executeVideoGeneration(image);
  };

  const executeVideoGeneration = async (image: GeneratedImage) => {
    setIsVideoGenerating(image.id);
    setError(null);
    setUsageCount((c) => c + 1);
    try {
      const ai = new GoogleGenAI({ apiKey });
      const base64Data = image.url.split(',')[1];
      let op = await ai.models.generateVideos({
        model: 'veo-2.0-generate-001',
        prompt: `Create a 10 second cinematic motion poster based on this image. Keep the character stable and animate the background elements (wind, lighting, particles). Style: ${image.prompt}`,
        image: { imageBytes: base64Data, mimeType: 'image/png' },
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: ['9:16', '3:4', '2:3'].includes(image.aspectRatio) ? '9:16' : '16:9',
        },
      });
      while (!op.done) {
        await new Promise((r) => setTimeout(r, 10000));
        op = await ai.operations.getVideosOperation({ operation: op });
      }
      const uri = op.response?.generatedVideos?.[0]?.video?.uri;
      if (uri) {
        const blob = await (await fetch(uri, { headers: { 'x-goog-api-key': apiKey } })).blob();
        setVideos((prev) => [{ id: crypto.randomUUID(), url: URL.createObjectURL(blob), sourceImageId: image.id, prompt: image.prompt, timestamp: Date.now() }, ...prev]);
      }
    } catch (err: any) {
      setError('動画の生成に失敗しました。Veoモデルの利用権限や容量を確認してください。');
    } finally {
      setIsVideoGenerating(null);
    }
  };

  const downloadMedia = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  const currentModelInfo = GEMINI_MODELS.find((m) => m.id === model);
  const needsKeyForCurrentConfig = model !== 'pollinations' || generationMode === 'video';

  return (
    <div className="h-screen bg-bg-terminal text-[#E0D7CC] flex flex-col overflow-hidden geometric-grid">
      {/* Header */}
      <header className="h-16 border-b border-border-subtle flex items-center justify-between px-8 bg-[#16161D] z-30 shrink-0">
        <div>
          <h1 className="text-2xl font-serif tracking-[0.3em] text-accent font-bold uppercase leading-none cursor-default select-none">
            Ink Canvas
          </h1>
          <p className="text-[8px] uppercase tracking-[0.5em] text-primary/80 font-bold mt-0.5">
            AI Image Studio — by Ink Inc.
          </p>
        </div>
        <div className="flex items-center gap-8 text-[10px] font-mono tracking-widest text-primary/60">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
            SYSTEM STATUS: OPTIMAL
          </div>
          <div className="flex items-center gap-2">
            <span className="opacity-50">ENGINE:</span>
            {model === 'pollinations' ? 'POLLINATIONS FLUX' : 'GEMINI / IMAGEN'}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 border-r border-border-subtle p-6 flex flex-col gap-6 bg-bg-sidebar z-20 overflow-y-auto shrink-0">

          {/* API Key Panel */}
          <ApiKeyPanel apiKey={apiKey} onSave={saveApiKey} onClear={clearApiKey} />

          <div className="border-t border-white/5" />

          {/* Reference Image Upload */}
          <section>
            <label className="text-[10px] uppercase tracking-widest text-primary block mb-3 font-bold">
              Reference Input
            </label>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative h-40 border border-dashed rounded transition-all flex flex-col items-center justify-center cursor-pointer group overflow-hidden ${
                isDragging ? 'bg-primary/10 border-primary' : 'bg-black/30 border-white/5 hover:border-primary/50'
              }`}
            >
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files[0])} />
              {uploadedFile ? (
                <div className="absolute inset-0 group">
                  <img src={uploadedFile.url} className="w-full h-full object-cover" alt="Reference" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); setUploadedFile(null); }}
                      className="p-2 bg-red-500 rounded-full text-white hover:bg-red-600">
                      <X className="w-4 h-4" />
                    </button>
                    <p className="text-[10px] text-white font-bold uppercase tracking-widest">Change Image</p>
                  </div>
                </div>
              ) : (
                <>
                  <Upload className={`w-8 h-8 mb-2 transition-colors ${isDragging ? 'text-primary' : 'text-neutral-600 group-hover:text-primary/70'}`} />
                  <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest text-center px-4">
                    Drag & Drop or Click<br /><span className="opacity-50 font-normal">Reference Image</span>
                  </p>
                </>
              )}
            </div>
          </section>

          {/* Generation Mode */}
          <section>
            <label className="text-[10px] uppercase tracking-widest text-primary block mb-3 font-bold">
              Generation Mode
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['image', 'video'] as const).map((mode) => (
                <button key={mode}
                  onClick={() => setGenerationMode(mode)}
                  className={`py-2 text-[10px] uppercase tracking-widest rounded transition-all border relative ${
                    generationMode === mode
                      ? 'bg-primary text-black border-primary'
                      : 'bg-black/20 border-white/5 text-neutral-500 hover:border-primary/30'
                  }`}
                >
                  {mode}
                  {mode === 'video' && !apiKey && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-500" title="APIキーが必要" />
                  )}
                </button>
              ))}
            </div>
            {generationMode === 'video' && !apiKey && (
              <p className="mt-2 text-[9px] text-amber-500/70 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> 動画生成にはGemini APIキーが必要です
              </p>
            )}
          </section>

          {/* Engine Selector */}
          <section>
            <label className="text-[10px] uppercase tracking-widest text-primary block mb-3 font-bold">
              Engine Selector
            </label>
            <div className="space-y-1">
              {generationMode === 'image' ? (
                GEMINI_MODELS.map((m) => (
                  <button key={m.id}
                    onClick={() => {
                      if (m.requiresKey && !apiKey) {
                        setError('このモデルにはGemini APIキーが必要です。');
                        return;
                      }
                      setModel(m.id);
                    }}
                    className={`w-full text-left px-4 py-3 rounded transition-all border flex items-center justify-between text-xs tracking-wide ${
                      model === m.id
                        ? 'bg-[#1A1A22] border-primary text-white shadow-[0_0_15px_rgba(140,120,81,0.1)]'
                        : 'bg-transparent border-transparent text-neutral-500 hover:text-neutral-300'
                    } ${m.requiresKey && !apiKey ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <span className="flex items-center gap-2">
                      {m.requiresKey && <Key className="w-3 h-3 text-primary/40 shrink-0" />}
                      {m.name}
                      {m.note && <span className="text-[8px] text-amber-500/70">({m.note})</span>}
                    </span>
                    {model === m.id && <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                  </button>
                ))
              ) : (
                <button className="w-full text-left px-4 py-3 bg-[#1A1A22] border border-primary rounded text-white flex items-center justify-between text-xs tracking-wide">
                  <span className="flex items-center gap-2">
                    <Key className="w-3 h-3 text-primary/40" />
                    Veo 2.0 Neural Synth
                  </span>
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                </button>
              )}
            </div>

            {/* Pollinations info */}
            {model === 'pollinations' && generationMode === 'image' && (
              <div className="mt-3 flex gap-2 p-2 bg-green-950/20 border border-green-800/20 rounded text-[9px] text-green-400/70">
                <Info className="w-3 h-3 shrink-0 mt-0.5" />
                APIキー不要・完全無料で動作します
              </div>
            )}
          </section>

          {/* Aspect Ratio */}
          <section>
            <label className="text-[10px] uppercase tracking-widest text-primary block mb-3 font-bold">
              Aspect Ratio
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ASPECT_RATIOS.map((r) => (
                <button key={r}
                  onClick={() => setAspectRatio(r)}
                  className={`py-2 rounded border text-[10px] transition-all font-mono ${
                    aspectRatio === r
                      ? 'bg-primary text-black border-primary'
                      : 'bg-black/40 border-border-subtle text-neutral-500 hover:border-primary/50'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </section>

          {/* Prompt */}
          <section className="flex-1 flex flex-col border-t border-white/5 pt-6">
            <label className="text-[10px] uppercase tracking-widest text-primary block mb-3 font-bold">
              Generation Intent
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={uploadedFile ? 'Describe modifications to reference...' : "Describe the liver's appearance or scene..."}
              className="w-full flex-1 min-h-[120px] bg-black/40 border border-border-subtle rounded p-4 text-sm text-neutral-200 placeholder:text-neutral-700 focus:outline-none focus:border-primary transition-all resize-none font-serif leading-relaxed"
            />
            <button
              onClick={handleGenerate}
              disabled={isGenerating || (!prompt.trim() && !uploadedFile)}
              className="mt-4 w-full py-4 bg-primary text-black font-bold uppercase tracking-[0.2em] text-xs rounded hover:bg-accent transition-all shadow-xl disabled:opacity-30 disabled:grayscale"
            >
              {isGenerating ? (
                <Loader2 className="w-4 h-4 animate-spin mx-auto" />
              ) : uploadedFile ? (
                'PROCESS REFERENCE'
              ) : (
                'Invoke Generation'
              )}
            </button>

            {/* Key warning near generate button */}
            {needsKeyForCurrentConfig && !apiKey && (
              <p className="mt-2 text-[9px] text-amber-500/70 text-center flex items-center justify-center gap-1">
                <AlertTriangle className="w-3 h-3" /> APIキーを設定してください
              </p>
            )}
          </section>
        </aside>

        {/* Main Workspace */}
        <main className="flex-1 p-4 lg:p-8 overflow-y-auto relative bg-bg-terminal flex flex-col gap-8">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <h2 className="font-serif text-3xl text-accent italic tracking-tight">Executive Preview</h2>
              {uploadedFile && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="px-2 py-0.5 bg-primary/20 border border-primary/30 rounded text-[9px] text-primary uppercase font-bold tracking-widest flex items-center gap-2 animate-pulse">
                    <ArrowRightLeft className="w-3 h-3" /> Image-to-{generationMode.toUpperCase()} Mode Active
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-4">
              {error && (
                <div className="text-red-500 text-[10px] uppercase tracking-[0.2em] bg-red-500/10 px-3 py-1 border border-red-500/20 rounded animate-pulse max-w-sm text-right">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Image Grid */}
          <div className="w-full">
            <div
              className="grid gap-3 md:gap-4 lg:gap-6 pb-24 w-full"
              style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', minWidth: '0' }}
            >
              {images.map((img, idx) => (
                <motion.div
                  key={img.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: (idx % 4) * 0.1 }}
                  className="group relative glass-terminal rounded-lg overflow-hidden flex flex-col border border-white/10 bg-[#0D0D12] transition-all hover:border-primary/50 shadow-2xl"
                >
                  <div className="relative overflow-hidden w-full bg-black/60 aspect-[3/4] flex items-center justify-center border-b border-white/5">
                    <img
                      src={img.url}
                      alt={`Item ${images.length - idx}`}
                      className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black via-black/90 to-transparent translate-y-full group-hover:translate-y-0 transition-transform flex flex-col gap-2 z-20">
                      <button
                        onClick={() => downloadMedia(img.url, `ink-canvas-${img.id}.png`)}
                        className="w-full text-[9px] bg-primary text-black py-2 rounded-sm uppercase font-black tracking-widest hover:bg-accent transition-colors shadow-lg"
                      >
                        Download PNG
                      </button>
                      <button
                        onClick={() => handleGenerateVideo(img)}
                        disabled={isVideoGenerating === img.id}
                        className="w-full text-[9px] bg-white/10 text-white py-2 rounded-sm uppercase border border-white/20 hover:bg-white/30 transition-colors flex items-center justify-center gap-2 disabled:opacity-40"
                      >
                        {isVideoGenerating === img.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <VideoIcon className="w-3 h-3" />
                        )}
                        Animate
                      </button>
                    </div>
                  </div>
                  <div className="p-3 bg-black/40 flex flex-col gap-1 relative border-t border-white/5">
                    <div className="text-[9px] text-accent font-serif italic truncate w-full opacity-80 group-hover:opacity-100 transition-opacity">
                      "{img.prompt}"
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-[7px] text-primary/40 uppercase tracking-[0.2em] font-bold">
                        {img.model.split('-')[0].toUpperCase()} // {img.aspectRatio}
                      </div>
                      <div className="text-[14px] font-serif italic text-primary/10 font-black tracking-tighter">
                        {String(images.length - idx).padStart(2, '0')}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}

              {images.length === 0 &&
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={`empty-${i}`}
                    className="glass-terminal rounded-lg flex items-center justify-center aspect-[3/4] border border-dashed border-primary/10 bg-black/10">
                    <div className="text-white/5 text-6xl font-serif italic font-black">0{i + 1}</div>
                  </div>
                ))}
            </div>
          </div>

          {/* Videos Feed */}
          {videos.length > 0 && (
            <div className="space-y-8 pt-12 border-t border-border-subtle">
              <h3 className="font-serif text-2xl text-accent italic">Motion Composites</h3>
              <div className="grid grid-cols-2 gap-8">
                {videos.map((video) => (
                  <div key={video.id} className="glass-terminal rounded overflow-hidden space-y-2 group bg-black">
                    <video src={video.url} controls className="w-full aspect-video object-contain" />
                    <div className="p-4 flex justify-between items-center bg-[#16161D]">
                      <div className="text-[10px] uppercase tracking-widest text-primary font-bold">VEO_OUTPUT_STREAM</div>
                      <button onClick={() => downloadMedia(video.url, `motion-${video.id}.mp4`)}
                        className="p-2 hover:text-primary">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Quota Modal & Loading Overlay */}
      <AnimatePresence>
        {showQuotaModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="max-w-md w-full bg-[#1A1A22] border border-primary/30 p-8 rounded shadow-[0_0_50px_rgba(140,120,81,0.15)] flex flex-col gap-6"
            >
              <div className="flex items-center gap-4 text-primary">
                <Settings className="w-8 h-8" />
                <h2 className="text-xl font-serif tracking-[0.1em] uppercase">Quota Advisory</h2>
              </div>
              <div className="space-y-4">
                <p className="text-sm text-neutral-300 leading-relaxed">
                  利用制限（無料枠）の上限に近づいているか、高コストモデルを選択しています。
                  継続すると、Google側の料金が発生する可能性があります。
                </p>
                <div className="p-4 bg-black/40 border border-white/5 rounded text-xs font-mono">
                  <div className="text-[10px] text-primary/60 uppercase tracking-widest mb-1">Status Report</div>
                  SESSION_USAGE: {usageCount} ITEMS<br />
                  LIMIT_STATUS: {usageCount >= 5 ? 'CAP_REACHED' : 'NOMINAL'}<br />
                  MODEL_TYPE: {model.toUpperCase()}
                </div>
                <p className="text-sm text-accent italic">それでも実行しますか？</p>
              </div>
              <div className="flex gap-4">
                <button
                  onClick={() => { setShowQuotaModal(false); setPendingAction(null); }}
                  className="flex-1 py-3 border border-white/10 rounded text-[10px] uppercase tracking-widest font-bold hover:bg-white/5 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowQuotaModal(false);
                    if (pendingAction?.type === 'image') executeGeneration();
                    else if (pendingAction?.type === 'video' && pendingAction.data) executeVideoGeneration(pendingAction.data);
                    setPendingAction(null);
                  }}
                  className="flex-1 py-3 bg-primary text-black rounded text-[10px] uppercase tracking-widest font-bold hover:bg-accent transition-all shadow-lg"
                >
                  EXECUTE ANYWAY
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {(isGenerating || !!isVideoGenerating) && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg-terminal/90 backdrop-blur-md"
          >
            <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin" />
              <div className="w-24 h-24 rounded-full border border-primary/20 flex items-center justify-center bg-black shadow-[0_0_50px_rgba(140,120,81,0.2)]">
                <Sparkles className="text-primary w-10 h-10 animate-pulse" />
              </div>
            </div>
            <motion.p
              key={loadingMessage}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="font-serif text-xl italic text-accent text-center px-6 tracking-wide"
            >
              {loadingMessage}
            </motion.p>
            <div className="mt-8 flex gap-2">
              <div className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
              <div className="w-1 h-1 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
              <div className="w-1 h-1 rounded-full bg-primary animate-bounce" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
<footer className="h-8 bg-[#0A0A0F] border-t border-border-subtle px-8 flex items-center justify-between text-[9px] uppercase tracking-[0.2em] text-primary/40 font-mono shrink-0">
  
  {/* 左側 */}
  <div>
    Ink Canvas — Ink Inc. // AI Creation, Human Care.
  </div>

  {/* 右側 */}
  <div className="flex gap-8 items-center">
    <span>SESSION: {new Date().toLocaleDateString('ja-JP')}</span>

    <a
      href="https://inkinc-hp.vercel.app/"
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-2 text-primary/50 hover:text-primary transition-all"
    >
      <span className="opacity-60 group-hover:opacity-100">
  JOIN INK INC. — LIVER PROGRAM
      </span>

      {/* 小さい光るドット */}
      <span className="w-1.5 h-1.5 rounded-full bg-primary opacity-50 group-hover:opacity-100 group-hover:shadow-[0_0_8px_rgba(140,120,81,0.6)] transition-all" />
    </a>
  </div>
</footer>
    </div>
  );
}
