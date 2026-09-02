export default function GestureDebugOverlay({ status = 'inactive', gesture = 'No gesture', confidence = 0, fps = 0 }) {
  if (!import.meta.env.DEV) return null;

  return (
    <div className="gesture-debug">
      <strong>Gesture debug</strong>
      <span>Camera: {status}</span>
      <span>Gesture: {gesture}</span>
      <span>Confidence: {confidence.toFixed(2)}</span>
      <span>FPS: {fps}</span>
    </div>
  );
}
