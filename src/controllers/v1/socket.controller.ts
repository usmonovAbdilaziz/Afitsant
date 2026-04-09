import { OrderSessionService } from '@/services/v1/order-session.service';
import { RedisService } from '@/utils/redis';
import { Server, Socket } from 'socket.io';

type OrderStartPayload = string | { tableId?: string } | undefined;
type OrderStartSuccess = Awaited<
  ReturnType<typeof OrderSessionService.createOrderSession>
>;
type OrderStartAckPayload =
  | { success: true; data: OrderStartSuccess }
  | { success: false; error: { message: string } };

export class SocketController {
  private static io: Server;

  static init(io: Server) {
    SocketController.io = io;

    const socketNs = io.of('/socket');

    socketNs.on('connection', (socket: Socket) => {
      console.log('Client connected:', socket.id);

      const joinTableRoom = async (
        payload: string | { tableId?: string } | undefined,
      ) => {
        const tableId =
          typeof payload === 'string' ? payload : payload?.tableId ?? '';

        if (!tableId) {
          socket.emit('socket:error', {
            message: 'tableId is required',
          });
          return;
        }

        await RedisService.setSocketTable(socket.id, tableId);
        await RedisService.addSocketToTableSet(tableId, socket.id);

        await socket.join(`table:${tableId}`);
        socket.emit('joinedRoom', { tableId });
      };

      const joinBusinessRoom = async (
        payload: string | { businessId?: string } | undefined,
      ) => {
        const businessId =
          typeof payload === 'string' ? payload : payload?.businessId ?? '';

        if (!businessId) {
          socket.emit('socket:error', {
            message: 'businessId is required',
          });
          return;
        }

        await socket.join(`business:${businessId}`);
        socket.emit('joinedBusinessRoom', { businessId });
      };

      const joinClientRoom = async (
        payload: string | { clientId?: string } | undefined,
      ) => {
        const clientId =
          typeof payload === 'string' ? payload : payload?.clientId ?? '';

        if (!clientId) {
          socket.emit('socket:error', {
            message: 'clientId is required',
          });
          return;
        }

        await socket.join(`client:${clientId}`);
        socket.emit('joinedClientRoom', { clientId });
      };

      const joinBookingRoom = async (
        payload: string | { bookingId?: string } | undefined,
      ) => {
        const bookingId =
          typeof payload === 'string' ? payload : payload?.bookingId ?? '';

        if (!bookingId) {
          socket.emit('socket:error', {
            message: 'bookingId is required',
          });
          return;
        }

        await socket.join(`booking:${bookingId}`);
        socket.emit('joinedBookingRoom', { bookingId });
      };

      const joinStaffRoom = async (
        payload: string | { staffId?: string } | undefined,
      ) => {
        const staffId =
          typeof payload === 'string' ? payload : payload?.staffId ?? '';

        if (!staffId) {
          socket.emit('socket:error', {
            message: 'staffId is required',
          });
          return;
        }

        await socket.join(`staff:${staffId}`);
        socket.emit('joinedStaffRoom', { staffId });
      };

      const joinStaffRoleRoom = async (
        payload:
          | string
          | { businessId?: string; position?: string }
          | undefined,
      ) => {
        const businessId =
          typeof payload === 'string' ? '' : payload?.businessId ?? '';
        const position =
          typeof payload === 'string' ? payload : payload?.position ?? '';

        if (!businessId || !position) {
          socket.emit('socket:error', {
            message: 'businessId and position are required',
          });
          return;
        }

        const normalizedPosition = String(position).trim().toUpperCase();
        await socket.join(`staff-role:${businessId}:${normalizedPosition}`);
        socket.emit('joinedStaffRoleRoom', {
          businessId,
          position: normalizedPosition,
        });
      };

      socket.on('joinRoom', joinTableRoom);
      socket.on('join', joinTableRoom);
      socket.on('joinBusinessRoom', joinBusinessRoom);
      socket.on('joinBusiness', joinBusinessRoom);
      socket.on('joinClientRoom', joinClientRoom);
      socket.on('joinClient', joinClientRoom);
      socket.on('joinBookingRoom', joinBookingRoom);
      socket.on('joinBooking', joinBookingRoom);
      socket.on('joinStaffRoom', joinStaffRoom);
      socket.on('joinStaff', joinStaffRoom);
      socket.on('joinStaffRoleRoom', joinStaffRoleRoom);
      socket.on('joinStaffRole', joinStaffRoleRoom);

      socket.on(
        'order:start',
        async (
          data: OrderStartPayload,
          ack?: (payload: OrderStartAckPayload) => void,
        ) => {
          try {
            const tableId =
              typeof data === 'string' ? data : data?.tableId ?? '';
            const result = await OrderSessionService.createOrderSession(tableId);
            if (typeof ack === 'function') {
              ack({ success: true, data: result });
              return;
            }

            socket.emit('order:start:ack', { success: true, data: result });
          } catch (error: unknown) {
            const payload = {
              success: false,
              error: {
                message:
                  error instanceof Error
                    ? error.message
                    : 'Failed to start order session',
              },
            };

            if (typeof ack === 'function') {
              ack(payload);
              return;
            }

            socket.emit('order:start:ack', payload);
          }
        },
      );

      socket.on('disconnect', async () => {
        const tableId = await RedisService.getSocketTable(socket.id);
        if (tableId) {
          await RedisService.removeSocketFromTableSet(tableId, socket.id);
        }
        await RedisService.removeSocket(socket.id);
      });
    });
  }

  static getIO(): Server {
    return SocketController.io;
  }

  static emitToNamespace(event: string, data: unknown) {
    SocketController.io.of('/socket').emit(event, data);
  }
}
