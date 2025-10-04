import { HChatDocument } from "../../db/model/chat.model";
import { HUserDocument } from "../../db/model/User.model";

export interface IProfileImageResponse {
  url: string;
}

export interface IUserResponse {
  user: Partial<HUserDocument>;
  groups?: Partial<HChatDocument>[];
}
