import {
  ImageSegmenter,
  FilesetResolver
} from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2";

export function drawHairCanvas(ctx, canvas, result) {
  const mask = result.categoryMask.getAsUint8Array();
  const width = result.categoryMask.width;
  const height = result.categoryMask.height;

  // Asegúrate de que el canvas tenga el mismo tamaño que la máscara
  canvas.width = width;
  canvas.height = height;

  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const count = {};

  for (let i = 0; i < mask.length; i++) {
    if (mask[i] === 1) {
      const idx = i * 4;

      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      const key = `${r},${g},${b}`;
      count[key] = (count[key] || 0) + 1;

      data[idx]     = 236;
      data[idx + 1] = 255;
      data[idx + 2] = 0;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  const sorted = Object.entries(count).sort((a, b) => b[1] - a[1]);
  return sorted.length ? sorted[0][0].split(",").map(Number) : null;
}

export function getHairColor(result) {
  const mask = result.categoryMask.getAsUint8Array();
  const width = result.categoryMask.width;
  const height = result.categoryMask.height;

  const scratchCanvas = document.createElement("canvas");
  scratchCanvas.width = width;
  scratchCanvas.height = height;
  const scratchCtx = scratchCanvas.getContext("2d");
  
  const video = document.getElementById("webcam");
  scratchCtx.drawImage(video, 0, 0, width, height);
  
  const imageData = scratchCtx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const count = {};

  for (let i = 0; i < mask.length; i++) {
    if (mask[i] === 1) {
      const idx = i * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const key = `${r},${g},${b}`;
      count[key] = (count[key] || 0) + 1;
    }
  }

  const sorted = Object.entries(count).sort((a, b) => b[1] - a[1]);
  return sorted.length ? sorted[0][0].split(",").map(Number) : null;
}

/**
 * Headless TFLite inference helper for arbitrary MediaPipe models.
 */
export class TFLiteInferenceHelper {
  constructor(options) {
    this.modelUrl = options.modelUrl;
    this.delegate = options.delegate || "GPU";
    this.runningMode = options.mode || "IMAGE";
    this.segmenter = null;
  }

  async load() {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.2/wasm"
    );

    this.segmenter = await ImageSegmenter.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: this.modelUrl,
        delegate: this.delegate
      },
      runningMode: this.runningMode,
      outputCategoryMask: true,
      outputConfidenceMasks: false
    });
  }

  async setMode(mode) {
    if (this.segmenter && this.runningMode !== mode) {
      this.runningMode = mode;
      await this.segmenter.setOptions({ runningMode: mode });
    }
  }

  async inferImage(input) {
    if (!this.segmenter) throw new Error("Model not loaded yet.");
    if (this.runningMode !== "IMAGE") {
      await this.setMode("IMAGE");
    }
    return await this.segmenter.segment(input);
  }

  async inferVideoFrame(videoElement, timestamp) {
    if (!this.segmenter) throw new Error("Model not loaded yet.");
    if (this.runningMode !== "VIDEO") {
      await this.setMode("VIDEO");
    }
    return await this.segmenter.segmentForVideo(videoElement, timestamp);
  }

  getLabels() {
    if (!this.segmenter) throw new Error("Model not loaded yet.");
    return this.segmenter.getLabels();
  }
}

