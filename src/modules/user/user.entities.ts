import { HUserDocument } from "../../db/model/User.model";

export interface IProfileImageResponse {
  url: string;
}

export interface IUserResponse {
  user: Partial<HUserDocument>;
}
