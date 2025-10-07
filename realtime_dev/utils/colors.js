export function getDominantColorFromRegion(landmarks, indices, canvas) {
  const ctx = canvas.getContext("2d");
  const path = new Path2D();

  indices.forEach((i, idx) => {
    const pt = landmarks[i];
    const x = pt.x * canvas.width;
    const y = pt.y * canvas.height;
    if (idx === 0) path.moveTo(x, y);
    else path.lineTo(x, y);
  });
  path.closePath();

  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = canvas.width;
  maskCanvas.height = canvas.height;
  const maskCtx = maskCanvas.getContext("2d");
  maskCtx.fillStyle = "white";
  maskCtx.fill(path);
  maskCtx.globalCompositeOperation = "source-in";
  maskCtx.drawImage(canvas, 0, 0);

  const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
  const data = imageData.data;
  const count = {};

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a === 0) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key = `${r},${g},${b}`;
    count[key] = (count[key] || 0) + 1;
  }

  const sorted = Object.entries(count).sort((a, b) => b[1] - a[1]);
  if (sorted.length>0)
    return sorted[0][0].split(",").map(parseFloat);
  return null
}
