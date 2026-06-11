import { request, gql } from 'graphql-request';

const UPDATE_PROVEEDOR = gql`
  mutation UpdateProveedor($id_proveedor: ID!, $nombre_proveedor: String, $contactos: [ContactoInput!]) {
    updateProveedor(id_proveedor: $id_proveedor, nombre_proveedor: $nombre_proveedor, contactos: $contactos) {
      id_proveedor
      nombre_proveedor
      contactos {
        id_contacto
        contacto
        tipo_contacto
      }
    }
  }
`;

async function test() {
  const vars = {
      id_proveedor: "1",
      nombre_proveedor: "AAA",
      contactos: [
        { tipo_contacto: 'Teléfono', contacto: '42525242' },
        { tipo_contacto: 'Teléfono', contacto: '585959' },
        { tipo_contacto: 'Teléfono', contacto: '5959595' },
        { tipo_contacto: 'Teléfono', contacto: '36365356' }
      ]
  };

  const headers = {};

  console.log("Sending request...");
  try {
    const data = await request('http://localhost:4000/graphql', UPDATE_PROVEEDOR, vars, headers);
    console.log("SUCCESS:", JSON.stringify(data, null, 2));
  } catch (e) {
    console.error("ERROR:", e);
    if (e.response) {
      console.error("GraphQL Errors:", JSON.stringify(e.response.errors, null, 2));
    }
  }
}

test();
