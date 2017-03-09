const assert = require('assert')
const adapter = require('../lib/adapter')
const TestHelper = require('./test_helper')

const connectionName = TestHelper.connectionName
const nodeProps = TestHelper.testNodeProps

const nodeProps1 = Object.assign({}, { name: 'node1', rank: 2 }, nodeProps)
const nodeProps2 = Object.assign({}, { name: 'node2', rank: 1 }, nodeProps)

describe('Finding Nodes', function () {

 	before(() => { return TestHelper.registerConnection() })
 	afterEach(() => { return TestHelper.cleanDB() })

  let node1, node2

  beforeEach((done) => {
		adapter.create(connectionName, null, nodeProps1, function(err, results1) {
      if (err) { done(err) }

      node1 = results1[0]
  		adapter.create(connectionName, null, nodeProps2, function(err, results2) {
        if (err) { done(err) }

        node2 = results2[0]

        done()
      })
    })
  })

	it('should find nodes', function (done) {
    const queryParams = {
      where: { sails_neo4j_test: 1 },
    }

    adapter.find(connectionName, null, queryParams, (err, results) => {
      assert.equal(results.length, 2)
      assert.equal(results[0]._id, node1._id)
      assert.equal(results[1]._id, node2._id)

      done()
    })
	})

  describe('when given sort option', () => {
    it('should find the nodes and sort them correctly', (done) => {
      const queryParams = {
        where: { sails_neo4j_test: 1 },
        sort: [ { rank: 'ASC' } ]
      }

      adapter.find(connectionName, null, queryParams, (err, results) => {
        assert.equal(results.length, 2)
        assert.equal(results[0]._id, node2._id)
        assert.equal(results[1]._id, node1._id)

        done()
      })
    })

    describe('when given limit option', () => {
      it('should order them and limit to the limit', (done) => {
        const queryParams = {
          where: { sails_neo4j_test: 1 },
          sort: [ { rank: 'ASC' } ],
          limit: 1
        }

        adapter.find(connectionName, null, queryParams, (err, results) => {
          assert.equal(results.length, 1)
          assert.equal(results[0]._id, node2._id)

          done()
        })
      })
    })
  })

  describe('when given nested attributes', () => {
    let deepNode
    const nestedProp = { thing: { deep: 'poop' } }
    const props = Object.assign({}, nodeProps, { nested: nestedProp })

    beforeEach((done) => {
  		adapter.create(connectionName, null, props, function(err, results) {
        if (err) { done(err) }

        deepNode = results[0]
        done()
      })
    })

    it('finds nodes using nested props in the query', (done) => {
      const queryParams = {
        where: { nested: nestedProp }
      }

  		adapter.find(connectionName, null, queryParams, function(err, results) {
        assert.equal(results.length, 1)
        assert.equal(results[0]._id, deepNode._id)

        const deepAttribute = results[0].data.nested.thing.deep
        assert.equal(deepAttribute, 'poop')

        done()
      })
    })
  })
})
