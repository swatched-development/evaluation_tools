export function drawZone(ctx, landmarks, indices, color) {
  ctx.beginPath();
  indices.forEach((i, idx) => {
    const point = landmarks[i];
    const x = point.x * ctx.canvas.width;
    const y = point.y * ctx.canvas.height;
    if (idx === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

export function drawAllZones(ctx, landmarks, zones, zoneColors) {
  for (const zone in zones) {
    drawZone(ctx, landmarks, zones[zone], zoneColors[zone] || "rgba(0,255,255,0.3)");
  }
}

