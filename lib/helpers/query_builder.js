const acceptedTypes = ['node', 'rel']
const acceptedDirections = ['in', 'out']

class QueryBuilder {
  constructor() {
    this.matches = []
    this.refs = []
    this.wheres = {}
    this.rets = [] // things to return
    this.params = {}

    this.orders = []
    // NOTE: sometimes name collision btwn props and functions
    this._limit = null
  }

  // TODO: put a "match" method on the adapter that automatically appends
  // "type" and "labels" (and maybe ref too)
  match(data) {
    if (Array.isArray(data)) {
      data.forEach((matchComponent, i) => {
        data[i] = this._validateAndAddRef(matchComponent)
      })
    } else {
      data = this._validateAndAddRef(data)
    }

    this.matches.push(data)

    // This is so you can chain
    return this
  }

  _validateAndAddRef(data) {
    if (!data.type || !(acceptedTypes.includes(data.type))) {
      const err = new Error('QueryBuilder: match() data must include "type" key (one of ["node", "rel"])')
      err.code = 'E_MISSING_KEY_TYPE'
      throw err
    }

    if (data.type === 'rel') {
      if (data.direction && !(acceptedDirections.includes(data.direction))) {
        const err = new Error('QueryBuilder: match() direction for rel must be one of ["in", "out"]')
        err.code = 'E_INVALID_KEY_DIRECTION'
        throw err
      }
    }

    if (!data.labels) { data.labels = []}

    if (data.type === 'node') {
      if (!data.ref) { data.ref = this._getNodeRef() }
    } else {
      if (!data.ref) { data.ref = this._getRelRef() }
    }

    if (this.refs.includes(data.ref)) {
      const err = new Error(`QueryBuilder: match() data "ref" (${data.ref}) has already been used`)
      err.code = 'E_DUPLICATE_KEY_REF'
      throw err
    }

    this.refs.push(data.ref)

    return data
  }

  where(wheres) {
    this.wheres = this._constructWhere(wheres)

    return this
  }

  // TODO: clean this logic up
  _constructWhere(whereClause) {
    const firstKey = Object.keys(whereClause)[0]

    let clauses

    if (firstKey.toLowerCase() === 'or') {
      clauses = whereClause.or.map((innerClause) => {
        return this._constructWhere(innerClause)
      })
      return { or: clauses }
    }

    if (firstKey.toLowerCase() === 'and') {
      clauses = whereClause.and.map((innerClause) => {
        return this._constructWhere(innerClause)
      })
    }

    // assume keys are refs
    else if (this.refs.includes(firstKey)) {
      clauses = Object.keys(whereClause).map((ref) => {
        const clausesForRef = this._criteriaToCompareClauses(whereClause[ref], ref)
        return this._joinWithAnd(clausesForRef)
      })

    } else {
      clauses = this._criteriaToCompareClauses(whereClause)
    }

    return this._joinWithAnd(clauses)
  }

  _joinWithAnd(clauses) {
    return { and: clauses }
  }

  _criteriaToCompareClauses(criteria, ref) {
    if (!ref) { ref = this.refs[0] }

    const compareClauses = Object.keys(criteria).map((prop) => {
      const rawValue = criteria[prop]
      const valueAndCompare = this._valueAndComparator(rawValue)
      const value = valueAndCompare.value
      const compare = valueAndCompare.compare

      const paramName = this._getParamName(ref, prop)
      // add value to this.params
      this.params[paramName] = value
      return { ref: ref, prop: prop, compare: compare, paramName: paramName }
    })

    return compareClauses
  }

  _getParamName(nodeRef, propKey) {
    const baseName = `${nodeRef}_${propKey}`
    const paramKeys = Object.keys(this.params)

    let conflicts = paramKeys.filter((d) => { return d.match(baseName) })
    if (conflicts.length === 0) { return baseName }

    return `${conflicts.sort().pop()}_1`
  }

  _valueAndComparator(value) {
    const defaultCompare = '='

    if (typeof value !== 'object') {
      return { compare: defaultCompare, value: value }
    }

    const validCompares = ['<', '<=', '>', '>=', '=', '<>', 'IN', 'EXISTS']
    const compareKey = Object.keys(value)[0]
    const upperCompareKey = compareKey.toUpperCase()

    if (!validCompares.includes(upperCompareKey)) {
      return { compare: defaultCompare, value: value }
    }

    return { compare: upperCompareKey, value: value[compareKey] }
  }

  // TODO: check to make sure that order: keys are one of:
  // asc or desc
  order(order) {
    if (Array.isArray(order)) {
      order.forEach((orderItem) => {
        this.orders.push(orderItem)
      })
    } else {
      this.orders.push(order)
    }

    return this
  }

  limit(limit) {
    const err = new Error('QueryBuilder: limit arg must be a number')
    err.code = 'E_INVALID_KEY_LIMIT'

    if (!limit) { throw err }

    limit = parseInt(limit)

    if (isNaN(limit)) { throw err }

    this._limit = limit

    return this
  }

