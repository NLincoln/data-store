import React, { useState } from "react";
import { createModel } from "../Ajax";
import {
  Container,
  Input,
  Card,
  CardHeader,
  CardContent
} from "@material-ui/core";

interface Project {
  id: string;
  name: string;
  full_name: string;
  url: string;
}

let repositories = createModel<Project, string, { items: Project[] }>({
  isSubscribingTo(query: string, record: Project) {
    return record.name.startsWith(query);
  },
  transformQueryResponseToArray(response) {
    return response.items;
  },
  async getById(id) {
    throw new Error("Not supported");
  },
  async query(name): Promise<{ items: Project[] }> {
    if (name.length === 0) {
      return { items: [] };
    }
    let params = new URLSearchParams();
    params.append("q", name);
    let response = await fetch(
      `https://api.github.com/search/repositories?${params}`
    );
    if (!response.ok) {
      let err = await response.json();
      throw err;
    }
    return await response.json();
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
  let query = repositories.useQuery(searchValue);

  if (query.error) {
    throw query.error;
  }

  if (!query.data) {
    return null;
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
              {query.data.items.map(repo => (
                <li key={repo.id}>{repo.full_name}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </Container>
    </>
  );
}
