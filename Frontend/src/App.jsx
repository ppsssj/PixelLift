import { useEffect, useRef, useState } from "react";
import Hero from "./components/Hero";
import IntroScreen from "./components/IntroScreen";
import PreviewPanel from "./components/PreviewPanel";
import UploadPanel from "./components/UploadPanel";

const DEFAULT_STATUS = {
  tone: "neutral",
  message: "이미지를 고른 뒤 업스케일 작업을 시작해보세요.",
};

const HISTORY_STORAGE_KEY = "pixellift-history";

function readStoredHistory() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const saved = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function readInitialView() {
  if (typeof window === "undefined") {
    return false;
  }

  const params = new URLSearchParams(window.location.search);
  return params.get("view") === "workspace";
}

function App() {
  const inputRef = useRef(null);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState("realesr-general-x4v3");
  const [outscale, setOutscale] = useState("2");
  const [tile, setTile] = useState("0");
  const [denoiseStrength, setDenoiseStrength] = useState("0.5");
  const [fp32, setFp32] = useState(false);
  const [status, setStatus] = useState({
    tone: "neutral",
    message: "사용 가능한 모델을 불러오는 중입니다...",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hasStarted, setHasStarted] = useState(readInitialView);
  const [activeView, setActiveView] = useState("original");
  const [selectedFile, setSelectedFile] = useState(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState("");
  const [result, setResult] = useState(null);
  const [historyItems, setHistoryItems] = useState(readStoredHistory);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadModels() {
      try {
        const response = await fetch("/api/models");
        if (!response.ok) {
          throw new Error("사용 가능한 모델 목록을 불러오지 못했습니다.");
        }

        const payload = await response.json();
        if (ignore) {
          return;
        }

        setModels(payload.models);
        const preferred = payload.models.find((model) => model.id === "realesr-general-x4v3");
        setSelectedModel(preferred?.id ?? payload.models[0]?.id ?? "");
        setStatus(DEFAULT_STATUS);
      } catch (error) {
        if (!ignore) {
          setStatus({
            tone: "error",
            message: error.message || "모델 정보를 불러오지 못했습니다.",
          });
        }
      }
    }

    loadModels();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedFile) {
      setOriginalPreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setOriginalPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      window.localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(historyItems));
    } catch {
      // localStorage access can fail in some environments, so keep history in memory.
    }
  }, [historyItems]);

  function handleFileSelection(file) {
    if (!file) {
      setSelectedFile(null);
      setResult(null);
      setStatus({
        tone: "neutral",
        message: "업로드할 이미지를 기다리는 중입니다.",
      });
      return;
    }

    if (!file.type.startsWith("image/")) {
      setStatus({
        tone: "error",
        message: "이미지 파일만 업로드할 수 있습니다.",
      });
      return;
    }

    setSelectedFile(file);
    setResult(null);
    setActiveView("original");
    setHistoryOpen(false);
    setStatus({
      tone: "neutral",
      message: `${file.name} 파일이 선택됐습니다. 이제 업스케일을 시작할 수 있습니다.`,
    });
  }

  function handleInputChange(event) {
    const [file] = event.target.files ?? [];
    handleFileSelection(file);
  }

  function handleDragOver(event) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(event) {
    event.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    const [file] = event.dataTransfer.files ?? [];

    if (file && inputRef.current) {
      const transfer = new DataTransfer();
      transfer.items.add(file);
      inputRef.current.files = transfer.files;
    }

    handleFileSelection(file);
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedFile) {
      setStatus({
        tone: "error",
        message: "업스케일 전에 이미지를 먼저 선택해주세요.",
      });
      return;
    }

    const payload = new FormData();
    payload.append("file", selectedFile);
    payload.append("model_name", selectedModel);
    payload.append("outscale", outscale);
    payload.append("tile", tile);
    payload.append("denoise_strength", denoiseStrength);
    payload.append("fp32", fp32 ? "true" : "false");

    setIsSubmitting(true);
    setStatus({
      tone: "working",
      message: "이미지를 업스케일하는 중입니다. 첫 요청은 모델 로드 때문에 조금 더 걸릴 수 있습니다.",
    });

    try {
      const response = await fetch("/api/upscale", {
        method: "POST",
        body: payload,
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "업스케일 요청에 실패했습니다.");
      }

      const historyItem = {
        ...data,
        id: `${data.filename}-${Date.now()}`,
        sourceName: selectedFile.name,
        createdAt: new Date().toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      setResult(historyItem);
      setHistoryItems((prev) => [historyItem, ...prev].slice(0, 12));
      setActiveView("upscaled");
      setHistoryOpen(false);
      setStatus({
        tone: "success",
        message: `처리가 완료됐습니다. 결과 크기: ${data.width} x ${data.height}`,
      });
    } catch (error) {
      setResult(null);
      setStatus({
        tone: "error",
        message: error.message || "업스케일 처리 중 오류가 발생했습니다.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSelectHistoryItem(item) {
    setSelectedModel(item.model_name);
    setOutscale(String(item.outscale));
    setTile(String(item.tile ?? 0));
    setResult({
      filename: item.filename,
      result_url: item.result_url,
      model_name: item.model_name,
      outscale: item.outscale,
      tile: item.tile,
      width: item.width,
      height: item.height,
    });
    setActiveView("upscaled");
    setHistoryOpen(false);
    setStatus({
      tone: "neutral",
      message: `${item.sourceName} 작업 이력을 불러왔습니다.`,
    });
  }

  return (
    <div className="page-shell">
      {!hasStarted ? (
        <IntroScreen isReady={models.length > 0} models={models} onStart={() => setHasStarted(true)} status={status} />
      ) : (
        <>
          <Hero
            downloadDisabled={!result}
            historyItems={historyItems}
            historyOpen={historyOpen}
            onCloseHistory={() => setHistoryOpen(false)}
            onGoHome={() => {
              setHasStarted(false);
              setHistoryOpen(false);
            }}
            onSelectHistoryItem={handleSelectHistoryItem}
            onToggleHistory={() => setHistoryOpen((prev) => !prev)}
            result={result}
          />
          <main className="workspace" id="workspace">
            <UploadPanel
              denoiseStrength={denoiseStrength}
              fileName={selectedFile?.name}
              fp32={fp32}
              inputRef={inputRef}
              isDragging={isDragging}
              isSubmitting={isSubmitting}
              models={models}
              onDenoiseStrengthChange={setDenoiseStrength}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onFileChange={handleInputChange}
              onFp32Change={setFp32}
              onOutscaleChange={setOutscale}
              onSelectedModelChange={setSelectedModel}
              onSubmit={handleSubmit}
              onTileChange={setTile}
              outscale={outscale}
              selectedModel={selectedModel}
              status={status}
              tile={tile}
            />
            <PreviewPanel
              activeView={activeView}
              isSubmitting={isSubmitting}
              onViewChange={setActiveView}
              originalPreviewUrl={originalPreviewUrl}
              result={result}
              selectedFile={selectedFile}
              statusMessage={status.message}
            />
          </main>
        </>
      )}
    </div>
  );
}

export default App;
