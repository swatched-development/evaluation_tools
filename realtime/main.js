import vision from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";
import { zones, zoneColors } from './utils/zones.js';
import { drawAllZones } from './utils/draw.js';
import { getDominantColorFromRegion } from './utils/colors.js';
// import { VITInferenceWeb, SKIN_COLOR_CLASSES } from './utils/vits.js';
// import { TFLiteInferenceHelper, drawHairCanvas, getHairColor} from './utils/hair.js';
import { createFaceMaskedImage } from './utils/faceUtils.js';
import { calculateFaceAngles } from './utils/faceAngles.js';
import { calculateFaceAndBackgroundLuminance } from './utils/lightmetrics.js';
const { FaceLandmarker, FilesetResolver, DrawingUtils } = vision;
const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const resultsContent = document.getElementById("resultsContent");
const canvasCtx = canvasElement.getContext("2d");
const infoPanel = document.getElementById("info-panel")

const OPTIMAL_ANGLE_TOLERANCE=10;

let COLOR_FINDER="https://8ix3xnvt0j.execute-api.us-east-1.amazonaws.com/prod/aiface"

let faceLandmarker;
// let skinToneModel;
let runningMode = "VIDEO";
let lastVideoTime = -1;
let webcamRunning = false;
let skinToneRunning = false;
let maskEnabled = true;

// const hairSegmenter = new TFLiteInferenceHelper({modelUrl:"https://swatched-development.github.io/evaluation_tools/realtime/models/hair_segmenter.tflite"})
let onFaceAnalysisResultCallback = null;
let onPerFrameCallback = null;
let faceBoundingBox = null;
let environmentID="8ix3xnvt0j"
let transactionID=null

export function setTransactionId(newId){
  transactionID = newId;
}

export function setMaskEnabled(enabled) {
  maskEnabled = enabled;
}

export async function initFaceLandmarker(onResult,skipEnableCamera, transaction_id,environment="dev", onPerFrame=null) {

  transactionID=transaction_id;
  environmentID={
    "dev" : "8ix3xnvt0j",
    "prod" : "kk2ztajnbb",
    "stg": "bjcl0ah4nk"
  }[environment];
  //COLOR_FINDER=`https://${environmentID}.execute-api.us-east-1.amazonaws.com/prod/iaface`


  onFaceAnalysisResultCallback=onResult
  onPerFrameCallback=onPerFrame;
  // await hairSegmenter.load()
  createFaceBoundingBoxOverlay();
  const filesetResolver = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
  );

  faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
      delegate: "CPU"
    },
    outputFaceBlendshapes: false,
    runningMode,
    numFaces: 1
  });

  if (skipEnableCamera===true) return;

  enableCamera();
}

export function stopCamera() {
  webcamRunning = false;
  skinToneRunning = false;
  if (video.srcObject) {
    video.srcObject.getTracks().forEach(track => track.stop());
    video.srcObject = null;
  }
}


export async function enableCamera() {
  const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 1280, height: 720 }, audio: false });
  video.srcObject = stream;
  await video.play();
  webcamRunning = true;
  requestAnimationFrame(predictLoop);
}
let counter = 0
let lastTriggerTime = 0

