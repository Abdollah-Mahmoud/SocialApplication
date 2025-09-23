import { Model } from "mongoose";
import { IComment as TDocument } from "./../model/Comment.model";
import { DatabaseRepository } from "./db.repository";

export class CommentRepository extends DatabaseRepository<TDocument> {
  constructor(protected override readonly model: Model<TDocument>) {
    super(model);
  }
}
