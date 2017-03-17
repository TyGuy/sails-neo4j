/*---------------------------------------------------------------
  :: sails-neo4j
  -> adapter
---------------------------------------------------------------*/

const async = require('async')
const _ = require('lodash')
const neo = require('./connection')
const QueryBuilder = require('./helpers/query_builder')
const security = require('./helpers/security')
const utils = require('./helpers/utils')


var adapter = module.exports = (function() {

  // Set to true if this adapter supports (or requires) things like data types, validations, keys, etc.
  // If true, the schema for models using this adapter will be automatically synced when the server starts.
  // Not terribly relevant if not using a non-SQL / non-schema-ed data store
  var connections = {};
  var syncable = true,

  // Including a commitLog config enables transactions in this adapter
  // Please note that these are not ACID-compliant transactions:
  // They guarantee *ISOLATION*, and use a configurable persistent store, so they are *DURABLE* in the face of server crashes.
  // However there is no scheduled task that rebuild state from a mid-step commit log at server start, so they're not CONSISTENT yet.
  // and there is still lots of work to do as far as making them ATOMIC (they're not undoable right now)
  //
  // However, for the immediate future, they do a great job of preventing race conditions, and are
  // better than a naive solution.  They add the most value in findOrCreate() and createEach().
  //
  // commitLog: {
  //  identity: '__default_mongo_transaction',
  //  adapter: 'sails-mongo'
  // },

  // Default configuration for collections
  // (same effect as if these properties were included at the top level of the model definitions)
    defaults = {
      // change these to fit your setup
      protocol: 'http://',
      username: 'neo4j',
      password: 'neo4j',
      port: 7474,
      host: 'localhost',
      base: '/db/data/',
      debug: false

      // If setting syncable, you should consider the migrate option,
      // which allows you to set how the sync will be performed.
      // It can be overridden globally in an app (config/adapters.js) and on a per-model basis.
      //
      // drop   => Drop schema and data, then recreate it
      // alter  => Drop/add columns as necessary, but try
      // safe   => Don't change anything (good for production DBs)
      // migrate: 'alter'
    };

  //Init
  //Merge the default connection with the connection from sails app (config/connections.js).
  function createConnection(connection) {
      connection = connection || {};
      connectionSettings = {};
      _.merge(connectionSettings, defaults, connection);
      neo.connect(connectionSettings);
      return neo;
  }

  //Stored the neo4j connection on connections array and then it can be retrieved by identity name ("neo4j")
  function registerConnection(connection, collection, cb) {
      if(!connection.identity) return cb(new Error('Connection is missing an identity.'));
      if(connections[connection.identity]) return cb(new Error('Connection is already registered.'));
      connections[connection.identity] =  createConnection(connection);
      cb();
  }

  // imported from utils
  function parseOne(values) { return utils.parseOne(values) }

  function parseMany(values) { return utils.parseMany(values) }

  function andJoin(object, properties, andKeyword, namespace) {
    return utils.andJoin(object, properties, andKeyword, namespace)
  }

  function toWhere(object, params, namespace) {
    return utils.toWhere(object, params, namespace)
  }

  // move id up a level, change "properties" to "data", and decode JSON strings
  function reformNode(rawNode) {
    const copy = Object.assign({}, rawNode)

    if (copy.properties.id) {
      copy.id = copy.properties.id
    }

    const decodedProps = utils.decodeProps(copy.properties)
    delete copy.properties

    return Object.assign({}, copy, { data: decodedProps })
  }

  function queryRaw(connection, collection, q, params, cb) {
    const encodedParams = utils.encodeProps(params)

    // TODO: this is a hack for inconsistent query types; eventually remove
    if (Array.isArray(q)) { q = q.join('\n') }

    connections[connection].graph(function(gr) {
      gr.cypher({ query: q, params: encodedParams }, (err, results) => {
        if (connectionSettings.debug) console.log(q, results);
        if (err) { return cb(err, null) }

        var reformedResults = []

        for(var i = 0; i < results.length; i++) {
          reformedResults[i] = {}

          Object.keys(results[i]).forEach((resultKey) => {
            // TODO: will this work if it's not a node?
            reformedResults[i][resultKey] = reformNode(results[i][resultKey])
          })
        }

        cb(null, reformedResults)
      })
    })
  }

  function query(connection, collection, q, params, cb, unique) {
    const extractN = (err, results) => {
      if (err) { return cb(err) }

      const newResults = results.map((result) => {
        return result.n
      })

      cb(null, newResults)
    }

    return queryRaw(connection, collection, q, params, extractN)
  }

  function getConnection(config) {
    if (!config) { config = {} }

    return neo.connect(Object.assign({}, defaults, config));
  }

  function getRelatedNodesWithDirection(connection, collection, predecessorParams,
    successorCollectionName, successorParams, relationshipType, relationshipParams, directed, cb) {

    // hack to make sorting work
    if (!successorParams) { successorParams = {} }
    let originalSuccParams = Object.assign({}, successorParams)
    delete successorParams.sort

    let connector = (!!directed) ? '->' : '-'
    let flipNodes = (directed && directed.toLowerCase() === 'in') ? true : false

    let predNodeName = 'a'
    let succNodeName = 'n'

    var q, predecessorNamespace = 'pred', successorNamespace = 'succ';

    const relNamespace = 'rel'
    const relParamString = utils.toParams(relationshipParams, relNamespace)

    // not that clear but works...
    if (flipNodes) {
      q = [`MATCH (${succNodeName})-[r:` + relationshipType + relParamString + ']' + connector + `(${predNodeName})`]
    } else {
      q = [`MATCH (${predNodeName})-[r:` + relationshipType + relParamString + ']' + connector + `(${succNodeName})`]
    }

    predecessorClause = utils.nodeCriteriaClause(collection, predecessorParams, predecessorNamespace, predNodeName)
    q.push('WHERE ' + predecessorClause)

    successorClause = utils.nodeCriteriaClause(successorCollectionName, successorParams, successorNamespace, succNodeName)
    if (successorClause.length > 0) {
      q.push('AND ' + successorClause)
    }

    q.push('RETURN n')

    q = utils.addOrderClause(q, originalSuccParams, succNodeName)

    params = {}
    params = utils.populateParams(params, predecessorParams, predecessorNamespace)
    params = utils.populateParams(params, successorParams, successorNamespace)
    params = utils.populateParams(params, relationshipParams, relNamespace)

    query(connection, collection, q, params, cb, true);
  }

  function getRelatedLinksWithDirection(connection, collection, predecessorParams,
    successorCollectionName, successorParams, relationshipType, relationshipParams, directed, cb) {

    let connector = (!!directed) ? '->' : '-'
    let flipNodes = (directed && directed.toLowerCase() === 'in') ? true : false

    let predNodeName = 'a'
    let succNodeName = 'b'

    var q, predecessorNamespace = 'pred', successorNamespace = 'succ';

    const relNamespace = 'rel'
    const relParamString = utils.toParams(relationshipParams, relNamespace)

    // not that clear but works...
    if (flipNodes) {
      q = [`MATCH (${succNodeName})-[n:` + relationshipType + relParamString + ']' + connector + `(${predNodeName})`]
    } else {
      q = [`MATCH (${predNodeName})-[n:` + relationshipType + relParamString + ']' + connector + `(${succNodeName})`]
    }

    predecessorClause = utils.nodeCriteriaClause(collection, predecessorParams, predecessorNamespace, predNodeName)
    q.push('WHERE ' + predecessorClause)

    successorClause = utils.nodeCriteriaClause(successorCollectionName, successorParams, successorNamespace, succNodeName)
    if (successorClause.length > 0) {
      q.push('AND ' + successorClause)
    }

    q.push('RETURN n')

    params = {}
    params = utils.populateParams(params, predecessorParams, predecessorNamespace)
    params = utils.populateParams(params, relationshipParams, relNamespace)
    params = utils.populateParams(params, successorParams, successorNamespace)

    query(connection, collection, q, params, cb, true);
  }
  //return value of adapter function constructor

  return {
    syncable: syncable,
    defaults: defaults,
    getConnection: getConnection,
    sanitized: security.sanitized,
    queryRaw: queryRaw,
    query: query,
    registerConnection: registerConnection,
    createConnection: createConnection,

    // TODO: could we do some better default initialization?
    buildQuery: function(connection, collection) {
      return new QueryBuilder()
    },

    toNode: function(connection, collection, options) {
      if (!options) { options = {} }

      const defaultOpts = { type: 'node', ref: collection, labels: [collection] }
      return Object.assign({}, defaultOpts, options)
    },

    create: function(connection, collection, params, cb) {

      var q, delimiter = '';

      if (collection === null) { collection = ''; } // do we have a label?

      if (params !== null && collection !== null) { delimiter = ' AND '; } // do we have a label and params?

      const nodeString = utils.nodeString('n', collection, params)

      q = [
        `CREATE ${nodeString}`,
        'RETURN n'
      ];
      query(connection, collection, q, params, cb, true);
    },

    createMany: function(connection, collection, params, cb) {

      var q, delimiter = '';

      if (collection === null) { collection = ''; } // do we have a label?
      else { collection = ':' + collection; }

      if (params && collection) { delimiter = ' AND '; } // do we have a label and params?

      // NOTE: this will only work for a hash of 1 key in it.
      // Should probably change this to just take array of props,
      q = [
        'UNWIND {' + parseMany(params) + '} AS properties',
        'CREATE (n) SET n = properties',
        'RETURN n'
      ];

      query(connection, collection, q, params, cb, false);
    },

    // TODO: should have an intermediate step, maybe within queryBuilder,
    // maybe utils, maybe here, where it takes the params and actually
    // builds the query a little better
    find: function(connection, collection, params, cb) {
      const labels = (collection) ? [collection] : []
      const match = { type: 'node', ref: 'n', labels: labels }
      const returns = ['n']

      const queryBuilder = new QueryBuilder()
      queryBuilder.match(match)

      if (params.where && Object.keys(params.where).length > 0) {
        const where = params.where
        queryBuilder.where(where)
      }

      queryBuilder.returns(returns)

      // could rethink orders, and/or how to pass "n" from here.
      // maybe the whole thing goes into queryBuilder
      const orders = params.sort || params.order

      if (orders) {
        formattedOrders = utils.formatOrders(orders)
        queryBuilder.order(formattedOrders)
      }

      if (params.limit) { queryBuilder.limit(params.limit) }

      const builtQuery = queryBuilder.toQuery()

      query(connection, collection, builtQuery.query, builtQuery.params, cb, false);
    },

    update: function(connection, collection, params, values, cb) {

      var q, delimiter = '';

      if (collection === null) { collection = ''; } // do we have a label?
      else { collection = 'n:' + collection; }

      if (params.where && collection) { delimiter = ' AND '; } // do we have a label and params?

      const oldNamespace = 'old'
      const newNamespace = 'new'

      q = [
        'MATCH (n)',
        'WHERE ' + collection + delimiter + toWhere('n', params, oldNamespace),
        'SET ' + andJoin('n', _.omit(values, ['id', '_id']), ',', newNamespace),
        'RETURN n'
      ];

      let queryParams = {}
      queryParams = utils.populateParams(queryParams, params.where, oldNamespace)
      queryParams = utils.populateParams(queryParams, values, newNamespace)

      query(connection, collection, q, queryParams, cb, true);
    },

    destroy: function(connection, collection, params, cb) {
      var q, delimiter = '';

      if (collection === null) { collection = ''; } // do we have a label?
      else { collection = 'n:' + collection; }

      if (params.where && collection) { delimiter = ' AND '; } // do we have a label and params?
      q = [
        'MATCH (n)',
        'WHERE ' + collection + delimiter + toWhere('n', params),
        'DELETE n'
      ];
      query(connection, collection, q, params.where, cb, true);
    },

    detachDestroy: function(connection, collection, params, cb) {
      var q, delimiter = '';

      if (collection === null) { collection = ''; } // do we have a label?
      else { collection = 'n:' + collection; }

      if (params.where && collection) { delimiter = ' AND '; } // do we have a label and params?
      q = [
        'MATCH (n)',
        'WHERE ' + collection + delimiter + toWhere('n', params),
        'DETACH DELETE n'
      ];
      query(connection, collection, q, params.where, cb, true);
    },


    // REQUIRED method if users expect to call Model.stream()
    stream: function(connection, collection, options, stream) {
      // options is a standard criteria/options object (like in find)

      // stream.write() and stream.end() should be called.
      // for an example, check out:
      // https://github.com/balderdashy/sails-dirty/blob/master/DirtyAdapter.js#L247

    },

    // non-directional
    getRelatedNodes: function(connection, collection, predecessorParams, successorCollectionName, successorParams, relationshipType, relationshipParams, cb) {
      return getRelatedNodesWithDirection(
        connection, collection, predecessorParams,
        successorCollectionName, successorParams,
        relationshipType, relationshipParams,
        null, cb
      )
    },

    // directional: out
    getOutNodes: function(connection, collection, predecessorParams, successorCollectionName, successorParams, relationshipType, relationshipParams, cb) {
      return getRelatedNodesWithDirection(
        connection, collection, predecessorParams,
        successorCollectionName, successorParams,
        relationshipType, relationshipParams,
        'out', cb
      )
    },

    // directional: in
    getInNodes: function(connection, collection, predecessorParams, successorCollectionName, successorParams, relationshipType, relationshipParams, cb) {
      return getRelatedNodesWithDirection(
        connection, collection, predecessorParams,
        successorCollectionName, successorParams,
        relationshipType, relationshipParams,
        'in', cb
      )
    },

    link: function(connection, collection, predecessorParams, successorCollectionName, successorParams, relationshipType, relationshipParams, cb) {
      var q, predecessorDelimiter = '', successorDelimiter = '', predecessorNamespace = 'pred', successorNamespace = 'succ';

      if (collection === null) { collection = ''; } // do we have a label?
      else { collection = 'a:' + collection; }
      if (predecessorParams && collection) { predecessorDelimiter = ' AND '; }

      if (successorCollectionName === null) { successorCollectionName = ''; } // do we have a label?
      else { successorCollectionName = 'b:' + successorCollectionName; }
      if (successorParams && collection) { successorDelimiter = ' AND '; }

      const relNamespace = 'rel'
      const relParamString = utils.toParams(relationshipParams, relNamespace)

      q = [
        'MATCH (a),(b)',
        'WHERE ' + collection + predecessorDelimiter + toWhere('a', {where: predecessorParams}, predecessorNamespace)
        +' AND ' + successorCollectionName + successorDelimiter + toWhere('b', {where: successorParams}, successorNamespace),
        'MERGE (a)-[n:' + relationshipType + relParamString + ']->(b)',
        'ON MATCH SET n.lastSeen = timestamp()',
        'RETURN n'
      ];

      params = {};
      params = utils.populateParams(params, predecessorParams, predecessorNamespace)
      params = utils.populateParams(params, relationshipParams, relNamespace)
      params = utils.populateParams(params, successorParams, successorNamespace)


      query(connection, collection, q, params, cb, true);
    },

    // this is non-directed
    getLinks: function(connection, collection, predecessorParams, successorCollectionName, successorParams, relationshipType, relationshipParams, cb) {
      return getRelatedLinksWithDirection(
        connection, collection, predecessorParams, successorCollectionName,
        successorParams, relationshipType, relationshipParams, null, cb
      )
    },

    getOutLinks: function(connection, collection, predecessorParams, successorCollectionName, successorParams, relationshipType, relationshipParams, cb) {
      return getRelatedLinksWithDirection(
        connection, collection, predecessorParams, successorCollectionName,
        successorParams, relationshipType, relationshipParams, 'out', cb
      )
    },

    getInLinks: function(connection, collection, predecessorParams, successorCollectionName, successorParams, relationshipType, relationshipParams, cb) {
      return getRelatedLinksWithDirection(
        connection, collection, predecessorParams, successorCollectionName,
        successorParams, relationshipType, relationshipParams, 'in', cb
      )
    },

    unlink: function(connection, collection, predecessorParams, successorCollectionName, successorParams, relationshipType, relationshipParams, cb) {
      var q, predecessorDelimiter = '', successorDelimiter = '', predecessorNamespace = 'pred', successorNamespace = 'succ';

      if (collection === null) { collection = ''; } // do we have a label?
      else { collection = 'a:' + collection; }
      if (predecessorParams && collection) { predecessorDelimiter = ' AND '; }

      if (successorCollectionName === null) { successorCollectionName = ''; } // do we have a label?
      else { successorCollectionName = 'n:' + successorCollectionName; }
      if (successorParams && collection) { successorDelimiter = ' AND '; }

      relationshipParams = _.isEmpty(relationshipParams) ? '' : ' ' + JSON.stringify(relationshipParams);

      q = [
        'MATCH (a)-[r:' + relationshipType + relationshipParams + ']-(n)',
        'WHERE ' + collection + predecessorDelimiter + toWhere('a', {where: predecessorParams}, predecessorNamespace),
        'AND ' + successorCollectionName + successorDelimiter + toWhere('n', {where: successorParams}, successorNamespace),
        'DELETE r',
        'RETURN n'
      ];

      params = {};
      _.each(predecessorParams, function(value, key) {
        key = predecessorNamespace + '_' + key;
        params[key] = value;
      });
      _.each(successorParams, function(value, key) {
        key = successorNamespace + '_' + key;
        params[key] = value;
      });

      query(connection, collection, q, params, cb, true);
    },

    // for now, assume directed out from node...
    updateLink: function(connection, collection, fromParams, toCollection, toParams, relData, cb) {
      const relType = relData.type
      const relMatchParams = relData.matchParams
      const relUpdateParams = relData.updateParams

      if (!relType) {
        return cb(new Error('in updateLink: argument "relData" must have "type" key.'))
      }
      if (!relUpdateParams) {
        return cb(new Error('in updateLink: argument "relData" must have "updateParams" key.'))
      }

      const fromName = 'a', relName = 'n', toName = 'b'
      const fromNamespace = 'from', toNamespace = 'to'
      let q

      const relMatchNamespace = 'old_rel'
      const relUpdateNamespace = 'new_rel'
      const relMatchParamString = utils.toParams(relMatchParams, relMatchNamespace)

      q = [`MATCH (${fromName})-[${relName}:${relType + relMatchParamString}]->(${toName})`]

      fromClause = utils.nodeCriteriaClause(collection, fromParams, fromNamespace, fromName)
      q.push('WHERE ' + fromClause)

      toClause = utils.nodeCriteriaClause(toCollection, toParams, toNamespace, toName)
      if (toClause.length > 0) {
        q.push('AND ' + toClause)
      }

      q.push('SET ' + andJoin(relName, _.omit(relUpdateParams, ['id', '_id']), ',', relUpdateNamespace))

      // no matter what, we are returning n....
      q.push(`RETURN ${relName}`)

      params = {}
      params = utils.populateParams(params, fromParams, fromNamespace)
      params = utils.populateParams(params, toParams, toNamespace)
      params = utils.populateParams(params, relMatchParams, relMatchNamespace)
      params = utils.populateParams(params, relUpdateParams, relUpdateNamespace)

      query(connection, collection, q, params, cb, true);
    }

    /*
    **********************************************
    * Optional overrides
    **********************************************

    // Optional override of built-in batch create logic for increased efficiency
    // otherwise, uses create()
    createEach: function (collectionName, cb) { cb(); },

    // Optional override of built-in findOrCreate logic for increased efficiency
    // otherwise, uses find() and create()
    findOrCreate: function (collectionName, cb) { cb(); },

    // Optional override of built-in batch findOrCreate logic for increased efficiency
    // otherwise, uses findOrCreate()
    findOrCreateEach: function (collectionName, cb) { cb(); }
    */


    /*
    **********************************************
    * Custom methods
    **********************************************

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    //
    // > NOTE:  There are a few gotchas here you should be aware of.
    //
    //    + The collectionName argument is always prepended as the first argument.
    //      This is so you can know which model is requesting the adapter.
    //
    //    + All adapter functions are asynchronous, even the completely custom ones,
    //      and they must always include a callback as the final argument.
    //      The first argument of callbacks is always an error object.
    //      For some core methods, Sails.js will add support for .done()/promise usage.
    //
    //    +
    //
    ////////////////////////////////////////////////////////////////////////////////////////////////////


    // Any other methods you include will be available on your models
    foo: function (collectionName, cb) {
      cb(null,"ok");
    },
    bar: function (collectionName, baz, watson, cb) {
      cb("Failure!");
    }


    // Example success usage:

    Model.foo(function (err, result) {
      if (err) console.error(err);
      else console.log(result);

      // outputs: ok
    })

    // Example error usage:

    Model.bar(235, {test: 'yes'}, function (err, result){
      if (err) console.error(err);
      else console.log(result);

      // outputs: Failure!
    })

    */
  };

})();
