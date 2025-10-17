import { z } from "zod";
import { LogoutEnum } from "../../utils/security/token.security";
import { Types } from "mongoose";
import { generalFields } from "../../middleware/validation.middleware";
import { roleEnum } from "../../db/model/User.model";

export const welcome = z.strictObject({
  name: z.string().min(2),
});

export const logout = {
  body: z.strictObject({
    flag: z.enum(LogoutEnum).default(LogoutEnum.only),
  }),
};

export const sendFriendRequest = {
  params: z.strictObject({
    userId: generalFields.id,
  }),
};

export const acceptFriendRequest = {
  params: z.strictObject({
    requestId: generalFields.id,
  }),
};

export const changeRole = {
  params: sendFriendRequest.params,
  body: z.strictObject({
    role: z.enum(roleEnum),
  }),
};

export const freezeAccount = {
  params: z
    .object({
      userId: z.string().optional(),
    })
    .optional()
    .refine(
      (data) => {
        return data?.userId ? Types.ObjectId.isValid(data.userId) : true;
      },
      {
        error: "invalid objectId format",
        path: ["userId"],
      }
    ),
};

export const restoreAccount = {
  params: z
    .object({
      userId: z.string(),
    })
    .refine(
      (data) => {
        return Types.ObjectId.isValid(data.userId);
      },
      {
        error: "invalid objectId format",
        path: ["userId"],
      }
    ),
};

export const blockUser = {
  params: z.object({
    userId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid userId"),
  }),
};

export const deleteFriendRequest = {
  params: z.object({
    requestId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid requestId"),
  }),
};

export const unFriend = {
  params: z.object({
    userId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid userId"),
  }),
};

export const hardDelete = restoreAccount;
