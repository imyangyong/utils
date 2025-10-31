import type { DeepMerge } from './types'
import { notNullish } from './guards'
import { isObject, isPrimitive } from './is'
import { randomStr } from './string'

/**
 * Map key/value pairs for an object, and construct a new one
 *
 *
 * @category Object
 *
 * Transform:
 * @example
 * ```
 * objectMap({ a: 1, b: 2 }, (k, v) => [k.toString().toUpperCase(), v.toString()])
 * // { A: '1', B: '2' }
 * ```
 *
 * Swap key/value:
 * @example
 * ```
 * objectMap({ a: 1, b: 2 }, (k, v) => [v, k])
 * // { 1: 'a', 2: 'b' }
 * ```
 *
 * Filter keys:
 * @example
 * ```
 * objectMap({ a: 1, b: 2 }, (k, v) => k === 'a' ? undefined : [k, v])
 * // { b: 2 }
 * ```
 */
export function objectMap<K extends string, V, NK extends string | number | symbol = K, NV = V>(obj: Record<K, V>, fn: (key: K, value: V) => [NK, NV] | undefined): Record<NK, NV> {
  return Object.fromEntries(
    Object.entries(obj)
      .map(([k, v]) => fn(k as K, v as V))
      .filter(notNullish),
  ) as Record<NK, NV>
}

/**
 * Type guard for any key, `k`.
 * Marks `k` as a key of `T` if `k` is in `obj`.
 *
 * @category Object
 * @param obj object to query for key `k`
 * @param k key to check existence in `obj`
 */
export function isKeyOf<T extends object>(obj: T, k: keyof any): k is keyof T {
  return k in obj
}

/**
 * Strict typed `Object.keys`
 *
 * @category Object
 */
export function objectKeys<T extends object>(obj: T) {
  return Object.keys(obj) as Array<`${keyof T & (string | number | boolean | null | undefined)}`>
}

/**
 * Strict typed `Object.entries`
 *
 * @category Object
 */
export function objectEntries<T extends object>(obj: T) {
  return Object.entries(obj) as Array<[keyof T, T[keyof T]]>
}

/**
 * Deep merge
 *
 * The first argument is the target object, the rest are the sources.
 * The target object will be mutated and returned.
 *
 * @category Object
 */
export function deepMerge<T extends object = object, S extends object = T>(target: T, ...sources: S[]): DeepMerge<T, S> {
  if (!sources.length)
    return target as any

  const source = sources.shift()
  if (source === undefined)
    return target as any

  if (isMergableObject(target) && isMergableObject(source)) {
    objectKeys(source).forEach((key) => {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype')
        return

      // @ts-expect-error index of type
      if (isMergableObject(source[key])) {
        // @ts-expect-error index of type
        if (!target[key])
          // @ts-expect-error index of type
          target[key] = {}

        // @ts-expect-error index of type
        if (isMergableObject(target[key])) {
          deepMerge(target[key], source[key])
        }
        else {
          // @ts-expect-error index of type
          target[key] = source[key]
        }
      }
      else {
        // @ts-expect-error index of type
        target[key] = source[key]
      }
    })
  }

  return deepMerge(target, ...sources)
}

/**
 * Deep merge
 *
 * Differs from `deepMerge` in that it merges arrays instead of overriding them.
 *
 * The first argument is the target object, the rest are the sources.
 * The target object will be mutated and returned.
 *
 * @category Object
 */
export function deepMergeWithArray<T extends object = object, S extends object = T>(target: T, ...sources: S[]): DeepMerge<T, S> {
  if (!sources.length)
    return target as any

  const source = sources.shift()
  if (source === undefined)
    return target as any

  if (Array.isArray(target) && Array.isArray(source))
    target.push(...source)

  if (isMergableObject(target) && isMergableObject(source)) {
    objectKeys(source).forEach((key) => {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype')
        return

      // @ts-expect-error index of type
      if (Array.isArray(source[key])) {
        // @ts-expect-error index of type
        if (!target[key])
          // @ts-expect-error index of type
          target[key] = []

        // @ts-expect-error index of type
        deepMergeWithArray(target[key], source[key])
      }
      // @ts-expect-error index of type
      else if (isMergableObject(source[key])) {
        // @ts-expect-error index of type
        if (!target[key])
          // @ts-expect-error index of type
          target[key] = {}

        // @ts-expect-error index of type
        deepMergeWithArray(target[key], source[key])
      }
      else {
        // @ts-expect-error index of type
        target[key] = source[key]
      }
    })
  }

  return deepMergeWithArray(target, ...sources)
}

