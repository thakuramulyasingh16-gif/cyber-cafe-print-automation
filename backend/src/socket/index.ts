import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

let io: SocketIOServer;

export function setupSocketIO(socketIO: SocketIOServer) {
  io = socketIO;

  socketIO.on('connection', (socket: Socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Authenticate admin sockets
    socket.on('authenticate', (token: string) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as {
          id: string;
          role: string;
        };
        socket.data.userId = decoded.id;
        socket.data.role = decoded.role;
        socket.join('admin-room');
        socket.emit('authenticated', { success: true });
        console.log(`🔒 Admin socket authenticated: ${socket.id}`);
      } catch {
        socket.emit('authenticated', { success: false, error: 'Invalid token' });
      }
    });

    // Print agent socket
    socket.on('agent:connect', (agentToken: string) => {
      const expectedToken = process.env.PRINT_AGENT_TOKEN || 'print-agent-dev-token-change-in-production';
      if (agentToken === expectedToken) {
        socket.join('print-agents');
        socket.emit('agent:connected', { success: true });
        console.log(`🖨️ Print agent connected: ${socket.id}`);
      } else {
        socket.emit('agent:connected', { success: false, error: 'Invalid agent token' });
      }
    });

    // Customer can join an order room to get status updates
    socket.on('order:subscribe', (orderId: string) => {
      socket.join(`order-${orderId}`);
    });

    socket.on('order:unsubscribe', (orderId: string) => {
      socket.leave(`order-${orderId}`);
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });
}

// Emit order update to admin room and order-specific room
export function emitOrderUpdate(order: Record<string, unknown>) {
  if (!io) return;
  io.to('admin-room').emit('order:updated', order);
  if (order.id) {
    io.to(`order-${order.id}`).emit('order:updated', order);
  }
}

// Emit new order to admin
export function emitNewOrder(order: Record<string, unknown>) {
  if (!io) return;
  io.to('admin-room').emit('order:new', order);
}

// Emit print job update
export function emitPrintJobUpdate(job: Record<string, unknown>) {
  if (!io) return;
  io.to('admin-room').emit('printjob:updated', job);
  io.to('print-agents').emit('printjob:assigned', job);
  if (job.orderId) {
    io.to(`order-${job.orderId}`).emit('printjob:updated', job);
  }
}

// Emit dashboard stats update
export function emitDashboardUpdate() {
  if (!io) return;
  io.to('admin-room').emit('dashboard:refresh');
}

// Emit to print agents: new job available
export function emitNewPrintJob(job: Record<string, unknown>) {
  if (!io) return;
  io.to('print-agents').emit('printjob:new', job);
}
