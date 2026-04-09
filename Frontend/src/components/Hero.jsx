import { useEffect, useRef } from "react";
import logoMark from "../assets/pixellift-logo.svg";

function Hero({
  downloadDisabled,
  historyItems,
  historyOpen,
  onCloseHistory,
  onGoHome,
  onSelectHistoryItem,
  onToggleHistory,
  result,
}) {
  const historyRef = useRef(null);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!historyOpen || !historyRef.current) {
        return;
      }

      if (!historyRef.current.contains(event.target)) {
        onCloseHistory();
      }
    }

    document.addEventListener("mousedown", handlePointerDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [historyOpen, onCloseHistory]);

  return (
    <header className="workspace-header">
      <div className="workspace-brand">
        <button type="button" className="workspace-home-button" onClick={onGoHome}>
          <span className="brand-lockup">
            <img src={logoMark} alt="" className="brand-mark" />
            <strong>PixelLift</strong>
          </span>
        </button>
        <nav className="workspace-nav" ref={historyRef}>
          <button type="button" className={`workspace-nav-button${historyOpen ? " is-open" : ""}`} onClick={onToggleHistory}>
            작업 공간
          </button>
          {historyOpen && (
            <div className="workspace-history-popover">
              <div className="workspace-history-head">
                <strong>작업 이력</strong>
                <span>{historyItems.length}개</span>
              </div>
              {historyItems.length === 0 ? (
                <p className="workspace-history-empty">아직 처리한 이미지가 없습니다.</p>
              ) : (
                <div className="workspace-history-list">
                  {historyItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="workspace-history-item"
                      onClick={() => onSelectHistoryItem(item)}
                    >
                      <span className="workspace-history-thumb">
                        {item.result_url ? (
                          <img src={item.result_url} alt="" className="workspace-history-thumb-image" />
                        ) : (
                          <span className="workspace-history-thumb-fallback">IMG</span>
                        )}
                      </span>
                      <span className="workspace-history-copy">
                        <strong>{item.sourceName}</strong>
                        <span>{item.model_name}</span>
                        <small>
                          {item.createdAt} · {item.outscale}x
                        </small>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          <a href="https://github.com/xinntao/Real-ESRGAN" rel="noreferrer" target="_blank">
            문서
          </a>
        </nav>
      </div>

      <div className="workspace-header-actions">
        <a
          className={`workspace-download-button${downloadDisabled ? " is-disabled" : ""}`}
          download={result?.filename}
          href={downloadDisabled ? undefined : result?.result_url}
        >
          결과 다운로드
        </a>
      </div>
    </header>
  );
}

export default Hero;
