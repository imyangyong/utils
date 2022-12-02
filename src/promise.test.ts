import { describe, expect, it } from 'vitest'
import { createSingletonPromise, sleep, until } from './promise'
import type { AsyncTuple } from './promise'

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
    const result: AsyncTuple = await until(() => Promise.resolve('value'))

    expect(result.error).toBe(null)

    expect(result.data).toEqual('value')
  })

  it('given a callback function that throws an exception', async () => {
    const customError = new Error('Error message')

    const run = () => {
      return until(() => {
        throw customError
      })
    }

    expect(run).not.toThrow()

    const { error, data } = await run()
    expect(error).toEqual(customError)
    expect(data).toBe(null)
  })

  it('given a Promise that rejects', async () => {
    const result: AsyncTuple = await until(() => Promise.reject(new Error('Error message')))

    expect(result.error).toBeInstanceOf(Error)
    expect(result.error).toHaveProperty('message', 'Error message')

    expect(result.data).toBeNull()
  })
})
