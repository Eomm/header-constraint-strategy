'use strict'

const { test } = require('tap')
const FindMyWay = require('find-my-way')
const Fastify = require('fastify')

const headerConstraintStrategy = require('../index')

test('Bad interface', t => {
  t.plan(2)
  t.throws(headerConstraintStrategy)

  t.throws(() => {
    headerConstraintStrategy({})
  })
})

test('FindMyWay integration', t => {
  t.plan(5)

  const router = FindMyWay({
    defaultRoute: (req, res) => {
      t.pass('404')
    },
    constraints: {
      world: headerConstraintStrategy({
        name: 'world', // the name must be equal to the json property
        header: 'hello',
        mustMatchWhenDerived: true
      })
    }
  })

  router.on('GET', '/', (req, res) => {
    t.pass('root')
  })

  router.on('GET', '/', { constraints: { world: 'A' } }, (req, res) => {
    t.pass('route A')
  })

  router.on('GET', '/', { constraints: { world: 'B' } }, (req, res) => {
    t.pass('route B')
  })

  router.lookup({ method: 'GET', url: '/', headers: { } }, {})
  router.lookup({ method: 'GET', url: '/', headers: { hello: 'A' } }, {})
  router.lookup({ method: 'GET', url: '/', headers: { hello: 'B' } }, {})
  router.lookup({ method: 'GET', url: '/', headers: { hello: 'C' } }, {})

  router.off('GET', '/')
  router.reset()
  t.pass('completed')
})

test('Fastify integration', async t => {
  const app = Fastify({
    constraints: {
      bar: headerConstraintStrategy({ header: 'bar', mustMatchWhenDerived: true }),
      foo: headerConstraintStrategy('foo')
    }
  })

  app.get('/', { handler: reply('response root') })
  app.get('/', { handler: reply('response 1'), constraints: { bar: 'ABC' } })
  app.get('/', { handler: reply('response 2'), constraints: { bar: 'QWE' } })

  app.get('/', { handler: reply('response 3'), constraints: { foo: 'zxc' } })
  app.get('/', { handler: reply('response 4'), constraints: { foo: 'asd' } })

  app.get('/', { handler: reply('response mix'), constraints: { bar: 'ABC', foo: 'asd' } })

  let res
  res = await app.inject({ url: '/' })
  t.equal(res.statusCode, 200, 'warm up')
  t.equal(res.json().val, 'response root')

  res = await app.inject({ url: '/', headers: { bar: 'abc' } })
  t.equal(res.statusCode, 404, 'mustMatchWhenDerived in action')

  res = await app.inject({ url: '/', headers: { foo: 'abc' } })
  t.equal(res.statusCode, 200, 'mustMatchWhenDerived in action')
  t.equal(res.json().val, 'response root')

  res = await app.inject({ url: '/', headers: { bar: 'QWE' } })
  t.equal(res.statusCode, 200)
  t.equal(res.json().val, 'response 2')

  res = await app.inject({ url: '/', headers: { foo: 'zxc' } })
  t.equal(res.statusCode, 200)
  t.equal(res.json().val, 'response 3')

  res = await app.inject({ url: '/', headers: { foo: 'asd', bar: 'ABC' } })
  t.equal(res.statusCode, 200)
  t.equal(res.json().val, 'response mix')

  res = await app.inject({ url: '/', headers: { foo: 'zxc', bar: 'QWE' } })
  t.equal(res.statusCode, 200)
  t.equal(res.json().val, 'response 3')

  res = await app.inject({ url: '/', headers: { bar: 'QWE', foo: 'zxc' } })
  t.equal(res.statusCode, 200)
  t.equal(res.json().val, 'response 3')

  res = await app.inject({ url: '/', headers: { foo: 'zxc' } })
  t.equal(res.statusCode, 200)
  t.equal(res.json().val, 'response 3')
})

test('README example', async t => {
  // STEP 1: setup the constraints into your fastify instance
  const app = Fastify({
    constraints: {
      // basic usage
      foo: headerConstraintStrategy('foo'),
      // strict usage
      mustBeIn: headerConstraintStrategy({ header: 'mustBeIn', mustMatchWhenDerived: true }),
      // custom header usage
      appOption: headerConstraintStrategy({ name: 'appOption', header: 'x-my-app' })
    }
  })

  // STEP 2: use the constraint where you need them
  app.get('/', {
    handler: reply('no constraint')
  })

  app.get('/', {
    handler: reply('foo'),
    constraints: {
      foo: 'bar'
    }
  })

  app.get('/', {
    handler: reply('mustBeIn'),
    constraints: {
      mustBeIn: '123'
    }
  })

  app.get('/', {
    handler: reply('appOption'),
    constraints: {
      appOption: 'ABC'
    }
  })

  app.get('/', {
    handler: reply('mustBeIn and appOption'),
    constraints: {
      mustBeIn: '123',
      appOption: 'ABC'
    }
  })

  let res
  res = await app.inject({ url: '/' })
  t.equal(res.statusCode, 200)
  t.equal(res.json().val, 'no constraint')

  res = await app.inject({ url: '/', headers: { foo: 'bar' } })
  t.equal(res.statusCode, 200)
  t.equal(res.json().val, 'foo')

  res = await app.inject({ url: '/', headers: { foo: 'hello' } })
  t.equal(res.statusCode, 200)
  t.equal(res.json().val, 'no constraint')

  res = await app.inject({ url: '/', headers: { mustBeIn: '123' } })
  t.equal(res.statusCode, 200)
  t.equal(res.json().val, 'mustBeIn')

  res = await app.inject({ url: '/', headers: { mustBeIn: '456' } })
  t.equal(res.statusCode, 404)

  res = await app.inject({ url: '/', headers: { 'x-my-app': 'ABC' } })
  t.equal(res.statusCode, 200)
  t.equal(res.json().val, 'appOption')

  res = await app.inject({ url: '/', headers: { mustBeIn: '123', 'x-my-app': 'ABC' } })
  t.equal(res.statusCode, 200)
  t.equal(res.json().val, 'mustBeIn and appOption')

  res = await app.inject({ url: '/', headers: { mustBeIn: 'ops', 'x-my-app': 'ABC' } })
  t.equal(res.statusCode, 200)
  t.equal(res.json().val, 'appOption')

  res = await app.inject({ url: '/', headers: { foo: 'bar', mustBeIn: '123', 'x-my-app': 'ABC' } })
  t.equal(res.statusCode, 200)
  t.equal(res.json().val, 'mustBeIn and appOption')

  res = await app.inject({ url: '/', headers: { foo: 'bar', mustBeIn: 'ops', 'x-my-app': 'ABC' } })
  t.equal(res.statusCode, 200)
  t.equal(res.json().val, 'appOption')
})

function reply (val) {
  return function (req, reply) {
    reply.send({ val })
  }
}
