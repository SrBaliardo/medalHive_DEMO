# MedalHive DEMO — instruções de manutenção

Este projeto é uma cópia web independente do MedalHive desktop. Não modificar
o projeto original nem compartilhar sua base de dados com esta demonstração.

- React, Vite, JavaScript, CSS e SQLite em WebAssembly (`sql.js`). Sem Electron,
  backend, cobrança, comunicação com hardware ou sincronização reais.
- A aplicação publica somente `dist/`. Não incluir bancos, credenciais reais,
  `.env`, arquivos de clientes ou materiais de outros projetos.
- `src/medalhive/MedalHive.jsx` e seus componentes preservam a interface do totem.
  `demo/store.js` preserva regras de compra/estoque/simulação; `database.js`
  adapta SQLite e `session.js` controla a persistência isolada por aba.
- O acesso demo/demo123 é público e apenas demonstra a navegação administrativa;
  não é autenticação de produção. Nunca aceitar credenciais reais nesse fluxo.
- Dados fictícios em sessionStorage, sem integração com o desktop. Atualizar
  preserva estado; abas têm cópias independentes. O navegador pode descartar os
  dados. Reiniciar limpa somente a chave desta demonstração após confirmação.
- Preços em centavos, pedido idempotente, reservas de estoque, entrega por
  unidade e retomada após recarga são contratos a preservar.
- Não tornar pagamentos ou equipamentos reais por conveniência; exigem outra
  arquitetura e autorização explícita. Pagamentos/QR/sincronização são simulados.
- Manter recursos locais, dimensões responsivas, teclado/toque, foco visível e
  preferência por movimento reduzido. Não esconder falhas de armazenamento.
- Validar com `npm run lint`, `npm test` e `npm run build`. Testes Node cobrem
  regras e SQLite WASM, sem abrir navegador. O usuário exige permissão antes de
  acesso ao navegador: declarar a revisão visual/interativa pendente até obtê-la.
- Usar o lockfile e Node 22.13+. Não publicar nem conectar a landing page sem
  pedido específico. A criação desta cópia não autoriza upload ao GitHub.
