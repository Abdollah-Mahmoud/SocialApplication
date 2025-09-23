import { model, models, Schema, HydratedDocument, Types } from "mongoose";
import { generateHash } from "../../utils/security/hash.security";
import { emailEvent } from "../../utils/email/email.event";

export enum genderEnum {
  male = "male",
  female = "female",
}

export enum roleEnum {
  user = "user",
  admin = "admin",
  superAdmin = "super-admin",
}

export enum ProviderEnum {
  GOOGLE = "GOOGLE",
  SYSTEM = "SYSTEM",
}

export interface IUser {
  // _id: Types.ObjectId;

  firstName: string;
  lastName: string;
  username?: string;

  email: string;
  confirmEmailOtp?: string;
  confirmedAt?: Date;

  password: string;
  resetPasswordOtp?: string;
  changeCredentialsTime?: Date;

  phone?: string;
  address?: string;
  profileImage?: string;
  tempProfileImage?: string;
  coverImages?: string[];

  gender: genderEnum;
  role: roleEnum;

  provider: ProviderEnum;

  freezedAt?: Date;
  freezedBy?: Types.ObjectId;

  restoredAt?: Date;
  restoredBy?: Types.ObjectId;
  friends?: Types.ObjectId[];

  createdAt: Date;
  updatedAt?: Date;

  blocked?: Types.ObjectId[];
}
// export interface IUserDocument extends IUser, Document {}

const userSchema = new Schema<IUser>(
  {
    firstName: { type: String, required: true, minLength: 2, maxLength: 25 },
    lastName: { type: String, required: true, minLength: 2, maxLength: 25 },

    email: { type: String, required: true, unique: true },
    confirmEmailOtp: { type: String },
    confirmedAt: { type: Date },

    password: {
      type: String,
      required: function () {
        return this.provider === ProviderEnum.GOOGLE ? false : true;
      },
    },
    resetPasswordOtp: { type: String },
    changeCredentialsTime: { type: Date },

    phone: { type: String },
    address: { type: String },
    profileImage: { type: String },
    tempProfileImage: String,
    coverImages: [String],

    gender: {
      type: String,
      enum: genderEnum,
      default: genderEnum.male,
    },
    role: {
      type: String,
      enum: roleEnum,
      default: roleEnum.user,
    },

    freezedAt: Date,
    freezedBy: { type: Schema.Types.ObjectId, ref: "User" },

    restoredAt: Date,
    restoredBy: { type: Schema.Types.ObjectId, ref: "User" },
    friends: [{ type: Schema.Types.ObjectId, ref: "User" }],

    blocked: [{ type: Schema.Types.ObjectId, ref: "User" }],

    provider: {
      type: String,
      enum: ProviderEnum,
      default: ProviderEnum.SYSTEM,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    strictQuery: true,
  }
);

userSchema
  .virtual("username")
  .set(function (value: string) {
    const [firstName, lastName] = value.split(" ") || [];
    this.set({ firstName, lastName });
  })
  .get(function () {
    return this.firstName + " " + this.lastName;
  });

userSchema.pre(
  "save",
  async function (
    this: HUserDocument & { wasNew: Boolean; confirmEmailPlainOtp?: string },
    next
  ) {
    this.wasNew = this.isNew;

    if (this.isModified("password")) {
      this.password = await generateHash(this.password);
    }
    if (this.isModified("confirmEmailOtp")) {
      this.confirmEmailPlainOtp = this.confirmEmailOtp as string;
      this.confirmEmailOtp = await generateHash(this.confirmEmailOtp as string);
    }

    next();
  }
);

userSchema.post("save", async function (doc, next) {
  const that = this as HUserDocument & {
    wasNew: boolean;
    confirmEmailPlainOtp?: string;
  };
  if (that.wasNew && that.confirmEmailPlainOtp) {
    emailEvent.emit("confirmEmail", {
      to: this.email,
      otp: that.confirmEmailPlainOtp,
    });
  }

  next();
});

userSchema.pre(["find", "findOne"], function (next) {
  const query = this.getQuery();
  if (query.paranoid === false) {
    this.setQuery({ ...query });
  } else {
    this.setQuery({ ...query, freezedAt: { $exists: false } });
  }
  next();
});

export const UserModel = models.user || model<IUser>("User", userSchema);
export type HUserDocument = HydratedDocument<IUser>;
