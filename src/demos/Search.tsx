import React, { useState, useMemo } from "react";
import { createModel } from "../Ajax";
import {
  Container,
  Input,
  Card,
  CardHeader,
  CardContent
} from "@material-ui/core";
import { wait } from "./common";

interface Project {
  id: string;
  name: string;
  full_name: string;
  url: string;
}

let repositories = createModel<Project>({
  async getById(id) {
    throw new Error("Not supported");
  },
  async query(data) {
    let name = data.name!!;
    if (name.length === 0) {
      return [];
    }
    let params = new URLSearchParams();
    params.append("q", data.name!!);
    let response = await fetch(
      `https://api.github.com/search/repositories?${params}`
    );
    if (!response.ok) {
      let err = await response.json();
      throw err;
    }
    let { items } = await response.json();
    return items;
  },
  update(id, data) {
    throw new Error("Not supported");
  },
  create(data) {
    throw new Error("Not supported");
  },
  delete(id) {
    throw new Error("Not supported");
  }
});

export default function SearchDemo() {
  let [searchValue, setSearchValue] = useState("");
  let params = useMemo(
    () => ({
      name: searchValue
    }),
    [searchValue]
  );
  let query = repositories.useQuery(params);

  if (query.isLoading) {
    return null;
  }

  if (query.error) {
    throw query.error;
  }

  return (
    <>
      <Container maxWidth={"md"} style={{ padding: 24 }}>
        <Card>
          <CardHeader
            title={
              "Search for public repositories (you'll probably be rate limited after a bit)"
            }
          />
          <CardContent>
            <Input
              style={{ width: "100%" }}
              value={searchValue}
              placeholder={"Search"}
              onChange={event => setSearchValue(event.target.value)}
            />
            <ul>
              {query.data.map(repo => (
                <li key={repo.id}>{repo.full_name}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </Container>
    </>
  );
}
