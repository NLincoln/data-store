import React from "react";
import { useGetById, UseQueryResult, useQuery } from "./Ajax";

type ID = string;

interface DataRecord {
  id: ID;
}

enum PullRequestStatus {
  Merged = "Merged",
  Closed = "Closed",
  Open = "Open"
}

interface PullRequest extends DataRecord {
  id: ID;
  status: PullRequestStatus;
  title: string;
}

type FetchResult<T extends DataRecord> =
  | {
      loading: true;
      data: null;
      update: null;
    }
  | {
      loading: false;
      data: T[];
      update: (record: Partial<T>) => Promise<void>;
    };

function usePullRequests(params: {
  status: PullRequestStatus;
}): UseQueryResult<PullRequest> {
  return useQuery(params.status);
}

function PullRequestList(props: { status: PullRequestStatus }) {
  let result = usePullRequests({
    status: props.status
  });
  if (result.isLoading) {
    return null;
  }

  return (
    <div>
      <h1>{props.status}</h1>
      {result.data.map(pr => {
        return <PullRequestView id={pr.id} />;
      })}
    </div>
  );
}

function PullRequestView(props: { id: string }) {
  let result = useGetById<PullRequest>(`pr:${props.id}`);
  if (result.isLoading) {
    return <>loading</>;
  }
  let pr = result.data;
  return (
    <div style={{ display: "flex" }}>
      <div>
        [{pr.id}][{pr.status}] {pr.title}
      </div>
      <select
        value={pr.status}
        onChange={event => {
          result.update!({
            status: PullRequestStatus[
              event.target.value as any
            ] as PullRequestStatus
          });
        }}
      >
        <option value={PullRequestStatus.Open}>{PullRequestStatus.Open}</option>
        <option value={PullRequestStatus.Merged}>
          {PullRequestStatus.Merged}
        </option>
        <option value={PullRequestStatus.Closed}>
          {PullRequestStatus.Closed}
        </option>
      </select>
    </div>
  );
}

export default function App() {
  return (
    <>
      <PullRequestList status={PullRequestStatus.Open} />
      <PullRequestList status={PullRequestStatus.Merged} />
      <PullRequestList status={PullRequestStatus.Closed} />
    </>
  );
}
