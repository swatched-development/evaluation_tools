import vision from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";
import { zones, zoneColors } from './utils/zones.js';
import { drawAllZones } from './utils/draw.js';
import { getDominantColorFromRegion } from './utils/colors.js';
// import { VITInferenceWeb, SKIN_COLOR_CLASSES } from './utils/vits.js';
// import { TFLiteInferenceHelper, drawHairCanvas, getHairColor} from './utils/hair.js';
import { createFaceMaskedImage } from './utils/faceUtils.js';
const { FaceLandmarker, FilesetResolver, DrawingUtils } = vision;
const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const resultsContent = document.getElementById("resultsContent");
const canvasCtx = canvasElement.getContext("2d");
const infoPanel = document.getElementById("info-panel")

let COLOR_FINDER="https://8ix3xnvt0j.execute-api.us-east-1.amazonaws.com/prod/find-color"


let faceLandmarker;
// let skinToneModel;
let runningMode = "VIDEO";
let lastVideoTime = -1;
let webcamRunning = false;
let skinToneRunning = false;

// const hairSegmenter = new TFLiteInferenceHelper({modelUrl:"https://swatched-development.github.io/evaluation_tools/realtime/models/hair_segmenter.tflite"})
let onFaceAnalysisResultCallback = null;
let onPerFrameCallback = null;
let faceBoundingBox = null;
let environmentID="8ix3xnvt0j"
let transactionID=null

export function setTransactionId(newId){
  transactionID = newId;
}

export async function initFaceLandmarker(onResult,skipEnableCamera, transaction_id,environment="dev") {
  
  transactionID=transaction_id;
  environmentID={
    "dev" : "8ix3xnvt0j",
    "stg" : "kk2ztajnbb",
    "prod": "bjcl0ah4nk"
  }[environment];
  COLOR_FINDER=`https://${environmentID}.execute-api.us-east-1.amazonaws.com/prod/find-color`


  onFaceAnalysisResultCallback=onResult
  onPerFrameCallback=undefined;//onPerFrame
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

  // skinToneModel = new VITInferenceWeb("https://swatched-development.github.io/evaluation_tools/realtime/models/skin_tone_detector.onnx", SKIN_COLOR_CLASSES);
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
      
      if (onPerFrameCallback) {
        onPerFrameCallback({
          boundingBox: boundingBox,
          landmarks: landmarks,
          rgbColors: rgbColors
        });
      } else {
        updateFaceBoundingBox(boundingBox);
      }
      
      if (!skinToneRunning && !(counter%6)) {
        skinToneRunning = true;
        const maskedFaceCanvas = createFaceMaskedImage(video, landmarks);
        const b64Face = maskedFaceCanvas.toDataURL("image/png").split(';base64,')[1]

        const payload = {
          camera_colors : [],
          camera_hair_color : [],
          camera_image  : b64Face,
          transaction_id: transactionID
        }
        
        fetch(COLOR_FINDER, {
          method: "POST",
          mode : "cors",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        }).then(async (corrected) => {
          skinToneRunning = false;
          const correctedQuery = await corrected.json()
          let L=0
          let N=0
          correctedQuery.corrected_l.forEach((v)=> {
            if (isNaN(v*1)) return 
            L+=v
            N++;
          })
          L /=N;

          if (onFaceAnalysisResultCallback){
            let geminiSkinTone = null;
            let geminiHairColor = null;
            let otherFindings = correctedQuery.geminiFindings;
            try{
              if (typeof(otherFindings) == 'string'){
                otherFindings = JSON.parse(JSON.parse(otherFindings));
                geminiSkinTone = otherFindings.skinTone;
                geminiHairColor = otherFindings.hairColor;
              }
            }catch(e){
            }

            const resultPayload ={
              "boundingBox"        : boundingBox,
              "vitSkinTone"        : geminiSkinTone,
              "estimatedLValue"    : L,
              "undertoneHistogram" : correctedQuery.undertone,
              "hairColor"          : geminiHairColor || correctedQuery.hairColor
            }
            if (otherFindings) {
              resultPayload.otherFindings = otherFindings;
              resultPayload.skinConcerns = otherFindings.skinConerns;
              resultPayload.faceShape = otherFindings.faceShape;
              resultPayload.eyeColor = otherFindings.eyeColor;
            }
            if (infoPanel){
              if (geminiSkinTone){
                infoPanel.innerHTML+=`Skin Tone: ${geminiSkinTone}<br>`
              }
            }

            onFaceAnalysisResultCallback(resultPayload)
          }
        }).catch(err => {
          console.error("Color finder error:", err);
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

