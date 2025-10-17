import {
  GraphQLObjectType,
  GraphQLOutputType,
  GraphQLString,
  GraphQLInt,
} from "graphql";

export const GraphQLUniformResponse = ({
  name,
  data,
}: {
  name: string;
  data: GraphQLOutputType;
}): GraphQLOutputType => {
  return new GraphQLObjectType({
    name,
    fields: {
      message: { type: GraphQLString },
      statusCode: { type: GraphQLInt },
      data: { type: data },
    },
  });
};
