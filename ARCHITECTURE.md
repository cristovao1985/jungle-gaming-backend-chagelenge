## Autenticação e identidade

### Decisão para o escopo do desafio

A autenticação não foi implementada nesta entrega, pois não faz parte da pontuação técnica do desafio e o tempo disponível foi priorizado para integridade financeira, concorrência, idempotência e consistência transacional.

Essa decisão é intencional e não significa que a aplicação deva permanecer sem autenticação em produção.

### Arquitetura proposta

Em um ambiente de produção, a autenticação seria delegada a um provedor de identidade externo compatível com OpenID Connect (OIDC), como Keycloak ou Zitadel.

A API validaria os tokens de acesso emitidos pelo provedor, verificando assinatura, emissor (`iss`), audiência (`aud`), validade (`exp`) e demais requisitos aplicáveis. A autorização seria definida de acordo com as responsabilidades de cada endpoint.

O health check permaneceria público. As mensagens recebidas pela fila seriam consideradas provenientes de um canal interno confiável, conforme o escopo do desafio, mas a identidade do provedor e os demais dados da mensagem continuariam sujeitos às validações de domínio.

### Ponto de extensão

A autenticação deverá ser integrada à camada HTTP por meio de um `AuthGuard` ou mecanismo equivalente, validando a identidade antes de permitir o acesso aos endpoints protegidos.

A implementação deverá manter a lógica de autenticação desacoplada das regras de negócio, permitindo substituir o provedor de identidade sem alterar os casos de uso financeiros.

### Limites da decisão

A ausência de autenticação nesta entrega não deve ser interpretada como autorização para expor a API publicamente. Antes de um deploy em produção, será necessário implementar e testar autenticação, autorização, gerenciamento de segredos e os controles de segurança pertinentes.

As validações financeiras, a idempotência e as garantias de consistência do processamento não dependem da autenticação HTTP e permanecem obrigatórias.
