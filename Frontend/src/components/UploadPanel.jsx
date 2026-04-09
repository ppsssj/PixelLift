function UploadPanel({
  denoiseStrength,
  fileName,
  fp32,
  inputRef,
  isDragging,
  isSubmitting,
  models,
  onDenoiseStrengthChange,
  onDragLeave,
  onDragOver,
  onDrop,
  onFileChange,
  onFp32Change,
  onOutscaleChange,
  onSelectedModelChange,
  onSubmit,
  onTileChange,
  outscale,
  selectedModel,
  status,
  tile,
}) {
  return (
    <aside className="workspace-sidebar">
      <form onSubmit={onSubmit}>
        <section className="workspace-sidebar-section">
          <h3>INPUT</h3>
          <label className="workspace-dropzone" data-dragging={isDragging ? "true" : "false"}>
            <div className="workspace-dropzone-copy" onDragEnter={onDragOver} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
              <div className="workspace-dropzone-icon">IMG</div>
              <p>클릭하거나 파일을 드래그해서 업로드</p>
              <span>{fileName || "JPG, PNG, WebP · 최대 10MB"}</span>
            </div>
            <input ref={inputRef} id="image-input" name="file" type="file" accept="image/*" onChange={onFileChange} required />
          </label>
        </section>

        <section className="workspace-sidebar-section">
          <h3>CONFIGURATION</h3>

          <label className="workspace-field">
            <span>모델 선택</span>
            <div className="workspace-select-wrap">
              <select value={selectedModel} onChange={(event) => onSelectedModelChange(event.target.value)} name="model_name">
                {models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
            </div>
          </label>

          <label className="workspace-field workspace-range-field">
            <div className="workspace-field-head">
              <span>확대 배율</span>
              <strong>{Number(outscale).toFixed(1)}x</strong>
            </div>
            <input name="outscale" type="range" min="1" max="4" step="0.5" value={outscale} onChange={(event) => onOutscaleChange(event.target.value)} />
          </label>

          <label className="workspace-field">
            <span>타일</span>
            <input name="tile" type="number" min="0" step="32" value={tile} onChange={(event) => onTileChange(event.target.value)} />
          </label>

          <label className="workspace-field workspace-range-field">
            <div className="workspace-field-head">
              <span>노이즈 보정</span>
              <strong>{Number(denoiseStrength).toFixed(2)}</strong>
            </div>
            <input
              name="denoise_strength"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={denoiseStrength}
              onChange={(event) => onDenoiseStrengthChange(event.target.value)}
            />
          </label>

          <label className="workspace-toggle-row">
            <span>FP32 모드</span>
            <span className={`workspace-toggle${fp32 ? " is-on" : ""}`}>
              <input type="checkbox" checked={fp32} onChange={(event) => onFp32Change(event.target.checked)} />
              <i />
            </span>
          </label>
        </section>

        <section className="workspace-sidebar-footer">
          <div className="workspace-engine-status">
            <div className="workspace-engine-indicator">
              <span className={`status-dot${status.tone === "error" ? " is-error" : ""}`} />
              <small>엔진 상태</small>
            </div>
            <strong>{status.tone === "error" ? "오류" : isSubmitting ? "작업 중" : "준비됨"}</strong>
          </div>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "처리 중..." : "이미지 처리"}
          </button>

          <p className="workspace-status-text" data-tone={status.tone} aria-live="polite">
            {status.message}
          </p>
        </section>
      </form>
    </aside>
  );
}

export default UploadPanel;
