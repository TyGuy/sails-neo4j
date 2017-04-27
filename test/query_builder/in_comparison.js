const assert = require('assert')
const QueryBuilder = require('../../lib/helpers/query_builder')

describe('QueryBuilder with IN', function () {
 it('works', () => {
   const queryBuilder = new QueryBuilder()
   const wheres = { age: { 'IN': [10, 100] } }
   const result = queryBuilder.match({ type: 'node' }).where(wheres).toQuery()

   assert(result.query.match((/n.age IN \{n_age\}/i)))

   assert(result.params.n_age[0] === 10)
   assert(result.params.n_age[1] === 100)
 })
})
