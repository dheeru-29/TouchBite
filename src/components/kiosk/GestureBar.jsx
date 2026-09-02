import GestureCamera from '../gesture/GestureCamera';
import GestureStatus from '../gesture/GestureStatus';

const guidance = {
  welcome: ['✋', 'Hold an open palm to begin'],
  'order-type': ['↔', 'Swipe to choose · Hold 👍 to confirm'],
  'category-menu': ['↕', 'Flick to browse · Hold 👍 to confirm'],
  browse: ['↔', 'Swipe to browse · 💍 ring finger for menu'],
  'item-selected': ['🤙', 'Pinky-drag to cart · Pinch to set quantity'],
  'item-qty': ['↕', 'Flick to change quantity · Pinch to exit'],
  cart: ['👍', 'Hold to pay · Swipe down to close'],
  payment: ['↔', 'Swipe to choose · Hold 👍 to pay'],
  success: ['↓', 'Swipe down to start a new order'],
};

export default function GestureBar({
  mode = 'browse',
  cameraStatus = 'inactive',
  gestureEnabled = true,
  videoRef,
  cameraError,
  thumbProgress = 0,
  handVisible = false,
  onRetryCamera,
}) {
  const [icon, message] = guidance[mode] || guidance.browse;

  return (
    <aside className="gesture-bar">
      <div className="gesture-bar__content">
        <span className="gesture-bar__pulse" />
        <span className="gesture-bar__icon">{icon}</span>
        <span>{message}</span>
      </div>
      <GestureStatus cameraStatus={cameraStatus} gestureEnabled={gestureEnabled} cameraError={cameraError} />
      <GestureCamera
        videoRef={videoRef}
        status={cameraStatus}
        mirrored
        progress={thumbProgress}
        handVisible={handVisible}
        onRetry={onRetryCamera}
        style={{ display: gestureEnabled ? 'block' : 'none' }}
      />
    </aside>
  );
}