  returns(rets) {
    if (typeof rets === 'string') {
      rets = rets.split(',')
    }

    if (!Array.isArray(rets)) {
      throw new Error('rets must be an array')
    }

    this.rets = rets

    return this
  }

  _getNodeRef() {
    return this._getRefWithBase('n')
  }

  _getRelRef() {
    return this._getRefWithBase('r')
  }

  _getRefWithBase(baseRef) {
    let found = false
    let ref = baseRef

    let counter = 1

    while(!found) {
      if (!this.refs.includes(ref)) {
        found = true
        break
      }

      ref = `${baseRef}${counter}`
      counter = counter + 1
    }
    return ref
  }

  toQuery() {
    if (this.matches.length === 0) {
      const err = new Error('QueryBuilder must have at least one match clause')
      err.code = 'E_MISSING_CLAUSE_MATCH'
      throw err
    }
    if (this.rets.length === 0) {
      if (this.refs.length !== 1) {
        const err = new Error('QueryBuilder must have a return clause if multiple matches involved')
        err.code = 'E_MISSING_CLAUSE_RETURN'
        throw err
      }

      // set to ref of first match if not already set
      this.rets.push(this.refs[0])
    }

    let queryArray = []

    queryArray.push(this._buildMatches())

    if (Object.keys(this.wheres).length > 0) {
      queryArray.push(this._buildWheres())
    }

    queryArray.push(this._buildReturn())

    if (this.orders.length > 0) {
      queryArray.push(this._buildOrderClause())
    }

    if (this._limit) {
      queryArray.push(this._buildLimitClause())
    }

    return { query: queryArray.join("\n"), params: this.params }
  }

  _buildMatches() {
    const matchClauses = this.matches.map((matchObj) => {
      return this._buildSingleMatchClause(matchObj)
    })

    return matchClauses.join(",\n")
  }

  _buildSingleMatchClause(matchObj) {
    let matchParts

    if (Array.isArray(matchObj)) {
      matchParts = matchObj.map((item) => {
        return this._buildSingleMatchObject(item)
      })
    } else {
      matchParts = [this._buildSingleMatchObject(matchObj)]
    }
    return `MATCH ${matchParts.join('')}`
  }

  _buildSingleMatchObject(matchItem) {
    const itemWithLabels = [matchItem.ref].concat(matchItem.labels).join(':')

    if (matchItem.type === 'node') {
      return `(${itemWithLabels})`
    }

    // else, rel:
    let relPieces = ['-', '-']

    if (matchItem.direction) {
      if (matchItem.direction === 'in') {
        relPieces[0] = '<-'
      } else {
        relPieces[1] = '->'
      }
    }

    return `${relPieces[0]}[${itemWithLabels}]${relPieces[1]}`
  }

  _buildWheres() {
    const parts = this._splitCompositeClause(this.wheres)
    const builtWhereClause = this._buildLogicalClause(parts.innerClauses, parts.joinWith)

    return `WHERE ${builtWhereClause}`
  }

  // This only works for a composite clause, with a key "and" or "or"
  _splitCompositeClause(clause) {
    let innerClauses, joinWith

    if (clause.or) {
      innerClauses = clause.or
      joinWith = 'OR'
    } else {
      innerClauses = clause.and
      joinWith = 'AND'
    }

    return { innerClauses, joinWith }
  }

  _buildLogicalClause(clauses, joinWith) {
    const firstClauseKey = Object.keys(clauses[0])[0]

    let clauseStrings

    if (firstClauseKey === 'or' || firstClauseKey === 'and') {
      clauseStrings = clauses.map((innerClause) => {
        const parts = this._splitCompositeClause(innerClause)
        return this._buildLogicalClause(parts.innerClauses, parts.joinWith)
      })

    // base case
    } else {
      clauseStrings = clauses.map((compareClause) => {
        return this._buildCompareClause(compareClause)
      })
    }

    return `(${clauseStrings.join(` ${joinWith} `)})`
  }

  _buildCompareClause(compareClause) {
    const ref = compareClause.ref
    const prop = compareClause.prop
    let compare = compareClause.compare
    const paramName = compareClause.paramName

    if (compare === 'EXISTS') {
      const value = this.params[paramName]
      if (!value) { compare = 'NOT EXISTS' }
      return `${compare}(${ref}.${prop})`
      // todo: need to delete value from params?
    }

    if (prop === '_id') {
      return `id(${ref}) ${compare} {${paramName}}`
    }

    return `${ref}.${prop} ${compare} {${paramName}}`
  }

  _buildReturn() {
    const returnVals = this.rets.join(',')
    return `RETURN ${returnVals}`
  }

  _buildOrderClause() {
    const clauses = this.orders.map((item) => {
      const name = `${item.ref}.${item.prop}`
      return (item.order) ? `${name} ${item.order.toUpperCase()}` : name
    })

    return 'ORDER BY ' + clauses.join(', ')
  }

  _buildLimitClause() {
    return `LIMIT ${this._limit}`
  }
}

module.exports = QueryBuilder
