import { ChatModel } from "./../../db/model/chat.model";
import { FriendRequestModel } from "./../../db/model/friendRequest.model";
import { PostModel } from "./../../db/model/Post.model";
import { Request, Response } from "express";
import {
  IFreezeAccountDTO,
  IHardDeleteAccountDTO,
  ILogoutDto,
  IRestoreAccountDTO,
} from "./user.dto";
import { UserRepository } from "../../db/repository/user.repository";
import {
  genderEnum,
  HUserDocument,
  roleEnum,
  UserModel,
} from "../../db/model/User.model";
import { Types, UpdateQuery } from "mongoose";
import {
  createLoginCredentials,
  createRevokeToken,
  LogoutEnum,
} from "../../utils/security/token.security";
import { JwtPayload } from "jsonwebtoken";
import {
  createPreSignedUploadLink,
  deleteFiles,
  deleteFolderByPrefix,
  uploadfiles,
} from "../../utils/multer/s3.config";
import { StorageEnum } from "../../utils/multer/cloud.multer";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotfoundException,
} from "../../utils/response/error.response";
import { s3Event } from "../../utils/multer/s3.events";
import { successResponse } from "../../utils/response/success.response";
import { IProfileImageResponse, IUserResponse } from "./user.entities";
import { friendRequestRepository, PostRepository } from "../../db/repository";
import { ChatRepository } from "../../db/repository/chat.repository";
import { GraphQLError } from "graphql";

export interface IUser {
  id: number;
  name: string;
  email: string;
  gender: genderEnum;
  password: string;
  followers: number[];
}
let users: IUser[] = [
  {
    id: 1,
    name: "mahmoud",
    email: "ad@ab@gmail.com",
    gender: genderEnum.male,
    password: "288282",
    followers: [],
  },
  {
    id: 1,
    name: "asasas",
    email: "ab@gmail.com",
    gender: genderEnum.female,
    password: "323232",
    followers: [],
  },
  {
    id: 1,
    name: "fdfdfd",
    email: "b@gmail.com",
    gender: genderEnum.male,
    password: "545454",
    followers: [],
  },
  {
    id: 1,
    name: "hghghg",
    email: "a@gmail.com",
    gender: genderEnum.male,
    password: "989898",
    followers: [],
  },
];

export class UserService {
  private userModel: UserRepository = new UserRepository(UserModel);
  private postModel: PostRepository = new PostRepository(PostModel);
  private chatModel: ChatRepository = new ChatRepository(ChatModel);

  private friendRequestModel = new friendRequestRepository(FriendRequestModel);

  constructor() {}

  profileImage = async (req: Request, res: Response): Promise<Response> => {
    const {
      ContentType,
      Originalname,
    }: { ContentType: string; Originalname: string } = req.body;
    const { url, key } = await createPreSignedUploadLink({
      ContentType,
      Originalname,
      path: `users/${req.decoded?._id}`,
    });
    const user = await this.userModel.findByIdAndUpdate({
      id: req.user?._id as Types.ObjectId,
      update: {
        profileImage: key,
        tempProfileImage: req.user?.profileImage,
      },
    });

    if (!user) {
      throw new BadRequestException("Fail to update user profile image");
    }

    s3Event.emit("trackProfileImageUpload", {
      userId: req.user?._id,
      oldKey: req.user?.profileImage,
      key,
      expiresIn: 30000,
    });

    return successResponse<IProfileImageResponse>({ res, data: { url } });
  };

  profileCoverImage = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    const urls = await uploadfiles({
      storageApproach: StorageEnum.disk,
      files: req.files as Express.Multer.File[],
      path: `users/${req.decoded?._id}/cover`,
      useLarge: true,
    });

    const user = await this.userModel.findByIdAndUpdate({
      id: req.user?._id as Types.ObjectId,
      update: {
        coverImages: urls,
      },
    });

    if (!user) {
      throw new BadRequestException("Fail to update profile cover images");
    }

