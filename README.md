# pixellift

`pixellift`는 로컬에 클론해둔 `Real-ESRGAN`을 그대로 활용해 이미지 업스케일링을 서빙하는 프로젝트다.  
현재 구성은 `FastAPI` 기반 백엔드와 정적 프론트엔드 UI로 이루어져 있고, 업로드한 이미지를 `Real-ESRGAN` 모델로 복원한 뒤 결과 이미지를 바로 내려받을 수 있다.

## 프로젝트 개요

이 프로젝트의 목적은 두 가지다.

1. 이미 내려받아 둔 `Real-ESRGAN` 모델과 가중치를 다시 구성하지 않고 그대로 재사용한다.
2. 추론 스크립트를 직접 매번 실행하지 않아도 되도록 웹 기반 업로드/서빙 흐름을 만든다.

즉, `pixellift`는 `Real-ESRGAN` 자체를 다시 구현한 것이 아니라, 이미 준비된 모델 환경을 서비스 형태로 감싼 래퍼에 가깝다.

## 현재 제공 기능

- 이미지 파일 업로드
- 모델 선택 후 업스케일 요청
- 배율(`outscale`) 설정
- 타일 크기(`tile`) 설정
- `realesr-general-x4v3`용 디노이즈 강도 설정
- FP32 추론 옵션 설정
- 업스케일 결과 미리보기
- 결과 이미지 다운로드
- 로컬 `Real-ESRGAN` 가중치 자동 재사용
- 필요한 경우 일부 가중치 자동 다운로드

## 기술 스택

- 백엔드: `FastAPI`, `Uvicorn`
- 프론트엔드: 순수 `HTML`, `CSS`, `JavaScript`
- 추론 엔진: 로컬 `Real-ESRGAN`
- 런타임 환경: `Real-ESRGAN/.venv` 재사용

## 디렉터리 구조

```text
ESRGANP/
├─ Backend/
│  ├─ main.py
│  ├─ realesrgan_service.py
│  ├─ requirements.txt
│  ├─ start.ps1
│  └─ runtime/
│     ├─ uploads/
│     └─ results/
├─ Frontend/
│  ├─ index.html
│  ├─ app.js
│  └─ styles.css
└─ Real-ESRGAN/
   ├─ .venv/
   ├─ weights/
   └─ ...
```

## 동작 방식

흐름은 아래처럼 이어진다.

1. 사용자가 웹 UI에서 이미지를 업로드한다.
2. 프론트엔드가 `POST /api/upscale`로 폼 데이터를 전송한다.
3. 백엔드는 업로드 이미지를 `Backend/runtime/uploads`에 임시 저장한다.
4. `realesrgan_service.py`가 선택된 모델을 기준으로 `RealESRGANer`를 준비한다.
5. 가중치가 없으면 `Real-ESRGAN/weights` 아래로 자동 다운로드한다.
6. 추론 결과 이미지를 `Backend/runtime/results`에 저장한다.
7. 프론트엔드가 결과 URL을 받아 미리보기와 다운로드 링크를 표시한다.

같은 옵션으로 반복 요청할 경우 모델 로더를 다시 만들지 않도록 업샘플러를 캐시하도록 구현되어 있다.

## 사전 준비

아래 조건이 충족되어 있어야 한다.

- `Real-ESRGAN` 레포지토리가 이미 로컬에 클론되어 있을 것
- `Real-ESRGAN/.venv` 가상환경이 존재할 것
- `Real-ESRGAN` 기본 의존성 설치가 끝나 있을 것
- Python에서 `torch`, `cv2`, `basicsr`, `realesrgan` import가 가능할 것

이미 현재 워크스페이스는 이 구조를 기준으로 작성되어 있다.

## 빠른 실행

PowerShell에서 아래 명령으로 실행하면 된다.

```powershell
Set-Location C:\Users\SCH\Documents\ESRGANP\Backend
.\start.ps1
```

실행 후 브라우저에서 아래 주소로 접속한다.

```text
http://127.0.0.1:8000
```

## `start.ps1`이 하는 일

`Backend/start.ps1`은 아래 순서로 동작한다.

