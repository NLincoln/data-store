import React, { useState, useCallback } from "react";
import { createModel } from "../Ajax";
import {
  Container,
  Card,
  CardHeader,
  CardContent,
  Button
} from "@material-ui/core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { Formik, Field, Form } from "formik";
import { faSpinner } from "@fortawesome/free-solid-svg-icons";

interface User {
  id: string;
  username: string;
  isActive: boolean;
}
let wait = (t: number) => new Promise(r => setTimeout(r, t));
let autoIncrement = 1;
let DATABASE: { [x: string]: User } = {};

let userModel = createModel({
  async getById(id: string) {
    console.log("[FIND-RECORD] /users", id);
    await wait(250);
    return DATABASE[id] || null;
  },
  async query(params: Partial<User>) {
    console.log("[QUERY] /users", params);
    await wait(2500);

    return Object.values(DATABASE).filter(user => {
      return Object.keys(params).every(key => {
        return (user as any)[key] === (params as any)[key];
      });
    });
  },
  async update(id: string, update: Partial<User>) {
    console.log("[UPDATE] /users", id, update);
    await wait(250);
    DATABASE[id] = {
      ...DATABASE[id],
      ...update
    };
    return DATABASE[id];
  },
  async create(data: Omit<User, "id">): Promise<User> {
    console.log("[CREATE] /users", data);
    await wait(1500);
    let id = autoIncrement++;
    DATABASE[id] = {
      ...data,
      id: String(id)
    };
    return DATABASE[id];
  },
  async delete(id: string) {
    console.log("[DELETE] /users", id);
    await wait(1000);
    delete DATABASE[id];
  }
});

function useWrapAsyncMutation<F extends Function>(
  callback: F
): { isRunning: boolean; execute: F } {
  let [isRunning, setRunning] = useState(false);

  let execute = useCallback(
    async (...args) => {
      setRunning(true);
      let result = await callback(...args);
      setRunning(false);
      return result;
    },
    [callback]
  );
  return {
    execute: execute as any,
    isRunning
  };
}

let query = {
  isActive: true
};

export default function UserInfoDemo() {
  let users = userModel.useQuery(query);
  let createUser = useWrapAsyncMutation(userModel.useCreateMutation());
  let updateUser = useWrapAsyncMutation(userModel.useUpdateMutation());

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
                <Button
                  onClick={() => {
                    updateUser.execute(user!!.id, {
                      isActive: false
                    });
                  }}
                  disabled={updateUser.isRunning}
                  variant={"contained"}
                  color={"primary"}
                  style={{ display: "block", width: "100%", padding: 8 }}
                >
                  Remove User{" "}
                  {updateUser.isRunning && (
                    <FontAwesomeIcon icon={faSpinner} spin />
                  )}
                </Button>
              </>
            ) : (
              <Formik
                onSubmit={values => {
                  createUser.execute({
                    username: values.username,
                    isActive: true
                  });
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
