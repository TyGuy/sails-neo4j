require('dotenv').config();

const adapter = require('../lib/adapter')

const connectionName = exports.connectionName = 'neo4j'
const testNodeProps = exports.testNodeProps = { sails_neo4j_test: 1 }

const connection = exports.connection = {
	identity: connectionName,
	username: process.env.NEO4J_USERNAME || 'neo4j',
	password: process.env.NEO4J_PASSWORD || 'neo4j'
}

let registered = false

const registerConnection = exports.registerConnection = () => {
  return new Promise((resolve, reject) => {
    if (registered) { resolve(connection.identity) }

  	adapter.registerConnection(connection, null, (err, result) => {
      if (err) { reject(err) }

      registered = true
      resolve(connection.identity)
    })
  })
}

const cleanDB = exports.cleanDB = () => {
  return new Promise((resolve, reject) => {

    adapter.detachDestroy(connectionName, null, { where: testNodeProps }, (err, results) => {
      if (err) { reject(err) }

      resolve(results)
    })
  })
}

registerConnection()
