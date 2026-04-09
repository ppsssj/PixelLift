from __future__ import annotations

from pathlib import Path
from uuid import uuid4
import mimetypes

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from realesrgan_service import RealESRGANService


APP_DIR = Path(__file__).resolve().parent
PROJECT_DIR = APP_DIR.parent
FRONTEND_DIR = PROJECT_DIR / "Frontend"
RUNTIME_DIR = APP_DIR / "runtime"
UPLOAD_DIR = RUNTIME_DIR / "uploads"
RESULT_DIR = RUNTIME_DIR / "results"


class UpscaleResponse(BaseModel):
    filename: str
    result_url: str
    model_name: str
    outscale: float
    tile: int
    width: int
    height: int


app = FastAPI(title="pixellift", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

service = RealESRGANService()
RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
RESULT_DIR.mkdir(parents=True, exist_ok=True)

app.mount("/generated", StaticFiles(directory=str(RESULT_DIR)), name="generated")
app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIR)), name="assets")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/models")
def get_models() -> dict[str, list[dict[str, object]]]:
    return {"models": service.get_models()}


@app.post("/api/upscale", response_model=UpscaleResponse)
async def upscale(
    file: UploadFile = File(...),
    model_name: str = Form("RealESRGAN_x4plus"),
    outscale: float = Form(4.0),
    tile: int = Form(0),
    denoise_strength: float = Form(0.5),
    fp32: bool = Form(False),
) -> UpscaleResponse:
    if outscale <= 0:
        raise HTTPException(status_code=400, detail="outscale must be greater than 0")
    if tile < 0:
        raise HTTPException(status_code=400, detail="tile must be 0 or greater")
    if not 0 <= denoise_strength <= 1:
        raise HTTPException(status_code=400, detail="denoise_strength must be between 0 and 1")

    suffix = Path(file.filename or "").suffix
    if not suffix:
        guessed = mimetypes.guess_extension(file.content_type or "")
        suffix = guessed or ".png"

    upload_path = UPLOAD_DIR / f"{uuid4().hex}{suffix}"

    try:
        content = await file.read()
        upload_path.write_bytes(content)
        result = service.upscale(
            input_path=upload_path,
            output_dir=RESULT_DIR,
            model_name=model_name,
            outscale=outscale,
            tile=tile,
            denoise_strength=denoise_strength,
            fp32=fp32,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    finally:
        await file.close()

    return UpscaleResponse(
        filename=result["output_name"],
        result_url=f"/generated/{result['output_name']}",
        model_name=result["model_name"],
        outscale=result["outscale"],
        tile=result["tile"],
        width=result["width"],
        height=result["height"],
    )


@app.get("/")
def index() -> FileResponse:
    return FileResponse(FRONTEND_DIR / "index.html")
