// Adaptación de tu sistema de detección facial y zonas a MediaPipe Tasks Vision (face_landmarker)
import vision from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";
import { zones, zoneColors } from './utils/zones.js';
import { drawAllZones } from './utils/draw.js';
import { getDominantColorFromRegion } from './utils/colors.js';
import { VITInferenceWeb, SKIN_COLOR_CLASSES } from './utils/vits.js';

const { FaceLandmarker, FilesetResolver, DrawingUtils } = vision;
const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const resultsContent = document.getElementById("resultsContent");
const canvasCtx = canvasElement.getContext("2d");

let faceLandmarker;
let skinToneModel;
let runningMode = "VIDEO";
let lastVideoTime = -1;
let webcamRunning = false;
let skinToneRunning = false;

export async function initFaceLandmarker() {
  const filesetResolver = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
  );

  faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
      delegate: "GPU"
    },
    outputFaceBlendshapes: false,
    runningMode,
    numFaces: 1
  });

  skinToneModel = new VITInferenceWeb("models/skin_tone_detector.onnx", SKIN_COLOR_CLASSES);
  enableCamera();
}

async function enableCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
  video.srcObject = stream;
  await video.play();
  webcamRunning = true;
  requestAnimationFrame(predictLoop);
}
let counter = 0
async function predictLoop() {
  if (!webcamRunning) return;
  counter++
  canvasElement.width = video.videoWidth;
  canvasElement.height = video.videoHeight;
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  const startTimeMs = performance.now();
  if (lastVideoTime !== video.currentTime) {
    lastVideoTime = video.currentTime;
    const result = await faceLandmarker.detectForVideo(video, startTimeMs);
    if (result.faceLandmarks.length > 0) {
      const landmarks = result.faceLandmarks[0];

      const drawingUtils = new DrawingUtils(canvasCtx);
      drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, { color: "#C0C0C070", lineWidth: 1 });

      drawAllZones(canvasCtx, landmarks, zones, zoneColors);
      extractAndDisplayColors(landmarks);
      
      if (!skinToneRunning && !(counter%10)) {
        skinToneRunning = true;
        const boundingBox = getBoundingBoxFromLandmarks(landmarks);
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = boundingBox.w;
        tempCanvas.height = boundingBox.h;
        const tempCtx = tempCanvas.getContext("2d");
        tempCtx.drawImage(video, boundingBox.x, boundingBox.y, boundingBox.w, boundingBox.h, 0, 0, boundingBox.w, boundingBox.h);

        skinToneModel.classify(tempCanvas).then((vitResult) => {
          console.log("VIT Result:", vitResult);
          skinToneRunning = false;
        }).catch(err => {
          console.error("SkinTone classification error:", err);
          skinToneRunning = false;
        });
      }
    }
  }
  requestAnimationFrame(predictLoop);
}

function getBoundingBoxFromLandmarks(landmarks) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const point of landmarks) {
    if (point.x < minX) minX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.x > maxX) maxX = point.x;
    if (point.y > maxY) maxY = point.y;
  }
  const x = Math.floor(minX * video.videoWidth);
  const y = Math.floor(minY * video.videoHeight);
  const w = Math.ceil((maxX - minX) * video.videoWidth);
  const h = Math.ceil((maxY - minY) * video.videoHeight);
  return { x, y, w, h };
}

function extractAndDisplayColors(landmarks) {
  resultsContent.innerHTML = "";
  const scratchCanvas = document.createElement("canvas");
  scratchCanvas.width = video.videoWidth;
  scratchCanvas.height = video.videoHeight;
  const scratchCtx = scratchCanvas.getContext("2d");
  scratchCtx.drawImage(video, 0, 0);

  for (const zoneName in zones) {
    const indices = zones[zoneName];
    const domColor = getDominantColorFromRegion(landmarks, indices, scratchCanvas);

    const swatch = document.createElement("div");
    swatch.className = "color-swatch";
    swatch.style.backgroundColor = domColor;
    const label = document.createElement("span");
    label.textContent = zoneName;
    swatch.appendChild(label);
    resultsContent.appendChild(swatch);
  }
}

