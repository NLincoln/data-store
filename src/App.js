import React from "react";
import PullRequestDemo from "./demos/PullRequests";
import { Router, Link } from "@reach/router";
import { CssBaseline } from "@material-ui/core";
import UserInfoDemo from "./demos/UserInfo";

function DemosList() {
  return (
    <>
      <h1>List of Demos:</h1>
      <ul>
        <li>
          <Link to={"pull-requests"}>Pull Requests</Link>
        </li>
        <li>
          <Link to={"user-info"}>User Creation</Link>
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
      <Router>
        <PullRequestDemo path={"pull-requests"} />
        <UserInfoDemo path={"user-info"} />
        <DemosList path={"/"} />
      </Router>
    </>
  );
}
