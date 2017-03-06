const neo4j = require('neo4j-js')

function buildPath(connection) {
  var auth = '' || connection.username;

  if (auth && connection.password) {
    auth += ':' + connection.password + '@';
  }

  return connection.protocol + auth + connection.host + ':' + connection.port + connection.base;
}

module.exports = (function() {
  var graph = null

  function connect(connection) {
    return new Promise((resolve, reject) => {
      if (graph) {
        return resolve(graph)
      }

      var path = buildPath(connection)

      neo4j.connect(path, function(err, _graph) {
        if (err) {
          console.log('An error has occured when trying to connect to Neo4j:');
          reject(err)
          // is this also necessary??
          throw err
        }

        graph = _graph
        resolve(graph)
      })
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
