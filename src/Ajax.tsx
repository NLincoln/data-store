import React, { useContext, useReducer, useEffect, useCallback } from "react";
import useRefMounted from "react-use/lib/useRefMounted";

type InvalidateFn = () => void;
type ValueOf<T> = T[keyof T];

interface IdRecord {
  id: string;
}

type KeySubscription<TType> = {
  key: keyof TType;
  value: ValueOf<TType>;

  invalidate: InvalidateFn;
};
type IdSubscription = {
  id: string;
  invalidate: InvalidateFn;
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

class ModelImpl<TType extends IdRecord> {
  constructor(private model: Model<TType>) {}
  private _keySubscriptions: KeySubscription<TType>[] = [];
  private _idSubscriptions: IdSubscription[] = [];
  private _cache: { [x: string]: TType } = {};

  async getById(id: string): Promise<TType> {
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

    Object.keys(cacheRecord).forEach(key => {
      let cacheValue = cacheRecord[key];
      this.invalidate(key as keyof TType, cacheValue);
      if (cacheValue !== (response as any)[key]) {
        this.invalidate(key as keyof TType, (response as any)[key]);
      }
    });

    this.invalidateRecord(id);
    this.pushToCache(response);
    return response;
  }

  subscribe(
    key: keyof TType,
    value: ValueOf<TType>,
    onInvalidate: InvalidateFn
  ): () => void {
    let subscription: KeySubscription<TType> = {
      key,
      value,
      invalidate: onInvalidate
    };
    this._keySubscriptions.push(subscription);
    return () => {
      this._keySubscriptions = this._keySubscriptions.filter(
        sub => sub !== subscription
      );
    };
  }

  subscribeToRecord(id: string, onInvalidate: InvalidateFn): () => void {
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

  private invalidateRecord(id: string) {
    this._idSubscriptions
      .filter(sub => sub.id === id)
      .forEach(sub => sub.invalidate());
  }

  private invalidate(key: keyof TType, value: ValueOf<TType>) {
    this._keySubscriptions
      .filter(sub => sub.key === key && sub.value === value)
      .forEach(sub => {
        sub.invalidate();
      });
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
        (ajax: ModelImpl<TType>, onInvalidate: InvalidateFn) =>
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
        (ajax: ModelImpl<TType>, onInvalidate: InvalidateFn) => {
          let subs = Object.entries(params).map(([key, value]) =>
            ajax.subscribe(key as keyof TType, value, onInvalidate)
          );
          return () => {
            subs.forEach(sub => sub());
          };
        },

        [params]
      );
      return useAsync<TType[]>(cb, createSub);
    }
  };
}
