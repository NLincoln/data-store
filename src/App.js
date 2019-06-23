import React from "react";
import PullRequestDemo from "./demos/PullRequests";
import { Router, Link } from "@reach/router";

function DemosList() {
  return (
    <>
      <h1>List of Demos:</h1>
      <ul>
        <li>
          <Link to={"pull-requests"}>Pull Requests</Link>
        </li>
      </ul>
    </>
  );
}

export default function App() {
  return (
    <>
      <Router>
        <PullRequestDemo path={"pull-requests"} />
        <DemosList path={"/"} />
      </Router>
    </>
  );
}
