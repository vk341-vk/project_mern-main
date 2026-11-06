let isModelLoaded = false;
let isLoading = false;

const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';

export const faceService = {
  isReady() {
    return isModelLoaded && !!window.faceapi;
  },

  async loadModels() {
    if (isModelLoaded) return true;
    if (isLoading) {
      // wait until loaded
      while (isLoading) {
        await new Promise((r) => setTimeout(r, 100));
      }
      return isModelLoaded;
    }

    isLoading = true;
    try {
      // Wait for faceapi script tag if still downloading
      await new Promise((resolve) => {
        if (window.faceapi) return resolve();
        const check = setInterval(() => {
          if (window.faceapi) {
            clearInterval(check);
            resolve();
          }
        }, 150);
        setTimeout(() => {
          clearInterval(check);
          resolve();
        }, 8000);
      });

      if (!window.faceapi) {
        throw new Error('face-api.js library could not be loaded from CDN.');
      }

      const faceapi = window.faceapi;
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);

      isModelLoaded = true;
      isLoading = false;
      return true;
    } catch (err) {
      console.warn('[Clearpoint Face] Model load failed, fallback enabled:', err.message);
      isLoading = false;
      isModelLoaded = false;
      return false;
    }
  },

  async detectDescriptor(videoEl, minScore = 0.72) {
    if (!this.isReady() || !videoEl) {
      throw new Error('Face recognition model not ready or video not initialized.');
    }

    const faceapi = window.faceapi;
    const detection = await faceapi
      .detectSingleFace(videoEl, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      return { detected: false, message: 'No face detected in video frame.' };
    }

    if (detection.detection.score < minScore) {
      return {
        detected: false,
        score: detection.detection.score,
        message: `Low detection confidence (${Math.round(detection.detection.score * 100)}%). Please face the camera directly in good lighting.`
      };
    }

    return {
      detected: true,
      score: detection.detection.score,
      descriptor: Array.from(detection.descriptor)
    };
  },

  matchFace(queryDescriptor, peopleList, threshold = 0.5) {
    if (!queryDescriptor || !peopleList || !peopleList.length) {
      return null;
    }

    const faceapi = window.faceapi;
    const queryArray = new Float32Array(queryDescriptor);
    let bestPerson = null;
    let minDistance = 999;

    for (const person of peopleList) {
      if (!person.faceDescriptor || person.faceDescriptor === 'SIMULATED') continue;
      const enrolledArray = new Float32Array(person.faceDescriptor);
      const dist = faceapi
        ? faceapi.euclideanDistance(queryArray, enrolledArray)
        : this.euclideanDistance(queryArray, enrolledArray);

      if (dist < minDistance) {
        minDistance = dist;
        bestPerson = person;
      }
    }

    if (bestPerson && minDistance < threshold) {
      return { person: bestPerson, distance: minDistance, confidence: Math.round((1 - minDistance) * 100) };
    }

    return null;
  },

  euclideanDistance(arr1, arr2) {
    let sum = 0;
    for (let i = 0; i < arr1.length; i++) {
      const diff = arr1[i] - arr2[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }
};
