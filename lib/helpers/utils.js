const _ = require('lodash')

const parseOne = (values, namespace) => {
  var i, names = [], name;
  for (i in values) {
    if (values.hasOwnProperty(i)) {
      const completeName = !(namespace) ? i : [namespace, i].join('_')
      name = i + ': {' + completeName + '}';
      names.push(name);
    }
  }
  return names.join(', ');
}

const parseMany = (values) => {
  var i, names = [], name;
  for (i in values) {
    if (values.hasOwnProperty(i)) {
      if (Object.prototype.toString.call(values[i]) === '[object Array]') {
        name = i;
      }
      else {
        return false;
      }
      names.push(name);
    }
  }
  return names.join(',');
}

const andJoin = (object, properties, andKeyword, namespace) => {
  var query = [], q;
  for (var i in properties) {
    if (properties.hasOwnProperty(i)) {
      var equality = '=';
      if (properties[i].hasOwnProperty('=~'))
      {
        properties[i] = '(?i)' + properties[i]['='];
        equality = '=~';
      }
      var field = object + '.' + i;
      if (i==='id')
      {
        field = 'id('+object+')';
        properties[i] = parseInt(properties[i]);
      }
      completeName = (typeof namespace === 'undefined' || namespace === null) ? i : namespace + '_' + i;
      q = field + equality + '{' + completeName + '}';
      query.push(q);
    }
  }
  return query.join(andKeyword);
}

const toWhere = (object, params, namespace) => {
  properties = params.where;
  if (!properties)
    return '';
  var query = [], q;
  var count = 0;
  for (var i in properties) {
    count++;
  }
  if (count === 1 && properties.hasOwnProperty('or'))
  {
    var targetProperties = {};
    for (var i in properties['or'])
    {
      q = '(' + andJoin(object, properties['or'][i], ' AND ', namespace) + ')';
      query.push(q);
      _.extend(targetProperties,properties['or'][i]);
    }
    params.where = targetProperties;
  }
  else
    query.push('(' + andJoin(object, properties, ' AND ', namespace) + ')');

  return '(' + query.join(' OR ') + ')';
}

// example inputs:
// ['users', { name: 'hello', sails_neo4j_test: 1 }, 'succ', 'n']
// OR
// ['users', {}, '', 'n']
// OR
// [null, { id: '123'}, '', 'n']
//
// example output (matches first example input):
// "((n.name={succ_name} AND n.sails_neo4j_test={succ_sails_neo4j_test}))"
//
const nodeCriteriaClause = (collectionName, nodeCriteria, namespace, nodeName) => {
  if (!namespace) { namespace = '' }
  if (!nodeName) { nodeName = 'n' }

  if (collectionName === null) { collectionName = ''; } // do we have a label?
  else { collectionName = nodeName + ':' + collectionName; }

  const hasCollectionParams = nodeCriteria && Object.keys(nodeCriteria).length > 0
  let clauseParts = []

  if (collectionName) {
    clauseParts.push(collectionName)
  }
  if (hasCollectionParams) {
    clauseParts.push(toWhere(nodeName, { where: nodeCriteria }, namespace))
  }

  return clauseParts.join(' AND ')
}

// Note: this returns a copy and does not alter original
const populateParams = (paramsToPopulate, additionalParams, namespace) => {
  params = Object.assign({}, paramsToPopulate)
  _.each(additionalParams, function(value, key) {
    key = (!namespace) ? key : namespace + '_' + key
    params[key] = value
  })

  return params
}

const nodeString = (nodeName, collection, params) => {
  const nodeWithLabel = (!!collection) ? `${nodeName}:${collection}` : `${nodeName}`
  const paramString = toParams(params)

  return `(${nodeWithLabel}${paramString})`
}

// this is for matching node or rel properties:
// given:
//   params: { name: 'thing', age: 25 }
//   namespace: 'dude'
// output is:
//   " { name: {dude_name}, age: {dude_age} }"
const toParams = (params, namespace) => {
  return _.isEmpty(params) ? '' : ` { ${parseOne(params, namespace)} }`
}

const addOrderClause = (queryArray, params, nodeName) => {
  q = queryArray.slice()

  let sortCriteria

  if (params.sort) {
    sortCriteria = params.sort
  } else if (params.order) {
    sortCriteria = params.order
  }

  if (sortCriteria) {
    const orders = sortCriteria.map((sortItem) => {
      if (typeof sortItem === 'string' ) { return `${nodeName}.${sortItem}` }
      else {
        const key = Object.keys(sortItem)[0]
        return (sortItem[key].toLowerCase() === 'desc') ? `${nodeName}.${key} DESC` : `${nodeName}.${key}`
      }
    })

    const sortString = `ORDER BY ${orders.join(', ')}`
    q.push(sortString)
  }

  return q
}

module.exports = {
  parseOne: parseOne,
  parseMany: parseMany,
  andJoin: andJoin,
  toWhere: toWhere,
  nodeCriteriaClause: nodeCriteriaClause,
  populateParams: populateParams,
  nodeString: nodeString,
  toParams: toParams,
  addOrderClause: addOrderClause,
}
