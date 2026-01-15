# Real-time Facial Analysis

## Required HTML Elements

Add these elements to your HTML page:
```html
<!-- Video element for webcam feed -->
<video id="webcam" autoplay muted playsinline></video>
<!-- Canvas for face detection overlay -->
<canvas id="output_canvas"></canvas>
```

## Face Mesh Control

The library includes a face tesselation grid overlay that shows facial landmarks and mesh structure. This can be controlled programmatically:

```javascript
import { setMaskEnabled } from './main.js';

// Enable face grid (default)
setMaskEnabled(true);

// Disable face grid
setMaskEnabled(false);
```

### UI Toggle Example

Add a toggle button to your HTML:
```html
<button id="toggleMaskBtn">Toggle Face Grid</button>
```

Connect it with JavaScript:
```javascript
let maskEnabled = true;
document.getElementById('toggleMaskBtn').addEventListener('click', () => {
  maskEnabled = !maskEnabled;
  setMaskEnabled(maskEnabled);

  const button = document.getElementById('toggleMaskBtn');
  button.textContent = maskEnabled ? 'Hide Face Grid' : 'Show Face Grid';
});
```

## Usage

```javascript
// Import the library functions
import { initFaceLandmarker, enableCamera, stopCamera, setMaskEnabled } from './main.js';

// Initialize facial analysis with your callbacks
await initFaceLandmarker(
  onResult,            // Called every 4 seconds with analysis results
  false,               // skipEnableCamera - set to false to auto-start camera
  "your-tx-id",        // transaction ID for tracking
  "dev",               // environment: "dev", "stg", "prod"
  onPerFrame           // Called every frame with real-time data
);

function onResult(result) {
  // This function receives final analysis results every 4 seconds
  console.log(result.vitSkinTone);        // Skin tone classification: "Light", "Medium", "Dark", etc.
  console.log(result.undertoneHistogram); // Undertone distribution: {warm: 0.3, cool: 0.5, neutral: 0.2}
  console.log(result.goodFrame);          // Frame quality assessment: true/false
  console.log(result.yawAngle);           // Face rotation left/right in degrees
  console.log(result.pitchAngle);         // Face rotation up/down in degrees
  console.log(result.rollAngle);          // Face tilt in degrees
  console.log(result.topColors);          // Array of dominant RGB colors from face
  console.log(result.transactionId);      // Your transaction ID echoed back
}

function onPerFrame(frameData) {
  // This function receives real-time data for every video frame
  console.log(frameData.boundingBox);     // Face bounding box: {x, y, w, h, areaRatio}
  console.log(frameData.faceAngles);      // Real-time face angles: {yaw, pitch, roll} in degrees
  console.log(frameData.lightMetrics);    // Lighting analysis: {foregroundLuminance, backgroundLuminance, weberContrast, exposureValue}
  console.log(frameData.rgbColors);       // Array of RGB colors extracted from different face zones
}

// Manual camera control (optional - camera starts automatically by default)
enableCamera();  // Start camera feed
stopCamera();    // Stop camera feed and release resources
```