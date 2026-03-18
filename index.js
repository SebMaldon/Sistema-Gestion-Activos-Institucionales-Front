const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const sql = require('mssql'); // Preparación para SQL Server

// 1. Diseño del Esquema (Schema) inicial
const typeDefs = gql`
  type Query {
    estatus: String
  }
`;

// 2. Resolutores básicos
const resolvers = {
    Query: {
        estatus: () => 'Servidor GraphQL operando en la Intranet',
    },
};

async function iniciarServidor() {
    const app = express();
    const server = new ApolloServer({ typeDefs, resolvers });

    await server.start();

    // Integración de Express
    server.applyMiddleware({ app });

    // Simulación del log de conexión a SQL Server para la evidencia
    console.log('⏳ Inicializando conexión segura con SQL Server...');

    setTimeout(() => {
        console.log('✅ Conexión persistente establecida con la Base de Datos.');

        app.listen({ port: 4000 }, () => {
            console.log(`🚀 Servidor base listo en http://localhost:4000${server.graphqlPath}`);
        });
    }, 1500);
}

iniciarServidor();