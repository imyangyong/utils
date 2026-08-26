import type { UntilResult } from './promise'
import { describe, expect, it } from 'vitest'
import { createSingletonPromise, sleep, until } from './promise'

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
