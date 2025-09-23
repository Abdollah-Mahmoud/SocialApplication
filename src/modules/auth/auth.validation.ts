import z from "zod";
import { generalFields } from "../../middleware/validation.middleware";

export const login = {
  body: z.strictObject({
    email: generalFields.email,
    password: generalFields.password,
  }),
};

export const signup = {
  body: login.body
    .extend({
      username: generalFields.username.optional(),
      confirmPassword: generalFields.confirmPassword,
    })
    .superRefine((data, ctx) => {
      if (data.confirmPassword !== data.password) {
        ctx.addIssue({
          code: "custom",
          path: ["confirmEmail"],
          message: "password missmatch confirmPassword",
        });
      }
      if (data.username?.split(" ")?.length != 2) {
        ctx.addIssue({
          code: "custom",
          path: ["username"],
          message: "username must be 2 parts as abdollah mahmoud",
        });
      }
    }),
};

export const confirmEmail = {
  body: z.strictObject({
    email: generalFields.email,
    otp: generalFields.otp,
  }),
};

export const signupWithGmail = {
  body: z.strictObject({
    idToken: z.string(),
  }),
};

export const sendForgotPasswordCode = {
  body: z.strictObject({
    email: generalFields.email,
  }),
};

export const verifyForgotPasswordCode = {
  body: sendForgotPasswordCode.body.extend({
    otp: generalFields.otp,
  }),
};

export const ResetForgotPasswordCode = {
  body: verifyForgotPasswordCode.body
    .extend({
      otp: generalFields.otp,
      password: generalFields.password,
      confirmPassword: generalFields.confirmPassword,
    })
    .refine(
      (data) => {
        return data.password === data.confirmPassword;
      },
      {
        message: "password missmatch confirm-passwords",
        path: ["confirmPassword"],
      }
    ),
};
