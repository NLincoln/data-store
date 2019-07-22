import React, { useState, useCallback, useMemo, ChangeEvent } from "react";
import { createInMemoryModel } from "./common";
import {
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Container,
  TablePagination,
  Card,
  CardHeader,
  CardContent
} from "@material-ui/core";

interface Task {
  id: string;
  title: string;
  estimate: string;
}

const tasks = createInMemoryModel<Task>({
  "001": {
    id: "001",
    title: "Walk the dog",
    estimate: "1h"
  },
  "002": {
    id: "002",
    title: "Wash the dishes",
    estimate: "30m"
  },
  "003": {
    id: "003",
    title: "Brush Teeth",
    estimate: "3m"
  },
  "004": {
    id: "004",
    title: "Work on project",
    estimate: "10h"
  },
  "005": {
    id: "005",
    title: "Browse Twitter",
    estimate: "2h"
  },
  "006": {
    id: "006",
    title: "Browse Facebook",
    estimate: "0m"
  },
  "007": {
    id: "007",
    title: "Work on work",
    estimate: "1h"
  },
  "008": {
    id: "008",
    title: "Create more list items",
    estimate: "1h"
  },
  "009": {
    id: "009",
    title: "Listen to Eurobeat",
    estimate: "1h"
  },
  "010": {
    id: "010",
    title: "Compile Dependencies",
    estimate: "1h"
  },
  "011": {
    id: "011",
    title: "Read DUNE",
    estimate: "1h"
  },
  "012": {
    id: "012",
    title: "Watch TV",
    estimate: "1h"
  }
});

function usePagination() {
  let [page, setPage] = useState(0);
  let [perPage, setPerPage] = useState<number>(5);
  const onPerPageChange = useCallback((value: number) => {
    setPerPage(value);
    setPage(0);
  }, []);
  return {
    page,
    perPage,
    setPage,
    setPerPage: onPerPageChange
  };
}

export default function PaginatedDemo() {
  let pagination = usePagination();
  let query = useMemo(
    () => ({
      pageSize: pagination.perPage,
      page: pagination.page
    }),
    [pagination.perPage, pagination.page]
  );

  let results = tasks.useQuery(query);
  return (
    <Container maxWidth={"md"}>
      <Card>
        <CardHeader
          title={
            <>
              Pagination Demo{" "}
              {results.isLoading && (
                <span data-testid={"loading"}>Loading...</span>
              )}
            </>
          }
        />
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Time Estimate</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {results.data &&
                results.data.data.map(task => (
                  <TableRow key={task.id}>
                    <TableCell>{task.id}</TableCell>
                    <TableCell>{task.title}</TableCell>
                    <TableCell>{task.estimate}</TableCell>
                  </TableRow>
                ))}
              {results.data && (
                <TableRow>
                  <TablePagination
                    rowsPerPageOptions={[2, 5, 10]}
                    count={results.data.meta.totalElements}
                    rowsPerPage={pagination.perPage}
                    page={pagination.page}
                    onChangePage={(event: unknown, newPage: number) =>
                      pagination.setPage(newPage)
                    }
                    onChangeRowsPerPage={(
                      event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
                    ) => pagination.setPerPage(Number(event.target.value))}
                  />
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Container>
  );
}