function isMergableObject(item: any): item is object {
  return isObject(item) && !Array.isArray(item)
}

/**
 * Create a new subset object by giving keys
 *
 * @category Object
 */
export function objectPick<O extends object, T extends keyof O>(obj: O, keys: T[], omitUndefined = false) {
  return keys.reduce((n, k) => {
    if (k in obj) {
      if (!omitUndefined || obj[k] !== undefined)
        n[k] = obj[k]
    }
    return n
  }, {} as Pick<O, T>)
}

/**
 * Create a new subset object by omit giving keys
 *
 * @category Object
 */
export function objectOmit<O extends object, T extends keyof O>(obj: O, keys: T[], omitUndefined = false) {
  return Object.fromEntries(Object.entries(obj).filter(([key, value]) => {
    return (!omitUndefined || value !== undefined) && !keys.includes(key as T)
  })) as Omit<O, T>
}

/**
 * Clear undefined fields from an object. It mutates the object
 *
 * @category Object
 */
export function clearUndefined<T extends object>(obj: T): T {
  // @ts-expect-error index of type
  Object.keys(obj).forEach((key: string) => (obj[key] === undefined ? delete obj[key] : {}))
  return obj
}

/**
 * Determines whether an object has a property with the specified name
 *
 * @see https://eslint.org/docs/rules/no-prototype-builtins
 * @category Object
 */
export function hasOwnProperty<T>(obj: T, v: PropertyKey) {
  if (obj == null)
    return false
  return Object.prototype.hasOwnProperty.call(obj, v)
}

/**
 * deep diff two objects, return the difference
 *
 * @category Object
 */
export function deepDiff<T extends Record<string, { oldValue: any, newValue: any }>>(obj1: any, obj2: any): T {
  const diff = {} as any

  function compareProps(prop: string, val1: any, val2: any) {
    if (typeof val1 === 'object' && typeof val2 === 'object') {
      const nestedDiff = deepDiff(val1, val2)
      if (Object.keys(nestedDiff).length > 0)
        diff[prop] = nestedDiff
    }
    else if (val1 !== val2) {
      diff[prop] = {
        newValue: val2,
        oldValue: val1,
      }
    }
  }

  for (const prop in obj1) {
    if (Object.hasOwnProperty.call(obj1, prop)) {
      if (!Object.hasOwnProperty.call(obj2, prop)) {
        diff[prop] = {
          newValue: undefined,
          oldValue: obj1[prop],
        }
      }
      else {
        compareProps(prop, obj1[prop], obj2[prop])
      }
    }
  }

  for (const prop in obj2) {
    if (Object.hasOwnProperty.call(obj2, prop) && !Object.hasOwnProperty.call(obj1, prop)) {
      diff[prop] = {
        newValue: obj2[prop],
        oldValue: undefined,
      }
    }
  }

  return diff
}

/**
 * Convert an object to a list, mapping each entry
 * into a list item
 *
 * @description inspired by: https://github.com/rayepps/radash/blob/069b26cdd7d62e6ac16a0ad3baa1c9abcca420bc/src/object.ts#L152
 *
 * @category Object
 */
export function listify<TValue, TKey extends string | number | symbol, KResult>(obj: Record<TKey, TValue>, toItem: (key: TKey, value: TValue) => KResult) {
  if (!obj)
    return []
  const entries = Object.entries(obj)
  if (entries.length === 0)
    return []
  return entries.reduce((acc, entry) => {
    acc.push(toItem(entry[0] as TKey, entry[1] as TValue))
    return acc
  }, [] as KResult[])
}

/**
 * Immutably rename object keys
 * @example
 * const obj = { a: 1, b: 2, c: { d: 3 }, e: { f: { g: 4 } } }
 * const keysMap = { 'a': 'A', b: 'B', c: 'C', 'c:d': 'D','e:f:g': 'G' }
 * renameObjectKeysDeeply(keysMap, obj) // { A: 1, B: 2, C: { D: 3 }, e: { f: { G: 4 } }
 */