1. `Real-ESRGAN/.venv/Scripts/python.exe` 존재 여부 확인
2. `fastapi`, `uvicorn`, `multipart` 설치 여부 확인
3. 없으면 `Backend/requirements.txt` 기준으로 백엔드 의존성 설치
4. `uvicorn main:app` 실행

즉, 백엔드를 위한 별도 가상환경을 만들지 않고, 기존 `Real-ESRGAN` 가상환경에 서버 런타임만 추가해서 사용하는 방식이다.

## 수동 실행 방법

원하면 스크립트를 거치지 않고 직접 실행할 수도 있다.

```powershell
Set-Location C:\Users\SCH\Documents\ESRGANP\Real-ESRGAN
.\.venv\Scripts\python.exe -m pip install -r ..\Backend\requirements.txt
.\.venv\Scripts\python.exe -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload --app-dir ..\Backend
```

## 지원 API

현재 제공되는 엔드포인트는 아래와 같다.

- `GET /`
- `GET /api/health`
- `GET /api/models`
- `POST /api/upscale`
- `GET /generated/{filename}`

## API 상세

### `GET /api/health`

서버 상태를 확인한다.

응답 예시:

```json
{
  "status": "ok"
}
```

### `GET /api/models`

현재 선택 가능한 모델 목록을 반환한다.

응답 예시:

```json
{
  "models": [
    {
      "id": "RealESRGAN_x4plus",
      "name": "General x4 Plus",
      "netscale": 4
    }
  ]
}
```

### `POST /api/upscale`

이미지를 업로드하고 업스케일링을 요청한다.

폼 필드는 아래와 같다.

- `file`: 업로드할 이미지 파일
- `model_name`: 사용할 모델 ID
- `outscale`: 최종 확대 배율
- `tile`: 타일 크기, `0`이면 타일링 비활성화
- `denoise_strength`: `realesr-general-x4v3`에서만 의미 있음
- `fp32`: `true`면 half precision 비활성화

응답 예시:

```json
{
  "filename": "sample-ab12cd34.jpg",
  "result_url": "/generated/sample-ab12cd34.jpg",
  "model_name": "RealESRGAN_x4plus",
  "outscale": 2.0,
  "tile": 0,
  "width": 358,
  "height": 358
}
```

## API 호출 예시

PowerShell 또는 터미널에서 `curl`로 테스트할 수 있다.

```powershell
curl.exe -X POST http://127.0.0.1:8000/api/upscale `
  -F "file=@C:\path\to\image.jpg" `
  -F "model_name=RealESRGAN_x4plus" `
  -F "outscale=2" `
  -F "tile=0" `
  -F "denoise_strength=0.5" `
  -F "fp32=false"
```

## 현재 지원 모델

백엔드에는 아래 모델들이 연결되어 있다.

- `RealESRGAN_x4plus`
- `RealESRNet_x4plus`
- `RealESRGAN_x4plus_anime_6B`
- `RealESRGAN_x2plus`
- `realesr-animevideov3`
- `realesr-general-x4v3`

모델에 따라 내부 네트워크 구조와 기본 배율이 다르다.

- 일반 복원 계열: `RealESRGAN_x4plus`, `RealESRNet_x4plus`
- 애니메이션 이미지 계열: `RealESRGAN_x4plus_anime_6B`
- x2 업스케일 계열: `RealESRGAN_x2plus`
- 애니메이션 비디오 계열: `realesr-animevideov3`
- 경량 일반 복원 계열: `realesr-general-x4v3`

## 파일 저장 위치

런타임 중 생성되는 파일은 아래 경로를 사용한다.

- 업로드 원본: `Backend/runtime/uploads`
- 결과 이미지: `Backend/runtime/results`
- 모델 가중치: `Real-ESRGAN/weights`

결과 이미지는 `/generated/...` 경로로 정적 서빙된다.

## 프론트엔드 구성

프론트엔드는 별도 빌드 도구 없이 동작한다.

- `Frontend/index.html`: 화면 구조
- `Frontend/app.js`: 업로드 요청, 상태 표시, 결과 렌더링
- `Frontend/styles.css`: UI 스타일

