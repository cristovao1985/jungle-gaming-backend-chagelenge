# Jungle Gaming — Backend Challenge

API backend construída com **Bun, NestJS, MikroORM e PostgreSQL**.

## Requisitos

- Docker Desktop com Docker Compose (para executar a API em contêiner), ou Bun instalado localmente.
- PostgreSQL acessível com as configurações do ambiente.
- O projeto não cria um segundo PostgreSQL: o Compose usa o banco já existente no host.

## Configuração local

1. Instale as dependências:

   ```powershell
   bun install
   ```

2. Crie `.env.local` a partir de `.env.example` e ajuste os valores para seu ambiente. Não envie credenciais reais no ZIP público ou repositório.

3. Execute a aplicação em desenvolvimento:

   ```powershell
   bun run start:dev
   ```

   Ou execute a aplicação diretamente:

   ```powershell
   bun run start
   ```

## Testes e compilação

```powershell
bun test
bunx nest build
```

O comando de compilação depende da configuração Nest/TypeScript do projeto. Os testes devem ser executados antes da entrega.

## Executar com Docker Compose

O Compose sobe somente a API e se conecta ao PostgreSQL que já está rodando no host.

1. Crie `.env.docker` a partir de `.env.docker.example`.
2. Confirme que o PostgreSQL está ativo e acessível na porta configurada.
3. Construa e inicie a API:

   ```powershell
   docker compose up --build
   ```

4. Para parar:

   ```powershell
   docker compose down
   ```

A API será publicada na porta `3000` por padrão. Se a aplicação tiver um endpoint de saúde configurado, use-o para verificar a inicialização; caso contrário, consulte os endpoints implementados no código.

### Conexão com PostgreSQL do host

Dentro do contêiner, `localhost` aponta para o próprio contêiner. Por isso, `.env.docker.example` usa `host.docker.internal`, endereço fornecido pelo Docker Desktop para acessar o host Windows.

Se o PostgreSQL não aceitar conexões vindas do Docker, verifique as regras de escuta e firewall do PostgreSQL. Não exponha o banco à internet.

## Migrações

Os scripts de migração existentes usam `.env.local`. Para executar migrações, configure esse arquivo e use os comandos definidos no `package.json`, por exemplo:

```powershell
bun run migration:pending
bun run migration:up
```

Execute migrações apenas quando necessário e após confirmar que o banco configurado é o correto.

## Variáveis de ambiente

| Variável | Finalidade |
|---|---|
| `PORT` | Porta HTTP da API |
| `DB_HOST` | Host do PostgreSQL |
| `DB_PORT` | Porta do PostgreSQL |
| `DB_NAME` | Nome do banco |
| `DB_USER` | Usuário do banco |
| `DB_PASSWORD` | Senha do banco |

Confirme no código/configuração do MikroORM se esses são exatamente os nomes lidos pela aplicação.

## Notas de entrega

- Não inclua `.env.local`, `.env.docker` com senhas reais, `node_modules`, `dist` ou `.git`.
- Inclua `package.json` e o lockfile do Bun (`bun.lock` ou `bun.lockb`, conforme o projeto).
- Documente limitações conhecidas e não declare testes de integração como executados se apenas testes unitários foram rodados.
