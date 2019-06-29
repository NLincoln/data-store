import React, { useContext, useReducer, useEffect, useCallback } from "react";

type InvalidateFn<TType> = (data: TType, type: InvalidationType) => void;
type ValueOf<T> = T[keyof T];

enum InvalidationType {
  Related,
  Unrelated
}

interface IdRecord {
  id: string;
}

type QuerySubscription<TType> = {
  query: Partial<TType>;
  invalidate: InvalidateFn<TType>;
};
type IdSubscription<TType> = {
  id: string;
  invalidate: InvalidateFn<TType>;
};

export interface Model<T> {
  getById(id: string): Promise<T>;
  query(params: Partial<T>): Promise<T[]>;
  update(id: string, data: Partial<T>): Promise<T>;
}

type AsyncState<T> =
  | {
      isLoading: true;
      data: null;
    }
  | {
      isLoading: false;
      data: T;
    };

type AsyncAction<TType, TData> =
  | {
      type: "FINISHED";
      data: TData;
    }
  | {
      type: "UPDATE";
      record: TType;
    };

function asyncReducer<TType extends IdRecord, TData>(
  state: AsyncState<TData>,
  action: AsyncAction<TType, TData>
): AsyncState<TData> {
  if (action.type === "FINISHED") {
    return {
      isLoading: false,
      data: action.data
    };
  } else if (action.type === "UPDATE") {
    if (Array.isArray(state.data)) {
      let next = state.data.map((entry: TType) => {
        if (entry.id === action.record.id) {
          return action.record;
        }
        return entry;
      });
      return {
        isLoading: false,
        data: (next as unknown) as TData
      };
    } else {
      return {
        isLoading: false,
        data: (action.record as unknown) as TData
      };
    }
  }
  return state;
}

function getInitialAsyncState<T>(): AsyncState<T> {
  return {
    isLoading: true,
    data: null
  };
}

class ModelImpl<TType extends IdRecord> {
  constructor(private model: Model<TType>) {}
  private _querySubscriptions: QuerySubscription<TType>[] = [];
  private _idSubscriptions: IdSubscription<TType>[] = [];
  private _cache: { [x: string]: TType } = {};

  async getById(id: string): Promise<TType> {
    if (this._cache[id]) {
      return this._cache[id];
    }
    let data = await this.model.getById(id);
    this.pushToCache(data);
    return data;
  }

  async query(params: Partial<TType>): Promise<TType[]> {
    let data = await this.model.query(params);
    data.forEach(record => this.pushToCache(record));
    return data;
  }

  async update(id: string, data: Partial<TType>): Promise<TType> {
    let cacheRecord = this._cache[id] as any;
    this.patchCache(id, data);
    let response = await this.model.update(id, data);
    this.invalidate(cacheRecord, response);
    this.invalidateRecord(id, response);
    this.pushToCache(response);
    return response;
  }

  subscribe(
    query: Partial<TType>,
    onInvalidate: InvalidateFn<TType>
  ): () => void {
    let subscription: QuerySubscription<TType> = {
      query,
      invalidate: onInvalidate
    };
    this._querySubscriptions.push(subscription);
    return () => {
      this._querySubscriptions = this._querySubscriptions.filter(
        sub => sub !== subscription
      );
    };
  }

  subscribeToRecord(id: string, onInvalidate: InvalidateFn<TType>): () => void {
    let subscription = {
      id,
      invalidate: onInvalidate
    };
    this._idSubscriptions.push(subscription);
    return () => {
      this._idSubscriptions = this._idSubscriptions.filter(
        sub => sub !== subscription
      );
    };
  }

  private pushToCache(record: TType) {
    this._cache[record.id] = record;
  }

  private patchCache(id: string, data: Partial<TType>) {
    let prevData = this._cache[id];
    this._cache[id] = {
      ...prevData,
      ...data
    };
  }

  private invalidateRecord(id: string, data: TType) {
    this._idSubscriptions
      .filter(sub => sub.id === id)
      .forEach(sub => sub.invalidate(data, InvalidationType.Unrelated));
  }

  private isSubscribingTo(query: Partial<TType>, record: TType) {
    for (let key in query) {
      if (record[key] !== query[key]) {
        return false;
      }
    }
    return true;
  }

  private invalidate(record: TType, patch: TType) {
    for (let sub of this._querySubscriptions) {
      let isSubscribingToPrevious = this.isSubscribingTo(sub.query, record);
      let isSubscribingToNext = this.isSubscribingTo(sub.query, patch);

      if (!isSubscribingToPrevious && !isSubscribingToNext) {
        continue;
      }
      let didResultsProbablyStayTheSame =
        isSubscribingToPrevious === isSubscribingToNext;

      if (didResultsProbablyStayTheSame) {
        sub.invalidate(patch, InvalidationType.Unrelated);
      } else {
        sub.invalidate(patch, InvalidationType.Related);
      }
    }
  }
}

export type AsyncResult<TType, TData> = AsyncState<TData> & {
  update: (id: string, val: Partial<TType>) => Promise<void>;
};

export function createModel<TType extends IdRecord>(model: Model<TType>) {
  let Context = React.createContext<ModelImpl<TType>>(new ModelImpl(model));

  function useAsync<TData>(
    cb: (ajax: Model<TType>) => Promise<TData>,
    createSub: (
      ajax: ModelImpl<TType>,
      onInvalidate: InvalidateFn<TType>
    ) => () => void
  ): AsyncResult<TType, TData> {
    let ajax = useContext(Context);
    let [state, dispatch] = useReducer<
      React.Reducer<AsyncState<TData>, AsyncAction<TType, TData>>
    >(asyncReducer, getInitialAsyncState<TData>());

    useEffect(() => {
      let isCurrent = true;
      let onInvalidate: InvalidateFn<TType> = async (data, type) => {
        if (!isCurrent) return;
        if (type === InvalidationType.Related) {
          let freshData = await cb(ajax);
          if (!isCurrent) return;
          dispatch({
            type: "FINISHED",
            data: freshData
          });
        } else if (type === InvalidationType.Unrelated) {
          dispatch({
            type: "UPDATE",
            record: data
          });
        }
      };
      cb(ajax).then(data => {
        if (!isCurrent) return;
        dispatch({
          type: "FINISHED",
          data
        });
      });

      let subscription = createSub(ajax, onInvalidate);

      return () => {
        isCurrent = false;
        subscription();
      };
    }, [cb, ajax, createSub]);

    return {
      ...state,
      update: async (id: string, data: Partial<TType>) => {
        await ajax.update(id, data);
      }
    };
  }

  return {
    useGetById(id: string): AsyncResult<TType, TType> {
      let cb = useCallback((ajax: Model<TType>) => ajax.getById(id), [id]);
      let createSub = useCallback(
        (ajax: ModelImpl<TType>, onInvalidate: InvalidateFn<TType>) =>
          ajax.subscribeToRecord(id, onInvalidate),
        [id]
      );
      return useAsync<TType>(cb, createSub);
    },

    useQuery(params: Partial<TType>): AsyncResult<TType, TType[]> {
      let cb = useCallback((ajax: Model<TType>) => ajax.query(params), [
        params
      ]);
      let createSub = useCallback(
        (ajax: ModelImpl<TType>, onInvalidate: InvalidateFn<TType>) => {
          return ajax.subscribe(params, onInvalidate);
        },

        [params]
      );
      return useAsync<TType[]>(cb, createSub);
    }
  };
}
