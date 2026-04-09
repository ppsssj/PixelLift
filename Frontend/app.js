const form = document.querySelector("#upscale-form");
const imageInput = document.querySelector("#image-input");
const modelSelect = document.querySelector("#model-select");
const outscaleInput = document.querySelector("#outscale-input");
const tileInput = document.querySelector("#tile-input");
const denoiseInput = document.querySelector("#denoise-input");
const fp32Input = document.querySelector("#fp32-input");
const statusBox = document.querySelector("#status-box");
const originalPreview = document.querySelector("#original-preview");
const resultPreview = document.querySelector("#result-preview");
const downloadLink = document.querySelector("#download-link");
const submitButton = document.querySelector("#submit-button");

let originalPreviewUrl = "";

function setStatus(message, tone = "neutral") {
  statusBox.textContent = message;
  statusBox.dataset.tone = tone;
}

function resetResultPreview() {
  resultPreview.removeAttribute("src");
  downloadLink.hidden = true;
  downloadLink.removeAttribute("href");
  downloadLink.removeAttribute("download");
}

async function loadModels() {
  setStatus("Loading available models...");

  const response = await fetch("/api/models");
  if (!response.ok) {
    throw new Error("Could not load available models.");
  }

  const payload = await response.json();
  modelSelect.innerHTML = "";

  payload.models.forEach((model, index) => {
    const option = document.createElement("option");
    option.value = model.id;
    option.textContent = `${model.name} (${model.id})`;
    if (index === 0) {
      option.selected = true;
    }
    modelSelect.appendChild(option);
  });

  setStatus("Pick an image and start the upscale request.");
}

imageInput.addEventListener("change", () => {
  const [file] = imageInput.files;
  resetResultPreview();

  if (originalPreviewUrl) {
    URL.revokeObjectURL(originalPreviewUrl);
    originalPreviewUrl = "";
  }

  if (!file) {
    originalPreview.removeAttribute("src");
    setStatus("Waiting for an image.");
    return;
  }

  originalPreviewUrl = URL.createObjectURL(file);
  originalPreview.src = originalPreviewUrl;
  setStatus(`Selected ${file.name}. Ready to upscale.`);
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const [file] = imageInput.files;
  if (!file) {
    setStatus("Choose an image before submitting.", "error");
    return;
  }

  const payload = new FormData();
  payload.append("file", file);
  payload.append("model_name", modelSelect.value);
  payload.append("outscale", outscaleInput.value);
  payload.append("tile", tileInput.value);
  payload.append("denoise_strength", denoiseInput.value);
  payload.append("fp32", fp32Input.checked ? "true" : "false");

  submitButton.disabled = true;
  setStatus("Upscaling image. This can take a while on the first request...", "working");

  try {
    const response = await fetch("/api/upscale", {
      method: "POST",
      body: payload,
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.detail || "Upscale request failed.");
    }

    resultPreview.src = data.result_url;
    downloadLink.href = data.result_url;
    downloadLink.download = data.filename;
    downloadLink.hidden = false;
    setStatus(`Done. Output size: ${data.width} x ${data.height}`, "success");
  } catch (error) {
    resetResultPreview();
    setStatus(error.message, "error");
  } finally {
    submitButton.disabled = false;
  }
});

loadModels().catch((error) => {
  setStatus(error.message, "error");
});
