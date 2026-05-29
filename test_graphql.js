import { queryGraphQL } from './src/services/graphqlClient.js';
import dotenv from 'dotenv';
dotenv.config();

const q = `
  query {
    bienes(filter: { search: "MXL3453C1K" }) {
      edges {
        node {
          id_bien
          num_serie
          cuentasPC {
            id_cuenta
            cuenta_windows
          }
        }
      }
    }
  }
`;

async function run() {
  const data = await queryGraphQL(q);
  console.log(JSON.stringify(data, null, 2));
}

run();
