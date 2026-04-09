import { createServer } from 'http';
import { Server } from 'socket.io';
import app from '@/app';
import { config } from '@/config/env';
import { SocketController } from '@/controllers/v1/socket.controller';
import { BookingProgressService } from '@/services/v1/booking-progress.service';
import { TelegramService } from '@/services/telegram/telegram.service';

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  },
  transports: ['polling', 'websocket'],
});

// Socket logikasini controller ga berish
SocketController.init(io);

async function startServer() {
  BookingProgressService.startMonitor();

  httpServer.listen(config.PORT, '0.0.0.0', () => {
    console.log(
      `🚀 Server is running on port: http://${config.HOST}:${config.PORT}`,
    );
    // Keep HTTP startup independent from Telegram reachability.
    void TelegramService.init().catch((error) => {
      console.error('Telegram startup failed:', error);
    });
  });
}

startServer();
