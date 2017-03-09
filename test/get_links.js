const assert = require('assert')
const adapter = require('../lib/adapter')
const TestHelper = require('./test_helper')

const connectionName = TestHelper.connectionName
const nodeProps = TestHelper.testNodeProps

describe('Retrieving links', function () {
  const nodeProps1 = Object.assign({}, { name: 'node1' }, nodeProps)
  const nodeProps2 = Object.assign({}, { name: 'node2' }, nodeProps)
  const statusProp = 'pending'
  const relProps = { status: statusProp }

  const relationshipType = 'CONNECTED_TO'

  let node1, node2, relationship

 	before(() => { return TestHelper.registerConnection() })
 	afterEach(() => { return TestHelper.cleanDB() })

  beforeEach((done) => {
    adapter.create(connectionName, null, nodeProps1, (err, results1) => {
      node1 = results1[0]
      adapter.create(connectionName, null, nodeProps2, (err, results2) => {
        node2 = results2[0]

        adapter.link(connectionName, null, nodeProps1, null, nodeProps2, relationshipType, relProps, (err, results) => {
          relationship = results[0]

          done()
        })
      })
    })
  })

  describe('getLinks (non-directed)', () => {
    it('returns the link', (done) => {
      adapter.getLinks(connectionName, null, nodeProps1, null, nodeProps2, relationshipType, relProps, (err, results) => {
        if (err) { done(err) }

        const newRelationship = results[0]
        assert.equal(newRelationship._id, relationship._id)
        assert.equal(newRelationship.data.status, statusProp)

        done()
      })
    })

    it('returns the link in the other direction', (done) => {
      adapter.getLinks(connectionName, null, nodeProps2, null, nodeProps1, relationshipType, relProps, (err, results) => {
        if (err) { done(err) }

        const newRelationship = results[0]
        assert.equal(newRelationship._id, relationship._id)
        assert.equal(newRelationship.data.status, statusProp)

        done()
      })
    })

    it('returns empty array for non-existent link', (done) => {
      const noNodeProps = { name: 'notNode' }

      adapter.getLinks(connectionName, null, nodeProps1, null, noNodeProps, relationshipType, relProps, (err, results) => {
        if (err) { done(err) }

        assert.equal(results.length, 0)
        done()
      })
    })

    it('works without the relationship params', (done) => {
      adapter.getLinks(connectionName, null, nodeProps1, null, nodeProps2, relationshipType, {}, (err, results) => {
        if (err) { done(err) }

        const newRelationship = results[0]
        assert.equal(newRelationship._id, relationship._id)
        assert.equal(newRelationship.data.status, statusProp)

        done()
      })
    })
  })

  describe('getOutLinks', () => {
    it('returns the link when given node1', (done) => {
      adapter.getOutLinks(connectionName, null, nodeProps1, null, nodeProps2, relationshipType, relProps, (err, results) => {
        if (err) { done(err) }

        const newRelationship = results[0]
        assert.equal(newRelationship._id, relationship._id)
        assert.equal(newRelationship.data.status, statusProp)

        done()
      })
    })

    it('returns nothing when given node2', (done) => {
      adapter.getOutLinks(connectionName, null, nodeProps2, null, nodeProps1, relationshipType, relProps, (err, results) => {
        if (err) { done(err) }

        assert.equal(results.length, 0)
        done()
      })
    })
  })

  describe('getInLinks', () => {
    it('returns the link when given node2', (done) => {
      adapter.getInLinks(connectionName, null, nodeProps2, null, nodeProps1, relationshipType, relProps, (err, results) => {
        if (err) { done(err) }

        const newRelationship = results[0]
        assert.equal(newRelationship._id, relationship._id)
        assert.equal(newRelationship.data.status, statusProp)

        done()
      })
    })

    it('returns nothing when given node1', (done) => {
      adapter.getInLinks(connectionName, null, nodeProps1, null, nodeProps2, relationshipType, relProps, (err, results) => {
        if (err) { done(err) }

        assert.equal(results.length, 0)
        done()
      })
    })
  })
})
