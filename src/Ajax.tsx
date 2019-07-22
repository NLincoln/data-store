import React, {
  useContext,
  useReducer,
  useEffect,
  useCallback,
  useState,
  useRef
} from "react";

type InvalidateFn<TType> = (
  data: TType,
  type: InvalidationType
) => Promise<void>;

enum InvalidationType {
  Related,
  Unrelated
}

interface IdRecord {
  id: string;
}

type QuerySubscription<TType, TQuery> = {
  query: TQuery;
  invalidate: InvalidateFn<TType>;
};

type IdSubscription<TType> = {
  id: string;
  invalidate: InvalidateFn<TType>;
};

/**
 * The base model interface. Consumers of this module MUST implement this interface,
 * although several helpers will be available to help you out.
 */
export interface Model<TType, TQuery, TFullData> {
  getById(id: string): Promise<TType>;
  query(params: TQuery): Promise<TFullData>;
  update(id: string, data: Partial<TType>): Promise<TType>;
  create(data: Omit<TType, "id">): Promise<TType>;
  delete(id: string): Promise<void>;

  isSubscribingTo(query: TQuery, record: TType): boolean;
  transformQueryResponseToArray(response: TFullData): TType[];
}

export function defaultIsSubscribingTo<TType>(
  query: Partial<TType>,
  record: TType
): boolean {
  return Object.keys(query).every(key => {
    return (query as any)[key] === (record as any)[key];
  });
}

type AsyncState<T> =
  | {
      isLoading: true;
      // can be true when we already have existing data
      data: null | T;
      error: null | Error;
      counter: number;
    }
  | {
      isLoading: false;
      data: T;
      error: null;
      counter: number;
    }
  | {
      isLoading: false;
      data: null;
      error: Error;
      counter: number;
    };

type AsyncAction<TType, TData> =
  | {
      type: "FINISHED";
      data: TData;
      counter: number;
    }
  | {
      type: "UPDATE";
      record: TType;
    }
  | {
      type: "START_LOADING";
      counter: number;
    }
  | {
      type: "ERROR";
      error: any;
      counter: number;
    };

/**
 * A reducer that can manage async state. Can handle most
 * operations one would need to perform.
 * @param state
 * @param action
 */
function asyncReducer<TType extends IdRecord, TData>(
  state: AsyncState<TData>,
  action: AsyncAction<TType, TData>
): AsyncState<TData> {
  if (action.type === "FINISHED") {
    if (action.counter < state.counter) {
      return state;
    }
    return {
      isLoading: false,
      data: action.data,
      error: null,
      counter: action.counter
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
        data: (next as unknown) as TData,
        error: null,
        counter: state.counter!!
      };
    } else {
      return {
        isLoading: false,
        data: (action.record as unknown) as TData,
        error: null,
        counter: state.counter!!
      };
    }
  } else if (action.type === "START_LOADING") {
    if (action.counter < state.counter) return state;
    return {
      ...state,
      isLoading: true
    };
  } else if (action.type === "ERROR") {
    if (action.counter < state.counter) {
      return state;
    }
    return {
      isLoading: false,
      data: null,
      error: action.error,
      counter: action.counter
    };
  }
  return state;
}

function getInitialAsyncState<T>(): AsyncState<T> {
  return {
    isLoading: true,
    data: null,
    error: null,
    counter: 0
  };
}

/**
 * This is where the real guts of this module lies. A ModelImpl is a cache that
 * operates in terms of subscriptions. Whenever something you're subscribing to changes,
 * the ModelImpl will dispatch an invalidation for that subscription. To accomplish this it
 * MUST maintain an internal cache. This is super important because it means that the response
 * from the api must be consistent between getById / query. Support for _inconsistent_ responses
 * is planned, but is vvvv difficult so I don't want to both with it for a bit.
 */
class ModelImpl<TType extends IdRecord, TQuery, TFullData> {
  constructor(private model: Model<TType, TQuery, TFullData>) {}
  private _querySubscriptions: QuerySubscription<TType, TQuery>[] = [];
  private _idSubscriptions: IdSubscription<TType>[] = [];
  private _cache: { [x: string]: TType } = {};

