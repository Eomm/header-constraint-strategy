# header-constraint-strategy

A general purpose [`find-my-way`](https://github.com/delvedor/find-my-way) custom constraint strategy.
Tested for [Fastify](https://github.com/fastify/fastify).


[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
[![Build Status](https://github.com/Eomm/header-constraint-strategy/workflows/ci/badge.svg)](https://github.com/Eomm/header-constraint-strategy/actions)

This module let you to drive the incoming HTTP request into a route based on the header's strict content.
Doing so, if a request has a specific string header, it can reach a route hide behind a constraint.
Go to the _Usage_ section to get a complete overview of this feature!


## Install

```
npm install header-constraint-strategy
```


## Usage with Fastify

Here all the constraint types you can define with this module!
This setup shows you all the settings `header-constraint-strategy` provides to you.

```js
const headerConstraintStrategy = require('header-constraint-strategy')
const Fastify = require('fastify')

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

app.listen(80)
```

The routes can be reached via an HTTP request with these headers.

| # | `foo` header | `mustBeIn` header | `x-my-app` header | response |
|---|--------------|-------------------|-------------------|----------|
|1| - | - | - | 200 - no constraint
|2| `bar` | - | - | 200 - foo
|3| `hello` | - | - | 200 - no constraint
|4| - | `123` | - | 200 - mustBeIn
|5| - | `456` | - | 404
|6| - | - | `ABC` | 200 - appOption
|7| - | `123` | `ABC` | 200 - mustBeIn and appOption
|8| - | `ops` | `ABC` | 200 - appOption
|9| `bar` | `123` | `ABC` | 200 - mustBeIn and appOption
|10| `bar` | `ops` | `ABC` | 200 - appOption

### Cases explanation

1) When the is not headers that meets the constraint, the route without constraint will be used if set. Otherwise 404
2) The `foo` constraint is matched
3) The `foo` constraint is not matched so the route without constraint is used
4) The `mustBeIn` constraint is matched
5) Like the 4), but this time the route without constraint is no used because of the flag `mustMatchWhenDerived: true`
6) The `appOption` constraint is matched
7) Multiple constraint matches
8) Only the `appOption` constraint is matched
9) When there are multiple matches (the route with `foo` and route with `mustBeIn` and `appOption`), the route with more fulfilled constraint wins!
10) In case of draws (the route with `foo` and the route with `appOption` are metching) wins the last route configured! So in this example, if you move the `foo` route ad the end of the file, the output will change!


## Options

You can pass the following options during the registration:

| Option | Default | Description |
|--------|---------|-------------|
|`name`| as the header if not set | The name of the JSON property that you will set in the route's `constraints` option
|`header`| as the name if not set | The HTTP header where read the input to match the constraint
|`mustMatchWhenDerived`| `false` | Define if the same route without constraint must be evaluated for the routing


## License

Copyright [Manuel Spigolon](https://github.com/Eomm), Licensed under [MIT](./LICENSE).
