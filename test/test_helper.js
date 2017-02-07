require('dotenv').config();

const adapter = require('../lib/adapter')

const connectionName = exports.connectionName = 'neo4j'

const connection = {
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

registerConnection()
