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

type AsyncState<T> =
  | {
      isLoading: true;
      data: null;
    }
  | {
      isLoading: false;
      data: T;
    };

type AsyncAction<T> =
  | {
      type: "FINISHED";
      data: T;
    }
  | {
      type: "UPDATE";
      data: T;
    };

function asyncReducer<T>(
  state: AsyncState<T>,
  action: AsyncAction<T>
): AsyncState<T> {
  if (action.type === "FINISHED") {
    return {
      isLoading: false,
      data: action.data
    };
  }
  return state;
}

function getInitialAsyncState<T>(): AsyncState<T> {
  return {
    isLoading: true,
    data: null
  };
}

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

export type AsyncResult<TType, TData> = AsyncState<TData> & {
  update: (id: string, val: Partial<TType>) => Promise<void>;
};

function useAsync<TType, TData>(
  cb: (ajax: Ajax) => Promise<TData>
): AsyncResult<TType, TData> {
  let ajax = useContext(Context);
  let [state, dispatch] = useReducer<
    React.Reducer<AsyncState<TData>, AsyncAction<TData>>
  >(asyncReducer, getInitialAsyncState<TData>());

  useEffect(() => {
    let isCurrent = true;
    cb(ajax).then(data => {
      if (!isCurrent) return;
      dispatch({
        type: "FINISHED",
        data
      });
    });
    return () => {
      isCurrent = false;
    };
  }, [cb, ajax]);

  return {
    ...state,
    update: async (id: string, data: Partial<TType>) => {}
  };
}

export function useGetById<T>(id: string): AsyncResult<T, T> {
  return useAsync(ajax => ajax.getById<T>(id));
}

export function useQuery<T>(status: string): AsyncResult<T, T[]> {
  return useAsync(ajax => ajax.query<T>(status));
}
