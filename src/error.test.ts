import { describe, expect, it } from 'vitest'
import { ErrorBase } from './error'

type ErrorName =
  | 'GET_PROJECT_ERROR'
  | 'CREATE_PROJECT_ERROR'
  | 'UPDATE_PROJECT_ERROR'
  | 'DELETE_PROJECT_ERROR'

class TeamError extends ErrorBase<ErrorName> {}

describe('error', () => {
  it('should be able to create an error', () => {
    try {
      throw new TeamError({
        message: 'Failed to get project',
        name: 'GET_PROJECT_ERROR',
      })
    }
    catch (error) {
      if (error instanceof TeamError) {
        expect(error.name).toBe('GET_PROJECT_ERROR')
        expect(error.message).toBe('Failed to get project')
        expect(error.cause).toBeUndefined()
      }
    }
  })
})