    if (req.user?.coverImages) {
      await deleteFiles({
        urls: req.user.coverImages,
      });
    }
    return successResponse<IUserResponse>({ res, data: { user } });
  };

  profile = async (req: Request, res: Response): Promise<Response> => {
    const profile = await this.userModel.findById({
      id: req.user?._id as Types.ObjectId,
      options: {
        populate: [
          {
            path: "friends",
            select: "firstName lastName  email gender profilePicture",
          },
        ],
      },
    });
    if (!profile) {
      throw new NotfoundException("fail to find user profile");
    }
    const groups = await this.chatModel.find({
      filter: {
        participants: { $in: req.user?._id as Types.ObjectId },
        group: { $exists: true },
      },
    });

    return successResponse<IUserResponse>({
      res,
      data: { user: profile, groups },
    });
  };

  dashboard = async (req: Request, res: Response): Promise<Response> => {
    const results = await Promise.allSettled([
      this.userModel.find({ filter: {} }),
      this.postModel.find({ filter: {} }),
    ]);
    return successResponse({
      res,
      data: { results },
    });
  };

  changeRole = async (req: Request, res: Response): Promise<Response> => {
    const { userId } = req.params as unknown as { userId: Types.ObjectId };
    const { role }: { role: roleEnum } = req.body;
    const denyRoles: roleEnum[] = [role, roleEnum.superAdmin];
    if (req.user?.role === roleEnum.admin) {
      denyRoles.push(roleEnum.admin);
    }
    const user = await this.userModel.findOneAndUpdate({
      filter: {
        _id: userId as Types.ObjectId,
        role: { $nin: denyRoles },
      },
      update: {
        role,
      },
    });

    if (!user) {
      throw new NotfoundException("failed to find a matching result");
    }

    return successResponse({
      res,
    });
  };

  sendFriendRequest = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    const { userId } = req.params as unknown as { userId: Types.ObjectId };
    const checkFriendRequestExist = await this.friendRequestModel.findOne({
      filter: {
        createdBy: { $in: [req.user?._id, userId] },
        sendTo: { $in: [req.user?._id, userId] },
      },
    });
    if (checkFriendRequestExist) {
      throw new ConflictException("Friend request already exists");
    }

    const user = await this.userModel.findOne({ filter: { _id: userId } });
    if (!user) {
      throw new NotfoundException("invalid recipient");
    }
    const [friendRequest] =
      (await this.friendRequestModel.create({
        data: [
          {
            createdBy: req.user?._id as Types.ObjectId,
            sendTo: userId,
          },
        ],
      })) || [];

    if (!friendRequest) {
      throw new BadRequestException("something went wrong");
    }
    return successResponse({
      res,
      statusCode: 20,
    });
  };

  acceptFriendRequest = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    const { requestId } = req.params as unknown as {
      requestId: Types.ObjectId;
    };
    const friendRequest = await this.friendRequestModel.findOneAndUpdate({
      filter: {
        _id: requestId,
        sendTo: req.user?._id,
        acceptedAt: { $exists: false },
      },
      update: {
        acceptedAt: new Date(),
      },
    });
    if (!friendRequest) {
      throw new NotfoundException("Failed to find a matching result");
    }

    await Promise.all([
      await this.userModel.updateOne({
        filter: { _id: friendRequest.createdBy },
        update: {
          $addToSet: { friends: friendRequest.sendTo },
        },
      }),

      await this.userModel.updateOne({
        filter: { _id: friendRequest.sendTo },
        update: {
          $addToSet: { friends: friendRequest.createdBy },
        },
      }),
    ]);

    return successResponse({
      res,
    });
  };

  freezeAccount = async (req: Request, res: Response): Promise<Response> => {
    const { userId } = (req.params as IFreezeAccountDTO) || {};
    if (userId && req.user?.role !== roleEnum.admin) {
      throw new ForbiddenException("not authorized user");
    }
    const user = await this.userModel.updateOne({
      filter: {
        _id: userId || req.user?._id,
        freezedAt: { $exists: false },
      },
      update: {
        freezedAt: new Date(),
        freezedBy: req.user?._id,
        changeCredentialsTime: new Date(),
        $unset: {
          restoredAt: 1,
          restoredBy: 1,
        },
      },
    });

    if (!user.matchedCount) {
      throw new NotfoundException(
        "user not founed or failed to delete this resource"
      );
    }

    return successResponse({ res });
  };

  restoreAccount = async (req: Request, res: Response): Promise<Response> => {
    const { userId } = req.params as IRestoreAccountDTO;

    const user = await this.userModel.updateOne({
      filter: {
        _id: userId,
        freezedBy: { $ne: userId },
      },
      update: {
        restoredAt: new Date(),
        restoredBy: req.user?._id,

        $unset: {
          freezedAt: 1,
          freezedBy: 1,
        },
      },
    });

    if (!user.matchedCount) {
      throw new NotfoundException(
        "user not founed or failed to restore this resource"
      );
    }

    return successResponse({ res });
  };

  hardDeleteAccount = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    const { userId } = req.params as IHardDeleteAccountDTO;

    const user = await this.userModel.deleteOne({
      filter: {
        _id: userId,
        freezedAt: { $exists: true },
      },
    });

    if (!user.deletedCount) {
      throw new NotfoundException(
        "user not found or hard delete this resource"
      );
    }

    await deleteFolderByPrefix({ path: `users/${userId}` });

    return successResponse({ res });
  };

  logout = async (req: Request, res: Response): Promise<Response> => {
    const { flag }: ILogoutDto = req.body;
    let statusCode: number = 200;
    const update: UpdateQuery<IUser> = {};
    switch (flag) {
      case LogoutEnum.all:
        update.changeCredentialsTime = new Date();
        break;

      default:
        await createRevokeToken(req.decoded as JwtPayload);
        statusCode = 201;
        break;
    }

    await this.userModel.updateOne({
      filter: { _id: req.decoded?._id },
      update,
    });

    return res.status(statusCode).json({
      message: "logged out successfully",
    });
  };

  refreshToken = async (req: Request, res: Response): Promise<Response> => {
    const credentials = await createLoginCredentials(req.user as HUserDocument);
    await createRevokeToken(req.decoded as JwtPayload);
    return res.status(201).json({ message: "Done", data: { credentials } });
  };

  blockUser = async (req: Request, res: Response): Promise<Response> => {
    const { userId } = req.params as unknown as { userId: Types.ObjectId };

    if (userId.toString() === req.user?._id.toString()) {
      throw new BadRequestException("You cannot block yourself");
    }

    const user = await this.userModel.findOne({ filter: { _id: userId } });
    if (!user) {
      throw new NotfoundException("User not found");
    }

    const updatedUser = await this.userModel.findByIdAndUpdate({
      id: req.user?._id as Types.ObjectId,
      update: {
        $addToSet: { blocked: userId },
        $pull: { friends: userId },
      },
    });

    return successResponse({
      res,
      data: { user: updatedUser },
    });
  };

  deleteFriendRequest = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    const { requestId } = req.params as unknown as {
      requestId: Types.ObjectId;
    };

    const request = await this.friendRequestModel.findOneAndDelete({
      filter: {
        _id: requestId,
        $or: [{ createdBy: req.user?._id }, { sendTo: req.user?._id }],
      },
    });

    if (!request) {
      throw new NotfoundException("Friend request not found or unauthorized");
    }

    return successResponse({
      res,
      message: "Friend request deleted successfully",
    });
  };

  unFriend = async (req: Request, res: Response): Promise<Response> => {
    const { userId } = req.params as unknown as { userId: Types.ObjectId };

    const friend = await this.userModel.findOne({ filter: { _id: userId } });
    if (!friend) {
      throw new NotfoundException("User not found");
    }

    await Promise.all([
      this.userModel.updateOne({
        filter: { _id: req.user?._id },
        update: { $pull: { friends: userId } },
      }),
      this.userModel.updateOne({
        filter: { _id: userId },
        update: { $pull: { friends: req.user?._id } },
      }),
    ]);

    return successResponse({
      res,
      message: "Unfriended successfully",
    });
  };

  // graphql =============================================
  welcome = (user: HUserDocument): string => {
    console.log({ s: user });
    return "Hello graphql";
  };

  allUsers = async (
    args: { gender: genderEnum },
    authUser: HUserDocument
  ): Promise<HUserDocument[]> => {
    return await this.userModel.find({
      filter: { _id: { $ne: authUser._id }, gender: args.gender },
    });
  };

  search = (args: {
    email: string;
  }): { message: string; statusCode: number; data: IUser } => {
    const user = users.find((ele) => ele.email === args.email);
    if (!user) {
      throw new GraphQLError("failed to find matching result", {
        extensions: { statusCode: 404 },
      });
    }
    return { message: "Done", statusCode: 200, data: user };
  };

  addFollower = (args: { friendId: number; myId: number }): IUser[] => {
    users = users.map((ele: IUser): IUser => {
      if (ele.id === args.friendId) {
        ele.followers.push(args.myId);
      }
      return ele;
    });
    return users;
  };
}

export default new UserService();
