const assert = require('assert')
const adapter = require('../../lib/adapter')
const TestHelper = require('../test_helper')
const QueryBuilder = require('../../lib/helpers/query_builder')

const connectionName = TestHelper.connectionName
const nodeProps = TestHelper.testNodeProps


describe('QueryBuilder', function () {

 	before(() => { return TestHelper.registerConnection() })
 	afterEach(() => { return TestHelper.cleanDB() })

  it('instantiates', (done) => {
    const queryBuilder = new QueryBuilder()
    assert(queryBuilder.matches.length === 0)
    assert(queryBuilder.wheres)
    assert(queryBuilder.returns)
    assert(queryBuilder.params)

    done()
  })

  describe('toQuery', () => {
    it('fails without matches', () => {
      const queryBuilder = new QueryBuilder()

      assert.throws(() => { queryBuilder.toQuery() }, /match clause/)
    })

    it('fails without returns if multiple matches', () => {
      const queryBuilder = new QueryBuilder()
      queryBuilder.match({ type: 'node' }).match({ type: 'node' })

      assert.throws(() => { queryBuilder.toQuery() }, /return clause/)
    })

    it('defaults to return first thing if no return given', () => {
      const queryBuilder = new QueryBuilder()
      const result = queryBuilder.match({ type: 'node' }).toQuery()

      assert(result.query.match(/MATCH \(n\)/))
      assert(result.query.match(/RETURN n/))
      assert.deepStrictEqual(result.params, {})
    })

    it('builds a correct query with match and return', () => {
      const queryBuilder = new QueryBuilder()
      const matches = [
        { type: 'node', ref: 'n' },
        { type: 'node', ref: 'm' },
      ]
      const result = queryBuilder
        .match(matches[0])
        .match(matches[1])
        .returns('n,m').toQuery()

      assert(result.query.match(/MATCH \(n\),/))
      assert(result.query.match(/MATCH \(m\)/))
      assert(result.query.match(/RETURN n,m/))

      assert(!result.query.match(/WHERE/))

      assert.deepStrictEqual(result.params, {})
    })

    it('builds a query using match and where', () => {
      const queryBuilder = new QueryBuilder()
      const matches = [
        { type: 'node', ref: 'n', labels: ['users']},
        { type: 'node', ref: 'm' },
      ]
      const wheres = {
        n: { name: 'kevin' },
        m: { name: 'bacon' }
      }
      const returns = ['n', 'm']

      const result = queryBuilder
        .match(matches[0])
        .match(matches[1])
        .where(wheres) // TODO: should we need to pass the node ref always?
        .returns(returns)
        .toQuery()

      assert(result.query.match(/MATCH \(n\:users\),/))
      assert(result.query.match(/MATCH \(m\)/))
      assert(result.query.match(/m.name = \{m_name\}/))
      assert(result.query.match(/n.name = \{n_name\}/))
      assert(result.query.match(/RETURN n,m/))

      assert.equal(result.params.n_name, 'kevin')
      assert.equal(result.params.m_name, 'bacon')
    })

    it('works with ordering', () => {
      const queryBuilder = new QueryBuilder()
      const matches = [
        { type: 'node', ref: 'n', labels: ['users']},
        { type: 'node', ref: 'm' },
      ]
      const orders = [
        { ref: 'n', prop: 'name', order: 'desc' },
        { ref: 'm', prop: 'name' }
      ]

      const result = queryBuilder.match(matches).returns('n,m').order(orders).toQuery()

      assert(result.query.match(/MATCH \(n\:users\),/))
      assert(result.query.match(/MATCH \(m\)/))
      assert(result.query.match(/RETURN n,m/))
      assert(result.query.match(/ORDER BY n\.name DESC, m\.name/))
    })

    it('works with ordering and limiting', () => {
      const queryBuilder = new QueryBuilder()
      const matches = [
        { type: 'node', ref: 'n', labels: ['users']},
        { type: 'node', ref: 'm' },
      ]
      const orders = [
        { ref: 'n', prop: 'name', order: 'desc' },
        { ref: 'm', prop: 'name' }
      ]
      const limit = 20

      const result = queryBuilder.match(matches).returns('n,m').order(orders).limit(limit).toQuery()

      assert(result.query.match(/MATCH \(n\:users\),/))
      assert(result.query.match(/MATCH \(m\)/))
      assert(result.query.match(/RETURN n,m/))
      assert(result.query.match(/ORDER BY n\.name DESC, m\.name/))
      assert(result.query.match(/LIMIT 20/))

    })
  })
})
