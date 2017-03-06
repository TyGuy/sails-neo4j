const assert = require('assert')
const adapter = require('../lib/adapter.js')
const TestHelper = require('./test_helper')

const connectionConfig = TestHelper.connection

describe('init', () => {

	it('should succeed when a valid connection is created', (done) => {

		adapter.getConnection(connectionConfig).then((connection) => {
			adapter.getConnection(connectionConfig).then((connectionAgain) => {
				assert(connection.query)
				assert.equal(connection, connectionAgain)

				done()
			})
		})
	})
})
