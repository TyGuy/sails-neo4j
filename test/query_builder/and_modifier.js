const assert = require('assert')
const QueryBuilder = require('../../lib/helpers/query_builder')

describe('QueryBuilder with AND', function () {
 it('works', () => {
   const queryBuilder = new QueryBuilder()
   const wheres = {
     and: [
       { n: { age: { '>=': 10 } } },
       { age: { '<': 100 } }
     ]
   }
   const result = queryBuilder.match({ type: 'node' }).where(wheres).toQuery()

   assert(result.query.match((/n.age >= \{n_age\}/i)))
   assert(result.query.match((/n.age < \{n_age_1\}/i)))

   assert.equal(result.params.n_age, 10)
   assert.equal(result.params.n_age_1, 100)
 })
})
