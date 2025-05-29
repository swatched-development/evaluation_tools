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

