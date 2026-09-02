import { useEffect, useRef } from 'react';

export default function GestureCamera({ videoRef, status = 'inactive', mirrored = true, style = {}, progress = 0, handVisible = false, onRetry }) {
  const localRef = useRef(null);
  const resolvedRef = videoRef || localRef;

  useEffect(() => {
    if (!resolvedRef.current) return;
    resolvedRef.current.setAttribute('playsinline', 'true');
    resolvedRef.current.muted = true;
    resolvedRef.current.autoplay = true;
  }, [resolvedRef]);

  return (
    <div className={`gesture-camera gesture-camera--${status}`} style={style}>
      <video ref={resolvedRef} className={mirrored ? 'is-mirrored' : ''} />
      <span className={`gesture-camera__hand-dot${handVisible ? ' gesture-camera__hand-dot--visible' : ''}`} />
      {progress > 0 && <div className="gesture-camera__progress" style={{ width: `${progress}%` }} />}
      {(status === 'permission' || status === 'unavailable') && (
        <button type="button" className="gesture-camera__retry" onClick={onRetry}>
          {status === 'permission' ? 'Allow camera' : 'Retry'}
        </button>
      )}
    </div>
  );
}
