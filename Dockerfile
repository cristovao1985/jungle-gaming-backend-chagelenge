FROM oven/bun:1

WORKDIR /app

# Copie os manifestos primeiro para aproveitar o cache de dependências.
COPY package.json ./
COPY bun.lock* ./

RUN bun install --frozen-lockfile || bun install

COPY . .

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Este projeto inicia a aplicação diretamente pelo Bun, conforme package.json.
# Para rodar em modo de desenvolvimento use bun run test:local
CMD ["bun", "run", "start"]
