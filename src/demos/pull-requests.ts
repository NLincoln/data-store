import { createModel, Model } from "../Ajax";

type ID = string;

interface DataRecord {
  id: ID;
}
export enum PullRequestStatus {
  Merged = "Merged",
  Closed = "Closed",
  Open = "Open"
}

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

const model: Model<PullRequest> = {
  async query(params) {
    await wait(150);
    return Object.values(database).filter(pr => {
      return Object.entries(params).every(([key, value]) => {
        return pr[key as keyof PullRequest] === value;
      });
    });
  },
  async getById(id) {
    await wait(150);
    return database[id];
  },
  async update(id, data) {
    await wait(150);
    let prevData = database[id];
    database[id] = {
      ...prevData,
      ...data
    };
    return database[id];
  }
};

const pullRequests = createModel<PullRequest>(model);

export function useQueryPR(args: Partial<PullRequest>) {
  return pullRequests.useQuery(args);
}

export function useFindPR(id: ID) {
  return pullRequests.useGetById(id);
}
