const assert = require('assert')
const QueryBuilder = require('../../lib/helpers/query_builder')

describe('QueryBuilder with <, <=, >, >=', function () {
 it('works', () => {
   const queryBuilder = new QueryBuilder()
   const wheres = { age: { '>=': 10 } }
   const result = queryBuilder.match({ type: 'node' }).where({ n: wheres }).toQuery()

   assert(result.query.match((/WHERE n.age >= \{n_age\}/i)))
   assert.equal(result.params.n_age, 10)
 })
})
