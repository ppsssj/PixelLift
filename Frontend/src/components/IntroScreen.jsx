import { useMemo, useRef, useState } from "react";
import showcaseInput from "../assets/showcase-input.jpg";
import showcaseOutput from "../assets/showcase-output.jpg";

const MODEL_DETAILS = {
  "realesr-general-x4v3": {
    tag: "추천",
    summary: "대부분의 로컬 환경에서 가장 먼저 테스트하기 좋은 기본 모델입니다.",
    description:
      "가볍고 반응이 빨라 일반 사진, 저해상도 이미지, 간단한 복원 작업까지 폭넓게 대응합니다. 현재 PC처럼 GPU 사용이 제한적인 환경에서도 가장 현실적인 시작점입니다.",
    bestFor: "CPU 테스트, 빠른 확인, 일반 사진",
    caution: "매우 강한 디테일 복원에서는 더 큰 모델보다 보수적인 결과가 나올 수 있습니다.",
  },
  RealESRGAN_x4plus: {
    tag: "범용",
    summary: "실사 사진과 일반 이미지 복원에 강한 대표 모델입니다.",
    description:
      "복원력과 디테일 보존이 좋아 결과물 완성도는 높지만 모델 자체가 무거워 로컬 환경에 따라 처리 시간이 길어질 수 있습니다.",
    bestFor: "범용 복원, 고품질 결과, 실사 이미지",
    caution: "CPU 환경에서는 처리 속도가 매우 느릴 수 있습니다.",
  },
  RealESRNet_x4plus: {
    tag: "보존형",
    summary: "자연스러운 질감과 구조 보존에 조금 더 초점을 둔 모델입니다.",
    description:
      "복원 과정에서 과도한 sharpening을 줄이고 원본의 형태와 질감을 안정적으로 살리는 편입니다. 배경이나 세부 구조를 차분하게 유지하고 싶을 때 잘 맞습니다.",
    bestFor: "질감 유지, 구조 보존, 자연스러운 결과",
    caution: "장면에 따라 더 공격적인 선명화가 필요하면 다른 모델이 더 맞을 수 있습니다.",
  },
  RealESRGAN_x4plus_anime_6B: {
    tag: "애니",
    summary: "만화와 일러스트처럼 경계가 뚜렷한 이미지에 맞는 모델입니다.",
    description:
      "일러스트, 만화, 애니메이션 캐릭터 이미지처럼 윤곽선과 면 분리가 중요한 작업에서 안정적인 결과를 기대할 수 있습니다.",
    bestFor: "애니 일러스트, 만화, 셀화 기반 이미지",
    caution: "실사 사진에는 다소 부자연스럽게 보일 수 있습니다.",
  },
  RealESRGAN_x2plus: {
    tag: "밸런스",
    summary: "과한 확대 없이 2배 업스케일이 필요할 때 적합합니다.",
    description:
      "출력 크기를 지나치게 키우지 않고 선명함을 개선하는 데 유용합니다. 비교적 원본 비율을 유지하면서 부담 없이 품질을 높일 수 있습니다.",
    bestFor: "2배 확대, 가벼운 개선, 빠른 작업",
    caution: "큰 출력 확대가 목표라면 x4 계열 모델이 더 적합합니다.",
  },
  "realesr-animevideov3": {
    tag: "비디오",
    summary: "단일 이미지보다 애니메이션 프레임 계열에 맞춘 모델입니다.",
    description:
      "연속된 프레임 기반 콘텐츠에 맞춰진 모델이라, 애니메이션 장면이나 영상 캡처 같은 작업에서 더 자연스러운 흐름을 기대할 수 있습니다.",
    bestFor: "애니메이션 영상, 프레임 기반 복원",
    caution: "일반 사진 단일 업로드에는 다른 범용 모델이 더 잘 맞는 경우가 많습니다.",
  },
};

function IntroCard({ displayName, isActive, model, onSelect }) {
  const detail = MODEL_DETAILS[model.id] ?? {
    tag: "모델",
    summary: "현재 로컬 환경에서 사용할 수 있는 복원 모델입니다.",
  };

  return (
    <article className={`intro-card${isActive ? " is-active" : ""}`}>
      <div className="intro-card-head">
        <span className="intro-card-tag">{detail.tag}</span>
        <h3>{displayName}</h3>
      </div>
      <p className="intro-card-kicker">{model.id}</p>
      <p className="intro-card-copy">{detail.summary}</p>
      <button type="button" className="intro-card-button" onClick={() => onSelect(model.id)}>
        모델 설명 보기
      </button>
    </article>
  );
}

function ModelDetailPanel({ displayName, modelId }) {
  const detail = MODEL_DETAILS[modelId];

  if (!detail) {
    return null;
  }

  return (
    <section className="intro-detail-panel">
      <div className="intro-detail-head">
        <div>
          <span className="intro-card-tag">{detail.tag}</span>
          <h3>{displayName}</h3>
          <p className="intro-detail-id">{modelId}</p>
        </div>
        <p>{detail.bestFor}</p>
      </div>
      <div className="intro-detail-grid">
        <div>
          <h4>모델 설명</h4>
          <p>{detail.description}</p>
        </div>
        <div>
          <h4>추천 상황</h4>
          <p>{detail.bestFor}</p>
        </div>
        <div>
          <h4>주의 사항</h4>
          <p>{detail.caution}</p>
        </div>
      </div>
    </section>
  );
}

