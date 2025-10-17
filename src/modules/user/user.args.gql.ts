import { GraphQLInt, GraphQLNonNull, GraphQLString } from "graphql";
import { GraphQLGenderEnum } from "./user.types.gql";

export const allUsers = {
  name: { type: new GraphQLNonNull(GraphQLString) },
  gender: { type: GraphQLGenderEnum },
};

export const search = {
  email: {
    type: new GraphQLNonNull(GraphQLString),
    description: "this email is used to find unique account",
  },
};

export const addFollower = {
  friendId: { type: new GraphQLNonNull(GraphQLInt) },
  myId: { type: new GraphQLNonNull(GraphQLInt) },
};
