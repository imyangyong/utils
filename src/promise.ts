import type { Fn } from './types'
import { remove } from './array'

export interface SingletonPromiseReturn<T> {
  (): Promise<T>
  /**
   * Reset current staled promise.
   * Await it to have proper shutdown.
   */
  reset: () => Promise<void>
}

/**
 * Create singleton promise function
 *
 * @category Promise
 */
export function createSingletonPromise<T>(fn: () => Promise<T>): SingletonPromiseReturn<T> {
  let _promise: Promise<T> | undefined

  function wrapper() {
    if (!_promise)
      _promise = fn()
    return _promise
  }
  wrapper.reset = async () => {
    const _prev = _promise
    _promise = undefined
    if (_prev)
      await _prev
  }

  return wrapper
}

/**
 * Promised `setTimeout`
 *
 * @category Promise
 */
export function sleep(ms: number, callback?: Fn<any>) {
  return new Promise<void>(resolve =>

    setTimeout(async () => {
      await callback?.()
      resolve()
    }, ms),
  )
}

/**
 * Create a promise lock
 *
 * @category Promise
 * @example
 * ```
 * const lock = createPromiseLock()
 *
 * lock.run(async () => {
 *   await doSomething()
 * })
 *
 * // in anther context:
 * await lock.wait() // it will wait all tasking finished
 * ```
 */
export function createPromiseLock() {
  const locks: Promise<any>[] = []

  return {
    clear() {
      locks.length = 0
    },
    isWaiting() {
      return Boolean(locks.length)
    },
    async run<T = void>(fn: () => Promise<T>): Promise<T> {
      const p = fn()
      locks.push(p)
      try {
        return await p
      }
      finally {
        remove(locks, p)
      }
    },
    async wait(): Promise<void> {
      await Promise.allSettled(locks)
    },
  }
}

/**
 * Promise with `resolve` and `reject` methods of itself
 */
export interface ControlledPromise<T = void> extends Promise<T> {
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: any) => void
}

/**
 * Return a Promise with `resolve` and `reject` methods
 *
 * @category Promise
 * @example
 * ```
 * const promise = createControlledPromise()
 *
 * await promise
 *
 * // in anther context:
 * promise.resolve(data)
 * ```
 */
export function createControlledPromise<T>(): ControlledPromise<T> {
  let resolve: any, reject: any
  const promise = new Promise<T>((_resolve, _reject) => {
    resolve = _resolve
    reject = _reject
  }) as ControlledPromise<T>
  promise.resolve = resolve
  promise.reject = reject
  return promise
}

export type UntilResult<RejectionReason, ResolveData>
  = | [reason: RejectionReason, data: null]
    | [reason: null, data: ResolveData]

/**
 * Gracefully handles a given Promise factory.
 *
 * @description inspired by https://github.com/kettanaito/until-async/blob/main/src/index.ts
 * @example
 * const [error, data] = await until(() => fetchUser(id))
 */
export { until } from 'until-async'

/**
 * Symbol returned by `takeLatest` when a newer invocation supersedes the current one
 *
 * @category Promise
 */
export const STALE: unique symbol = Symbol('stale')

/**
 * Only resolves with the latest invocation of the given function.
 * If a previous invocation resolves after a newer one, it will return `STALE`.
 *
 * @category Promise
 */
export function takeLatest<Args extends unknown[], T>(
  fn: (this: unknown, ...args: Args) => Promise<T> | T,
): (this: unknown, ...args: Args) => Promise<T | typeof STALE> {
  let lastId = 0
  return function wrapped(this: unknown, ...args: Args): Promise<T | typeof STALE> {
    const id = ++lastId
    const isStale = () => id !== lastId
    return Promise.resolve()
      .then(() => fn.apply(this, args))
      .then(
        (value): T | typeof STALE => (isStale() ? STALE : value),
        (err): T | typeof STALE => {
          if (isStale())
            return STALE
          throw err
        },
      )
  }
}
