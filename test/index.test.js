'use strict'

const { test } = require('tap')
const FindMyWay = require('find-my-way')
const Fastify = require('fastify')

const headerConstraintStrategy = require('../index')

test('Bad interface', t => {
  t.plan(1)
  t.throws(headerConstraintStrategy)
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

function reply (val) {
  return function (req, reply) {
    reply.send({ val })
  }
}
