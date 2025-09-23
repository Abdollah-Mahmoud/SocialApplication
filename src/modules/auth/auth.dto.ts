// export interface IsignupBodeyInputsDto {
//   username: string;
//   email: string;
//   password: string;
// }

import * as validators from "./auth.validation";
import { z } from "zod";

export type ISignupBodeyInputsDto = z.Infer<typeof validators.signup.body>;
export type IConfirmEmailInputsDto = z.Infer<
  typeof validators.confirmEmail.body
>;
export type ILoginBodyInputsDTto = z.infer<typeof validators.login.body>;
export type IForgotCodeBodyInputsDTto = z.infer<
  typeof validators.sendForgotPasswordCode.body
>;
export type IVerifyForgotPasswordBodyInputsDTto = z.infer<
  typeof validators.verifyForgotPasswordCode.body
>;

export type IResetForgotPasswordBodyInputsDTto = z.infer<
  typeof validators.ResetForgotPasswordCode.body
>;

export type IGmail = z.infer<typeof validators.signupWithGmail.body>;
