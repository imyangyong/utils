import { describe, expect, it } from 'vitest'
import {
  deepMerge,
  deepMergeWithArray,
  listify,
  objectMap,
  renameObjectKeys,
  renameObjectKeysInArray,
  renameObjectKeysInArrayDeeply,
} from './object'

it('objectMap', () => {
  expect(objectMap({}, (...args) => args)).toEqual({})

  expect(
    objectMap(
      { a: 1, b: 2 },
      (k, v) => [k.toString().toUpperCase(), v.toString()],
    ),
  ).toEqual({ A: '1', B: '2' })

  expect(
    objectMap(
      { a: 1, b: 2 },
      () => undefined,
    ),
  ).toEqual({})

  expect(
    objectMap(
      { a: 1, b: 2 },
      (k, v) => k === 'a' ? undefined : [k, v],
    ),
  ).toEqual({ b: 2 })

  expect(
    objectMap(
      { a: 1, b: 2 },
      (k, v) => [v, k],
    ),
  ).toEqual({ 1: 'a', 2: 'b' })
})

describe('deepMerge', () => {
  it('should merge Objects and all nested Ones', () => {
    const obj1 = { a: { a1: 'A1' }, c: 'C', d: {} }
    const obj2 = { a: { a2: 'A2' }, b: { b1: 'B1' }, d: null } as any
    const obj3 = { a: { a1: 'A1', a2: 'A2' }, b: { b1: 'B1' }, c: 'C', d: null }
    expect(deepMerge({}, obj1, obj2)).toEqual(obj3)
  })
  it('should behave like Object.assign on the top level', () => {
    const obj1 = { a: { a1: 'A1' }, c: 'C' }
    const obj2 = { a: undefined, b: { b1: 'B1' } }
    const merged = deepMerge(obj1, obj2)
    expect(merged).toEqual(Object.assign({}, obj1, obj2))
  })
  it('should not merge array values, just override', () => {
    const obj1 = { a: ['A', 'B'] }
    const obj2 = { a: ['C'], b: ['D'] }
    expect(deepMerge({}, obj1, obj2)).toEqual({ a: ['C'], b: ['D'] })
  })
  it('should overide plain value', () => {
    const obj1 = { a: { x: 1 } }
    const obj2 = { a: { x: { f: 2 } } } as any
    expect(deepMerge({}, obj1, obj2)).toEqual({ a: { x: { f: 2 } } })
  })

  it('prototype pollution 1', () => {
    const obj = {} as any
    const obj2 = {} as any
    const payload = JSON.parse('{"__proto__":{"polluted":"Polluted!"}}')

    expect(obj.polluted).toBeUndefined()
    expect(obj2.polluted).toBeUndefined()
    deepMerge(obj, payload)
    expect(obj.polluted).toBeUndefined()
    expect(obj2.polluted).toBeUndefined()
  })
})

describe('deepMergeWithArray', () => {
  it('should merge array values', () => {
    const obj1 = { a: ['A', 'B'] }
    const obj2 = { a: ['C'], b: ['D'] }
    expect(deepMergeWithArray({}, obj1, obj2)).toEqual({ a: ['A', 'B', 'C'], b: ['D'] })
  })
})

it('listify', () => {
  const data = {
    marlin: {
      weight: 105,
    },
    bass: {
      weight: 8,
    },
  }

  expect(listify(data, (key, value) => ({ ...value, name: key }))).toEqual([{ name: 'marlin', weight: 105 }, { name: 'bass', weight: 8 }])
})

describe('renameObjectKeys', () => {
  it('should rename keys', () => {
    const obj = { a: 1, b: 2, c: { d: 3 }, e: { f: { g: 4 }, h: [] } }
    const keysMap = { 'a': 'A', 'b': 'B', 'c': 'C', 'c:d': 'D', 'e:f:g': 'G' }
    expect(renameObjectKeys(keysMap, obj)).toEqual({ A: 1, B: 2, C: { D: 3 }, e: { f: { G: 4 }, h: [] } })
  })

  it('should rename object keys in array', () => {
    const arr = [{ a: 1, b: 2, c: { d: 5 } }, { a: 3, b: 4, c: { d: 6 } }]
    const keysMap = { 'a': 'A', 'b': 'B', 'c:d': 'D' }
    expect(renameObjectKeysInArray(keysMap, arr)).toEqual([{ A: 1, B: 2, c: { D: 5 } }, { A: 3, B: 4, c: { D: 6 } }])
  })

  it('should rename object keys in array deeply', () => {
    const arr = [{ a: 1, b: [{ a: 2 }] }, { a: 3, b: [{ a: 4 }] }]
    const keysMap = { a: 'A', b: 'B' }
    expect(renameObjectKeysInArrayDeeply(keysMap, 'b', arr)).toEqual([{ A: 1, B: [{ A: 2 }] }, { A: 3, B: [{ A: 4 }] }])
  })
})
