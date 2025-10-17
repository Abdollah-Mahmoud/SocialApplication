import {
  GraphQLEnumType,
  GraphQLID,
  GraphQLInt,
  GraphQLNonNull,
} from "graphql";
import { LikeActionEnum } from "../../db/model/Post.model";

export const allPosts = {
  page: { type: new GraphQLNonNull(GraphQLInt) },
  sizeD: { type: new GraphQLNonNull(GraphQLInt) },
};

export const likePost = {
  postId: { type: new GraphQLNonNull(GraphQLID) },
  action: {
    type: new GraphQLNonNull(
      new GraphQLEnumType({
        name: "LikeActionEnum",
        values: {
          like: { value: LikeActionEnum.like },
          unlike: { value: LikeActionEnum.unlike },
        },
      })
    ),
  },
};
 