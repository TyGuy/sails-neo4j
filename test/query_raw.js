const assert = require('assert')
const adapter = require('../lib/adapter')
const QueryBuilder = require('../lib/helpers/query_builder')
const TestHelper = require('./test_helper')

const connectionName = TestHelper.connectionName
const nodeProps = TestHelper.testNodeProps

// elves
const nodeProps1 = Object.assign({}, { name: 'Elrond' }, nodeProps)
// realm_sectors
const nodeProps2 = Object.assign({}, { name: 'Rivendell' }, nodeProps)
// universes
const nodeProps3 = Object.assign({}, { name: 'The One' }, nodeProps)

const rel1 = { type: 'rel', ref: 'r1', direction: 'out', labels: ['LIVES_IN'] }
const rel2 = { type: 'rel', ref: 'r2', direction: null, labels: ['PART_OF'] }

describe('Finding Nodes', function () {

 	before(() => { return TestHelper.registerConnection() })
 	afterEach(() => { return TestHelper.cleanDB() })

  let node1, node2, node3

  beforeEach((done) => {
		adapter.create(connectionName, 'elves', nodeProps1, function(err, results1) {
      if (err) { done(err) }

      node1 = results1[0]
  		adapter.create(connectionName, 'realm_sectors', nodeProps2, function(err, results2) {
        if (err) { done(err) }

        node2 = results2[0]

    		adapter.create(connectionName, 'universes', nodeProps3, function(err, results3) {
          if (err) { done(err) }

          node3 = results3[0]

          done()
        })
      })
    })
  })

  beforeEach((done) => {
    adapter.link(connectionName, 'elves', nodeProps1, 'realm_sectors', nodeProps2, 'LIVES_IN', {},
    (err, linkResults) => {
      if (err) { done(err) }
      if (linkResults.length === 0) { done('NO LINK CREATED 1') }


      adapter.link(connectionName, 'realm_sectors', nodeProps2, 'universes', nodeProps3, 'PART_OF', {},
      (err, linkResults) => {
        if (err) { done(err) }
        if (linkResults.length === 0) { done('NO LINK CREATED 2') }

        done()
      })
    })
  })

  it('returns the correct things', (done) => {
    // NOTE: order matters here
    const matches = [
      adapter.toNode(connectionName, 'elves', { ref: 'e' }),
      rel1,
      adapter.toNode(connectionName, 'realm_sectors', { ref: 'rs' }),
      rel2,
      adapter.toNode(connectionName, 'universes', { ref: 'u' })
    ]
    const wheres = {
      e: { name: 'Elrond' },
      u: { name: 'The One' }
    }

    const returns = ['rs', 'u']

    const queryBuilder = new QueryBuilder()
    const query = queryBuilder.match(matches).where(wheres).returns(returns).toQuery()

    adapter.queryRaw(connectionName, '', query.query, query.params, (err, results) => {
      if (err) { done(err) }

      assert(results.length === 1)
      const row = results[0]

      assert.equal(row.rs.data.name, node2.data.name)
      assert.equal(row.u.data.name, node3.data.name)

      done()
    })
  })
})
