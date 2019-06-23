import { createModel } from "./Ajax";

type ID = string;

interface DataRecord {
  id: ID;
}

export enum PullRequestStatus {
  Merged = "Merged",
  Closed = "Closed",
  Open = "Open"
}

export interface PullRequest extends DataRecord {
  id: ID;
  status: PullRequestStatus;
  title: string;
}
const pullRequests = createModel<PullRequest>();

export function useQueryPR(args: { status: PullRequestStatus }) {
  return pullRequests.useQuery(args.status);
}

export function useFindPR(id: ID) {
  return pullRequests.useGetById(id);
}
