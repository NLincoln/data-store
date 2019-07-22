import React from "react";
import PullRequestDemo from "./demos/PullRequests";
import { Router, Link } from "@reach/router";
import { CssBaseline } from "@material-ui/core";
import UserInfoDemo from "./demos/UserInfo";
import SearchDemo from "./demos/Search";
import PaginatedDemo from "./demos/Paginated";

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
        <li>
          <Link to={"search"}>Repo Search</Link>
        </li>
        <li>
          <Link to={"paginated"}>Paginated Table</Link>
        </li>
      </ul>
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
        <SearchDemo path={"search"} />
        <PaginatedDemo path={"/paginated"} />
        <DemosList path={"/"} />
      </Router>
    </>
  );
}
