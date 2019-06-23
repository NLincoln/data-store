import React, { useReducer, useMemo } from "react";
import {
  PullRequestStatus,
  useQueryPR,
  useFindPR,
  PullRequest
} from "./pull-requests";
import Container from "@material-ui/core/Container";
import { CssBaseline, Grid, Card, CardContent, Input } from "@material-ui/core";

function PullRequestList(props: { status: PullRequestStatus }) {
  let params = useMemo(
    () => ({
      status: props.status
    }),
    [props.status]
  );
  let result = useQueryPR(params);
  if (result.isLoading) {
    return null;
  }

  return (
    <div>
      <h3>{props.status}</h3>
      <Grid container spacing={2}>
        {result.data.map(pr => {
          return (
            <Grid item key={pr.id}>
              <PullRequestView pr={pr} onUpdate={result.update} />
            </Grid>
          );
        })}
      </Grid>
    </div>
  );
}

function PullRequestView(props: {
  pr: PullRequest;
  onUpdate: (id: string, data: Partial<PullRequest>) => void;
}) {
  let { pr } = props;
  return (
    <Card>
      <CardContent>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div>
            #{pr.id}
            <Input
              value={pr.title}
              onChange={event =>
                props.onUpdate(pr.id, {
                  title: event.target.value
                })
              }
            />
          </div>
          <select
            value={pr.status}
            onChange={event => {
              props.onUpdate(pr.id, {
                status: PullRequestStatus[
                  event.target.value as any
                ] as PullRequestStatus
              });
            }}
          >
            <option value={PullRequestStatus.Open}>
              {PullRequestStatus.Open}
            </option>
            <option value={PullRequestStatus.Merged}>
              {PullRequestStatus.Merged}
            </option>
            <option value={PullRequestStatus.Closed}>
              {PullRequestStatus.Closed}
            </option>
          </select>
        </div>
      </CardContent>
    </Card>
  );
}

function PrById(props: { id: string }) {
  let result = useFindPR(props.id);
  if (result.isLoading) {
    return <>loading</>;
  }
  return <PullRequestView pr={result.data} onUpdate={result.update} />;
}

export default function App() {
  let forceUpdate = useReducer(v => v + 1, 0)[1];

  return (
    <>
      <CssBaseline />
      <Container maxWidth={"md"}>
        <h1>All updates are intentionally slow</h1>
        <h1>Turning on "highlight updates" in react devtools encouraged</h1>

        <button onClick={forceUpdate}>Force update app</button>
        <h1>
          Querying - Note how the list that doesn't change doesn't re-render
        </h1>
        <PullRequestList status={PullRequestStatus.Closed} />
        <PullRequestList status={PullRequestStatus.Open} />
        <PullRequestList status={PullRequestStatus.Merged} />

        <h1>
          Getting By ID: Note how changing one changes the other with the same
          ID
        </h1>
        <Grid container spacing={2}>
          <Grid item>
            <PrById id={"001"} />
          </Grid>
          <Grid item>
            <PrById id={"001"} />
          </Grid>
          <Grid item>
            <PrById id={"002"} />
          </Grid>
          <Grid item>
            <PrById id={"002"} />
          </Grid>
        </Grid>
      </Container>
    </>
  );
}