require('dotenv').config();

var assert = require('assert'),
	adapter = require('../lib/adapter.js');

describe('Creating Nodes', function () {
	var nodeProps = { sails_neo4j_test: 1 };

 	before(function(done) {
    var connection = {
			identity: 'neo4j',
			username: process.env.NEO4J_USERNAME || 'neo4j',
			password: process.env.NEO4J_PASSWORD || 'neo4j'
		};

		adapter.registerConnection(connection,null,done);
  });

	after(function() {
		adapter.destroy("neo4j", null, nodeProps, function(err, results) {
			if (err) { throw err; }
		});
	});

	it('should create one node with a property sails_neoj_test = 1', function (done) {
		adapter.create("neo4j", null, nodeProps, function(err, results) {
			if (err) { throw err; }

			assert.equal(results.length, 1);

			var props = results[0].n.data;
			assert.deepEqual(props, nodeProps);

			done();
		});
	});

	it('should create multiple nodes with the property sails_neoj_test = 1', function(done) {
		adapter.createMany("neo4j", null, {props:[nodeProps,nodeProps]}, function(err, results) {
			if (err) { throw err; }

			assert.equal(results.length, 2);

			var props = results[0].n.data;
			assert.deepEqual(props, nodeProps);

			done();
		});
	});
});
