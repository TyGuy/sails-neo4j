const acceptedTypes = ['node', 'rel']

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
      data.forEach((matchData) => {
        this._addMatch(matchData)
      })
    } else {
      this._addMatch(data)
    }

    // This is so you can chain
    return this
  }

  _addMatch(data) {
    if (!data.type || !(acceptedTypes.includes(data.type))) {
      const err = new Error('QueryBuilder: match() data must include "type" key (one of ["node", "rel"])')
      err.code = 'E_MISSING_KEY_TYPE'
      throw err
    }

    if (!data.labels) { data.labels = []}
    if (!data.ref) { data.ref = this._getNodeRef() }

    if (this.refs.includes(data.ref)) {
      const err = new Error(`QueryBuilder: match() data "ref" (${data.ref}) has already been used`)
      err.code = 'E_DUPLICATE_KEY_REF'
      throw err
    }

    this.refs.push(data.ref)
    this.matches.push(data)
  }

  where(wheres) {
    for (const nodeRef in wheres) {
      if (!this.wheres[nodeRef]) { this.wheres[nodeRef] = {} }

      for (const propKey in wheres[nodeRef]) {
        // this is sorta strange but it's because we need to create a reference
        // to each prop name, and store the value of that reference in params
        const paramName = `${nodeRef}_${propKey}`
        const rawParamValue = wheres[nodeRef][propKey]

        const valAndCompare = this._valueAndComparatorForWhere(rawParamValue)
        let value = valAndCompare.value
        // make integer for neo4j ids -- not super ideal but for now whatevs
        if (propKey === '_id') { value = parseInt(value) }

        this.wheres[nodeRef][propKey] = { param_name: paramName, compare: valAndCompare.compare }
        this.params[paramName] = value
      }
    }

    return this
  }

  _valueAndComparatorForWhere(value) {
    const defaultCompare = '='
    if (typeof value !== 'object') {
      return { compare: defaultCompare, value: value }
    }

    const validCompares = ['<', '<=', '>', '>=', '=', '<>']
    const compareKey = Object.keys(value)[0]

    if (!validCompares.includes(compareKey)) {
      return { compare: defaultCompare, value: value }
    }

    return { compare: compareKey, value: value[compareKey] }
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
    let found = false
    const baseRef = 'n'
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

    this.rets.forEach((ret) => {
      if (!this.refs.includes(ret)) {
        const err = new Error(`QueryBuilder: return value '${ret}' not found in refs`)
        err.code = 'E_RETURN_NOT_REF'
        throw err
      }
    })

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
      if (matchObj.type === 'node') {
        const matchData = [matchObj.ref].concat(matchObj.labels).join(':')
        return `MATCH (${matchData})`
      } else {
        throw new Error("FUCK") // TODO: implement for matching a rel
      }
    })

    return matchClauses.join(",\n")
  }

  // TODO: this doesn't handle "ORs", only "ANDs" right now
  _buildWheres() {
    const nodeWheres = Object.keys(this.wheres).map((nodeRef) => {

      const props = Object.keys(this.wheres[nodeRef]).map((paramKey) => {
        const paramName = this.wheres[nodeRef][paramKey].param_name
        const compare = this.wheres[nodeRef][paramKey].compare

        if (paramKey === '_id') {
          return `id(${nodeRef}) ${compare} {${paramName}}`
        }

        return `${nodeRef}.${paramKey} ${compare} {${paramName}}`
      })

      return props.join(' AND ')
    })

    return 'WHERE ' + nodeWheres.join('\nAND ')
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
