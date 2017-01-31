# Sails-Neo4j


### Testing:
WARNING: Please note that this will actually create and delete nodes in your local neo4j DB.
However, They are tagged with the property { "sails_neo4j_test": 1 }, so if you tag any other nodes with that, (that is pretty weird but also) they will be deleted.

```sh
npm install
cp .env.sample .env
# IMPORTANT:
# Make sure NEO4J_USERNAME and NEO4J_PASSWORD env vars (in .env file) actually
# match your local neo4j DB credentials; these are needed for basic auth.
npm test
```

### Copied from README.md of original repo in 2015:

Sails-Neo4j Adapter; Will update the readme very soon.
For now if you have any questions:
[![Gitter chat](https://badges.gitter.im/natgeo/sails-neo4j.png)](https://gitter.im/natgeo/sails-neo4j)
