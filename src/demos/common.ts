import { createModel } from "../Ajax";

export const wait = (t: number) => new Promise(r => setTimeout(r, t));

export function createInMemoryModel<TType extends { id: string }>(database: {
  [x: string]: TType;
}) {
  let autoIncrement = 0;
  return createModel({
    async getById(id: string) {
      console.log("[FIND-RECORD]", id);
      await wait(250);
      return database[id] || null;
    },
    async query(params: Partial<TType>) {
      console.log("[QUERY]", params);
      await wait(2500);

      return Object.values(database).filter(user => {
        return Object.keys(params).every(key => {
          return (user as any)[key] === (params as any)[key];
        });
      });
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
