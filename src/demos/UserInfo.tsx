import React from "react";
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
import { createInMemoryModel } from "./common";

interface User {
  id: string;
  username: string;
  isActive: boolean;
}

let userModel = createInMemoryModel<User>({});

let query = {
  isActive: true
};

export default function UserInfoDemo() {
  let users = userModel.useQuery(query);
  let createUser = userModel.useCreateMutation();
  let updateUser = userModel.useUpdateMutation();

  if (users.error) {
    throw users.error;
  }
  if (!users.data) {
    return null;
  }
  let user: User | null = users.data.data[0] || null;
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
