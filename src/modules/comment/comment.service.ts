import type { Request, Response } from "express";
import { successResponse } from "../../utils/response/success.response";
import { CommentModel } from "../../db/model/Comment.model";
import {
  AllowCommentsEnum,
  HPostDocument,
  PostModel,
} from "../../db/model/Post.model";
import { HUserDocument, UserModel } from "../../db/model/User.model";
import {
  PostRepository,
  UserRepository,
  CommentRepository,
} from "../../db/repository";
import { Types } from "mongoose";
import { postAvailability } from "../post";
import {
  BadRequestException,
  NotfoundException,
} from "../../utils/response/error.response";
import { deleteFiles, uploadfiles } from "../../utils/multer/s3.config";
import { StorageEnum } from "../../utils/multer/cloud.multer";

class CommentService {
  private userModel = new UserRepository(UserModel);
  private postModel = new PostRepository(PostModel);
  private commentModel = new CommentRepository(CommentModel);

  constructor() {}
  createComment = async (req: Request, res: Response): Promise<Response> => {
    const { postId } = req.params as unknown as { postId: Types.ObjectId };
    const post = await this.postModel.findOne({
      filter: {
        _id: postId,
        allowComments: AllowCommentsEnum.allow,
        $or: postAvailability(req.user as HUserDocument),
      },
    });

    if (!post) {
      throw new NotfoundException("fail to find matching result");
    }
    if (
      req.body.tags?.length &&
      (
        await this.userModel.find({
          filter: { _id: { $in: req.body.tags, $ne: req.user?._id } },
        })
      ).length !== req.body.tags.length
    ) {
      throw new NotfoundException("some of the mentioned users doesn't exist");
    }

    let attachments: string[] = [];

    if (req.files?.length) {
      attachments = await uploadfiles({
        storageApproach: StorageEnum.memory,
        files: req.files as Express.Multer.File[],
        path: `users/${post.createdBy}/post/${post.assetsFolderId}`,
      });
    }

    const [comment] =
      (await this.commentModel.create({
        data: [
          {
            ...req.body,
            attachments,
            postId,
            createdBy: req.user?._id,
          },
        ],
      })) || [];
    if (!comment) {
      if (attachments.length) {
        await deleteFiles({ urls: attachments });
      }
      throw new BadRequestException("Failed to create this comment");
    }

    return successResponse({ res, statusCode: 201 });
  };

  replyOnComment = async (req: Request, res: Response): Promise<Response> => {
    const { postId, commentId } = req.params as unknown as {
      postId: Types.ObjectId;
      commentId: Types.ObjectId;
    };
    const comment = await this.commentModel.findOne({
      filter: {
        _id: commentId,
        post: postId,
      },
      options: {
        populate: [
          {
            path: "postId",
            match: {
              allowComments: AllowCommentsEnum.allow,
              $or: postAvailability(req.user as HUserDocument),
            },
          },
        ],
      },
    });

    if (!comment?.postId) {
      throw new NotfoundException("fail to find matching result");
    }
    if (
      req.body.tags?.length &&
      (
        await this.userModel.find({
          filter: { _id: { $in: req.body.tags, $ne: req.user?._id } },
        })
      ).length !== req.body.tags.length
    ) {
      throw new NotfoundException("some of the mentioned users doesn't exist");
    }

    let attachments: string[] = [];

    if (req.files?.length) {
      const post = comment.postId as Partial<HPostDocument>;
      attachments = await uploadfiles({
        storageApproach: StorageEnum.memory,
        files: req.files as Express.Multer.File[],
        path: `users/${post.createdBy}/post/${post.assetsFolderId}`,
      });
    }

    const [reply] =
      (await this.commentModel.create({
        data: [
          {
            ...req.body,
            attachments,
            postId,
            commentId,
            createdBy: req.user?._id,
          },
        ],
      })) || [];
    if (!reply) {
      if (attachments.length) {
        await deleteFiles({ urls: attachments });
      }
      throw new BadRequestException("Failed to create this comment");
    }

    return successResponse({ res, statusCode: 201 });
  };
}

export default new CommentService();
