export const FACE_SHAPES_CLASSES = ["Heart", "Oblong", "Oval", "Round", "Square"];
export const SKIN_COLOR_CLASSES = ["Light", "TAN", "Medium", "Deep", "Dark", "Fair"];
export class VITInferenceWeb {
    constructor(modelPath, classes) {
        this.classes = classes;
        this.sessionPromise = ort.InferenceSession.create(modelPath);
    }

    async classify(canvas) {
        const session = await this.sessionPromise;
        const inputTensor = this._preprocessCanvasImage(canvas);
        const feeds = { input: inputTensor };
        const results = await session.run(feeds);
        const output = results.output.data;

        const maxIndex = output.reduce((bestIdx, val, idx, arr) =>
            val > arr[bestIdx] ? idx : bestIdx, 0);

        return this.classes[maxIndex];
    }

    _preprocessCanvasImage(canvas) {
        const ctx = canvas.getContext("2d");
        const imageData = ctx.getImageData(0, 0, 288, 288);

        // Recorte al centro de 256x256
        const startX = (288 - 256) / 2;
        const startY = (288 - 256) / 2;
        const cropped = ctx.getImageData(startX, startY, 256, 256);
        const data = cropped.data;

        // Normalizar y reordenar [R,G,B] -> [C,H,W]
        const imgFloat = new Float32Array(3 * 256 * 256);
        for (let i = 0; i < 256 * 256; i++) {
            imgFloat[i] = data[i * 4] / 255.0;                // R
            imgFloat[i + 256 * 256] = data[i * 4 + 1] / 255.0; // G
            imgFloat[i + 2 * 256 * 256] = data[i * 4 + 2] / 255.0; // B
        }

        return new ort.Tensor('float32', imgFloat, [1, 3, 256, 256]);
    }
}
