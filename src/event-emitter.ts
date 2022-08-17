/**
* @file event-emitter
* @author Angus Yang
* @date 2022-08-17
* @description EventEmitter is a minimalist event emitter implementation. forked from https://github.com/sindresorhus/emittery
*/
import type { Fn } from './types'
import { toArray } from './array'

type EventName = Symbol | number | string
type EventData = any
type Listener = (...eventData: EventData[]) => void
type AnyListener = (eventName: EventName, ...eventData: EventData[]) => void

interface Debug {
  name?: string
  enabled?: boolean
  logger?: (type: string, debugName: string | undefined, eventName: EventName | undefined, ...eventData: EventData[]) => void
}

interface Options {
  debug?: Debug
}

const anyMap = new WeakMap()
const eventsMap = new WeakMap()
const producersMap = new WeakMap()
const anyProducer = Symbol('anyProducer')
const resolvedPromise = Promise.resolve()

// Define symbols for "meta" events.
const listenerAdded = Symbol('listenerAdded')
const listenerRemoved = Symbol('listenerRemoved')

let canEmitMetaEvents = false
let isGlobalDebugEnabled = false

function assertEventName(eventName: EventName) {
  if (typeof eventName !== 'string' && typeof eventName !== 'symbol' && typeof eventName !== 'number')
    throw new TypeError('`eventName` must be a string, symbol, or number')
}

function assertListener(listener: Listener | AnyListener) {
  if (typeof listener !== 'function')
    throw new TypeError('listener must be a function')
}

function getListeners(instance: Emitter, eventName: EventName) {
  const events = eventsMap.get(instance)
  if (!events.has(eventName))
    events.set(eventName, new Set())

  return events.get(eventName)
}

function getEventProducers(instance: Emitter, eventName?: EventName) {
  const key = typeof eventName === 'string' || typeof eventName === 'symbol' || typeof eventName === 'number' ? eventName : anyProducer
  const producers = producersMap.get(instance)
  if (!producers.has(key))
    producers.set(key, new Set())

  return producers.get(key)
}

function enqueueProducers(instance: Emitter, eventName: EventName, ...eventData: EventData[]) {
  const producers = producersMap.get(instance)
  if (producers.has(eventName)) {
    for (const producer of producers.get(eventName))
      producer.enqueue(...eventData)
  }

  if (producers.has(anyProducer)) {
    const item = Promise.all([eventName, ...eventData])
    for (const producer of producers.get(anyProducer))
      producer.enqueue(item)
  }
}

function iterator(instance: Emitter, eventNames?: EventName | EventName[]) {
  eventNames = toArray(eventNames)

  let isFinished = false
  let flush: (value?: unknown) => void = () => {}
  let queue: EventData[] | undefined = []

  const producer = {
    enqueue(...item: EventData[]) {
      queue!.push(item)
      flush()
    },
    finish() {
      isFinished = true
      flush()
    },
  }

  for (const eventName of eventNames)
    getEventProducers(instance, eventName).add(producer)

  return {
    async next(): Promise<{ value?: EventData; done: boolean }> {
      if (!queue)
        return { done: true }

      if (queue.length === 0) {
        if (isFinished) {
          queue = undefined
          return this.next()
        }

        await new Promise((resolve) => {
          flush = resolve
        })

        return this.next()
      }

      return {
        done: false,
        value: await queue.shift(),
      }
    },

    async return(...value: EventData[]) {
      queue = undefined

      for (const eventName of (eventNames as EventName[]))
        getEventProducers(instance, eventName).delete(producer)

      flush()

      return arguments.length > 0
        ? { done: true, value: await value }
        : { done: true }
    },

    [Symbol.asyncIterator]() {
      return this
    },
  }
}

const isMetaEvent = (eventName: EventName) => eventName === listenerAdded || eventName === listenerRemoved

function emitMetaEvent(emitter: Emitter, eventName: EventName, ...eventData: EventData[]) {
  if (isMetaEvent(eventName)) {
    try {
      canEmitMetaEvents = true
      emitter.emit(eventName, ...eventData)
    }
    finally {
      canEmitMetaEvents = false
    }
  }
}

