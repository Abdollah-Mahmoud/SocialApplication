import {
  GraphQLEnumType,
  GraphQLID,
  GraphQLInt,
  GraphQLList,
  GraphQLObjectType,
  GraphQLString,
} from "graphql";
import { AllowCommentsEnum, AvailabilityEnum } from "../../db/model/Post.model";
import { GraphQLOneUserResponse } from "../user";

export const GraphQLAllowCommentsEnum = new GraphQLEnumType({
  name: "AllowCommentsEnum",
  values: {
    allow: { value: AllowCommentsEnum.allow },
    deny: { value: AllowCommentsEnum.deny },
  },
});
export const GraphQLAvailabilityEnum = new GraphQLEnumType({
  name: "AvailabilityEnum",
  values: {
    onlyMe: { value: AvailabilityEnum.onlyMe },
    friends: { value: AvailabilityEnum.friends },
    public: { value: AvailabilityEnum.public },
  },
});

export const GraphQLOnePostResponse = new GraphQLObjectType({
  name: "OnePostResponse",
  fields: {
    _id: { type: GraphQLID },
    content: { type: GraphQLString },
    attachments: { type: new GraphQLList(GraphQLString) },
    assetsFolderId: { type: GraphQLString },

    allowComments: { type: GraphQLAllowCommentsEnum },
    availability: { type: GraphQLAvailabilityEnum },

    likes: { type: new GraphQLList(GraphQLID) },
    tags: { type: new GraphQLList(GraphQLID) },

    createdBy: { type: GraphQLOneUserResponse },

    freezedAt: { type: GraphQLString },
    freezedBy: { type: GraphQLID },

    restoredAt: { type: GraphQLString },
    restoredBy: { type: GraphQLID },

    createdAt: { type: GraphQLString },
    updatedAt: { type: GraphQLString },
  },
});

export const allPosts = new GraphQLObjectType({
  name: "allPosts",
  fields: {
    docsCount: { type: GraphQLInt },
    limit: { type: GraphQLInt },
    pages: { type: GraphQLInt },
    currentPage: { type: GraphQLInt },
    result: { type: new GraphQLList(GraphQLOnePostResponse) },
  },
});
