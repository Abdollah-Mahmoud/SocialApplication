import { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import { decodeToken, TokenEnum } from "../../utils/security/token.security";
import { IAuthSocket } from "./gatway.interface";
import { ChatGateway } from "../chat";
import { BadRequestException } from "../../utils/response/error.response";

export const connectedSockets = new Map<string, string[]>();
let io: undefined | Server = undefined;

export const initializeIo = (httpServer: HttpServer) => {
  // initializing io
  io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  //middleware, listen on => http://localhost:3000/
  io.use(async (socket: IAuthSocket, next) => {
    try {
      const { user, decoded } = await decodeToken({
        authorization: socket.handshake?.auth.authorization || "",
        tokenType: TokenEnum.access,
      });
      const userTabs = connectedSockets.get(user._id.toString()) || [];
      userTabs.push(socket.id);
      connectedSockets.set(user._id.toString(), userTabs);
      socket.credentials = { user, decoded };
      next();
    } catch (error: any) {
      next(error);
    }
  });

  // logout
  function disconnection(socket: IAuthSocket) {
    return socket.on("disconnect", () => {
      const userId = socket.credentials?.user._id?.toString() as string;
      let remainingTabs =
        connectedSockets.get(userId)?.filter((tab: string) => {
          return tab !== socket.id;
        }) || [];

      if (remainingTabs?.length) {
        connectedSockets.set(userId, remainingTabs);
      } else {
        connectedSockets.delete(userId);
        getIo().emit("offline_user", userId);
      }
      console.log(`Logout ::: ${socket.id}`);
      console.log({ "After logout": connectedSockets });
    });
  }

  // listen on => http://localhost:3000/
  const chatGateway: ChatGateway = new ChatGateway();
  io.on("connection", (socket: IAuthSocket) => {
    console.log({ connectedSockets });
    chatGateway.register(socket, getIo());
    disconnection(socket);
  });
};

export const getIo = (): Server => {
  if (!io) {
    throw new BadRequestException("fail to establish server socket io");
  }
  return io;
};
