import React, { useContext, useReducer, useEffect } from "react";

export interface Ajax {
  getById<T>(id: string): Promise<T>;
  query<T>(status: string): Promise<T[]>;
}

interface DbRecord {
  id: string;
  title: string;
  status: string;
}
let database: { [x: string]: DbRecord } = {
  "pr:001": {
    id: "001",
    title: "Closed Issue 1",
    status: "Closed"
  },
  "pr:002": {
    id: "002",
    title: "Closed Issue 2",
    status: "Closed"
  },
  "pr:003": {
    id: "003",
    title: "Open Issue 1",
    status: "Open"
  },
  "pr:004": {
    id: "004",
    title: "Open Issue 2",
    status: "Open"
  },
  "pr:005": {
    id: "005",
    title: "Merged Issue 1",
    status: "Merged"
  },
  "pr:006": {
    id: "006",
    title: "Merged Issue 2",
    status: "Merged"
  }
};

let wait = (timeout: number) => new Promise(r => setTimeout(r, timeout));

let ajax: Ajax = {
  async getById<T>(id: string): Promise<T> {
    await wait(50);
    return (database[id] as unknown) as T;
  },
  async query<T>(status: string): Promise<T[]> {
    await wait(50);
    return Object.values(database)
      .filter(record => record.status === status)
      .map(record => (record as unknown) as T);
  }
};

let Context = React.createContext<Ajax>(ajax);

export type UseGetByIdResult<T> =
  | {
      isLoading: true;
      data: null;
      update: null;
    }
  | {
      isLoading: false;
      data: T;
      update: (val: Partial<T>) => Promise<void>;
    };
type GetByIdAction<T> = {
  type: "FINISHED";
  data: T;
};

export function useGetById<T>(id: string): UseGetByIdResult<T> {
  let ajax = useContext(Context);
  let [state, dispatch] = useReducer(
    (
      state: UseGetByIdResult<T>,
      action: GetByIdAction<T>
    ): UseGetByIdResult<T> => {
      if (action.type === "FINISHED") {
        return {
          isLoading: false,
          data: action.data,
          update: (val: Partial<T>) => Promise.resolve()
        };
      }
      return state;
    },
    {
      isLoading: true,
      data: null,
      update: null
    }
  );

  useEffect(() => {
    let isCurrent = true;
    ajax.getById<T>(id).then(data => {
      if (!isCurrent) return;
      dispatch({
        type: "FINISHED",
        data
      });
    });
    return () => {
      isCurrent = false;
    };
  }, [id, ajax]);

  return state;
}

export type UseQueryResult<T> =
  | {
      isLoading: true;
      data: null;
      update: null;
    }
  | {
      isLoading: false;
      data: T[];
      update: (val: Partial<T>) => Promise<void>;
    };
type QueryAction<T> = {
  type: "FINISHED";
  data: T[];
};

export function useQuery<T>(id: string): UseQueryResult<T> {
  let ajax = useContext(Context);
  let [state, dispatch] = useReducer(
    (state: UseQueryResult<T>, action: QueryAction<T>): UseQueryResult<T> => {
      if (action.type === "FINISHED") {
        return {
          isLoading: false,
          data: action.data,
          update: (val: Partial<T>) => Promise.resolve()
        };
      }
      return state;
    },
    {
      isLoading: true,
      data: null,
      update: null
    }
  );

  useEffect(() => {
    let isCurrent = true;
    ajax.query<T>(id).then(data => {
      if (!isCurrent) return;
      dispatch({
        type: "FINISHED",
        data
      });
    });
    return () => {
      isCurrent = false;
    };
  }, [id, ajax]);

  return state;
}
