from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from threading import Lock
from typing import Any
from uuid import uuid4
import sys

import cv2
import torch


APP_DIR = Path(__file__).resolve().parent
PROJECT_DIR = APP_DIR.parent
REAL_ESRGAN_DIR = PROJECT_DIR / "Real-ESRGAN"

if str(REAL_ESRGAN_DIR) not in sys.path:
    sys.path.insert(0, str(REAL_ESRGAN_DIR))

from basicsr.archs.rrdbnet_arch import RRDBNet
from basicsr.utils.download_util import load_file_from_url
from realesrgan import RealESRGANer
from realesrgan.archs.srvgg_arch import SRVGGNetCompact


@dataclass(frozen=True)
class ModelSpec:
    display_name: str
    netscale: int
    family: str
    urls: tuple[str, ...]


MODEL_SPECS: dict[str, ModelSpec] = {
    "RealESRGAN_x4plus": ModelSpec(
        display_name="General x4 Plus",
        netscale=4,
        family="rrdb",
        urls=("https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth",),
    ),
    "RealESRNet_x4plus": ModelSpec(
        display_name="General x4 Net",
        netscale=4,
        family="rrdb",
        urls=("https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.1/RealESRNet_x4plus.pth",),
    ),
    "RealESRGAN_x4plus_anime_6B": ModelSpec(
        display_name="Anime x4 6B",
        netscale=4,
        family="anime_rrdb",
        urls=("https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.2.4/RealESRGAN_x4plus_anime_6B.pth",),
    ),
    "RealESRGAN_x2plus": ModelSpec(
        display_name="General x2 Plus",
        netscale=2,
        family="rrdb_x2",
        urls=("https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.1/RealESRGAN_x2plus.pth",),
    ),
    "realesr-animevideov3": ModelSpec(
        display_name="Anime Video v3",
        netscale=4,
        family="srvgg_video",
        urls=("https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesr-animevideov3.pth",),
    ),
    "realesr-general-x4v3": ModelSpec(
        display_name="General x4 v3",
        netscale=4,
        family="srvgg_general",
        urls=(
            "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesr-general-wdn-x4v3.pth",
            "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesr-general-x4v3.pth",
        ),
    ),
}


class RealESRGANService:
    def __init__(self) -> None:
        self.weights_dir = REAL_ESRGAN_DIR / "weights"
        self._upsampler_cache: dict[tuple[Any, ...], RealESRGANer] = {}
        self._cache_lock = Lock()
        self._inference_lock = Lock()

    def get_models(self) -> list[dict[str, Any]]:
        return [
            {
                "id": model_id,
                "name": spec.display_name,
                "netscale": spec.netscale,
            }
            for model_id, spec in MODEL_SPECS.items()
        ]

    def upscale(
        self,
        input_path: Path,
        output_dir: Path,
        model_name: str,
        outscale: float,
        tile: int,
        denoise_strength: float,
        fp32: bool,
        gpu_id: int | None = None,
    ) -> dict[str, Any]:
        if model_name not in MODEL_SPECS:
            raise ValueError(f"Unsupported model: {model_name}")

        image = cv2.imread(str(input_path), cv2.IMREAD_UNCHANGED)
        if image is None:
            raise ValueError("The uploaded file could not be decoded as an image.")

        image_mode = None
        if len(image.shape) == 3 and image.shape[2] == 4:
            image_mode = "RGBA"

        upsampler = self._get_upsampler(
            model_name=model_name,
            tile=tile,
            denoise_strength=denoise_strength,
            fp32=fp32,
            gpu_id=gpu_id,
        )

        with self._inference_lock:
            output, _ = upsampler.enhance(image, outscale=outscale)

        output_dir.mkdir(parents=True, exist_ok=True)
        extension = input_path.suffix.lower().lstrip(".") or "png"
        if image_mode == "RGBA":
            extension = "png"

        output_name = f"{input_path.stem}-{uuid4().hex[:8]}.{extension}"
        output_path = output_dir / output_name
        if not cv2.imwrite(str(output_path), output):
            raise RuntimeError("Failed to write the upscaled output image.")

        return {
            "output_path": output_path,
            "output_name": output_name,
            "width": int(output.shape[1]),
            "height": int(output.shape[0]),
            "model_name": model_name,
            "outscale": outscale,
            "tile": tile,
        }

    def _get_upsampler(
        self,
        model_name: str,
        tile: int,
        denoise_strength: float,
        fp32: bool,
        gpu_id: int | None,
    ) -> RealESRGANer:
        cache_key = (
            model_name,
            tile,
            round(denoise_strength, 3),
            fp32,
            gpu_id,
        )

        with self._cache_lock:
            if cache_key in self._upsampler_cache:
                return self._upsampler_cache[cache_key]

            model, model_path, dni_weight, netscale = self._build_model_bundle(model_name, denoise_strength)
            upsampler = RealESRGANer(
                scale=netscale,
                model_path=model_path,
                dni_weight=dni_weight,
                model=model,
                tile=tile,
                tile_pad=10,
                pre_pad=0,
                half=torch.cuda.is_available() and not fp32,
                gpu_id=gpu_id,
            )
            self._upsampler_cache[cache_key] = upsampler
            return upsampler

    def _build_model_bundle(
        self,
        model_name: str,
        denoise_strength: float,
    ) -> tuple[Any, str | list[str], list[float] | None, int]:
        spec = MODEL_SPECS[model_name]
        model_path = self._ensure_weights(model_name)
        dni_weight = None

        if spec.family == "rrdb":
            model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=4)
        elif spec.family == "anime_rrdb":
            model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=6, num_grow_ch=32, scale=4)
        elif spec.family == "rrdb_x2":
            model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=2)
        elif spec.family == "srvgg_video":
            model = SRVGGNetCompact(
                num_in_ch=3,
                num_out_ch=3,
                num_feat=64,
                num_conv=16,
                upscale=4,
                act_type="prelu",
            )
        elif spec.family == "srvgg_general":
            model = SRVGGNetCompact(
                num_in_ch=3,
                num_out_ch=3,
                num_feat=64,
                num_conv=32,
                upscale=4,
                act_type="prelu",
            )
            if denoise_strength != 1:
                wdn_model_path = str(self.weights_dir / "realesr-general-wdn-x4v3.pth")
                model_path = [str(self.weights_dir / "realesr-general-x4v3.pth"), wdn_model_path]
                dni_weight = [denoise_strength, 1 - denoise_strength]
        else:
            raise ValueError(f"Unknown model family: {spec.family}")

        return model, model_path, dni_weight, spec.netscale

    def _ensure_weights(self, model_name: str) -> str:
        spec = MODEL_SPECS[model_name]
        self.weights_dir.mkdir(parents=True, exist_ok=True)

        if model_name == "realesr-general-x4v3":
            for url in spec.urls:
                file_name = url.rsplit("/", 1)[-1]
                target = self.weights_dir / file_name
                if not target.exists():
                    load_file_from_url(url=url, model_dir=str(self.weights_dir), progress=True, file_name=file_name)
            return str(self.weights_dir / "realesr-general-x4v3.pth")

        target = self.weights_dir / f"{model_name}.pth"
        if not target.exists():
            load_file_from_url(url=spec.urls[0], model_dir=str(self.weights_dir), progress=True, file_name=target.name)
        return str(target)