export function renameObjectKeys<T extends Record<string, any>, U = Record<string, string>>(keysMap: U, obj: Record<string, any>): T {
  const isObject = (obj: any): obj is Record<string, any> => typeof obj === 'object' && obj !== null && !Array.isArray(obj)
  const renameObject = (prevKey: string, currObj: any): any => {
    if (isObject(currObj)) {
      const renamedObj: Record<string, any> = {}
      for (const key in currObj) {
        const newKey = (keysMap as Record<string, string>)[prevKey + key] || key
        renamedObj[newKey] = renameObject(`${prevKey + key}:`, currObj[key])
      }
      return renamedObj
    }
    return currObj
  }
  return renameObject('', obj)
}

/**
 * Immutably rename object keys in an array of objects
 */
export function renameObjectKeysInArray<T extends Record<string, any>>(keysMap: Record<string, string>, arr: Record<string, any>[]): T[] {
  return arr.map(obj => renameObjectKeys(keysMap, obj))
}

/**
 * Immutably rename object keys in an array of objects deeply
 */
export function renameObjectKeysInArrayDeeply<T extends Record<string, any>>(keysMap: Record<string, string>, childrenKey: string, arr: Record<string, any>[]): T[] {
  return arr.map((obj) => {
    const renamedObj = renameObjectKeys(keysMap, obj)
    const renamedChildrenKey = keysMap[childrenKey] || childrenKey
    if (renamedObj[renamedChildrenKey]) {
      renamedObj[renamedChildrenKey] = renameObjectKeysInArrayDeeply(keysMap, childrenKey, renamedObj[renamedChildrenKey])
    }
    return renamedObj
  }) as T[]
}

const _objectIdMap = /* @__PURE__ */ new WeakMap<WeakKey, string>()
/**
 * Get an object's unique identifier
 *
 * Same object will always return the same id
 *
 * Expect argument to be a non-primitive object/array. Primitive values will be returned as is.
 *
 * @category Object
 */
export function objectId(obj: WeakKey): string {
  if (isPrimitive(obj))
    return obj as unknown as string
  if (!_objectIdMap.has(obj)) {
    _objectIdMap.set(obj, randomStr())
  }
  return _objectIdMap.get(obj)!
}

/**
 * LRU Cache
 */
// Node class for doubly-linked list
class Node {
  key: any
  value: any
  prev: Node | null
  next: Node | null

  constructor(key: any, value: any) {
    this.key = key
    this.value = value
    this.prev = null
    this.next = null
  }
}

export class LRUCache {
  private cache: Map<any, Node>
  private maxSize: number
  private head: Node
  private tail: Node

  constructor(maxSize: number) {
    this.cache = new Map()
    this.maxSize = maxSize

    // Initialize dummy head and tail nodes
    this.head = new Node(0, 0)
    this.tail = new Node(0, 0)
    this.head.next = this.tail
    this.tail.prev = this.head
  }

  private addNode(node: Node) {
    // Always add the new node right after head
    node.prev = this.head
    node.next = this.head.next

    this.head.next!.prev = node
    this.head.next = node
  }

  private removeNode(node: Node) {
    // Remove an existing node from the linked list
    const prev = node.prev
    const next = node.next

    prev!.next = next
    next!.prev = prev
  }

  private moveToHead(node: Node) {
    this.removeNode(node)
    this.addNode(node)
  }

  private removeTail(): Node {
    const node = this.tail.prev!
    this.removeNode(node)
    return node
  }

  get(key: any): any {
    const node = this.cache.get(key)
    if (!node) {
      return undefined
    }

    // Move to head (recently used)
    this.moveToHead(node)
    return node.value
  }

  set(key: any, value: any): void {
    const node = this.cache.get(key)

    if (node) {
      // Update the value and move to head
      node.value = value
      this.moveToHead(node)
    }
    else {
      const newNode = new Node(key, value)

      // Add to cache and linked list
      this.cache.set(key, newNode)
      this.addNode(newNode)

      // Remove the least recently used item if cache is full
      if (this.cache.size > this.maxSize) {
        const tailNode = this.removeTail()
        this.cache.delete(tailNode.key)
      }
    }
  }

  has(key: any): boolean {
    return this.cache.has(key)
  }

  clear(): void {
    this.cache.clear()
    this.head.next = this.tail
    this.tail.prev = this.head
  }
}
