export const MIN_DETECTION_SCORE = 0.72;
export const FACE_MATCH_THRESHOLD = 0.50;

let faceApiLoaded = false;
let loadingPromise = null;

export const initFaceApi = async () => {
  if (faceApiLoaded) return true;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      // Wait for script to attach to window
      const checkInterval = 100;
      let waited = 0;
      while (!window.faceapi && waited < 10000) {
        await new Promise((r) => setTimeout(r, checkInterval));
        waited += checkInterval;
      }

      if (!window.faceapi) {
        console.warn('[FaceAPI] Script not found on window.');
        return false;
      }

      const MODEL_URL = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';

      await Promise.all([
        window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);

      faceApiLoaded = true;
      console.log('[FaceAPI] Tiny face detector, landmarks, and recognition weights loaded!');
      return true;
    } catch (err) {
      console.warn('[FaceAPI] Error loading face-api weights:', err);
      faceApiLoaded = false;
      return false;
    }
  })();

  return loadingPromise;
};

export const isFaceApiReady = () => faceApiLoaded;

export const detectFaceDescriptor = async (videoElement) => {
  if (!faceApiLoaded || !window.faceapi) {
    throw new Error('Face API is not ready.');
  }

  const detection = await window.faceapi
    .detectSingleFace(videoElement, new window.faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptor();

  return detection;
};

export const computeEuclideanDistance = (descriptorA, descriptorB) => {
  if (!window.faceapi) {
    // Fallback mathematical euclidean distance
    let sum = 0;
    for (let i = 0; i < descriptorA.length; i++) {
      const diff = descriptorA[i] - descriptorB[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }
  return window.faceapi.euclideanDistance(descriptorA, descriptorB);
};

export const findBestFaceMatch = (detectedDescriptor, peopleList, threshold = FACE_MATCH_THRESHOLD) => {
  let bestPerson = null;
  let minDistance = 999;

  for (const person of peopleList) {
    if (!person.faceDescriptor || person.faceDescriptor === 'SIMULATED') continue;
    
    // Ensure array of floats
    const enrolledArray = Array.isArray(person.faceDescriptor)
      ? new Float32Array(person.faceDescriptor)
      : null;

    if (!enrolledArray) continue;

    const distance = computeEuclideanDistance(detectedDescriptor, enrolledArray);
    if (distance < minDistance) {
      minDistance = distance;
      bestPerson = person;
    }
  }

  if (bestPerson && minDistance < threshold) {
    return { match: bestPerson, distance: minDistance };
  }

  return { match: null, distance: minDistance };
};
