const neo4j = require('neo4j')

function buildPath(connection) {
  var auth = '' || connection.username;

  if (auth && connection.password) {
    auth += ':' + connection.password + '@';
  }

  return connection.protocol + auth + connection.host + ':' + connection.port + connection.base;
}

// NOTE: it is no longer necessary for the connection stuff
// to be asynchronous, except that the adapter itself depends on that.
// Could change this in the future.
module.exports = (function() {
  var graph = null

  function connect(connection) {
    return new Promise((resolve, reject) => {
      if (!graph) {

        var path = buildPath(connection)
        graph = new neo4j.GraphDatabase(path)
      }

      return resolve(graph)
    })
  }


  function graphDo(cb) {
    Promise.resolve(graph).then(cb);
  }

  // built in this pattern so this can be enhanced later on
  return {
    connect: connect,
    graph: graphDo
  };
})();
