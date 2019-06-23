import React, { useReducer } from "react";
import { PullRequestStatus, useQueryPR, useFindPR } from "./pull-requests";

function PullRequestList(props: { status: PullRequestStatus }) {
  let result = useQueryPR({
    status: props.status
  });
  if (result.isLoading) {
    return null;
  }

  return (
    <div>
      <h1>{props.status}</h1>
      {result.data.map(pr => {
        return <PullRequestView key={pr.id} id={pr.id} />;
      })}
    </div>
  );
}

function PullRequestView(props: { id: string }) {
  let result = useFindPR(props.id);
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
          result.update!(pr.id, {
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
  let forceUpdate = useReducer(v => v + 1, 0)[1];

  return (
    <>
      <button onClick={forceUpdate}>Force update app</button>
      <PullRequestList status={PullRequestStatus.Closed} />
      <PullRequestList status={PullRequestStatus.Open} />
      <PullRequestList status={PullRequestStatus.Merged} />
    </>
  );
}
