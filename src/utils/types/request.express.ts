import { JwtPayload } from "jsonwebtoken";
import { HUserDocument } from "../../db/model/User.model";

declare module "express-serve-static-core" {
  interface Request {
    user?: HUserDocument;
    decoded?: JwtPayload;
  }
}
