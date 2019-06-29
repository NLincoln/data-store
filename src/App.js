import React from "react";
import PullRequestDemo from "./demos/PullRequests";
import { Router, Link } from "@reach/router";
import { CssBaseline, Container } from "@material-ui/core";

function DemosList() {
  return (
    <>
      <h1>List of Demos:</h1>
      <ul>
        <li>
          <Link to={"pull-requests"}>Pull Requests</Link>
        </li>
      </ul>
      <Link to={"about"}>What is this?</Link>
    </>
  );
}

export default function App() {
  return (
    <>
      <CssBaseline />
      <Container maxWidth={"md"}>
        <Router>
          <PullRequestDemo path={"pull-requests"} />
          <DemosList path={"/"} />
        </Router>
      </Container>
    </>
  );
}
