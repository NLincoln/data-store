import React, { useState, useCallback } from "react";
import { createModel } from "../Ajax";
import {
  Container,
  Card,
  CardHeader,
  CardContent,
  TextField,
  Button
} from "@material-ui/core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Formik, Field, Form } from "formik";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

interface User {
  id: string;
  username: string;
}
let wait = (t: number) => new Promise(r => setTimeout(r, t));
let autoIncrement = 1;
let DATABASE: { [x: string]: User } = {};

let userModel = createModel({
  async getById(id: string) {
    console.log("[FIND-RECORD] /pull-requests", id);
    await wait(250);
    return DATABASE[id] || null;
  },
  async query(params: Partial<User>) {
    console.log("[QUERY] /pull-requests", params);
    await wait(2500);

    return Object.values(DATABASE).filter(user => {
      return Object.keys(params).every(key => {
        return (user as any)[key] === (params as any)[key];
      });
    });
  },
  async update(id: string, update: Partial<User>) {
    console.log("[UPDATE] /pull-requsts", id, update);
    await wait(250);
    DATABASE[id] = {
      ...DATABASE[id],
      ...update
    };
    return DATABASE[id];
  },
  async create(data: Omit<User, "id">): Promise<User> {
    console.log("[CREATE] /pull-requsts", data);
    await wait(1500);
    let id = autoIncrement++;
    DATABASE[id] = {
      ...data,
      id: String(id)
    };
    return DATABASE[id];
  }
});

function useWrapAsyncMutation<F extends CallableFunction>(callback: F) {
  let [isRunning, setRunning] = useState(false);

  let execute = useCallback(
    async (...args: any[]) => {
      setRunning(true);
      let result = await callback(...args);
      setRunning(false);
      return result;
    },
    [callback]
  );
  return {
    execute,
    isRunning
  };
}

let query = {};

export default function UserInfoDemo() {
  let users = userModel.useQuery(query);
  let createUser = useWrapAsyncMutation(userModel.useCreateMutation());

  console.log(users);
  if (users.isLoading) {
    return null;
  }
  if (users.error) {
    throw users.error;
  }
  let user: User | null = users.data[0] || null;
  return (
    <>
      <Container maxWidth={"md"} style={{ padding: 24 }}>
        <Card>
          <CardHeader title={"Create New User"} />
          <CardContent>
            {user ? (
              <>
                <p>
                  <strong>User ID: </strong> {user.id}
                </p>
                <p>
                  <strong>Username: </strong> {user.username}
                </p>
              </>
            ) : (
              <Formik
                onSubmit={values => {
                  createUser.execute(values);
                }}
                initialValues={{
                  username: ""
                }}
              >
                {form => {
                  return (
                    <Form>
                      <Field
                        name={"username"}
                        placeholder="Username"
                        style={{ width: "100%" }}
                      />
                      <div style={{ height: 24 }} />
                      <Button
                        disabled={createUser.isRunning}
                        type={"submit"}
                        variant={"contained"}
                        color={"primary"}
                        style={{ display: "block", width: "100%", padding: 8 }}
                      >
                        Create User{" "}
                        {createUser.isRunning && (
                          <FontAwesomeIcon icon={faSpinner} spin />
                        )}
                      </Button>
                    </Form>
                  );
                }}
              </Formik>
            )}
          </CardContent>
        </Card>
      </Container>
    </>
  );
}
