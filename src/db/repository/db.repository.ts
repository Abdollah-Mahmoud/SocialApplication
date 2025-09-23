import {
  CreateOptions,
  DeleteResult,
  FlattenMaps,
  HydratedDocument,
  Model,
  MongooseUpdateQueryOptions,
  PopulateOptions,
  ProjectionType,
  QueryOptions,
  RootFilterQuery,
  Types,
  UpdateQuery,
  UpdateWriteOpResult,
} from "mongoose";

export type Lean<T> = HydratedDocument<FlattenMaps<T>>;

export abstract class DatabaseRepository<TDocument> {
  constructor(protected readonly model: Model<TDocument>) {}

  async find({
    filter,
    select,
    options,
  }: {
    filter?: RootFilterQuery<TDocument>;
    select?: ProjectionType<TDocument> | undefined;
    options?: QueryOptions<TDocument> | undefined;
  }): Promise<HydratedDocument<TDocument>[] | [] | Lean<TDocument>[]> {
    const doc = this.model.find(filter || {}).select(select || "");

    if (options?.populate) {
      doc.populate(options.populate as PopulateOptions[]);
    }

    if (options?.skip) {
      doc.skip(options.skip);
    }

    if (options?.limit) {
      doc.limit(options.limit);
    }

    if (options?.lean) {
      doc.lean();
    }

    return await doc.exec();
  }

  async findById({
    id,
    select,
    options,
  }: {
    id: Types.ObjectId;
    select?: ProjectionType<TDocument> | undefined;
    options?: QueryOptions<TDocument> | undefined;
  }): Promise<HydratedDocument<TDocument> | Lean<TDocument> | null> {
    const doc = this.model.findById(id).select(select || "");

    if (options?.populate) {
      doc.populate(options.populate as PopulateOptions[]);
    }

    if (options?.lean) {
      doc.lean();
    }

    return await doc.exec();
  }

  async paginate({
    filter = {},
    select,
    options = {},
    page = "all",
    size = 5,
  }: {
    filter: RootFilterQuery<TDocument>;
    select?: ProjectionType<TDocument> | undefined;
    options?: QueryOptions<TDocument> | undefined;
    page?: number | "all";
    size?: number;
  }): Promise<HydratedDocument<TDocument>[] | [] | Lean<TDocument>[] | any> {
    let docsCount: number | undefined = undefined;
    let pages: number | undefined = undefined;
    if (page !== "all") {
      page = Math.floor(page < 1 ? 1 : page);
      options.limit = Math.floor(size < 1 || !size ? 5 : size);
      options.skip = (page - 1) * options.limit;

      docsCount = await this.model.countDocuments(filter);
      pages = Math.ceil(docsCount / options.limits);
    }
    const result = await this.find({ filter, select, options });
    return {
      docsCount,
      limit: options.limit,
      pages,
      currentPage: page !== "all" ? page : undefined,
      result,
    };
  }

  async findOne({
    filter,
    select,
    options,
  }: {
    filter?: RootFilterQuery<TDocument>;
    select?: ProjectionType<TDocument> | null;
    options?: QueryOptions<TDocument> | null;
  }): Promise<Lean<TDocument> | HydratedDocument<TDocument> | null> {
    const doc = this.model.findOne(filter).select(select || "");

    if (options?.populate) {
      doc.populate(options.populate as PopulateOptions[]);
    }

    if (options?.lean) {
      doc.lean(options.lean);
    }
    return await doc.exec();
  }

  async create({
    data,
    options,
  }: {
    data: Partial<TDocument>[];
    options?: CreateOptions | undefined;
  }): Promise<HydratedDocument<TDocument>[] | undefined> {
    return await this.model.create(data, options);
  }

  async updateOne({
    filter,
    update,
    options,
  }: {
    filter: RootFilterQuery<TDocument>;
    update: UpdateQuery<TDocument>;
    options?: MongooseUpdateQueryOptions<TDocument> | null;
  }): Promise<UpdateWriteOpResult> {
    if (Array.isArray(update)) {
      update.push({
        $set: {
          __v: { $add: ["$__v", 1] },
        },
      });
      return await this.model.updateOne(filter, update, options);
    }

    return await this.model.updateOne(
      filter,
      { ...update, $inc: { __v: 1 } },
      options
    );
  }

  async findOneAndUpdate({
    filter,
    update,
    options = { new: true },
  }: {
    filter?: RootFilterQuery<TDocument>;
    update?: UpdateQuery<TDocument>;
    options?: QueryOptions<TDocument> | null;
  }): Promise<HydratedDocument<TDocument> | Lean<TDocument> | null> {
    return this.model.findOneAndUpdate(
      filter,
      { ...update, $inc: { __v: 1 } },
      options
    );
  }

  async findByIdAndUpdate({
    id,
    update,
    options = { new: true },
  }: {
    id: Types.ObjectId;
    update?: UpdateQuery<TDocument>;
    options?: QueryOptions<TDocument> | null;
  }): Promise<HydratedDocument<TDocument> | Lean<TDocument> | null> {
    return this.model.findByIdAndUpdate(
      id,
      { ...update, $inc: { __v: 1 } },
      options
    );
  }

  async findOneAndDelete({
  filter,
  options,
}: {
  filter?: RootFilterQuery<TDocument>;
  options?: QueryOptions<TDocument> | null;
}): Promise<HydratedDocument<TDocument> | Lean<TDocument> | null> {
  return this.model.findOneAndDelete(filter, options || undefined);
}


  async deleteOne({
    filter,
  }: {
    filter: RootFilterQuery<TDocument>;
  }): Promise<DeleteResult> {
    return this.model.deleteOne(filter);
  }
}
