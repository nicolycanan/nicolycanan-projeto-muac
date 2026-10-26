# Desenvolvimento local

Ambiente utilizado no desenvolvimento: Node.js 24, npm e PowerShell. O projeto também depende do runtime local do Wrangler para simular os bindings da Cloudflare.

## Uma cópia nova, com dados vazios

Na sua própria clonagem do repositório, use os identificadores fictícios do exemplo. Isso substitui apenas a configuração dessa cópia; não faça essa substituição em uma instalação de produção que já esteja configurada.

```powershell
npm ci
Copy-Item wrangler.example.jsonc wrangler.jsonc

npx wrangler d1 migrations apply muac-analytics --local
npx wrangler d1 migrations apply muac-content --local

$env:MUAC_LOCAL='1'
$env:MUAC_DEV_AUTH='1'
npm run dev -- --hostname 127.0.0.1 --port 3000
```

Abra `http://127.0.0.1:3000`. O acervo começa vazio. Para criar conteúdo fictício, abra `/dashboard/articles`, envie uma imagem sua, salve um rascunho e publique quando quiser.

`MUAC_LOCAL=1` desativa bindings remotos no desenvolvimento. `MUAC_DEV_AUTH=1` permite testar o painel apenas com `NODE_ENV=development` e hostname `localhost` ou `127.0.0.1`. Não é uma credencial e não funciona como dispensa de login em produção.

O Notion não é necessário para uma instalação nova com D1. `.env.local.example` documenta as variáveis opcionais do adaptador legado. Nenhum token ou senha real deve ser colocado nesses arquivos de exemplo.

## Verificações

```powershell
npm test
npm run build
```

`npm test` usa conteúdo fictício em `tests/fixtures/`. Não precisa do banco publicado nem dos backups da autora.

`npm run test:editor` e os scripts `verify-migration`, `verify-metrics` e `verify-published` pertencem à conferência da instalação original: dependem de snapshots privados e, em alguns casos, de autenticação e recursos remotos. Não são o teste básico de uma clonagem nova.

Para simular a indisponibilidade do otimizador com o servidor local aberto, execute em outro terminal:

```powershell
node scripts/image-failure-proxy.mjs
```

Abra `http://127.0.0.1:3001/archive`. O proxy retorna erro nas imagens otimizadas e deixa os originais disponíveis, permitindo conferir a recuperação no navegador.

O lint geral ainda contém problemas anteriores nos efeitos React do dashboard e popup. Pastas geradas pelo OpenNext também podem produzir ruído nessa verificação. Isso não equivale a uma validação limpa de todo o repositório.

## Sua própria publicação

A publicação exige recursos da sua conta Cloudflare: Worker, dois bancos D1, namespace KV, binding de Images e uma aplicação Access. Substitua os identificadores do exemplo pelos seus e configure o emissor e a audiência da aplicação Access. A configuração pública não fornece acesso à conta de produção da autora.

Os comandos `npm run deploy`, `npm run upload` e os comandos com `--remote` atuam em recursos configurados e podem alterar sua instalação. Antes deles, configure seus próprios recursos, aplique os esquemas e confirme que está usando a conta correta.

Os identificadores em `wrangler.jsonc` são referências de infraestrutura, não credenciais. Um token de API ou uma sessão autenticada continua sendo necessário para administrar esses recursos. Configurações particulares podem ser guardadas em `wrangler.local.jsonc` ou `wrangler.production.jsonc`, que ficam fora do Git.

## Conteúdo que não acompanha o código

Não são distribuídos: eventos reais de navegação, IPs de visitantes, rascunhos, exportações do Notion, banco de produção, arquivos pessoais de upload e credenciais. A imagem do README é uma captura da interface pública, sem o painel administrativo.
