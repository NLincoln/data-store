import { createModel, defaultIsSubscribingTo } from "../Ajax";

export const wait = (t: number) => new Promise(r => setTimeout(r, t));

export type PaginationMeta = {
  pageNumber: number;
  size: number | null;
  totalElements: number;
  pageCount: number;
};

type QueryField<X> = X;

export type Query<T> = { [x in keyof T]?: QueryField<T[x]> } & {
  pageSize?: number;
  page?: number;
};
class NotFoundError extends Error {
  constructor(id: string, model: string, message?: string) {
    super(`Failed to look up ${model}:${id} ${message || ""}`);
  }
}

export function createInMemoryModel<TType extends { id: string }>(database: {
  [x: string]: TType;
}) {
  type TFullData = {
    data: TType[];
    meta: PaginationMeta;
  };

  let autoIncrement = 0;
  return createModel<TType, Query<TType>, TFullData>({
    isSubscribingTo: defaultIsSubscribingTo,
    transformQueryResponseToArray(response: TFullData) {
      return response.data;
    },
    async getById(id: string) {
      console.log("[FIND-RECORD]", id);
      await wait(250);
      let value = database[id];
      if (!value) {
        throw new NotFoundError(id, "common-model");
      }
      return value;
    },
    async query({ page, pageSize, ...params }: Query<TType>) {
      console.log("[QUERY]", params);
      await wait(2500);

      let data = Object.values(database).filter(user => {
        return Object.keys(params).every(key => {
          return (user as any)[key] === (params as any)[key];
        });
      });
      let totalElements = data.length;
      let pageCount = 1;

      if (pageSize) {
        let pageOrDefault = page || 0;
        let start = pageOrDefault * pageSize;
        let end = (pageOrDefault + 1) * pageSize;
        data = data.slice(start, end);
        pageCount = Math.ceil(totalElements / pageSize);
      }
      return {
        data,
        meta: {
          totalElements,
          pageCount,
          pageNumber: page || 0,
          size: pageSize || null
        }
      };
    },
    async update(id: string, update: Partial<TType>) {
      console.log("[UPDATE]", id, update);
      await wait(250);
      database[id] = {
        ...database[id],
        ...update
      };
      return database[id];
    },
    async create(data: Omit<TType, "id">): Promise<TType> {
      console.log("[CREATE]", data);
      await wait(1500);
      let id = autoIncrement++;
      database[id] = {
        ...data,
        id: String(id)
      } as any;
      return database[id];
    },
    async delete(id: string) {
      console.log("[DELETE]", id);
      await wait(1000);
      delete database[id];
    }
  });
}
