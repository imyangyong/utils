import type { Fn, Nullable } from './types'

/**
 * Call every function in an array
 */
export function batchInvoke(functions: Nullable<Fn>[]) {
  functions.forEach(fn => fn && fn())
}

/**
 * Call the function
 */
export function invoke(fn: Fn) {
  return fn()
}

/**
 * Pass the value through the callback, and return the value
 *
 * @example
 * ```
 * function createUser(name: string): User {
 *   return tap(new User, user => {
 *     user.name = name
 *   })
 * }
 * ```
 */
export function tap<T>(value: T, callback: (value: T) => void): T {
  callback(value)
  return value
}

/**
 * try to invoke the function otherwise return null
 */
export function tryOrReturnNull<T>(fn: () => T): T | null {
  try {
    return fn()
  }
  catch {
    return null
  }
}

/**
 * try to invoke the function async otherwise return null
 */
export async function tryOrReturnNullAsync<T>(fn: () => T): Promise<T | null> {
  try {
    return await fn()
  }
  catch {
    return null
  }
}
