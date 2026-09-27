import 'dotenv/config';
import { io, Socket } from 'socket.io-client';
import { PrintAgent } from './agent';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const AGENT_TOKEN = process.env.AGENT_TOKEN || 'print-agent-dev-token-change-in-production';
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || '3000', 10);

const agent = new PrintAgent();

let socket: Socket;
let reconnectTimer: NodeJS.Timeout | null = null;
let pollTimer: NodeJS.Timeout | null = null;

function connect() {
  console.log(`🖨️ Print Agent starting...`);
  console.log(`📡 Connecting to: ${BACKEND_URL}`);
  console.log(`🔧 Adapter: ${process.env.PRINT_ADAPTER || 'MOCK'}`);
  console.log(`🖨️ Printer: ${process.env.PRINTER_NAME || '(system default)'}`);

  socket = io(BACKEND_URL, {
    reconnection: false,
    timeout: 10000,
  });

  socket.on('connect', () => {
    console.log('✅ Connected to backend');
    socket.emit('agent:connect', AGENT_TOKEN);
  });

  socket.on('agent:connected', (data: { success: boolean; error?: string }) => {
    if (data.success) {
      console.log('🔒 Print agent authenticated');
      startPolling();
    } else {
      console.error('❌ Authentication failed:', data.error);
      socket.disconnect();
    }
  });

  // Listen for new print jobs via Socket.IO
  socket.on('printjob:new', async (job: { id: string }) => {
    console.log(`📋 New job notification: ${job.id}`);
    await agent.processPendingJobs();
  });

  socket.on('disconnect', (reason) => {
    console.log(`⚡ Disconnected: ${reason}`);
    stopPolling();
    scheduleReconnect();
  });

  socket.on('connect_error', (err) => {
    console.error(`❌ Connection error: ${err.message}`);
    scheduleReconnect();
  });
}

function startPolling() {
  if (pollTimer) return;
  console.log(`⏱️ Starting job polling every ${POLL_INTERVAL}ms`);
  
  // Initial check
  agent.processPendingJobs().catch(console.error);
  
  pollTimer = setInterval(async () => {
    await agent.processPendingJobs();
  }, POLL_INTERVAL);
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  console.log('🔄 Reconnecting in 5 seconds...');
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect();
  }, 5000);
}

// Start the agent
connect();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Print agent shutting down...');
  stopPolling();
  if (reconnectTimer) clearTimeout(reconnectTimer);
  if (socket) socket.disconnect();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopPolling();
  if (socket) socket.disconnect();
  process.exit(0);
});
