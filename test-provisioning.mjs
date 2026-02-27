const apiUrl = 'http://127.0.0.1:3000/backoffice/tenants/provision';

async function createTenants() {
    console.log('🚀 Iniciando creación en masa de 10 Inquilinos (Tenants)...');

    for (let i = 1; i <= 10; i++) {
        const payload = {
            name: `Empresa Automática ${i}`,
            subdomain: `empresa${i}`
        };

        console.log(`\nSolicitando aprovisionamiento para: [${payload.subdomain}]...`);

        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                console.log(`✅ [EXITO] ${data.message}`);
                console.log(`   ID: ${data.data.id}`);
                console.log(`   Subdominio: ${data.data.subdomain}`);
            } else {
                console.error(`❌ [ERROR HTTP]`, data);
            }
        } catch (err) {
            console.error(`❌ [ERROR DE RED]`, err.message);
        }
    }

    console.log('\n🏁 Bucle de Aprovisionamiento Finalizado!');
}

createTenants();