  async getById(id: string): Promise<TType> {
    /**
     * One of the most controversial decisions I think I'll make. If we already think we
     * have the value you're looking up in cache, we simply return that. This includes records
     * found via query, so if getById receives more fields then I'll need to support that. For now tho this
     * works amazingly.
     *
     * The main thing I want to avoid is fetching the same record tons and tons of times. Maybe this is misguided?
     * If it doesn't seem to effect too much in real-world usage I'll remove it.
     */
    if (this._cache[id]) {
      return this._cache[id];
    }
    let data = await this.model.getById(id);
    this.pushToCache(data);
    return data;
  }

  async query(params: TQuery): Promise<TFullData> {
    let data = await this.model.query(params);

    this.model
      .transformQueryResponseToArray(data)
      .forEach(record => this.pushToCache(record));
    return data;
  }

  async update(id: string, data: Partial<TType>): Promise<TType> {
    let cacheRecord = this._cache[id] as any;
    this.patchCache(id, data);
    let response = await this.model.update(id, data);
    await this.invalidate(cacheRecord, response);
    await this.invalidateRecord(id, response);
    this.pushToCache(response);
    return response;
  }
  async create(data: Omit<TType, "id">): Promise<TType> {
    let response = await this.model.create(data);
    this.pushToCache(response);
    await Promise.all(
      this._querySubscriptions
        .filter(sub => this.isSubscribingTo(sub.query, response))
        .map(sub => sub.invalidate(response, InvalidationType.Related))
    );
    return response;
  }

  async delete(id: string): Promise<void> {
    await this.model.delete(id);
    let cacheRecord = this._cache[id];
    await Promise.all(
      this._idSubscriptions
        .filter(sub => sub.id === id)
        .map(sub => sub.invalidate(cacheRecord, InvalidationType.Related))
    );
    await Promise.all(
      this._querySubscriptions
        .filter(sub => this.isSubscribingTo(sub.query, cacheRecord))
        .map(sub => sub.invalidate(cacheRecord, InvalidationType.Related))
    );
  }

  transformQueryResponseToArray(data: TFullData): TType[] {
    return this.model.transformQueryResponseToArray(data);
  }

