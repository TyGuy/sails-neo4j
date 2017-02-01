# Sails-Neo4j

## Installation
```sh
npm install TyGuy/sails-neo4j --save
```

## Usage:

### Starting up (`require/import`):
```javascript
import adapter from 'sails-neo4j' // don't have to call it "adapter", but for consistency with examples.
// OR
var adapter = require('sails-neo4j');
```

### `adapter.registerConnection`
First, create a connection object, to override any defaults ([defaults here](./lib/adapter.js#L35)):
```javascript
var connection = {
  identity: 'neo4j',
  username: process.env.NEO4J_USERNAME || 'neo4j',
  password: process.env.NEO4J_PASSWORD || 'neo4j'
}
```
> NOTE: The `identity` param is the only one explicitly required. If you are running neo4j locally, and have just set it up (and changed the password when prompted), then `password` is most likely the only other thing that needs to change from the default configs

Then, call `registerConnection` with the connection object:

```javascript
adapter.registerConnection(connection, null, callback)
```
Notes:
1. The second argument is unused (I have no idea), so have fun passing whatever you want.
2. If you try to register the connection multiple times, you will get an error.
3. As with most of the methods here, the callback should be in the form of `function(err, result){}`.

### `adapter.destroy`
(see [here](./lib/adapter.js#L263) for source)

```javascript
// adapter.destroy(connection_identity, collection_name, params, callback)
let params = { where: { username: 'tyler' } }

adapter.destroy('neo4j', null, params, function(err, results) {
  if (err) { throw err }

  return results
});

```
> NOTE: the `params` argument is deceptive, because you need an object with a key `where` (like `{ where: <criteria> }`)

## Development

### Testing:
WARNING: Please note that this will actually create and delete nodes in your local neo4j DB.
However, They are tagged with the property { "sails_neo4j_test": 1 }, so if you tag any other nodes with that, (that is pretty weird but also) they will be deleted.

```sh
npm install
cp .env.sample .env
# IMPORTANT:
# Make sure NEO4J_USERNAME and NEO4J_PASSWORD env vars (in .env file) actually
# match your local neo4j DB credentials; these are needed for basic auth.
npm test
```

### Copied from README.md of original repo in 2015:

Sails-Neo4j Adapter; Will update the readme very soon.
For now if you have any questions:
[![Gitter chat](https://badges.gitter.im/natgeo/sails-neo4j.png)](https://gitter.im/natgeo/sails-neo4j)
