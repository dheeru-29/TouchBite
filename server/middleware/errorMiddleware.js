export function notFound(req, res) { res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` }); }
export function errorHandler(error, req, res, next) { // eslint-disable-line no-unused-vars
  if (error.statusCode) return res.status(error.statusCode).json({ success: false, message: error.message });
  if (error.name === 'CastError') return res.status(400).json({ success: false, message: 'Invalid resource ID.' });
  if (error.name === 'ValidationError') return res.status(400).json({ success: false, message: error.message });
  console.error(error); return res.status(500).json({ success: false, message: 'Something went wrong while processing your request.' });
}