현재 UI에서 할 수 있는 일은 아래와 같다.

- 업로드할 이미지 선택
- 모델 선택
- 배율 입력
- 타일 크기 입력
- 디노이즈 강도 입력
- FP32 체크
- 원본/결과 이미지 비교
- 결과 다운로드

## 백엔드 구성

### `Backend/main.py`

FastAPI 앱 엔트리포인트다.

- 정적 파일 마운트
- 모델 목록 API 제공
- 업로드 API 제공
- 루트 페이지에서 프론트엔드 반환

### `Backend/realesrgan_service.py`

실제 업스케일링 로직을 담당한다.

- 모델 ID별 스펙 관리
- 가중치 존재 여부 확인
- 필요 시 자동 다운로드
- `RealESRGANer` 생성 및 캐시
- OpenCV 기반 입력/출력 처리

## 성능 관련 메모

첫 요청이 느릴 수 있는 이유는 아래와 같다.

- 모델 가중치 로딩
- CUDA 초기화
- 처음 사용하는 모델의 업샘플러 생성

메모리 부족 문제가 있으면 아래 순서로 조정하는 편이 좋다.

1. `tile` 값을 `0`에서 `256`, `128` 같은 값으로 바꾼다.
2. 필요하면 `fp32`를 끄고 기본 half precision을 사용한다.
3. 입력 이미지를 너무 큰 해상도로 한 번에 넣지 않는다.

## 주의사항

- 현재 구현은 단일 프로세스 기준으로 단순하게 구성되어 있다.
- 추론 시 내부 락을 사용하므로 동시 요청을 대량 처리하는 구조는 아니다.
- 업로드 원본 파일 정리 정책은 아직 따로 넣지 않았다.
- 인증, 사용자 관리, 작업 큐, 비동기 배치 처리 같은 운영 기능은 아직 없다.
- GFPGAN 기반 얼굴 복원 옵션은 아직 API에 연결하지 않았다.

## 확인된 동작

현재 아래 항목은 실제로 확인된 상태다.

- 서버 기동
- `GET /api/health` 응답
- `GET /api/models` 응답
- 샘플 이미지 업로드 후 `POST /api/upscale` 성공
- 결과 파일 생성 및 정적 경로 반환

## 트러블슈팅

### 1. 서버가 바로 실행되지 않을 때

`Real-ESRGAN/.venv`가 실제로 존재하는지 먼저 확인한다.

```powershell
Test-Path C:\Users\SCH\Documents\ESRGANP\Real-ESRGAN\.venv\Scripts\python.exe
```

### 2. `ModuleNotFoundError`가 발생할 때

백엔드 의존성이 설치되지 않았을 수 있다.

```powershell
Set-Location C:\Users\SCH\Documents\ESRGANP\Real-ESRGAN
.\.venv\Scripts\python.exe -m pip install -r ..\Backend\requirements.txt
```

### 3. GPU 메모리 부족 오류가 날 때

- `tile` 값을 더 작은 값으로 설정
- 더 작은 이미지로 먼저 확인
- 필요하면 CPU 또는 FP32 설정 조정

### 4. 결과가 너무 오래 걸릴 때

첫 요청인지, 큰 해상도 이미지인지, 처음 쓰는 모델인지 확인하는 편이 좋다.  
특히 첫 요청은 모델 로드 때문에 후속 요청보다 오래 걸릴 수 있다.

## 다음 확장 후보

현재 구조에서 이어서 붙이기 좋은 작업은 아래와 같다.

- 업로드 원본 자동 정리 스케줄
- 요청 이력 저장
- 진행 상태 표시
- 작업 큐 분리
- 비동기 추론 처리
- 배치 업로드
- 얼굴 복원 옵션 추가
- Docker 환경 정리
- 프론트 문구 한국어 완전 전환

## 라이선스 및 원본 프로젝트

업스케일링 핵심 모델은 `Real-ESRGAN` 프로젝트를 기반으로 한다.  
모델과 원본 레포지토리의 라이선스 및 사용 조건은 `Real-ESRGAN` 쪽 문서를 함께 확인하는 것이 좋다.
