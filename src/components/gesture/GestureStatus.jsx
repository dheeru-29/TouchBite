export default function GestureStatus({ cameraStatus = 'inactive', gestureEnabled = false, cameraError = '' }) {
  const statusLabel =
    cameraError ||
    (cameraStatus === 'active'
      ? 'Camera active'
      : cameraStatus === 'permission'
      ? 'Camera permission required'
      : cameraStatus === 'loading'
      ? 'Starting camera…'
      : 'Camera unavailable');

  return (
    <div className="gesture-status">
      <span className={`gesture-status__dot gesture-status__dot--${cameraStatus}`} />
      <div>
        <strong>{statusLabel}</strong>
        <small>{gestureEnabled ? 'Gesture control on' : 'Gesture control off'}</small>
      </div>
    </div>
  );
}
