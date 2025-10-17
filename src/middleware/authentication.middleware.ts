import type { NextFunction, Request, Response } from "express";
import { decodeToken, TokenEnum } from "../utils/security/token.security";
import {
  BadRequestException,
  ForbiddenException,
} from "../utils/response/error.response";
import { roleEnum } from "../db/model/User.model";
import { GraphQLError } from "graphql";

export const authentication = (tokenType: TokenEnum = TokenEnum.access) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.headers.authorization) {
      throw new BadRequestException("validation error", {
        key: "headers",
        issues: [{ path: "authorization", message: "missing authorization" }],
      });
    }
    const { decoded, user } = await decodeToken({
      authorization: req.headers.authorization,
      tokenType,
    });
    req.user = user;
    req.decoded = decoded;
    next();
  };
};

export const authorization = (
  accessRoles: roleEnum[] = [],
  tokenType: TokenEnum = TokenEnum.access
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (!req.headers.authorization) {
      throw new BadRequestException("validation error", {
        key: "headers",
        issues: [{ path: "authorization", message: "missing authorization" }],
      });
    }
    const { decoded, user } = await decodeToken({
      authorization: req.headers.authorization,
      tokenType,
    });

    if (!accessRoles.includes(user.role)) {
      throw new ForbiddenException("not authorized account");
    }

    req.user = user;
    req.decoded = decoded;
    next();
  };
};

export const graphAuthorization = (
  accessRoles: roleEnum[] = [],
  role: roleEnum
) => {
  if (!accessRoles.includes(role)) {
    throw new GraphQLError("not authorized account", {
      extensions: { statusCode: 403   },
    });
  }
};
