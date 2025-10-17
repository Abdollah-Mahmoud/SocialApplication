// setup env
import { resolve } from "node:path";
import { config } from "dotenv";
config({ path: resolve("./config/.env.development") });

import path from "path";

// load express and its types
import type { Request, Response, Express } from "express";
import express from "express";

// third party middleware
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";

import {
  authRouter,
  userRouter,
  postRouter,
  initializeIo,
  schema,
} from "./modules";

import {
  BadRequestException,
  globalErrorHandling,
} from "./utils/response/error.response";
import connectDB from "./db/db.connection";
import { createGetPreSignedLink, getFile } from "./utils/multer/s3.config";
import { promisify } from "node:util";
import { pipeline } from "node:stream";
import { chatRouter } from "./modules/chat";
const createS3WriteStreamPipe = promisify(pipeline);
import { createHandler } from "graphql-http/lib/use/express";
import { authentication } from "./middleware/authentication.middleware";

// handles api ratelimit on api requests
const limiter = rateLimit({
  windowMs: 60 * 60000,
  limit: 2000,
  message: { error: "Too many requests try again later" },
  statusCode: 429,
});

// app start point
const bootstrap = async (): Promise<void> => {
  const port: number | string = process.env.PORT || 5000;
  const app: Express = express();

  // global middleware
  app.use(cors());
  app.use(express.json());
  app.use(helmet());
  app.use(limiter);

  app.all(
    "/graphql",
    authentication(),
    createHandler({
      schema: schema,
      context: (req) => ({ user: req.raw.user }),
    })
  );

  // Serve node_modules for FE
  app.use("/static", express.static(path.join(__dirname, "node_modules")));

  // app routing
  app.get("/", (req: Request, res: Response) => {
    res.json({
      message: `welcome to ${process.env.APPLICATION_NAME} backend landing page`,
    });
  });

  //subapp routing modules
  app.use("/auth", authRouter);
  app.use("/user", userRouter);
  app.use("/post", postRouter);
  app.use("/chat", chatRouter);

  // get assets
  app.get(
    "/upload/pre-signed/*path",
    async (req: Request, res: Response): Promise<Response> => {
      const {
        downloadName,
        download = "false",
        expiresIn = 120,
      } = req.query as {
        downloadName?: string;
        download?: string;
        expiresIn?: number;
      };
      const { path } = req.params as unknown as { path: string[] };
      const Key = path.join("/");
      const url = await createGetPreSignedLink({
        Key,
        downloadName: downloadName as string,
        download,
        expiresIn,
      });

      return res.json({ message: "Done", data: { url } });
    }
  );
  app.get(
    "/upload/*path",
    async (req: Request, res: Response): Promise<void> => {
      const { downloadName, download = "false" } = req.query as {
        downloadName?: string;
        download?: string;
      };
      const { path } = req.params as unknown as { path: string[] };
      const Key = path.join("/");
      const s3Response = await getFile({ Key });
      if (!s3Response?.Body) {
        throw new BadRequestException("failed to fetch asset");
      }

      res.set("Cross-Origin-Resource-Policy", "cross-origin");

      res.setHeader(
        "Content-type",
        `${s3Response.ContentType || "application/octet-stream"}`
      );

      if (download === "true") {
        res.setHeader(
          "Content-Disposition",
          `attachement; filename="${downloadName || Key.split("/").pop()}"`
        );
      }

      return await createS3WriteStreamPipe(
        s3Response.Body as NodeJS.ReadableStream,
        res
      );
    }
  );

  // invalid routing
  app.use("{/*dummy}", (req: Request, res: Response) => {
    return res.status(404).json({ message: "invalid routing" });
  });
  // global error handling
  app.use(globalErrorHandling);

  // db
  await connectDB();

  // start server
  const httpServer = app.listen(port, () => {
    console.log(`server is running on port ====== ${port}`);
  });
  initializeIo(httpServer);
};

export default bootstrap;
