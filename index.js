'use strict'
const assert = require('assert')

function strictStringStorage () {
  const holder = new Map()
  return {
    get (value) {
      return holder.get(value)
    },
    set (value, store) {
      holder.set(value, store)
    },
    del (value) {
      holder.delete(value)
    },
    empty () {
      holder.clear()
    }
  }
}

module.exports = function factoryHeaderConstraintStrategy (opts) {
  let name
  let header
  let mustMatchWhenDerived = false

  if (typeof opts === 'string') {
    name = opts
    header = opts
  } else if (typeof opts === 'object') {
    name = opts.name || opts.header
    header = opts.header || opts.name
    mustMatchWhenDerived = opts.mustMatchWhenDerived === true
  } else {
    assert(false, 'You must provide a string or an object as argument')
  }

  assert(name && header, 'You must provide a string or an object as argument')

  header = header.toLowerCase()

  return {
    name,
    mustMatchWhenDerived,
    storage: strictStringStorage,
    validate (value) {
      assert(typeof value === 'string', 'The header should be a string')
    },
    deriveConstraint: (req, ctx) => {
      return req.headers[header]
    }
  }
}