async function predictLoop() {
  if (!webcamRunning) return;
  counter++
  canvasElement.width = video.videoWidth;
  canvasElement.height = video.videoHeight;
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  const startTimeMs = performance.now();
  if (lastVideoTime !== video.currentTime) {
    lastVideoTime = video.currentTime;
    // const hairResults = await hairSegmenter.inferVideoFrame(video, startTimeMs)
    const result = await faceLandmarker.detectForVideo(video, startTimeMs);
    if (result.faceLandmarks.length > 0) {
      const landmarks = result.faceLandmarks[0];
      const rgbColors =extractAndDisplayColors(landmarks);
      // const hairRgbColor=getHairColor(hairResults)
      const hairRgbColor = null;
      const boundingBox = getBoundingBoxFromLandmarks(landmarks);

      // Calculate face angles from landmarks
      const faceAngles = calculateFaceAngles(landmarks);

      // Calculate light metrics
      const scratchCanvas = document.createElement("canvas");
      scratchCanvas.width = video.videoWidth;
      scratchCanvas.height = video.videoHeight;
      const scratchCtx = scratchCanvas.getContext("2d");
      scratchCtx.drawImage(video, 0, 0);

      // Calculate face and background luminance
      const faceIndices = [...zones.front, ...zones.left_cheek, ...zones.right_cheek, ...zones.chin];
      const backgroundIndices = createBackgroundIndices(landmarks, video.videoWidth, video.videoHeight);
      const lightMetrics = calculateFaceAndBackgroundLuminance(scratchCanvas, landmarks, faceIndices, backgroundIndices);


      // FORCED: Always draw face mesh - mandatory display
      drawFaceMesh(landmarks);


      if (onPerFrameCallback) {
        onPerFrameCallback({
          boundingBox: boundingBox,
          landmarks: landmarks,
          rgbColors: rgbColors,
          faceAngles: faceAngles,
          areaRatio: boundingBox.areaRatio,
          lightMetrics: lightMetrics
        });
      }

      updateFaceBoundingBox(boundingBox);

      const currentTime = performance.now();
      if (!skinToneRunning && (currentTime - lastTriggerTime) >= 4000) {
        lastTriggerTime = currentTime;
        skinToneRunning = true;
        const maskedFaceCanvas = createFaceMaskedImage(video, landmarks);

        // Update crop preview
        const cropPreviewCanvas = document.getElementById('crop-preview');
        if (cropPreviewCanvas) {
          cropPreviewCanvas.width = maskedFaceCanvas.width;
          cropPreviewCanvas.height = maskedFaceCanvas.height;
          const cropPreviewCtx = cropPreviewCanvas.getContext('2d');
          cropPreviewCtx.drawImage(maskedFaceCanvas, 0, 0);
        }

        maskedFaceCanvas.toBlob(async (blob) => {
          if (!blob) {
            skinToneRunning = false;
            return;
          }

          const reader = new FileReader();
          reader.readAsArrayBuffer(blob);
          reader.onload = async function(e) {
            const imageData = e.target.result;

            const url = new URL(COLOR_FINDER);
            if (transactionID) {
              url.searchParams.append('transaction_id', transactionID);
            }

            try {
              const corrected = await fetch(url.toString(), {
                method: "POST",
                mode: "cors",
                headers: {
                  "Content-Type": "image/jpg"
                },
                body: imageData
              });

            skinToneRunning = false;
            const correctedQuery = await corrected.json();
            let L = 0;
            let N = 0;
            /*
            correctedQuery.corrected_l.forEach((v)=> {
              if (isNaN(v*1)) return
              L+=v
              N++;
            })
            L /=N;*/
            const fuzzyZero = (a)=> Math.abs(a) < OPTIMAL_ANGLE_TOLERANCE;


            if (onFaceAnalysisResultCallback) {
              // Individual quality checks
              const isGoodAngle = fuzzyZero(faceAngles.yaw) && fuzzyZero(faceAngles.roll) && fuzzyZero(faceAngles.pitch);
              const isGoodRatio = boundingBox.areaRatio >= 19;
              const isGoodLightExposition = Math.abs(lightMetrics.exposureValue-1.0) <= 0.2;

              // Quality messages
              let angleQuality = "";
              let ratioQuality = "";
              let lightQuality = "";

              if (!isGoodAngle) angleQuality = "Position your face straight to camera";
              if (!isGoodRatio) ratioQuality = "Get closer to the camera";
              if (!isGoodLightExposition) lightQuality = "Poor light exposure quality";

              const isTheFramePotentiallyOptimally = isGoodAngle && isGoodRatio && isGoodLightExposition;
              console.log(boundingBox.areaRatio);
              let eyeColor = null;
              if (correctedQuery.nominal_eye_color) {
                const leftEye = correctedQuery.nominal_eye_color.left;
                const rightEye = correctedQuery.nominal_eye_color.right;
                if (leftEye === "Brown" && rightEye === "Brown") {
                  eyeColor = "Brown";
                } else {
                  eyeColor = leftEye !== "Brown" ? leftEye : rightEye;
                }
              }

              const resultPayload = {
                "boundingBox"        : boundingBox,
                "vitSkinTone"        : correctedQuery.vit_skintone,
                "estimatedLValue"    : L,
                "undertoneHistogram" : correctedQuery.undertone_histogram,
                "hairColor"          : correctedQuery.nominal_hair_color,
                "eyeColor"           : eyeColor,
                "faceShape"          : correctedQuery.vit_faceshape,
                "topColors"          : correctedQuery.top_colors,
                "topColorsLab"       : correctedQuery.top_colors_lab,
                "referenceProducts"  : correctedQuery.reference_products,
                "referenceProductsLab": correctedQuery.reference_products_lab,
                "rollAngle"          : faceAngles.roll,
                "yawAngle"           : faceAngles.yaw,
                "pitchAngle"         : faceAngles.pitch,
                "transactionId"      : correctedQuery.transaction_id,
                "goodFrame"          : isTheFramePotentiallyOptimally,
                "angleQuality"       : angleQuality,
                "ratioQuality"       : ratioQuality,
                "lightQuality"       : lightQuality
              };
              /*if (infoPanel) {
                if (correctedQuery.vit_skintone) {
                  infoPanel.innerHTML += `Skin Tone: ${correctedQuery.vit_skintone}<br>`;
                }
              }*/

              onFaceAnalysisResultCallback(resultPayload);
            }
            } catch (err) {
              console.error("Color finder error:", err);
              skinToneRunning = false;
            }
          };
        }, 'image/jpeg');
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

  // Calculate bounding box area and ratio to total image
  const boundingBoxArea = w * h;
  const totalImageArea = video.videoWidth * video.videoHeight;
  const areaRatio = (boundingBoxArea / totalImageArea) * 100; // Percentage


  return { x, y, w, h, areaRatio };
}

function extractAndDisplayColors(landmarks) {
  if (resultsContent)
    resultsContent.innerHTML = "";
  const scratchCanvas = document.createElement("canvas");
  scratchCanvas.width = video.videoWidth;
  scratchCanvas.height = video.videoHeight;
  const scratchCtx = scratchCanvas.getContext("2d");
  scratchCtx.drawImage(video, 0, 0);
  const rgbColors =[]

  for (const zoneName in zones) {
    const indices = zones[zoneName];
    const domColor = getDominantColorFromRegion(landmarks, indices, scratchCanvas);
    rgbColors.push(domColor)
    if (!domColor && !resultsContent) continue
    const swatch = document.createElement("div");
    swatch.className = "color-swatch";
    swatch.style.backgroundColor = `rgb(${domColor})`
    const label = document.createElement("span");
    label.textContent = zoneName;
    swatch.appendChild(label);
    if (resultsContent)
      resultsContent.appendChild(swatch);
  }
  return rgbColors;
}

function createFaceBoundingBoxOverlay() {
  if (!faceBoundingBox) {
    faceBoundingBox = document.createElement('div');
    faceBoundingBox.id = 'face-bounding-box';
    faceBoundingBox.style.cssText = `
      position: absolute;
      border: 2px solid #00ff00;
      background: transparent;
      pointer-events: none;
      z-index: 10;
      display: none;
    `;
    document.body.appendChild(faceBoundingBox);
  }
}

function updateFaceBoundingBox(boundingBox) {
  if (!faceBoundingBox || !boundingBox) return;
  
  const canvasRect = canvasElement.getBoundingClientRect();
  const scaleX = canvasRect.width / canvasElement.width;
  const scaleY = canvasRect.height / canvasElement.height;
  
  faceBoundingBox.style.left = (canvasRect.left + boundingBox.x * scaleX) + 'px';
  faceBoundingBox.style.top = (canvasRect.top + boundingBox.y * scaleY) + 'px';
  faceBoundingBox.style.width = (boundingBox.w * scaleX) + 'px';
  faceBoundingBox.style.height = (boundingBox.h * scaleY) + 'px';
  faceBoundingBox.style.display = 'block';
}

export function drawFaceBoundingBox(boundingBox) {
  updateFaceBoundingBox(boundingBox);
}

function drawFaceMesh(landmarks) {
  try {
    if (!maskEnabled) return;

    const drawingUtils = new DrawingUtils(canvasCtx);

    // Draw all landmarks as dots first (simpler approach)
    for (let i = 0; i < landmarks.length; i++) {
      const landmark = landmarks[i];
      const x = landmark.x * canvasElement.width;
      const y = landmark.y * canvasElement.height;

      canvasCtx.fillStyle = 'rgba(0, 255, 0, 0.8)';
      canvasCtx.beginPath();
      canvasCtx.arc(x, y, 1, 0, 2 * Math.PI);
      canvasCtx.fill();
    }

    // Draw face connectors using MediaPipe constants
    if (vision.FaceLandmarker.FACE_LANDMARKS_TESSELATION) {
      drawingUtils.drawConnectors(landmarks, vision.FaceLandmarker.FACE_LANDMARKS_TESSELATION, {
        color: 'rgba(0, 255, 0, 0.3)',
        lineWidth: 0.5,
      });
    }

    if (vision.FaceLandmarker.FACE_LANDMARKS_FACE_OVAL) {
      drawingUtils.drawConnectors(landmarks, vision.FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, {
        color: 'rgba(0, 255, 0, 0.7)',
        lineWidth: 1,
      });
    }
  } catch (error) {
    console.error("Error drawing face mesh:", error);
  }
}

function createBackgroundIndices(landmarks, width, height) {
  // Create a rectangular background region around the face
  const boundingBox = getBoundingBoxFromLandmarks(landmarks);
  const margin = 50; // pixels

  const backgroundRegion = [
    { x: Math.max(0, boundingBox.x - margin), y: Math.max(0, boundingBox.y - margin) },
    { x: Math.min(width, boundingBox.x + boundingBox.w + margin), y: Math.max(0, boundingBox.y - margin) },
    { x: Math.min(width, boundingBox.x + boundingBox.w + margin), y: Math.min(height, boundingBox.y + boundingBox.h + margin) },
    { x: Math.max(0, boundingBox.x - margin), y: Math.min(height, boundingBox.y + boundingBox.h + margin) }
  ];

  // Convert to normalized coordinates for consistency with landmarks
  return backgroundRegion.map(point => ({
    x: point.x / width,
    y: point.y / height
  }));
}


