import React, { useContext, useReducer, useEffect, useCallback } from "react";
import useRefMounted from "react-use/lib/useRefMounted";

type InvalidateFn = () => void;

type QuerySubscription = {
  status: string;
  invalidate: InvalidateFn;
};

export interface Model<T> {
  getById(id: string): Promise<T>;
  query(status: string): Promise<T[]>;
}

interface DbRecord {
  id: string;
  title: string;
  status: string;
}

let database: { [x: string]: DbRecord } = {
  "001": {
    id: "001",
    title: "Issue 1",
    status: "Closed"
  },
  "002": {
    id: "002",
    title: "Issue 2",
    status: "Closed"
  },
  "003": {
    id: "003",
    title: "Issue 3",
    status: "Open"
  },
  "004": {
    id: "004",
    title: "Issue 4",
    status: "Open"
  },
  "005": {
    id: "005",
    title: "Issue 5",
    status: "Merged"
  },
  "006": {
    id: "006",
    title: "Issue 6",
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

type AsyncAction<T> = {
  type: "FINISHED";
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

class ModelImpl<TType> implements Model<TType> {
  async getById(id: string): Promise<TType> {
    await wait(50);
    return (database[id] as unknown) as TType;
  }
  async query(status: string): Promise<TType[]> {
    await wait(50);

    return (Object.values(database).filter(
      record => record.status === status
    ) as unknown) as TType[];
  }
  private _querySubscriptions: QuerySubscription[] = [];

  async update(id: string, data: Partial<TType>): Promise<TType> {
    await wait(50);
    let prevData = database[id];
    database[id] = {
      ...prevData,
      ...data
    };
    let dataRecord = data as Partial<DbRecord>;
    if (dataRecord.status) {
      this.invalidateStatus(prevData.status);
      this.invalidateStatus(dataRecord.status);
    }
    return (database[id] as unknown) as TType;
  }

  subscribe(status: string, onInvalidate: InvalidateFn): () => void {
    let subscription = {
      status,
      invalidate: onInvalidate
    };
    this._querySubscriptions.push(subscription);
    return () => {
      this._querySubscriptions = this._querySubscriptions.filter(
        sub => sub !== subscription
      );
    };
  }

  private invalidateStatus(status: string) {
    this._querySubscriptions
      .filter(sub => sub.status === status)
      .forEach(sub => {
        sub.invalidate();
      });
  }
}

export type AsyncResult<TType, TData> = AsyncState<TData> & {
  update: (id: string, val: Partial<TType>) => Promise<void>;
};

export function createModel<TType>() {
  let Context = React.createContext<ModelImpl<TType>>(new ModelImpl());

  function useAsync<TData>(
    cb: (ajax: Model<TType>) => Promise<TData>,
    createSub?: (
      ajax: ModelImpl<TType>,
      onInvalidate: InvalidateFn
    ) => () => void
  ): AsyncResult<TType, TData> {
    let isMountedRef = useRefMounted();

    let ajax = useContext(Context);
    let [state, dispatch] = useReducer<
      React.Reducer<AsyncState<TData>, AsyncAction<TData>>
    >(asyncReducer, getInitialAsyncState<TData>());

    useEffect(() => {
      let isCurrent = true;
      let onInvalidate = async () => {
        let data = await cb(ajax);
        if (!isCurrent) return;
        dispatch({
          type: "FINISHED",
          data
        });
      };
      cb(ajax).then(data => {
        if (!isCurrent) return;
        dispatch({
          type: "FINISHED",
          data
        });
      });

      let subscription: (() => void) | null = null;
      if (createSub) {
        subscription = createSub(ajax, onInvalidate);
      }

      return () => {
        isCurrent = false;
        if (subscription) {
          subscription();
        }
      };
    }, [cb, ajax, createSub]);

    return {
      ...state,
      update: async (id: string, data: Partial<TType>) => {
        await ajax.update(id, data);
        cb(ajax).then(data => {
          if (!isMountedRef.current) {
            return;
          }
          dispatch({
            type: "FINISHED",
            data
          });
        });
      }
    };
  }

  return {
    useGetById(id: string): AsyncResult<TType, TType> {
      let cb = useCallback((ajax: Model<TType>) => ajax.getById(id), [id]);
      return useAsync<TType>(cb);
    },

    useQuery(status: string): AsyncResult<TType, TType[]> {
      let cb = useCallback((ajax: Model<TType>) => ajax.query(status), [
        status
      ]);
      let createSub = useCallback(
        (ajax: ModelImpl<TType>, onInvalidate: InvalidateFn) =>
          ajax.subscribe(status, onInvalidate),
        [status]
      );
      return useAsync<TType[]>(cb, createSub);
    }
  };
}
