import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

// interface DeviceData {
//   deviceId: string;
//   name: string;
//   uniqueId: string;
//   speed: number;
//   attributes: {
//     ignition: boolean;
//     totalDistance: number;
//   };
//   lastUpdate: string;
//   runningDuration?: string;
//   tripDistance?: number;
//   matchesSearch?: boolean;
// }

export const useSocket = (serverUrl: string) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const newSocket = io(serverUrl, {
      transports: ["websocket"],
      timeout: 20000,
    });

    newSocket.on("connect", () => {
      console.log("Connected to server");
      setConnected(true);
      setError(null);
    });

    newSocket.on("disconnect", (reason) => {
      console.log(`Disconnected: ${reason}`);
      setConnected(false);
    });

    newSocket.on("error", (error) => {
      console.error("Socket error:", error);
      setError(error.message || "Socket connection error");
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [serverUrl]);

  return { socket, connected, error };
};
