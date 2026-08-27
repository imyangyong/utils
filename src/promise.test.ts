import type { UntilResult } from './promise'
import { describe, expect, it, vi } from 'vitest'
import { createSingletonPromise, sleep, STALE, takeLatest, until } from './promise'

it('promise', async () => {
  let dummy = 0

  const promise = createSingletonPromise(async () => {
    await sleep(10)
    dummy += 1
    return dummy
  })

  expect(dummy).toBe(0)

  await promise()

  expect(dummy).toBe(1)

  await promise()
  expect(await promise()).toBe(1)

  expect(dummy).toBe(1)

  await promise.reset()

  await promise()

  expect(dummy).toBe(2)
})

describe('until', async () => {
  it('given a callback function that returns a value', async () => {
    const [error, data]: UntilResult<null, string> = await until(() => Promise.resolve('value'))

    expect(error).toBe(null)

    expect(data).toEqual('value')
  })

  it('given a callback function that throws an exception', async () => {
    const customError = new Error('Error message')

    const run = () => {
      return until(() => {
        throw customError
      })
    }

    expect(run).not.toThrow()

    const [error, data] = await run()
    expect(error).toEqual(customError)
    expect(data).toBe(null)
  })

  it('given a Promise that rejects', async () => {
    const [error, data]: UntilResult<Error, null> = await until(() => Promise.reject(new Error('Error message')))

    expect(error).toBeInstanceOf(Error)
    expect(error).toHaveProperty('message', 'Error message')

    expect(data).toBeNull()
  })
})

describe('takeLatest', () => {
  function deferred<T>() {
    let resolve!: (value: T) => void
    let reject!: (reason?: any) => void
    const promise = new Promise<T>((_resolve, _reject) => {
      resolve = _resolve
      reject = _reject
    })
    return { promise, resolve, reject }
  }

  it('resolves with the value when there is only one invocation', async () => {
    const fn = takeLatest(async (n: number) => n * 2)

    await expect(fn(21)).resolves.toBe(42)
  })

  it('supports sync (non-async) functions', async () => {
    const fn = takeLatest((s: string) => s.length)

    await expect(fn('hello')).resolves.toBe(5)
  })

  it('passes through arguments to the wrapped function', async () => {
    const impl = vi.fn(async (a: number, b: string) => `${a}-${b}`)
    const fn = takeLatest(impl)

    await expect(fn(1, 'x')).resolves.toBe('1-x')
    expect(impl).toHaveBeenCalledWith(1, 'x')
  })

  it('resolves sequential (non-overlapping) calls with their own values', async () => {
    let count = 0
    const fn = takeLatest(async () => ++count)

    await expect(fn()).resolves.toBe(1)
    await expect(fn()).resolves.toBe(2)
  })

  it('resolves earlier racing invocations with STALE, only the latest gets the value', async () => {
    const d1 = deferred<string>()
    const d2 = deferred<string>()
    const fn = takeLatest(vi.fn()
      .mockImplementationOnce(() => d1.promise)
      .mockImplementationOnce(() => d2.promise))

    const p1 = fn('first')
    const p2 = fn('second')

    // resolve out of order: latest first
    d2.resolve('second-result')
    d1.resolve('first-result')

    await expect(p1).resolves.toBe(STALE)
    await expect(p2).resolves.toBe('second-result')
  })

  it('with three racing calls only the last one wins', async () => {
    const deferreds = [deferred<number>(), deferred<number>(), deferred<number>()]
    let i = 0
    const fn = takeLatest(() => deferreds[i++].promise)

    const p1 = fn()
    const p2 = fn()
    const p3 = fn()

    deferreds[2].resolve(3)
    deferreds[0].resolve(1)
    deferreds[1].resolve(2)

    await expect(p1).resolves.toBe(STALE)
    await expect(p2).resolves.toBe(STALE)
    await expect(p3).resolves.toBe(3)
  })

  it('propagates the rejection of the latest invocation', async () => {
    const error = new Error('boom')
    const fn = takeLatest(async () => {
      throw error
    })

    await expect(fn()).rejects.toBe(error)
  })

  it('resolves STALE instead of throwing when a stale invocation rejects', async () => {
    const d1 = deferred<string>()
    const d2 = deferred<string>()
    const fn = takeLatest(vi.fn()
      .mockImplementationOnce(() => d1.promise)
      .mockImplementationOnce(() => d2.promise))

    const p1 = fn()
    const p2 = fn()

    d1.reject(new Error('stale failure'))
    d2.resolve('ok')

    await expect(p1).resolves.toBe(STALE)
    await expect(p2).resolves.toBe('ok')
  })
})
