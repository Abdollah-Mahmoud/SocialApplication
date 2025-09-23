import type { Request, Response } from "express";
import {
  IConfirmEmailInputsDto,
  IForgotCodeBodyInputsDTto,
  IGmail,
  ILoginBodyInputsDTto,
  IResetForgotPasswordBodyInputsDTto,
  ISignupBodeyInputsDto,
  IVerifyForgotPasswordBodyInputsDTto,
} from "./auth.dto";
import { ProviderEnum, UserModel } from "../../db/model/User.model";

import {
  BadRequestException,
  ConflictException,
  NotfoundException,
} from "../../utils/response/error.response";
import { compareHash, generateHash } from "../../utils/security/hash.security";
import { emailEvent } from "../../utils/email/email.event";
import { generateNumberOtp } from "../../utils/otp";
import { createLoginCredentials } from "../../utils/security/token.security";
import { OAuth2Client, type TokenPayload } from "google-auth-library";
import { successResponse } from "../../utils/response/success.response";
import { ILoginResponse } from "./auth.entities";
import { UserRepository } from "../../db/repository";

class AuthenticationService {
  private userModel = new UserRepository(UserModel);
  constructor() {}

  private async verifyGmailAccount(idToken: string): Promise<TokenPayload> {
    const client = new OAuth2Client();
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.WEB_CLIENT_IDS?.split(",") || [],
    });

    const payload = ticket.getPayload();
    if (!payload?.email_verified) {
      throw new BadRequestException("Fail to verify this google account");
    }
    return payload;
  }

  signupWithGmail = async (req: Request, res: Response): Promise<Response> => {
    const { idToken }: IGmail = req.body;
    const { email, family_name, given_name, picture } =
      await this.verifyGmailAccount(idToken);

    const user = await this.userModel.findOne({
      filter: {
        email,
      },
    });
    if (user) {
      if (user.provider === ProviderEnum.GOOGLE) {
        return await this.loginWithGmail(req, res);
      }
      throw new ConflictException(
        `Email exist with another provider ::${user.provider}`
      );
    }
    const [newUser] =
      (await this.userModel.create({
        data: [
          {
            firstName: given_name as string,
            lastName: family_name as string,
            email: email as string,
            profileImage: picture as string,
            confirmedAt: new Date(),
            provider: ProviderEnum.GOOGLE,
          },
        ],
      })) || [];

    if (!newUser) {
      throw new BadRequestException(
        "Fail to signup with gmail please try again later"
      );
    }

    const credentials = await createLoginCredentials(newUser);

    return successResponse<ILoginResponse>({
      res,
      statusCode: 201,
      data: { credentials },
    });
  };

  loginWithGmail = async (req: Request, res: Response): Promise<Response> => {
    const { idToken }: IGmail = req.body;
    const { email } = await this.verifyGmailAccount(idToken);

    const user = await this.userModel.findOne({
      filter: {
        email,
        provider: ProviderEnum.GOOGLE,
      },
    });
    if (!user) {
      throw new NotfoundException(
        "not regestered account or regestered with another provider"
      );
    }

    const credentials = await createLoginCredentials(user);

    return successResponse<ILoginResponse>({ res, data: { credentials } });
  };

  signup = async (req: Request, res: Response): Promise<Response> => {
    let { username, email, password }: ISignupBodeyInputsDto = req.body;
    console.log({ username, email, password });

    const checkUserExist = await this.userModel.findOne({
      filter: { email },
      select: "email",
      options: {
        lean: true,
      },
    });
    console.log({ checkUserExist });

    if (checkUserExist) {
      throw new ConflictException("Email exist");
    }

    const otp = generateNumberOtp();
    await this.userModel.createUser({
      data: [
        {
          username: username as string,
          email,
          password,
          confirmEmailOtp: `${otp}`,
        },
      ],
    });

    emailEvent.emit("confirmEmail", { to: email, otp: otp });

    return successResponse({ res, statusCode: 201 });
  };

  confirmEmail = async (req: Request, res: Response): Promise<Response> => {
    const { email, otp }: IConfirmEmailInputsDto = req.body;

    const user = await this.userModel.findOne({
      filter: {
        email,
        confirmEmailOtp: { $exists: true },
        confirmedAt: { $exists: false },
      },
    });
    if (!user) {
      throw new NotfoundException("invalid account");
    }
    if (!(await compareHash(otp, user.confirmEmailOtp as string))) {
      throw new ConflictException("invalid confirmation code");
    }

    await this.userModel.updateOne({
      filter: { email },
      update: { confirmedAt: new Date(), $unset: { confirmEmailOtp: 1 } },
    });

    return successResponse({ res });
  };

  login = async (req: Request, res: Response): Promise<Response> => {
    const { email, password }: ILoginBodyInputsDTto = req.body;
    const user = await this.userModel.findOne({
      filter: { email, provider: ProviderEnum.SYSTEM },
    });
    if (!user) {
      throw new NotfoundException("invalid login data");
    }
    if (!user.confirmedAt) {
      throw new BadRequestException("Verify your account first");
    }

    if (!(await compareHash(password, user.password))) {
      throw new NotfoundException("invalid login data");
    }

    const credentials = await createLoginCredentials(user);

    return successResponse<ILoginResponse>({ res, data: { credentials } });
  };

  sendForgotCode = async (req: Request, res: Response): Promise<Response> => {
    const { email }: IForgotCodeBodyInputsDTto = req.body;
    const user = await this.userModel.findOne({
      filter: {
        email,
        provider: ProviderEnum.SYSTEM,
        confirmedAt: { $exists: true },
      },
    });
    if (!user) {
      throw new NotfoundException(
        "invalid account due to one of the following reasons [not register , invalid provider , not confirmed]"
      );
    }

    const otp = generateNumberOtp();
    const result = await this.userModel.updateOne({
      filter: { email },
      update: {
        resetPasswordOtp: await generateHash(String(otp)),
      },
    });

    if (!result.matchedCount) {
      throw new BadRequestException(
        "failed to send reset code please try again later"
      );
    }

    emailEvent.emit("resetPassword", { to: email, otp });

    return res.json({
      message: "Done",
    });
  };

  verifyForgotPassword = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    const { email, otp }: IVerifyForgotPasswordBodyInputsDTto = req.body;
    const user = await this.userModel.findOne({
      filter: {
        email,
        provider: ProviderEnum.SYSTEM,
        resetPasswordOtp: { $exists: true },
      },
    });
    if (!user) {
      throw new NotfoundException(
        "invalid account due to one of the following reasons [not register , invalid provider , not confirmed , missing resetPasswordOtp]"
      );
    }

    if (!(await compareHash(otp, user.resetPasswordOtp as string))) {
      throw new ConflictException("invalid otp");
    }

    return res.json({
      message: "Done",
    });
  };

  resetForgotPassword = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    const { email, otp, password }: IResetForgotPasswordBodyInputsDTto =
      req.body;
    const user = await this.userModel.findOne({
      filter: {
        email,
        provider: ProviderEnum.SYSTEM,
        resetPasswordOtp: { $exists: true },
      },
    });
    if (!user) {
      throw new NotfoundException(
        "invalid account due to one of the following reasons [not register , invalid provider , not confirmed , missing resetPasswordOtp]"
      );
    }

    if (!(await compareHash(otp, user.resetPasswordOtp as string))) {
      throw new ConflictException("invalid otp");
    }

    const result = await this.userModel.updateOne({
      filter: { email },
      update: {
        password: await generateHash(password),
        changeCredentialsTime: new Date(),
        $unset: { resetPasswordOtp: 1 },
      },
    });

    if (!result.matchedCount) {
      throw new BadRequestException("failed to reset account password");
    }

    return res.json({
      message: "Done",
    });
  };
}

export default new AuthenticationService();