function IntroScreen({ isReady, models, onStart, status }) {
  const detailRef = useRef(null);
  const [selectedModelId, setSelectedModelId] = useState("realesr-general-x4v3");

  const modelMap = useMemo(
    () =>
      Object.fromEntries(
        models.map((model) => [
          model.id,
          {
            id: model.id,
            displayName: model.name,
          },
        ]),
      ),
    [models],
  );

  const selectedDisplayName = modelMap[selectedModelId]?.displayName ?? selectedModelId;

  function handleSelectModel(modelId) {
    setSelectedModelId(modelId);

    window.requestAnimationFrame(() => {
      if (!detailRef.current) {
        return;
      }

      const rect = detailRef.current.getBoundingClientRect();
      const absoluteTop = window.scrollY + rect.top;
      const targetTop = absoluteTop - window.innerHeight / 2 + rect.height / 2;

      window.scrollTo({
        top: Math.max(targetTop, 0),
        behavior: "smooth",
      });
    });
  }

  return (
    <>
      <header className="intro-topbar">
        <div className="intro-topbar-inner">
          <strong>pixellift</strong>
          <nav>
            <a href="#intro-models">모델</a>
            <a href="#intro-benefits">특징</a>
            <a href="https://github.com/xinntao/Real-ESRGAN" rel="noreferrer" target="_blank">
              문서
            </a>
          </nav>
          <div className="intro-topbar-actions">
            <button type="button" className="topbar-cta" onClick={onStart} disabled={!isReady}>
              시작하기
            </button>
          </div>
        </div>
      </header>

      <main className="intro-shell">
        <section className="intro-hero">
          <span className="intro-kicker">LOCAL UPSCALING WORKSPACE</span>
          <h1>pixellift</h1>
          <p className="intro-subtitle">로컬 Real-ESRGAN 이미지 업스케일링</p>
          <p className="intro-copy">
            pixellift는 로컬 하드웨어에서 직접 이미지를 업스케일링할 수 있도록 정리한 작업 공간입니다.
            먼저 모델별 특성을 확인하고, 현재 PC 환경에 맞는 설정으로 자연스럽게 작업 화면으로 넘어갈 수 있습니다.
          </p>
          <div className="intro-actions">
            <button type="button" className="intro-start-button" onClick={onStart} disabled={!isReady}>
              {isReady ? "작업 공간 시작" : "모델 불러오는 중..."}
            </button>
            <button type="button" className="intro-secondary-button">사용 가이드</button>
          </div>
        </section>

        <section className="intro-banner">
          <span>i</span>
          <p>
            {status.tone === "error"
              ? status.message
              : "고성능 GPU가 없는 PC라면 먼저 `realesr-general-x4v3` 모델로 테스트하는 것을 권장합니다."}
          </p>
        </section>

        <section className="intro-models" id="intro-models">
          <div className="intro-section-head">
            <div>
              <h2>지원 모델</h2>
              <p>모델 설명 보기를 눌러 각 모델의 용도와 주의 사항을 확인한 뒤 작업을 시작할 수 있습니다.</p>
            </div>
            <span className="intro-chip">Architecture: Real-ESRGAN</span>
          </div>
          <div className="intro-grid">
            {models.map((model) => (
              <IntroCard
                key={model.id}
                displayName={model.name}
                isActive={selectedModelId === model.id}
                model={model}
                onSelect={handleSelectModel}
              />
            ))}
          </div>
          <div ref={detailRef}>
            <ModelDetailPanel displayName={selectedDisplayName} modelId={selectedModelId} />
          </div>
        </section>

        <section className="intro-benefits" id="intro-benefits">
          <article className="intro-feature intro-feature-image">
            <div className="intro-showcase-grid">
              <figure className="intro-showcase-card">
                <div className="intro-showcase-label">Input</div>
                <img src={showcaseInput} alt="업스케일 전 입력 이미지" className="intro-showcase-image" />
              </figure>
              <figure className="intro-showcase-card intro-showcase-card-output">
                <div className="intro-showcase-label">Output</div>
                <img src={showcaseOutput} alt="업스케일 후 출력 이미지" className="intro-showcase-image" />
              </figure>
            </div>
            <div className="intro-feature-overlay">
              <div>
                <h3>선명한 결과</h3>
                <p>실제 `0014.jpg` 입력 이미지와 `realesr-general-x4v3` 모델 출력 이미지를 그대로 사용한 예시입니다.</p>
              </div>
              <p>로컬에서 직접 추론한 결과를 바로 화면에 반영해 품질 차이를 눈으로 확인할 수 있습니다.</p>
            </div>
          </article>

          <div className="intro-feature-stack">
            <article className="intro-feature intro-feature-copy">
              <strong>로컬 우선</strong>
              <p>이미지가 외부 서버로 나가지 않기 때문에 작업 데이터를 로컬 환경 안에서 안전하게 유지할 수 있습니다.</p>
            </article>
            <article className="intro-feature intro-feature-dark">
              <strong>바로 작업 시작</strong>
              <p>모델 설명을 확인한 뒤 곧바로 업로드, 결과 확인, 다운로드까지 하나의 흐름으로 이어집니다.</p>
            </article>
          </div>
        </section>

        <footer className="intro-footer">
          <strong>pixellift</strong>
          <p>© 2026 Pixellift AI. Precision Upscaling.</p>
          <div>
            <a href="#intro-models">모델</a>
            <a href="#intro-benefits">특징</a>
            <a href="https://github.com/xinntao/Real-ESRGAN" rel="noreferrer" target="_blank">
              GitHub
            </a>
          </div>
        </footer>
      </main>
    </>
  );
}

export default IntroScreen;
