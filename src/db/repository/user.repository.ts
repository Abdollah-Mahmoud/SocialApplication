import { CreateOptions, HydratedDocument, Model } from "mongoose";
import { IUser as TDocument } from "../model/User.model";
import { BadRequestException } from "../../utils/response/error.response";
import { DatabaseRepository } from "./db.repository";

export class UserRepository extends DatabaseRepository<TDocument> {
  constructor(protected override readonly model: Model<TDocument>) {
    super(model);
  }

  

  async createUser({
    data,
    options,
  }: {
    data: Partial<TDocument>[];
    options?: CreateOptions;
  }): Promise<HydratedDocument<TDocument>> {
    const [user] = (await this.create({ data, options })) || [];
    if (!user) {
      throw new BadRequestException("Fail to create this user");
    }
    return user;
  }
}
