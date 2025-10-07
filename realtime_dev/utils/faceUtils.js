export function getFaceAngle(landmarks) {
  const leftEye = landmarks[234];
  const rightEye = landmarks[454];
  const dx = rightEye.x - leftEye.x;
  const dy = rightEye.y - leftEye.y;
  return Math.atan2(dy, dx) * (180 / Math.PI);
}

export function getFaceBoundingBox(landmarks, cw,ch,padding = 20) {
  const xs = landmarks.map(p => p.x * cw);
  const ys = landmarks.map(p => p.y * ch);

  const x0 = Math.min(...xs) - padding;
  const y0 = Math.min(...ys) - padding;
  const x1 = Math.max(...xs) + padding;
  const y1 = Math.max(...ys) + padding;

  const x = Math.max(0, Math.min(x0, x1));
  const y = Math.max(0, Math.min(y0, y1));
  const w = Math.max(0, Math.abs(x1 - x0));
  const h = Math.max(0, Math.abs(y1 - y0));

  return { x, y, w, h};
}

export function createFaceMaskedImage(videoElement, landmarks) {
  const canvas = document.createElement("canvas");
  canvas.width = videoElement.videoWidth;
  canvas.height = videoElement.videoHeight;
  const ctx = canvas.getContext("2d");
  
  ctx.drawImage(videoElement, 0, 0);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  const faceMask = createFaceMask(landmarks, canvas.width, canvas.height);
  
  for (let i = 0; i < data.length; i += 4) {
    const pixelIndex = Math.floor(i / 4);
    const y = Math.floor(pixelIndex / canvas.width);
    const x = pixelIndex % canvas.width;
    
    if (!faceMask[y] || !faceMask[y][x]) {
      data[i] = 0;     
      data[i + 1] = 0; 
      data[i + 2] = 0; 
    }
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  const boundingBox = getFaceBoundingBox(landmarks, canvas.width, canvas.height, 0);
  
  const croppedCanvas = document.createElement("canvas");
  croppedCanvas.width = boundingBox.w;
  croppedCanvas.height = boundingBox.h;
  const croppedCtx = croppedCanvas.getContext("2d");
  
  croppedCtx.drawImage(canvas, boundingBox.x, boundingBox.y, boundingBox.w, boundingBox.h, 0, 0, boundingBox.w, boundingBox.h);
  
  return croppedCanvas;
}

function createFaceMask(landmarks, width, height) {
  const mask = Array(height).fill().map(() => Array(width).fill(false));
  
  const faceContourIndices = [
    10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
  ];
  
  const scaledLandmarks = landmarks.map(point => ({
    x: Math.round(point.x * width),
    y: Math.round(point.y * height)
  }));
  
  const contourPoints = faceContourIndices.map(index => scaledLandmarks[index]);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isPointInPolygon({x, y}, contourPoints)) {
        mask[y][x] = true;
      }
    }
  }
  
  return mask;
}

function isPointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    if (((polygon[i].y > point.y) !== (polygon[j].y > point.y)) &&
        (point.x < (polygon[j].x - polygon[i].x) * (point.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x)) {
      inside = !inside;
    }
  }
  return inside;
}

