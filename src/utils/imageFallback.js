// A tiny inline SVG (no network request, so it can't itself fail) used as a
// graceful stand-in if a specific product photo URL ever comes back broken.
// Better than the browser's default broken-image icon on a live kiosk.
const FALLBACK_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
      <rect width="400" height="300" fill="#f3ece3"/>
      <circle cx="200" cy="128" r="52" fill="none" stroke="#d8c9b8" stroke-width="6"/>
      <path d="M170 118h60M170 138h60" stroke="#d8c9b8" stroke-width="6" stroke-linecap="round"/>
      <text x="200" y="220" font-family="sans-serif" font-size="15" fill="#a99e93" text-anchor="middle">Photo coming soon</text>
    </svg>`
  );

export function handleImageError(event) {
  if (event.target.dataset.fallbackApplied) return;
  event.target.dataset.fallbackApplied = 'true';
  event.target.src = FALLBACK_IMAGE;
}
