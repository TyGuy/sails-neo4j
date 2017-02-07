require('dotenv').config();

const assert = require('assert')
const adapter = require('../lib/adapter')
const TestHelper = require('./test_helper')

let connectionName = TestHelper.connectionName

describe('Creating Nodes', function () {
	var nodeProps = { sails_neo4j_test: 1 };

 	before(() => { return TestHelper.registerConnection() })

	afterEach(function(done) {
		adapter.destroy(connectionName, null, { where: nodeProps }, function(err, results) {
			if (err) { throw err; }
			done();
		});
	});

	it('should create one node with a property sails_neoj_test = 1', function (done) {
		adapter.create(connectionName, null, nodeProps, function(err, results) {
			if (err) { throw err; }

			assert.equal(results.length, 1);

			var props = results[0];
			for (let prop in nodeProps) {
				assert.equal(props[prop], nodeProps[prop]);
			}

			done();
		});
	});

	it('should create multiple nodes with the property sails_neoj_test = 1', function(done) {
		adapter.createMany(connectionName, null, {props:[nodeProps,nodeProps]}, function(err, results) {
			if (err) { throw err; }

			assert.equal(results.length, 2);

			var props = results[0];
			for (let prop in nodeProps) {
				assert.equal(props[prop], nodeProps[prop]);
			}

			done();
		});
	});
});
