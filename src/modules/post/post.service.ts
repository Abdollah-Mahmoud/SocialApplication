import type { Request, Response } from "express";
import { successResponse } from "../../utils/response/success.response";
import { PostRepository, UserRepository } from "../../db/repository";
import { HUserDocument, UserModel } from "../../db/model/User.model";
import {
  AvailabilityEnum,
  HPostDocument,
  LikeActionEnum,
  PostModel,
} from "../../db/model/Post.model";
import {
  BadRequestException,
  NotfoundException,
} from "../../utils/response/error.response";
import { deleteFiles, uploadfiles } from "../../utils/multer/s3.config";
import { v4 as uuid } from "uuid";
import { LikePostQueryInputsDto } from "./post.dto";
import { Types, UpdateQuery } from "mongoose";
import { StorageEnum } from "../../utils/multer/cloud.multer";
import { connectedSockets, getIo } from "../gateway";
import { GraphQLError, GraphQLID } from "graphql";

export const postAvailability = (user: HUserDocument) => {
  return [
    { availability: AvailabilityEnum.public },
    { availability: AvailabilityEnum.onlyMe, createdBy: user._id },
    {
      availability: AvailabilityEnum.friends,
      createdBy: { $in: [...(user.friends || []), user._id] },
    },
    {
      availability: { $ne: AvailabilityEnum.onlyMe },
      tags: { $in: user._id },
    },
  ];
};

export class PostService {
  private userModel = new UserRepository(UserModel);
  private postModel = new PostRepository(PostModel);

  constructor() {}
  createPost = async (req: Request, res: Response): Promise<Response> => {
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
    let assetsFolderId: string = uuid();

    if (req.files?.length) {
      attachments = await uploadfiles({
        files: req.files as Express.Multer.File[],
        path: `users/${req.user?._id}/post/${assetsFolderId}`,
      });
    }

    const [post] =
      (await this.postModel.create({
        data: [
          {
            ...req.body,
            attachments,
            assetsFolderId,
            createdBy: req.user?._id,
          },
        ],
      })) || [];
    if (!post) {
      if (attachments.length) {
        await deleteFiles({ urls: attachments });
      }
      throw new BadRequestException("Failed to create this post");
    }

    return successResponse({ res, statusCode: 201 });
  };

  updatePost = async (req: Request, res: Response): Promise<Response> => {
    const { postId } = req.params as unknown as { postId: Types.ObjectId };
    const post = await this.postModel.findOne({
      filter: {
        _id: postId,
        createdBy: req.user?._id,
      },
    });

    if (!post) {
      throw new NotfoundException("failed to find matching result");
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

    const updatedPost = await this.postModel.updateOne({
      filter: { _id: post._id },
      update: [
        {
          $set: {
            content: req.body.content,
            allowComments: req.body.allowComments || post.allowComments,
            availability: req.body.availability || post.availability,
            attachments: {
              $setUnion: [
                {
                  $setDifference: [
                    "$attachments",
                    req.body.removeAtttachments || [],
                  ],
                },
                attachments,
              ],
            },
            tags: {
              $setUnion: [
                {
                  $setDifference: [
                    "$tags",
                    (req.body.removedTags || []).map((tag: string) => {
                      return Types.ObjectId.createFromHexString(tag);
                    }),
                  ],
                },
                (req.body.tags || []).map((tag: string) => {
                  return Types.ObjectId.createFromHexString(tag);
                }),
              ],
            },
          },
        },
      ],
    });

    if (!updatedPost.matchedCount) {
      if (attachments.length) {
        await deleteFiles({ urls: attachments });
      }
      throw new BadRequestException("Failed to create this post");
    } else {
      if (req.body.removedAttachments?.length) {
        await deleteFiles({ urls: req.body.removedAttachments });
      }
    }

    return successResponse({ res });
  };

  likePost = async (req: Request, res: Response): Promise<Response> => {
    const { postId } = req.params as { postId: string };
    const { action } = req.query as LikePostQueryInputsDto;

    let update: UpdateQuery<HPostDocument> = {
      $addToSet: { likes: req.user?._id },
    };
    if (action === LikeActionEnum.unlike) {
      update = { $pull: { likes: req.user?._id } };
    }

    const post = await this.postModel.findOneAndUpdate({
      filter: { _id: postId, $or: postAvailability(req.user as HUserDocument) },
      update,
    });
    if (!post) {
      throw new NotfoundException("invalid postId or post not exist");
    }

    if (action !== LikeActionEnum.unlike) {
      getIo()
        .to(connectedSockets.get(post.createdBy.toString()) as string[])
        .emit("likePost", { postId, userId: req.user?._id });
    }

    return successResponse({ res });
  };

  postList = async (req: Request, res: Response): Promise<Response> => {
    let { page, size } = req.query as unknown as {
      page: number;
      size: number;
    };
    const posts = await this.postModel.paginate({
      filter: {
        $or: postAvailability(req.user as HUserDocument),
      },
      options: {
        populate: [
          {
            path: "comments",
            match: {
              commentId: { $exists: false },
              freezedAt: { $exists: false },
            },
            populate: [
              {
                path: "reply",
                match: {
                  commentId: { $exists: false },
                  freezedAt: { $exists: false },
                },
              },
            ],
          },
        ],
      },
      page,
      size,
    });

    return successResponse({ res, data: { posts } });
  };

  // GQL

  allPosts = async (
    {
      page,
      size,
    }: {
      page: number;
      size: number;
    },
    authUser: HUserDocument
  ): Promise<{
    docsCount?: Number;
    limit?: Number;
    pages?: Number;
    currentPage?: number | undefined;
    result: HPostDocument[];
  }> => {
    const posts = await this.postModel.paginate({
      filter: {
        $or: postAvailability(authUser),
      },
      options: {
        populate: [
          {
            path: "comments",
            match: {
              commentId: { $exists: false },
              freezedAt: { $exists: false },
            },
            populate: [
              {
                path: "reply",
                match: {
                  commentId: { $exists: false },
                  freezedAt: { $exists: false },
                },
              },
            ],
          },
          {
            path: "createdBy",
          },
        ],
      },
      page,
      size,
    });

    return posts;
  };

  likeGraphPost = async (
    { postId, action }: { postId: string; action: LikeActionEnum },
    authUser: HUserDocument
  ): Promise<HPostDocument> => {
    let update: UpdateQuery<HPostDocument> = {
      $addToSet: { likes: authUser._id },
    };
    if (action === LikeActionEnum.unlike) {
      update = { $pull: { likes: authUser._id } };
    }

    const post = await this.postModel.findOneAndUpdate({
      filter: { _id: postId, $or: postAvailability(authUser) },
      update,
    });
    if (!post) {
      throw new GraphQLError("invalid postId or post not exist", {
        extensions: { statusCode: 404 },
      });
    }

    if (action !== LikeActionEnum.unlike) {
      getIo()
        .to(connectedSockets.get(post.createdBy.toString()) as string[])
        .emit("likePost", { postId, userId: authUser._id });
    }

    return post;
  };
}

export const postService = new PostService();
