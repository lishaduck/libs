import { expect, fn, test, type testing } from "@libs/testing"
import { Resource } from "./resource.ts"
import { Store } from "./store/kv.ts"
import { Logger } from "@libs/logger"
import { delay } from "jsr:@std/async@^0.224.2/delay"

const log = new Logger({ level: Logger.level.disabled })
const store = await new Store({ path: ":memory:", log }).ready

test("deno")(`Resource cannot be instantiated without extending constructor with Resource.with`, () => {
  expect(() => new Resource()).toThrow(ReferenceError)
})

test("deno")(`Resource.with returns a new resource constructor`, async () => {
  const TestResource = await Resource.with({ store, log }).ready
  expect(() => new TestResource()).not.toThrow()
})

test("deno")(`Resource.constructor fetches back data from store when id is given`, async () => {
  const TestResource = await Resource.with({ name: "load", store, log }).ready
  const resource = new TestResource(null, { foo: "bar" })
  await resource.save()
  TestResource.uncache(resource.id)
  const reloaded = await new TestResource(resource.id).ready
  expect(reloaded.data).toEqual(resource.data)
  expect(new TestResource(reloaded.id)).toBe(reloaded)
  await expect(new TestResource("invalid").ready).rejects.toThrow(Error)
})

test("deno")(`Resource.load loads data from store`, async () => {
  const listeners = { load: fn(), loaded: fn() }
  const TestResource = await Resource.with({ name: "load", store, log, listeners }).ready
  const resource = new TestResource()
  await expect(resource.load()).resolves.toBeNull()
  expect(listeners.load).toBeCalled()
  expect(listeners.loaded).not.toBeCalled()
  await (TestResource as testing).store.set(resource.keys[0], (resource as testing).data)
  await expect(resource.load()).resolves.toBe(resource)
  expect(listeners.loaded).toBeCalled()
  await expect(resource.load()).resolves.toBe(resource)
})

test("deno")(`Resource.save saves data into store`, async () => {
  const listeners = { save: fn(), saved: fn() }
  const TestResource = await Resource.with({ name: "save", store, log, listeners }).ready
  const resource = new TestResource()
  expect(resource.data.created).toBeNull()
  expect(resource.data.updated).toBeNull()
  await expect(resource.save()).resolves.toBe(resource)
  expect(typeof resource.data.created).toBe("number")
  expect(typeof resource.data.updated).toBe("number")
  expect(resource.data.created).toBe(resource.data.updated)
  expect(listeners.save).toBeCalled()
  expect(listeners.saved).toBeCalled()
  await delay(50)
  await expect(resource.save()).resolves.toBe(resource)
  expect(resource.data.created).not.toBe(resource.data.updated)
  await expect(resource.save()).resolves.toBe(resource)
})

test("deno")(`Resource.delete deletes data from store`, async () => {
  const listeners = { delete: fn(), deleted: fn() }
  const TestResource = await Resource.with({ name: "delete", store, log, listeners }).ready
  const resource = new TestResource()
  await expect(resource.delete()).resolves.toBeNull()
  expect(listeners.delete).toBeCalled()
  expect(listeners.deleted).not.toBeCalled()
  await resource.save()
  await expect(resource.delete()).resolves.toBe(resource)
  expect(resource.data.created).toBeNull()
  expect(resource.data.updated).toBeNull()
  expect(listeners.deleted).toBeCalled()
  await expect(resource.delete()).resolves.toBeNull()
})

test("deno")(`Resource.has tests resource presence in store`, async () => {
  const TestResource = await Resource.with({ name: "has", store, log }).ready
  const resource = new TestResource()
  await expect(TestResource.has(resource.keys[0])).resolves.toBe(false)
  await expect(TestResource.has(resource.id)).resolves.toBe(false)
  await resource.save()
  await expect(TestResource.has(resource.keys[0])).resolves.toBe(true)
  await expect(TestResource.has(resource.id)).resolves.toBe(true)
})

test("deno")(`Resource.get gets resource from store and is the same instance each time`, async () => {
  const TestResource = await Resource.with({ name: "get", store, log }).ready
  const resource = new TestResource()
  await expect(TestResource.get(resource.keys[0])).resolves.toBeNull()
  await expect(TestResource.get(resource.id)).resolves.toBeNull()
  await resource.save()
  await expect(TestResource.get(resource.keys[0])).resolves.toBe(resource)
  await expect(TestResource.get(resource.id)).resolves.toBe(resource)
  TestResource.uncache(resource.id)
  await expect(TestResource.get(resource.id)).resolves.toHaveProperty("id", resource.id)
})

test("deno")(`Resource.delete deletes resource from store`, async () => {
  const TestResource = await Resource.with({ name: "delete", store, log }).ready
  const resource = new TestResource()
  await expect(TestResource.delete(resource.keys[0])).resolves.toBeNull()
  await expect(TestResource.delete(resource.id)).resolves.toBeNull()
  await resource.save()
  await expect(TestResource.delete(resource.keys[0])).resolves.toBe(resource)
  await resource.save()
  await expect(TestResource.delete(resource.id)).resolves.toBe(resource)
})

test("deno")(`Resource.list lists resources from store`, async () => {
  const TestResource = await Resource.with({ name: "list", store, log }).ready
  await expect(TestResource.list(undefined, { array: true })).resolves.toEqual([])
  const resources = []
  for (let i = 0; i < 5; i++) {
    resources.push(await new TestResource().ready)
    await resources.at(-1)!.save()
    await delay(1)
  }
  await expect(TestResource.list([], { array: true })).resolves.toEqual(resources)
  await expect(TestResource.list([[resources.at(0)!.id], [resources.at(-1)!.id]], { array: true })).resolves.toEqual(resources)
  await expect(Array.fromAsync(await TestResource.list([], { array: false }))).resolves.toEqual(resources)
})