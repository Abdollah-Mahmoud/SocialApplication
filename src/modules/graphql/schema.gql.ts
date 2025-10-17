import { GraphQLObjectType, GraphQLSchema } from "graphql";
import { userGQLSchema } from "../user";
import { postGqlSchema } from "../post";

const query = new GraphQLObjectType({
  name: "RootQueryName",
  description: "optional text",
  fields: {
    ...userGQLSchema.registerQuery(),
    ...postGqlSchema.registerQuery(),
  },
});

const mutation = new GraphQLObjectType({
  name: "RootSchemaMutation",
  description: "hold all RootSchemaMutation fields",
  fields: {
    ...userGQLSchema.registerMutation(),
    ...postGqlSchema.registerMutation(),
  },
});

export const schema = new GraphQLSchema({ query, mutation });