class Emitter {
  static mixin(emitteryPropertyName: string, methodNames: string[]) {
    methodNames = defaultMethodNamesOrAssert(methodNames)
    return (target: any) => {
      if (typeof target !== 'function')
        throw new TypeError('`target` must be function')

      for (const methodName of methodNames) {
        if (target.prototype[methodName] !== undefined)
          throw new Error(`The property \`${methodName}\` already exists on \`target\``)
      }

      function getEmitteryProperty(this: { enumerable: false; get: () => any }) {
        Object.defineProperty(this, emitteryPropertyName, {
          enumerable: false,
          value: new Emitter(),
        })
        // @ts-expect-error - index signature
        return this[emitteryPropertyName]
      }

      Object.defineProperty(target.prototype, emitteryPropertyName, {
        enumerable: false,
        get: getEmitteryProperty,
      })

      const emitteryMethodCaller = (methodName: string) => (...args: any[]) => {
        // @ts-expect-error - index signature
        return this[emitteryPropertyName][methodName](...args)
      }

      for (const methodName of methodNames) {
        Object.defineProperty(target.prototype, methodName, {
          enumerable: false,
          value: emitteryMethodCaller(methodName),
        })
      }

      return target
    }
  }

  static get isDebugEnabled() {
    if (typeof process !== 'object')
      return isGlobalDebugEnabled

    const { env } = process || { env: {} }
    return env.DEBUG === 'emittery' || env.DEBUG === '*' || isGlobalDebugEnabled
  }

  static set isDebugEnabled(newValue) {
    isGlobalDebugEnabled = newValue
  }

  debug: Debug

  constructor(options: Options = {}) {
    anyMap.set(this, new Set())
    eventsMap.set(this, new Map())
    producersMap.set(this, new Map())
    this.debug = options.debug || {}

    if (this.debug.enabled === undefined)
      this.debug.enabled = false

    if (!this.debug.logger) {
      this.debug.logger = (type, debugName, eventName, ...eventData) => {
        if (typeof eventName === 'symbol' || typeof eventName === 'number')
          eventName = eventName.toString()

        const currentTime = new Date()
        const logTime = `${currentTime.getHours()}:${currentTime.getMinutes()}:${currentTime.getSeconds()}.${currentTime.getMilliseconds()}`
        // eslint-disable-next-line no-console
        console.log(`[${logTime}][emittery:${type}][${debugName}] Event Name: ${eventName}\n\tdata: ${eventData}`)
      }
    }
  }

  logIfDebugEnabled(type: string, eventName: EventName | undefined, ...eventData: EventData[]) {
    if (Emitter.isDebugEnabled || this.debug.enabled)
      this.debug.logger!(type, this.debug.name, eventName, ...eventData)
  }

  on(eventNames: EventName | EventName[], listener: Listener) {
    assertListener(listener)

    eventNames = toArray(eventNames)
    for (const eventName of eventNames) {
      assertEventName(eventName)
      getListeners(this, eventName).add(listener)

      this.logIfDebugEnabled('subscribe', eventName, undefined)

      if (!isMetaEvent(eventName))
        emitMetaEvent(this, listenerAdded, { eventName, listener })
    }

    return this.off.bind(this, eventNames, listener)
  }

  off(eventNames: EventName | EventName[], listener: Listener) {
    assertListener(listener)

    eventNames = toArray(eventNames)
    for (const eventName of eventNames) {
      assertEventName(eventName)
      getListeners(this, eventName).delete(listener)

      this.logIfDebugEnabled('unsubscribe', eventName, undefined)

      if (!isMetaEvent(eventName))
        emitMetaEvent(this, listenerRemoved, { eventName, listener })
    }
  }

  once(eventNames: EventName | EventName[]) {
    let off_: Fn

    const promise = new Promise((resolve) => {
      off_ = this.on(eventNames, (data) => {
        off_()
        resolve(data)
      })
    })

    // @ts-expect-error - mount off on the promise
    promise.off = off_
    return promise
  }

  events(eventNames: EventName | EventName[]) {
    eventNames = toArray(eventNames)
    for (const eventName of eventNames)
      assertEventName(eventName)

    return iterator(this, eventNames)
  }

  async emit(eventName: EventName, ...eventData: EventData[]) {
    assertEventName(eventName)

    if (isMetaEvent(eventName) && !canEmitMetaEvents)
      throw new TypeError('`eventName` cannot be meta event `listenerAdded` or `listenerRemoved`')

    this.logIfDebugEnabled('emit', eventName, ...eventData)

    enqueueProducers(this, eventName, ...eventData)

    const listeners = getListeners(this, eventName)
    const anyListeners = anyMap.get(this)
    const staticListeners = [...listeners]
    const staticAnyListeners = isMetaEvent(eventName) ? [] : [...anyListeners]

    await resolvedPromise
    await Promise.all([
      ...staticListeners.map(async (listener) => {
        if (listeners.has(listener))
          return listener(...eventData)
      }),
      ...staticAnyListeners.map(async (listener) => {
        if (anyListeners.has(listener))
          return listener(eventName, ...eventData)
      }),
    ])
  }

