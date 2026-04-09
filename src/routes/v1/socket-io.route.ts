import { Router } from "express";
import { SocketController } from "@/controllers/v1/socket.controller";

const router = Router();
router.get("/status", (req, res) => {
  const io = SocketController.getIO();
  const connectedSockets = io ? io.of('/socket').sockets.size : 0;
  res.json({
    status: "running",
    connectedClients: connectedSockets,
  });
});

export default router;