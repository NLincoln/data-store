import { createModel, Model, defaultIsSubscribingTo } from "../Ajax";

type ID = string;

interface DataRecord {
  id: ID;
}
export enum PullRequestStatus {
  Merged = "Merged",
  Closed = "Closed",
  Open = "Open"
}

let autoIncrement = 0;
let database: { [x: string]: PullRequest } = {
  "001": {
    id: "001",
    title: "Issue 1",
    status: PullRequestStatus.Closed
  },
  "002": {
    id: "002",
    title: "Issue 2",
    status: PullRequestStatus.Closed
  },
  "003": {
    id: "003",
    title: "Issue 3",
    status: PullRequestStatus.Open
  },
  "004": {
    id: "004",
    title: "Issue 4",
    status: PullRequestStatus.Open
  },
  "005": {
    id: "005",
    title: "Issue 5",
    status: PullRequestStatus.Merged
  },
  "006": {
    id: "006",
    title: "Issue 6",
    status: PullRequestStatus.Merged
  }
};

export interface PullRequest extends DataRecord {
  id: ID;
  status: PullRequestStatus;
  title: string;
}
let wait = (timeout: number) => new Promise(r => setTimeout(r, timeout));

class NotFoundError extends Error {
  constructor(id: string, model: string, message?: string) {
    super(`Failed to look up ${model}:${id} ${message || ""}`);
  }
}

let log = (...messages: any[]) => {
  console.log(...messages);
  let formatted = messages
    .map(message => {
      if (typeof message === "string" || typeof message === "number") {
        return message;
      }
      return JSON.stringify(message);
    })
    .join(" ");
  if ((window as any).addToNetworkCalls) {
    (window as any).addToNetworkCalls(formatted);
  }
};

const model: Model<PullRequest, Partial<PullRequest>, PullRequest[]> = {
  isSubscribingTo: defaultIsSubscribingTo,
  transformQueryResponseToArray(response) {
    return response;
  },
  async query(params) {
    log("[QUERY] /pull-requests", params);
    await wait(150);
    let data = Object.values(database).filter(pr => {
      return Object.entries(params).every(([key, value]) => {
        return pr[key as keyof PullRequest] === value;
      });
    });
    return data;
  },
  async getById(id) {
    log("[FIND-RECORD] /pull-requests", id);
    await wait(150);
    if (database[id] === undefined) {
      throw new NotFoundError(id, "pull-request");
    }
    return database[id];
  },
  async update(id, data) {
    log("[UPDATE] /pull-requsts", id, data);
    await wait(250);
    let prevData = database[id];
    database[id] = {
      ...prevData,
      ...data
    };
    return database[id];
  },
  async create(data: Omit<PullRequest, "id">): Promise<PullRequest> {
    log("[CREATE] /pull-requsts", data);
    await wait(200);
    let id = autoIncrement++;
    database[id] = {
      ...data,
      id: String(id)
    };
    return database[id];
  },
  async delete(id: string) {
    log("[DELETE] /pull-requests", id);
    await wait(1000);
    delete database[id];
  }
};

const pullRequests = createModel(model);

export function useQueryPR(args: Partial<PullRequest>) {
  return pullRequests.useQuery(args);
}

export function useFindPR(id: ID) {
  let result = pullRequests.useGetById(id);
  if (result.error) {
    throw result.error;
  }
  return result;
}
