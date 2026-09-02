import { Server } from 'socket.io';
import { verifyAdminToken } from '../middleware/authMiddleware.js';

let ioInstance = null;

export function initRealtime(httpServer, allowedOrigins) {
  const io = new Server(httpServer, {
    cors: { origin: allowedOrigins, credentials: true },
  });

  // A dedicated namespace for the merchant dashboard. Nothing about the
  // customer kiosk connects here, and the handshake itself is rejected
  // unless a valid admin JWT is presented — so simply knowing the socket URL
  // gets you nothing without real admin credentials.
  const adminNamespace = io.of('/admin');

  adminNamespace.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) throw new Error('Missing token');
      const payload = verifyAdminToken(token);
      socket.admin = { id: payload.sub, email: payload.email };
      next();
    } catch (error) {
      next(new Error('Unauthorized'));
    }
  });

  adminNamespace.on('connection', (socket) => {
    socket.join('admins');
    socket.on('disconnect', () => {});
  });

  ioInstance = adminNamespace;
  return io;
}

export function emitNewOrder(order) {
  ioInstance?.to('admins').emit('order:new', order);
}

export function emitOrderUpdated(order) {
  ioInstance?.to('admins').emit('order:updated', order);
}
