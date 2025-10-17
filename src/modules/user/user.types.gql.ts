import {
  GraphQLEnumType,
  GraphQLID,
  GraphQLList,
  GraphQLNonNull,
  GraphQLObjectType,
  GraphQLString,
} from "graphql";
import {
  genderEnum,
  HUserDocument,
  ProviderEnum,
  roleEnum,
} from "../../db/model/User.model";
import { GraphQLUniformResponse } from "../graphql/types.gql";

export const GraphQLGenderEnum = new GraphQLEnumType({
  name: "GraphQLGenderEnum",
  values: {
    male: { value: genderEnum.male },
    female: { value: genderEnum.female },
  },
});

export const GraphQLProviderEnum = new GraphQLEnumType({
  name: "GraphQLProviderEnum",
  values: {
    google: { value: ProviderEnum.GOOGLE },
    system: { value: ProviderEnum.SYSTEM },
  },
});

export const GraphQLRoleEnum = new GraphQLEnumType({
  name: "GraphQLRoleEnum",
  values: {
    admin: { value: roleEnum.admin },
    superAdmin: { value: roleEnum.superAdmin },
    user: { value: roleEnum.user },
  },
});

export const GraphQLOneUserResponse = new GraphQLObjectType({
  name: "OneUserResponse",
  fields: {
    _id: { type: GraphQLID },
    firstName: { type: new GraphQLNonNull(GraphQLString) },
    lastName: { type: GraphQLString },
    username: {
      type: GraphQLString,
      resolve: (parent: HUserDocument) => {
        return parent.gender === genderEnum.male
          ? `Mr:: ${parent.username}`
          : `Mis::${parent.username}`;
      },
    },
    slug: { type: GraphQLString },

    email: { type: GraphQLString },
    confirmEmailOtp: { type: GraphQLString },
    confirmedAt: { type: GraphQLString },

    password: { type: GraphQLString },
    resetPasswordOtp: { type: GraphQLString },
    changeCredentialsTime: { type: GraphQLString },

    phone: { type: GraphQLString },
    address: { type: GraphQLString },
    profileImage: { type: GraphQLString },
    tempProfileImage: { type: GraphQLString },
    coverImages: { type: new GraphQLList(GraphQLString) },

    gender: { type: GraphQLGenderEnum },
    role: { type: GraphQLRoleEnum },
    provider: { type: GraphQLProviderEnum },

    freezedAt: { type: GraphQLString },
    freezedBy: { type: GraphQLID },

    restoredAt: { type: GraphQLString },
    restoredBy: { type: GraphQLID },
    friends: { type: new GraphQLList(GraphQLID) },

    createdAt: { type: GraphQLString },
    updatedAt: { type: GraphQLString },

    blocked: { type: new GraphQLList(GraphQLID) },
  },
});

export const welcome = new GraphQLNonNull(GraphQLString);
export const allUsers = new GraphQLList(GraphQLOneUserResponse);
export const search = GraphQLUniformResponse({
  name: "searchUser",
  data: new GraphQLNonNull(GraphQLOneUserResponse),
});
export const addFollower = new GraphQLList(GraphQLOneUserResponse);
