# FaceLandmarker Color Zone Analysis – Quick Start

This module captures video from a webcam and analyzes facial color zones in real time. It uses ONNX runtime and returns a structured payload per frame.

## Installation

1. **Include ONNX Runtime in your HTML:**

```html
<script src="https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js"></script>
```

2. **Add the Required HTML Structure:**

```html
<button id="startBtn">Start Analysis</button>

<div class="layout-container" style="display:none;">
  <div class="camera-container">
    <video id="webcam" autoplay muted playsinline></video>
    <canvas id="output_canvas"></canvas>
    <canvas class="grid_canvas"></canvas>
  </div>
  <div id="info-panel" class="info-panel">
    <h2>Color Zone Analysis</h2>
  </div>
</div>
```

3. **Include and Use the Module:**

```html
<script type="module">  

   //RECOMMENDED TO SETUP THIS URL AS A PARAMETER SO LATER WE HAVE STAGES
  import { initFaceLandmarker } from 'https://swatched-development.github.io/evaluation_tools/realtime/main.js';

  document.getElementById('startBtn').addEventListener('click', () => {
    document.querySelector('.layout-container').style.display = 'flex';
    document.getElementById('startBtn').style.display = 'none';

    initFaceLandmarker((result) => {
      console.log("Analysis Result:", result);
    });
  });
</script>
```

## Callback Payload

The callback passed to `initFaceLandmarker` receives an object like this per frame:

```js
{
  vitSkinTone: string,
  estimatedLValue: number,
  undertoneHistogram: number[],
  hairColor: string,
  skinConcerns: string[]
}
```

## Notes

* Ensure the page is served via HTTPS for webcam access.
* Tested on modern browsers with webcam permissions granted.

