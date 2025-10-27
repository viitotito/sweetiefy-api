import { Client } from 'pg';
import fs from 'fs/promises';
import path from 'path';

// Estas duas funções do módulo 'url' são necessárias para obter o caminho do diretório
// do script atual no modo ES Modules (o modo de 'import'/'export').
import { fileURLToPath } from 'url';

// A biblioteca 'dotenv' carrega variáveis de ambiente de um arquivo chamado '.env'
// para o objeto 'process.env' do Node.js. É ótimo para gerenciar senhas e configurações.
import dotenv from 'dotenv';

dotenv.config();

const {
    DB_HOST,
    DB_PORT,
    DB_USER,
    DB_PASSWORD,
    DB_DATABASE,
    PG_DATABASE_ADMIN = 'postgres',
    DB_DATABASE_ADMIN_PASSWORD,
    DB_DATABASE_FILE_PATH,
} = process.env;

// --- Resolução do Caminho do Arquivo .sql ---

// Esta é a maneira padrão e moderna de obter o caminho do diretório do arquivo em execução.
// Explicado em detalhe no início da resposta.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Esta constante guardará o caminho absoluto e final para o nosso arquivo 'banco.sql'.
// Usamos um operador ternário (if/else de uma linha) para decidir qual caminho usar.
const sqlFilePath = dbSchemaFilePath
    // CONDIÇÃO VERDADEIRA: Se 'dbSchemaFilePath' foi definido no .env...
    ? path.resolve(process.cwd(), dbSchemaFilePath)
    // CONDIÇÃO FALSA: Se não, usamos um caminho padrão relativo ao local deste script.
    : path.resolve(__dirname, '../database', 'banco.sql');


// --- 2. LÓGICA PRINCIPAL ---

// Criamos uma função 'async' para podermos usar 'await'. Isso torna o código
// que lida com operações demoradas (como I/O de rede ou disco) muito mais legível.
async function main() {
    // Criamos um objeto de configuração base para evitar repetição (Princípio DRY).
    // Todas as nossas conexões usarão essas mesmas configurações básicas.
    const baseConfig = {
        host: dbHost,
        port: Number(dbPort), // A porta vem como string, convertemos para número.
        user: dbUser,
    };

    // Declaramos as variáveis dos clientes aqui fora do bloco 'try' para que
    // elas sejam acessíveis no bloco 'finally' e possamos garantir que sejam fechadas.
    let adminClient, appClient;

    // O bloco 'try...catch...finally' é para tratamento de erros.
    // O código dentro do 'try' é executado. Se um erro ocorrer, o 'catch' é acionado.
    // O 'finally' é executado SEMPRE ao final, com ou sem erro.
    try {
        // --- ETAPA 1: Conectar como admin para apagar e recriar o banco ---

        // Criamos uma nova instância do cliente para a conexão administrativa.
        // Usamos o 'spread operator' (...) para copiar as propriedades de 'baseConfig'
        // e depois adicionamos ou sobrescrevemos as que são específicas para esta conexão.
        adminClient = new Client({
            ...baseConfig,
            database: dbAdminName,
            // Lógica inteligente: usa a senha de admin se ela existir, senão, usa a senha padrão.
            password: dbAdminPassword || dbPassword,
        });
        // 'await' pausa a execução da função até que a conexão seja estabelecida.
        await adminClient.connect();
        console.log(`- Conectado como admin ao banco "${DB_ADMIN_DATABASE}".`);
        console.log(`- Derrubando conexões existentes com "${DB_DATABASE}"...`);
        await adminClient.query(
            `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()`,
            [DB_DATABASE]
        );
        console.log(`- Recriando o banco de dados "${DB_DATABASE}"...`);
        const dropQuery = `DROP DATABASE IF EXISTS ${DB_DATABASE}`;
        const createQuery = `CREATE DATABASE ${DB_DATABASE}`;
        await adminClient.query(dropQuery);
        await adminClient.query(createQuery);
        console.log(`- Banco de dados recriado com sucesso.`);
    } finally {
        await adminClient.end();
        console.log('- Conexão de admin encerrada.');
    }
}

async function applySchema() {
    let sql;
    try {
        console.log(`- Lendo SQL do arquivo: ${sqlFilePath}`);
        sql = await fs.readFile(sqlFilePath, 'utf8');
    } catch (error) {
        console.error(`❌ Erro fatal: Não foi possível ler o arquivo de schema em ${sqlFilePath}.`);
        throw error;
    }
    const appClient = new Client(appConfig);
    try {
        await appClient.connect();
        console.log(`- Conectado ao banco "${DB_DATABASE}" para aplicar o schema.`);
        await appClient.query(sql);
        console.log('- Schema SQL aplicado com sucesso.');
    } finally {
        await appClient.end();
        console.log('- Conexão da aplicação encerrada.');
    }
}

console.log('--- Iniciando processo de reset do banco de dados ---');
try {
    await resetDatabase();
    await applySchema();
    console.log('✅ Processo de reset finalizado com sucesso!');
} catch (error) {
    console.error('❌ ERRO FATAL: Não foi possível resetar o banco de dados.');
    console.error(error);
    process.exit(1);
}