  subscribe(query: TQuery, onInvalidate: InvalidateFn<TType>): () => void {
    let subscription: QuerySubscription<TType, TQuery> = {
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
    return Promise.all(
      this._idSubscriptions
        .filter(sub => sub.id === id)
        .map(sub => sub.invalidate(data, InvalidationType.Unrelated))
    );
  }

  isSubscribingTo(query: TQuery, record: TType) {
    return this.model.isSubscribingTo(query, record);
  }

  private invalidate(record: TType, patch: TType) {
    let promises = [];
    for (let sub of this._querySubscriptions) {
      let isSubscribingToPrevious = this.isSubscribingTo(sub.query, record);
      let isSubscribingToNext = this.isSubscribingTo(sub.query, patch);

      if (!isSubscribingToPrevious && !isSubscribingToNext) {
        continue;
      }
      let didResultsProbablyStayTheSame =
        isSubscribingToPrevious === isSubscribingToNext;

      if (didResultsProbablyStayTheSame) {
        promises.push(sub.invalidate(patch, InvalidationType.Unrelated));
      } else {
        promises.push(sub.invalidate(patch, InvalidationType.Related));
      }
    }
    return Promise.all(promises);
  }
}

/**
 * Wraps an async function with a boolean that says whether that function is running
 */
function useWrapAsyncMutation<F extends Function>(
  callback: F
): { isRunning: boolean; execute: F } {
  /**
   * Ok this is super buggy when called multiple times and I need to fix that.
   */
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

export type AsyncResult<TType, TData> = AsyncState<TData> & {
  update: (id: string, val: Partial<TType>) => Promise<void>;
};

export function createModel<TType extends IdRecord, TQuery, TFullData>(
  model: Model<TType, TQuery, TFullData>
) {
  let Context = React.createContext<ModelImpl<TType, TQuery, TFullData>>(
    new ModelImpl(model)
  );

  function useAsync<TData>(
    cb: (ajax: Model<TType, TQuery, TFullData>) => Promise<TData>,
    createSub: (
      ajax: ModelImpl<TType, TQuery, TFullData>,
      onInvalidate: InvalidateFn<TType>
    ) => () => void
  ): AsyncResult<TType, TData> {
    let ajax = useContext(Context);
    let [state, dispatch] = useReducer<
      React.Reducer<AsyncState<TData>, AsyncAction<TType, TData>>
    >(asyncReducer, getInitialAsyncState<TData>());

    /**
     * Ok so this is a bit weird, but lemme explain.
     * So we want to avoid having race conditions in our javascript. With
     * useEffect this is fairly easy: have an `isCurrent` boolean that is checked
     * after everything async and set to false in the useEffect cleanup. The hard
     * part comes when you want to display intermediary results.  Obv we can
     * throw away the old data, but what we want is to say "ok well there's gonna be
     * more data coming, but this is better than what we currently have so ship it".
     *
     * That is this counter. Each request gets a number.
     * - If, when we get the response, our request # is less than the currently rendered request #,
     *   we throw it away.
     * - If our request is greater than the currently rendered request, we render it.
     */
    let counterRef = useRef(0);

    useEffect(() => {
      let counter = ++counterRef.current;

      let refetch = async () => {
        if (counter < counterRef.current) return;
        try {
          dispatch({
            type: "START_LOADING",
            counter
          });
          let freshData = await cb(ajax);
          dispatch({
            type: "FINISHED",
            data: freshData,
            counter
          });
        } catch (err) {
          dispatch({
            type: "ERROR",
            error: err,
            counter
          });
        }
      };

      let onInvalidate: InvalidateFn<TType> = async (data, type) => {
        if (counter < counterRef.current) return;
        if (type === InvalidationType.Related) {
          await refetch();
        } else if (type === InvalidationType.Unrelated) {
          dispatch({
            type: "UPDATE",
            record: data
          });
        }
      };

      refetch();

      let unsub = createSub(ajax, onInvalidate);

      return () => {
        unsub();
      };
    }, [cb, ajax, createSub]);

    return {
      ...state,
      update: async (id: string, data: Partial<TType>) => {
        ajax.update(id, data);
      }
    };
  }

  return {
    useGetById(id: string): AsyncResult<TType, TType> {
      let cb = useCallback(
        (ajax: Model<TType, TQuery, TFullData>) => ajax.getById(id),
        [id]
      );
      let createSub = useCallback(
        (
          ajax: ModelImpl<TType, TQuery, TFullData>,
          onInvalidate: InvalidateFn<TType>
        ) => ajax.subscribeToRecord(id, onInvalidate),
        [id]
      );
      return useAsync<TType>(cb, createSub);
    },

    useQuery(params: TQuery): AsyncResult<TType, TFullData> {
      let cb = useCallback(
        (ajax: Model<TType, TQuery, TFullData>) => ajax.query(params),
        [params]
      );
      let createSub = useCallback(
        (
          ajax: ModelImpl<TType, TQuery, TFullData>,
          onInvalidate: InvalidateFn<TType>
        ) => {
          return ajax.subscribe(params, onInvalidate);
        },

        [params]
      );
      return useAsync<TFullData>(cb, createSub);
    },
    useCreateMutation() {
      let ajax = useContext(Context);
      return useWrapAsyncMutation(
        useCallback(
          (data: Omit<TType, "id">) => {
            return ajax.create(data);
          },
          [ajax]
        )
      );
    },
    useUpdateMutation() {
      let ajax = useContext(Context);
      return useWrapAsyncMutation(
        useCallback(
          (id: string, data: Partial<TType>) => {
            return ajax.update(id, data);
          },
          [ajax]
        )
      );
    },
    useDeleteMutation() {
      let ajax = useContext(Context);
      return useWrapAsyncMutation(
        useCallback(
          (id: string) => {
            return ajax.delete(id);
          },
          [ajax]
        )
      );
    }
  };
}
