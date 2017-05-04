const assert = require('assert')
const adapter = require('../lib/adapter')
const TestHelper = require('./test_helper')

const connectionName = TestHelper.connectionName
const nodeProps = TestHelper.testNodeProps

const nodeProps1 = Object.assign({}, { name: 'node1', rank: 2 }, nodeProps)
const nodeProps2 = Object.assign({}, { name: 'node2', rank: 1 }, nodeProps)
const nodeProps3 = Object.assign({}, { name: 'node3', rank: 3, extraProp: 'yep' }, nodeProps)

describe('Finding Nodes', function () {

 	before(() => { return TestHelper.registerConnection() })
 	afterEach(() => { return TestHelper.cleanDB() })

  let node1, node2, node3

  beforeEach((done) => {
		adapter.create(connectionName, null, nodeProps1, function(err, results1) {
      if (err) { done(err) }

      node1 = results1[0]
  		adapter.create(connectionName, null, nodeProps2, function(err, results2) {
        if (err) { done(err) }

        node2 = results2[0]

    		adapter.create(connectionName, null, nodeProps3, function(err, results3) {
          if (err) { done(err) }

          node3 = results3[0]

          done()
        })

      })
    })
  })

	it('should find nodes', function (done) {
    const queryParams = {
      where: { sails_neo4j_test: 1 },
    }

    adapter.find(connectionName, null, queryParams, (err, results) => {
      assert.equal(results.length, 3)

      expectedIds = [node1._id, node2._id, node3._id]

      results.forEach((res) => {
        assert(expectedIds.includes(res._id))
      })

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
        assert.equal(results.length, 3)
        assert.equal(results[0]._id, node2._id)
        assert.equal(results[1]._id, node1._id)
        assert.equal(results[2]._id, node3._id)

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

  describe('when given > or <', () => {
    it('only returns correct nodes', (done) => {
      const queryParams = {
        where: { rank: { '>': 2 } }
      }

      adapter.find(connectionName, null, queryParams, (err, results) => {
        assert.equal(results.length, 1)
        assert.equal(results[0]._id, node3._id)

        done()
      })
    })
  })

  describe('when given criteria with AND', () => {
    it('returns only the correct node', (done) => {
      const queryParams = {
        where: {
          and: [
            { rank: { '>': 1 } },
            { name: 'node1' }
          ]
        }
      }

      adapter.find(connectionName, null, queryParams, (err, results) => {
        assert.equal(results.length, 1)
        assert.equal(results[0]._id, node1._id)

        done()
      })
    })
  })

  describe('when given nested criteria with OR', () => {
    it('works', (done) => {
      const queryParams = {
        where: {
          or: [
            {
              and: [
                { rank: { '>': 1 } },
                { name: 'node1' }
              ]
            },
            {
              and: [
                { name: 'node2' }
              ]
            }
          ]
        }
      }


      adapter.find(connectionName, null, queryParams, (err, results) => {
        assert.equal(results.length, 2)

        done()
      })
    })
  })

  describe('when given IN and an array of values for a prop', () => {
    it('works', (done) => {
      const queryParams = { where: { rank: { in: [1, 2] } } }

      adapter.find(connectionName, null, queryParams, (err, results) => {
        if (err) { return done(err) }

        assert.equal(results.length, 2)
        const ids = results.map((res) => res._id)

        assert(ids.includes(node1._id))
        assert(ids.includes(node2._id))

        done()
      })
    })
  })

  describe('query with EXISTS', () => {
    it('returns nodes with that attribute', (done) => {
      const queryParams = { where: { extraProp: { 'exists': true } } }

      adapter.find(connectionName, null, queryParams, (err, results) => {
        if (err) { return done(err) }

        assert.equal(results.length, 1)
        assert(results[0]._id === node3._id)

        done()
      })

    })
  })

  describe('query with NOT EXISTS', () => {
    it('returns nodes without that attribute', (done) => {
      const queryParams = { where: { extraProp: { 'exists': false } } }

      adapter.find(connectionName, null, queryParams, (err, results) => {
        if (err) { return done(err) }

        assert.equal(results.length, 2)
        const ids = results.map((res) => res._id)

        assert(ids.includes(node1._id))
        assert(ids.includes(node2._id))

        done()
      })

    })
  })
})
