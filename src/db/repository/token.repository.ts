import { DatabaseRepository } from "./db.repository";
import { IToken as TDocument } from "../model/Token.model";
import { Model } from "mongoose";

export class TokenRepository extends DatabaseRepository<TDocument> {
  constructor(protected override readonly model: Model<TDocument>) {
    super(model);
  }
}
