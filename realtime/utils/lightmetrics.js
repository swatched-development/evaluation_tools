export function calculateLuminanceY(imageData, mask = null) {
    const { data, width, height } = imageData;
    const luminanceValues = [];

    for (let i = 0; i < data.length; i += 4) {
        const pixelIndex = Math.floor(i / 4);
        const y = Math.floor(pixelIndex / width);
        const x = pixelIndex % width;

        if (mask && !mask[pixelIndex]) continue;

        const r = data[i] / 255.0;
        const g = data[i + 1] / 255.0;
        const b = data[i + 2] / 255.0;

        const Y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        luminanceValues.push(Y);
    }

    return luminanceValues;
}

export function calculateAverageLuminance(luminanceValues) {
    if (luminanceValues.length === 0) return 0;
    return luminanceValues.reduce((sum, y) => sum + y, 0) / luminanceValues.length;
}

export function calculateLogAverageLuminance(luminanceValues, epsilon = 0.0001) {
    if (luminanceValues.length === 0) return 0;

    const logSum = luminanceValues.reduce((sum, y) => {
        return sum + Math.log(epsilon + y);
    }, 0);

    return Math.exp(logSum / luminanceValues.length);
}

export function calculateWeberContrast(foregroundLuminance, targetLuminance) {
    if (targetLuminance === 0) return 0;
    return (foregroundLuminance - targetLuminance) / targetLuminance;
}

export function calculateRMSContrast(luminanceValues) {
    if (luminanceValues.length === 0) return 0;

    const meanLuminance = calculateAverageLuminance(luminanceValues);
    const sumSquaredDeviations = luminanceValues.reduce((sum, y) => {
        const deviation = y - meanLuminance;
        return sum + (deviation * deviation);
    }, 0);

    return Math.sqrt(sumSquaredDeviations / luminanceValues.length);
}

export function calculateExposureValue(foregroundLuminance, targetLuminance) {
    if (targetLuminance === 0) return 0;
    return Math.log2(foregroundLuminance / targetLuminance);
}

export function extractRegionFromCanvas(canvas, landmarks, regionIndices) {
    if (!regionIndices || regionIndices.length === 0) return null;

    const ctx = canvas.getContext('2d');
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    const mask = new Array(canvas.width * canvas.height).fill(false);

    let points;
    if (typeof regionIndices[0] === 'number') {
        // Face region indices - map to landmarks
        points = regionIndices.map(idx => {
            const landmark = landmarks[idx];
            return {
                x: Math.round(landmark.x * canvas.width),
                y: Math.round(landmark.y * canvas.height)
            };
        });
    } else {
        // Background region - already normalized coordinates
        points = regionIndices.map(point => ({
            x: Math.round(point.x * canvas.width),
            y: Math.round(point.y * canvas.height)
        }));
    }

    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            if (isPointInPolygon({ x, y }, points)) {
                mask[y * canvas.width + x] = true;
            }
        }
    }

    return { imageData, mask };
}

function isPointInPolygon(point, polygon) {
    let inside = false;
    const { x, y } = point;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x;
        const yi = polygon[i].y;
        const xj = polygon[j].x;
        const yj = polygon[j].y;

        if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
            inside = !inside;
        }
    }

    return inside;
}

export function calculateFaceAndBackgroundLuminance(canvas, landmarks, faceIndices, backgroundIndices) {
    try {
        const faceRegion = extractRegionFromCanvas(canvas, landmarks, faceIndices);
        const backgroundRegion = extractRegionFromCanvas(canvas, landmarks, backgroundIndices);

        if (!faceRegion || !backgroundRegion) {
            return {
                foregroundLuminance: 0,
                backgroundLuminance: 0,
                foregroundLogLuminance: 0,
                backgroundLogLuminance: 0,
                weberContrast: 0,
                foregroundRMSContrast: 0,
                backgroundRMSContrast: 0,
                exposureValue: 0
            };
        }

        const faceLuminanceValues = calculateLuminanceY(faceRegion.imageData, faceRegion.mask);
        const backgroundLuminanceValues = calculateLuminanceY(backgroundRegion.imageData, backgroundRegion.mask);

        const faceLuminance = calculateAverageLuminance(faceLuminanceValues);
        const backgroundLuminance = calculateAverageLuminance(backgroundLuminanceValues);

        return {
            foregroundLuminance: faceLuminance,
            backgroundLuminance: backgroundLuminance,
            foregroundLogLuminance: 0,
            backgroundLogLuminance: 0,
            weberContrast: 0,
            foregroundRMSContrast: 0,
            backgroundRMSContrast: 0,
            exposureValue: 0
        };
    } catch (error) {
        return {
            foregroundLuminance: 0,
            backgroundLuminance: 0,
            foregroundLogLuminance: 0,
            backgroundLogLuminance: 0,
            weberContrast: 0,
            foregroundRMSContrast: 0,
            backgroundRMSContrast: 0,
            exposureValue: 0
        };
    }
}

export function calculateLightMetrics(canvas, landmarks, foregroundIndices, backgroundIndices) {
    try {
        const foregroundRegion = extractRegionFromCanvas(canvas, landmarks, foregroundIndices);
        const backgroundRegion = extractRegionFromCanvas(canvas, landmarks, backgroundIndices);

        if (!foregroundRegion || !backgroundRegion) {
            return {
                foregroundLuminance: 0,
                backgroundLuminance: 0,
                foregroundLogLuminance: 0,
                backgroundLogLuminance: 0,
                weberContrast: 0,
                foregroundRMSContrast: 0,
                backgroundRMSContrast: 0,
                exposureValue: 0
            };
        }

        const foregroundLuminanceValues = calculateLuminanceY(foregroundRegion.imageData, foregroundRegion.mask);
        const backgroundLuminanceValues = calculateLuminanceY(backgroundRegion.imageData, backgroundRegion.mask);

        const foregroundLuminance = calculateAverageLuminance(foregroundLuminanceValues);
        const backgroundLuminance = calculateAverageLuminance(backgroundLuminanceValues);

        const foregroundLogLuminance = calculateLogAverageLuminance(foregroundLuminanceValues);
        const backgroundLogLuminance = calculateLogAverageLuminance(backgroundLuminanceValues);

        const weberContrast = calculateWeberContrast(foregroundLuminance, backgroundLuminance);
        const foregroundRMSContrast = calculateRMSContrast(foregroundLuminanceValues);
        const backgroundRMSContrast = calculateRMSContrast(backgroundLuminanceValues);
        const exposureValue = calculateExposureValue(foregroundLuminance, backgroundLuminance);

        return {
            foregroundLuminance,
            backgroundLuminance,
            foregroundLogLuminance,
            backgroundLogLuminance,
            weberContrast,
            foregroundRMSContrast,
            backgroundRMSContrast,
            exposureValue
        };
    } catch (error) {
        return {
            foregroundLuminance: 0,
            backgroundLuminance: 0,
            foregroundLogLuminance: 0,
            backgroundLogLuminance: 0,
            weberContrast: 0,
            foregroundRMSContrast: 0,
            backgroundRMSContrast: 0,
            exposureValue: 0
        };
    }
}