  async emitSerial(eventName: EventName, ...eventData: EventData[]) {
    assertEventName(eventName)

    if (isMetaEvent(eventName) && !canEmitMetaEvents)
      throw new TypeError('`eventName` cannot be meta event `listenerAdded` or `listenerRemoved`')

    this.logIfDebugEnabled('emitSerial', eventName, ...eventData)

    const listeners = getListeners(this, eventName)
    const anyListeners = anyMap.get(this)
    const staticListeners = [...listeners]
    const staticAnyListeners = [...anyListeners]

    await resolvedPromise

    for (const listener of staticListeners) {
      if (listeners.has(listener))
        await listener(...eventData)
    }

    for (const listener of staticAnyListeners) {
      if (anyListeners.has(listener))
        await listener(eventName, ...eventData)
    }
  }

  onAny(listener: AnyListener) {
    assertListener(listener)

    this.logIfDebugEnabled('subscribeAny', undefined, undefined)

    anyMap.get(this).add(listener)
    emitMetaEvent(this, listenerAdded, { listener })
    return this.offAny.bind(this, listener)
  }

  anyEvent() {
    return iterator(this)
  }

  offAny(listener: AnyListener) {
    assertListener(listener)

    this.logIfDebugEnabled('unsubscribeAny', undefined, undefined)

    emitMetaEvent(this, listenerRemoved, { listener })
    anyMap.get(this).delete(listener)
  }

  clearListeners(eventNames: EventName | EventName[]) {
    eventNames = Array.isArray(eventNames) ? eventNames : [eventNames]

    for (const eventName of eventNames) {
      this.logIfDebugEnabled('clear', eventName, undefined)

      if (typeof eventName === 'string' || typeof eventName === 'symbol' || typeof eventName === 'number') {
        getListeners(this, eventName).clear()

        const producers = getEventProducers(this, eventName)

        for (const producer of producers)
          producer.finish()

        producers.clear()
      }
      else {
        anyMap.get(this).clear()

        for (const listeners of eventsMap.get(this).values())
          listeners.clear()

        for (const producers of producersMap.get(this).values()) {
          for (const producer of producers)
            producer.finish()

          producers.clear()
        }
      }
    }
  }

  listenerCount(eventNames: EventName | EventName[]) {
    eventNames = toArray(eventNames)
    let count = 0

    for (const eventName of eventNames) {
      if (typeof eventName === 'string') {
        count += anyMap.get(this).size + getListeners(this, eventName).size + getEventProducers(this, eventName).size + getEventProducers(this).size
        continue
      }

      if (typeof eventName !== 'undefined')
        assertEventName(eventName)

      count += anyMap.get(this).size

      for (const value of eventsMap.get(this).values())
        count += value.size

      for (const value of producersMap.get(this).values())
        count += value.size
    }

    return count
  }

  bindMethods(target: Record<string, any>, methodNames: string[]) {
    if (typeof target !== 'object' || target === null)
      throw new TypeError('`target` must be an object')

    methodNames = defaultMethodNamesOrAssert(methodNames)

    for (const methodName of methodNames) {
      if (target[methodName] !== undefined)
        throw new Error(`The property \`${methodName}\` already exists on \`target\``)

      Object.defineProperty(target, methodName, {
        enumerable: false,
        // @ts-expect-error - index signature
        value: this[methodName].bind(this),
      })
    }
  }
}

const allEmitteryMethods = Object.getOwnPropertyNames(Emitter.prototype).filter(v => v !== 'constructor')

function defaultMethodNamesOrAssert(methodNames: string[]) {
  if (methodNames === undefined)
    return allEmitteryMethods

  if (!Array.isArray(methodNames))
    throw new TypeError('`methodNames` must be an array of strings')

  for (const methodName of methodNames) {
    if (!allEmitteryMethods.includes(methodName)) {
      if (typeof methodName !== 'string')
        throw new TypeError('`methodNames` element must be a string')

      throw new Error(`${methodName} is not Emitter method`)
    }
  }

  return methodNames
}

Object.defineProperty(Emitter, 'listenerAdded', {
  value: listenerAdded,
  writable: false,
  enumerable: true,
  configurable: false,
})
Object.defineProperty(Emitter, 'listenerRemoved', {
  value: listenerRemoved,
  writable: false,
  enumerable: true,
  configurable: false,
})

export {
  Emitter as EventEmitter,
}
