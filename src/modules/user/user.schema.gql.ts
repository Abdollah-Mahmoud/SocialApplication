import { UserResolver } from "./user.resolver";

import * as gqlTypes from "./user.types.gql";
import * as gqlArgs from "./user.args.gql";
import { GraphQLNonNull, GraphQLString } from "graphql";

class UserGQLSchema {
  private userResolver: UserResolver = new UserResolver();
  constructor() {}

  registerQuery = () => {
    return {
      sayHi: {
        type: gqlTypes.welcome,
        description: "this field returns our server welcome message 🚀",
        resolve: this.userResolver.welcome,
      },

      allUsers: {
        type: gqlTypes.allUsers,
        args: { name: { type: new GraphQLNonNull(GraphQLString) } },
        resolve: this.userResolver.allUsers,
      },

      searchUser: {
        type: gqlTypes.search,
        args: gqlArgs.search,
        resolve: this.userResolver.search,
      },
    };
  };

  registerMutation = () => {
    return {
      addFollower: {
        type: gqlTypes.addFollower,
        args: gqlArgs.addFollower,
        resolve: this.userResolver.addFollower,
      },
    };
  };
}

export default new UserGQLSchema();
