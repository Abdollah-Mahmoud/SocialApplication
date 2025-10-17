import { PostService } from "./post.service";
import { IAuthGraph } from "../graphql/schema.interface.gql";
import { HPostDocument, LikeActionEnum } from "../../db/model/Post.model";

export class PostResolver {
  private postService: PostService = new PostService();
  constructor() {}
  allPosts = async (
    parent: unknown,
    args: { page: number; size: number },
    context: IAuthGraph
  ): Promise<{
    docsCount?: Number;
    limit?: Number;
    pages?: Number;
    currentPage?: number | undefined;
    result: HPostDocument[];
  }> => {
    return await this.postService.allPosts(args, context.user);
  };

  likePost = async (
    parent: unknown,
    args: { postId: string; action: LikeActionEnum },
    context: IAuthGraph
  ): Promise<HPostDocument> => {
    return await this.postService.likeGraphPost(args, context.user);
  };
  
}
