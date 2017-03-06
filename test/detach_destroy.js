const assert = require('assert')
const adapter = require('../lib/adapter')
const TestHelper = require('./test_helper')

const connectionName = TestHelper.connectionName
const nodeProps = TestHelper.testNodeProps

describe('Destroying Nodes', function () {
  const nodeProps1 = Object.assign({}, { name: 'node1' }, nodeProps)
  const nodeProps2 = Object.assign({}, { name: 'node2' }, nodeProps)
  const relationshipType = 'CONNECTED_TO'

  let node1, node2, relationship

 	before(() => { return TestHelper.registerConnection() })
  afterEach(() => { return TestHelper.cleanDB() })

  beforeEach((done) => {
    adapter.create(connectionName, null, nodeProps1, (err, results1) => {
      node1 = results1[0]
      adapter.create(connectionName, null, nodeProps2, (err, results2) => {
        node2 = results2[0]
        adapter.link(connectionName, null, nodeProps1, null, nodeProps2, relationshipType, {}, (err, results3) => {
          if (err) {
            console.log(err)
            console.error(err)
          }
          relationship = results3[0]

          done()
        })
      })
    })
  })

	const expectExist = (criteria, exist) => {
		return new Promise((resolve, reject) => {
			adapter.find(connectionName, null, { where: criteria }, (err, results) => {
				if (err) { return reject(err) }

			  if (exist) {
					assert(results.length >= 1)
				} else {
					assert(results.length == 0)
				}

				return resolve(results)
			})
		})
	}

  describe('destroy', () => {
		it('does not destroy nodes with existing relationships, and raises error', (done) => {
			adapter.destroy(connectionName, null, { where: nodeProps1 }, (err, result) => {
				if (err) {
          assert.equal(err.name, 'neo4j.ClientError')
					assert.equal(err.neo4j.code, 'Neo.ClientError.Schema.ConstraintValidationFailed')

					done()
				} else {
	        // shouldn't get here
					assert(true == false)
				}
			})
		})
	})

	describe('detachDestory', () => {
		it('detaches and destroys the given node(s)', (done) => {
			let expectNode1 = expectExist(nodeProps1, true)
			let expectNode2 = expectExist(nodeProps2, true)

			Promise.all([expectNode1, expectNode2]).then(() => {
				adapter.detachDestroy(connectionName, null, { where: nodeProps1 }, (err, result) => {
					let expectNotNode1 = expectExist(nodeProps1, false)
					let expectNode2 = expectExist(nodeProps2, true)

					Promise.all([expectNotNode1, expectNode2]).then(() => {
						done()
					})
				})
			}).catch((err) => {
				console.error(err)
				done(err)
			})
		})
	})
});
