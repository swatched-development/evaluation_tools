// main.js

import { zones, zoneColors } from './utils/zones.js';
import { drawAllZones } from './utils/draw.js';
import { getFaceAngle, getFaceBoundingBox } from './utils/faceUtils.js';
import { getDominantColorFromRegion } from './utils/colors.js';
import { VITInferenceWeb,SKIN_COLOR_CLASSES,FACE_SHAPES_CLASSES} from './utils/vits.js'

const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');

let skinToneModel;
let faceShapeModel;

function extractAndDisplayColors(landmarks, zones, zoneColors, image) {
  const output = document.getElementById("resultsContent");
  output.innerHTML = "";

  const scratchCanvas = document.createElement("canvas");
  scratchCanvas.width = canvasElement.width;
  scratchCanvas.height = canvasElement.height;
  const scratchCtx = scratchCanvas.getContext("2d");
  scratchCtx.drawImage(image, 0, 0, scratchCanvas.width, scratchCanvas.height);

  for (const zoneName in zones) {
    const indices = zones[zoneName];
    const domColor = getDominantColorFromRegion(landmarks, indices, scratchCanvas);

    const swatch = document.createElement("div");
    swatch.className = "color-swatch";
    swatch.style.backgroundColor = domColor;
    const label = document.createElement("span");
    label.textContent = zoneName;
    swatch.appendChild(label);
    output.appendChild(swatch);
  }
}

function drawBoundingBox(ctx, landmarks,cw,ch) {
  const {x,y,w,h} = getFaceBoundingBox(landmarks,cw,ch);
  ctx.strokeStyle = 'lime';
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = w;
  croppedCanvas.height = h;
  const croppedCtx = croppedCanvas.getContext('2d');
  croppedCtx.drawImage(ctx.canvas, x, y, w, h, 0, 0, w, h);
  return croppedCanvas;
}

async function onResults(results) {
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  if (results.faceLandmarks) {
    const cropped = drawBoundingBox(canvasCtx, results.faceLandmarks,canvasElement.width,canvasElement.height);
    extractAndDisplayColors(results.faceLandmarks, zones, zoneColors, results.image);
    drawAllZones(canvasCtx, results.faceLandmarks, zones, zoneColors);
    if (skinToneModel){
      const vitSkinResult= await skinToneModel.classify(cropped)
      console.log(vitSkinResult);
    }
    const angle = getFaceAngle(results.faceLandmarks);
    console.log("Face angle:", angle);
  }

  canvasCtx.restore();
}

export async function initCameraAndHolistic() {
  skinToneModel = new VITInferenceWeb("models/skin_tone_detector.onnx",SKIN_COLOR_CLASSES);
  const holistic = new Holistic({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
  }});
  holistic.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: true,
    smoothSegmentation: true,
    refineFaceLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  });
  holistic.onResults(onResults);

  const camera = new Camera(videoElement, {
    onFrame: async () => {
      await holistic.send({image: videoElement});
    },
    width: 1280,
    height: 720
  });
  camera.start();
}
