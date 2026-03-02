const { Client } = require('pg');

const client = new Client({
    connectionString: 'postgres://postgres:postgres@127.0.0.1:54321/postgres' // docker port
});

async function run() {
    await client.connect();
    const res = await client.query(`
    SELECT u.email, r.name, r.id as role_id
    FROM saas_users u 
    LEFT JOIN saas_user_roles ur ON u.id = ur.user_id 
    LEFT JOIN saas_roles r ON r.id = ur.role_id;
  `);

    console.log("Usuarios y Roles exactos encontrados en la DB:");
    console.dir(res.rows, { depth: null });
    await client.end();
}
run();
