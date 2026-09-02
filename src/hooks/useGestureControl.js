import { useCallback, useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { createEngineState, resetEngineState, stepGestureEngine } from '../gestures/gestureEngine.js';
import { gestureConfig } from '../gestures/gestureConfig.js';
import { playIntentSound } from '../gestures/sfx.js';

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

/*
 * `mode` and `context` describe *what the current screen means* to the
 * gesture engine (see gestureEngine.js for the mode list). They're read via
 * refs on every frame so the camera/MediaPipe loop below never has to be
 * torn down and rebuilt when the user simply moves between screens.
 */
export function useGestureControl({ enabled = false, mode = 'browse', context = {}, onIntent }) {
  const videoRef = useRef(null);
  const landmarkerRef = useRef(null);
  const animationFrameRef = useRef(null);
  const engineStateRef = useRef(createEngineState());
  const streamRef = useRef(null);
  const hasInitializedRef = useRef(false);
  const enabledRef = useRef(enabled);
  const modeRef = useRef(mode);
  const contextRef = useRef(context);
  const onIntentRef = useRef(onIntent);
  const lastModeRef = useRef(mode);

  const [cameraStatus, setCameraStatus] = useState('inactive');
  const [cameraError, setCameraError] = useState('');
  const [isReady, setIsReady] = useState(false);
  const [handVisible, setHandVisible] = useState(false);
  const [gestureUi, setGestureUi] = useState({ cursor: { x: 50, y: 50 }, thumbProgress: 0, dragActive: false });
  const [lastIntent, setLastIntent] = useState('None');

  enabledRef.current = enabled;
  modeRef.current = mode;
  contextRef.current = context;
  onIntentRef.current = onIntent;

  // A mode change means the previous held pose is no longer relevant — reset
  // dwell counters so switching screens can't "inherit" a half-held gesture.
  if (lastModeRef.current !== mode) {
    lastModeRef.current = mode;
    resetEngineState(engineStateRef.current);
  }

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const initializeHandLandmarker = useCallback(async () => {
    if (hasInitializedRef.current) return true;
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return false;

    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      const handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL },
        numHands: 1,
        runningMode: 'VIDEO',
      });
      landmarkerRef.current = handLandmarker;
      hasInitializedRef.current = true;
      setIsReady(true);
      return true;
    } catch (error) {
      console.error('[Gesture] HandLandmarker init failed', error);
      setCameraStatus('unavailable');
      setCameraError('Gesture control unavailable');
      return false;
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('unavailable');
      setCameraError('Camera not supported in this browser');
      return false;
    }

    const video = videoRef.current;
    if (!video) return false;

    setCameraStatus('loading');
    setCameraError('');

    try {
      if (streamRef.current) stopStream();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });

      streamRef.current = stream;
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();
      setCameraStatus('active');
      return true;
    } catch (error) {
      console.error('[Gesture] Camera error:', error.name, error.message);
      setCameraStatus(error.name === 'NotAllowedError' ? 'permission' : 'unavailable');
      setCameraError(
        error.name === 'NotAllowedError'
          ? 'Camera permission required — allow camera access and reload'
          : error.name === 'NotFoundError'
          ? 'No camera found on this device'
          : 'Could not start the camera'
      );
      return false;
    }
  }, [stopStream]);

  const stopCamera = useCallback(() => {
    stopStream();
    setCameraStatus('inactive');
  }, [stopStream]);

  const retryCamera = useCallback(() => {
    startCamera();
  }, [startCamera]);

  useEffect(() => {
    let isMounted = true;
    let retryId = null;
    let lastTimestamp = 0;

    const boot = async () => {
      const ready = await initializeHandLandmarker();
      if (!isMounted || !ready) return;

      const attempt = async () => {
        if (!videoRef.current) {
          retryId = requestAnimationFrame(attempt);
          return;
        }

        const started = await startCamera();
        if (isMounted && started) {
          const handleFrame = (timestamp) => {
            if (!isMounted || !enabledRef.current) {
              animationFrameRef.current = requestAnimationFrame(handleFrame);
              return;
            }

            if (timestamp - lastTimestamp >= gestureConfig.detectEveryMs) {
              lastTimestamp = timestamp;
              const video = videoRef.current;

              if (video && streamRef.current && video.srcObject !== streamRef.current) {
                video.srcObject = streamRef.current;
                video.muted = true;
                video.playsInline = true;
                video.play().catch(() => {});
              }

              if (video?.readyState >= 2 && landmarkerRef.current) {
                try {
                  const results = landmarkerRef.current.detectForVideo(video, timestamp);
                  const hand = results.landmarks?.[0];

                  if (hand) {
                    setHandVisible(true);
                    const frame = stepGestureEngine(engineStateRef.current, hand, modeRef.current, timestamp, contextRef.current);
                    setGestureUi({ cursor: frame.cursor, thumbProgress: frame.thumbProgress, dragActive: frame.dragActive });
                    if (frame.intents.length) {
                      frame.intents.forEach((intent) => {
                        setLastIntent(intent);
                        playIntentSound(intent, { isPayment: modeRef.current === 'payment' });
                        onIntentRef.current?.(intent);
                      });
                    }
                  } else {
                    setHandVisible(false);
                    resetEngineState(engineStateRef.current);
                    setGestureUi((prev) => ({ ...prev, thumbProgress: 0, dragActive: false }));
                  }
                } catch (error) {
                  console.warn('[Gesture] Detection error:', error.message);
                }
              }
            }

            animationFrameRef.current = requestAnimationFrame(handleFrame);
          };

          animationFrameRef.current = requestAnimationFrame(handleFrame);
        } else if (isMounted) {
          retryId = requestAnimationFrame(attempt);
        }
      };

      attempt();
    };

    boot();

    return () => {
      isMounted = false;
      if (retryId) cancelAnimationFrame(retryId);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      stopCamera();
      if (landmarkerRef.current?.close) landmarkerRef.current.close();
      landmarkerRef.current = null;
      hasInitializedRef.current = false;
      setIsReady(false);
    };
    // Intentionally only re-runs on mount/unmount — mode/context/onIntent are
    // read from refs so switching screens never restarts the camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    videoRef,
    cameraStatus,
    cameraError,
    isReady,
    handVisible,
    cursor: gestureUi.cursor,
    thumbProgress: gestureUi.thumbProgress,
    dragActive: gestureUi.dragActive,
    lastIntent,
    gestureEnabled: enabled,
    retryCamera,
  };
}
