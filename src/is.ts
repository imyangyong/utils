import { toString } from './base'

export const isDef = <T = any>(val?: T): val is T => typeof val !== 'undefined'
export const isBoolean = (val: any): val is boolean => typeof val === 'boolean'
// eslint-disable-next-line ts/no-unsafe-function-type
export const isFunction = <T extends Function> (val: any): val is T => typeof val === 'function'
export const isNumber = (val: any): val is number => typeof val === 'number'
export const isString = (val: unknown): val is string => typeof val === 'string'
export const isObject = (val: any): val is object => toString(val) === '[object Object]'
export const isUndefined = (val: any): val is undefined => toString(val) === '[object Undefined]'
export const isNull = (val: any): val is null => toString(val) === '[object Null]'
export const isTruthy = <T>(val?: T): val is NonNullable<T> => Boolean(val) || val === 0
export const isRegExp = (val: any): val is RegExp => toString(val) === '[object RegExp]'
export const isDate = (val: any): val is Date => toString(val) === '[object Date]'

export const isWindow = (val: any): boolean => typeof window !== 'undefined' && toString(val) === '[object Window]'

/**
 * Check where your code is running.
 * In the browser or in node.js environment.
 *
 * @description inspired by https://github.com/flexdinesh/browser-or-node/blob/master/src/index.ts
 *
 */
export const isBrowser: boolean = typeof window !== 'undefined' && typeof window.document !== 'undefined'

// eslint-disable-next-line node/prefer-global/process
export const isNode: boolean = typeof process !== 'undefined' && process.versions != null && process.versions.node != null

// eslint-disable-next-line no-restricted-globals
export const isWebWorker: boolean = typeof self === 'object' && self.constructor && self.constructor.name === 'DedicatedWorkerGlobalScope'

// https://github.com/jsdom/jsdom/issues/1537#issuecomment-229405327
export const isJsDom: boolean
  = (typeof window !== 'undefined' && window.name === 'nodejs')
    || (typeof navigator !== 'undefined' && 'userAgent' in navigator && typeof navigator.userAgent === 'string' && (navigator.userAgent.includes('Node.js') || navigator.userAgent.includes('jsdom')))

export const isDeno: boolean
  // @ts-expect-error Deno
  = typeof Deno !== 'undefined'
  // @ts-expect-error Deno
    && typeof Deno.version !== 'undefined'
  // @ts-expect-error Deno
    && typeof Deno.version.deno !== 'undefined'

/** @see {@link https://bun.sh/guides/util/detect-bun} */
// eslint-disable-next-line node/prefer-global/process
export const isBun = typeof process !== 'undefined' && process.versions != null && process.versions.bun != null
