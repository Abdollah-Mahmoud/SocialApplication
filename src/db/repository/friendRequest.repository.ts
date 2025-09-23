import { Model } from "mongoose";
import { IFriendRequest as TDocument } from "../model/friendRequest.model";
import { DatabaseRepository } from "./db.repository";

export class friendRequestRepository extends DatabaseRepository<TDocument> {
  constructor(protected override readonly model: Model<TDocument>) {
    super(model);
  }
}
