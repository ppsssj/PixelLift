function PreviewPanel({ activeView, isSubmitting, onViewChange, originalPreviewUrl, result, selectedFile, statusMessage }) {
  const previewSrc = activeView === "upscaled" ? result?.result_url : originalPreviewUrl;
  const emptyMessage =
    activeView === "upscaled"
      ? "업스케일 결과가 여기에 표시됩니다."
      : "이미지를 업로드하면 이 화면에서 원본을 바로 확인할 수 있습니다.";
  const resolution = result ? `${result.width} x ${result.height}` : selectedFile ? "불러옴" : "0 x 0";

  return (
    <section className="workspace-stage">
      <div className="workspace-stage-toolbar">
        <div className="workspace-stage-tabs">
          <button type="button" className={activeView === "original" ? "is-active" : ""} onClick={() => onViewChange("original")}>
            원본
          </button>
          <button type="button" className={activeView === "upscaled" ? "is-active" : ""} onClick={() => onViewChange("upscaled")}>
            업스케일
          </button>
        </div>
      </div>

      <div className="workspace-canvas-shell">
        <div className="workspace-canvas">
          {isSubmitting && (
            <div className="workspace-loading-overlay" aria-live="polite" aria-busy="true">
              <div className="workspace-loading-panel">
                <div className="workspace-loading-spinner" />
                <strong>업스케일링 진행 중</strong>
                <p>{statusMessage || "이미지를 처리하고 있습니다. 잠시만 기다려주세요."}</p>
              </div>
            </div>
          )}

          {!previewSrc && (
            <div className="workspace-empty-state">
              <div className="workspace-empty-icon">IMG</div>
              <h2>아직 업로드한 이미지가 없습니다</h2>
              <p>{emptyMessage}</p>
              <div className="workspace-empty-dots">
                <span />
                <span />
                <span />
              </div>
            </div>
          )}

          {previewSrc && <img src={previewSrc} alt="Preview" className="workspace-preview-image" />}

          <div className="workspace-canvas-meta">
            <div className="workspace-canvas-stats">
              <span>해상도: {resolution}</span>
              <span className="dot" />
              <span>배율: {result ? `${result.outscale}x` : "--"}</span>
            </div>
            <div className="workspace-canvas-actions">
              <button type="button" disabled>
                +
              </button>
              <button type="button" disabled>
                -
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default PreviewPanel;
