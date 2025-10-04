import { HChatDocument } from "../../db/model/chat.model";

export interface IGetChatResponse {
  chat: Partial<HChatDocument>;
}
