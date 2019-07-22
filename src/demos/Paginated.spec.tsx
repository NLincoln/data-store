import "@testing-library/react/cleanup-after-each";
import "@testing-library/jest-dom/extend-expect";

import React from "react";
import { render, fireEvent } from "@testing-library/react";
import PaginatedDemo from "./Paginated";

test("It queries for data", async () => {
  let { getByTestId } = render(<PaginatedDemo />);

  expect(getByTestId("loading")).toBeInTheDocument();
});
