import { roleEnum } from "../../db/model/User.model";

export const endpoint = {
  welcome: [roleEnum.user, roleEnum.admin],
  profile: [roleEnum.user, roleEnum.admin],
  restoreAccount: [roleEnum.admin],
  hardDelete: [roleEnum.admin],
  dashboard: [roleEnum.admin, roleEnum.superAdmin],
};
