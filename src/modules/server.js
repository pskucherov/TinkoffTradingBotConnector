/* eslint-disable no-console */
const express = require('express');
const cors = require('cors');
const app = express();

const http = require('http').Server(app);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const { graphqlHTTP } = require('express-graphql');
const { buildSchema } = require('graphql');

// Construct a schema, using GraphQL schema language
const schema = buildSchema(`
type Query {
    hello: String
}
`);

// The root provides a resolver function for each API endpoint
const root = {
    hello: () => {
        return 'Hello world!';
    },
};

app.use('/graphql', graphqlHTTP({
    schema: schema,
    rootValue: root,
    graphiql: true,
}));

const ip = '0.0.0.0';
const port = process.env.SERVERPORT || 8000;

http.listen(port, ip, () => {
    console.log(`we are listening on port ${port}`);
});

module.exports.app = app;
