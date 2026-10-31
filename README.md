# MedalHive — DEMO WEB

Demonstração web independente do aplicativo MedalHive da Hivetron. Preserva
catálogo, compra, pagamento e entrega simulados, estoque, relatórios e
configurações. Não depende de Electron, instalação de banco ou servidor de API.

## Executar

Node.js 22.13 ou superior (recomendado Node 22 LTS atualizado).

```sh
npm ci
npm run dev
```

Acesso local: http://127.0.0.1:5190. Administração: **demo / demo123** (campos
preenchidos). Estoque inicial: 20 unidades de cada medalha. Os cenários iniciais
de pagamento e sincronização aprovam sempre; a administração permite simular
falhas e modo aleatório. Nenhuma cobrança ou comunicação externa é realizada.

```sh
npm run lint
npm test
npm run build
npm run preview
```

Prévia do build: http://127.0.0.1:4190. Publique somente `dist/` em hospedagem
estática com HTTPS e suporte a arquivos WASM (`application/wasm`). As rotas usam
hash, permitindo hospedar também em subpastas. Não abra `index.html` via file://.
Nenhum desses comandos publica o projeto.

## Isolamento e persistência

SQLite executa no navegador via WebAssembly. Seu snapshot é salvo em
sessionStorage, sob uma chave exclusiva desta demonstração. Atualizar a página
preserva o estado. Outra aba tem uma cópia independente (ao duplicar uma aba,
o navegador pode copiar seu estado inicial). Fechar a aba geralmente descarta
os dados; restauração de sessão do navegador pode recuperá-los.

O botão **Recomeçar demo** repõe o estado inicial apenas desta aba após
confirmação. O original desktop não é consultado ou alterado. Não são copiados
bancos, histórico real, senhas ou configurações da máquina original.

Se a página recarregar durante uma entrega, o pedido fica interrompido e pode
ser retomado na administração, preservando unidades já concluídas. Timers do
navegador podem ser limitados em abas em segundo plano; a simulação progride
gradualmente ao voltar, sem liberar todas as unidades de uma vez.

**Use somente dados fictícios.** O acesso administrativo é público e não protege
informações reais. sessionStorage não é armazenamento seguro nem durável. Não
há PIN pad, PIX, Arduino, pagamento, entrega física ou sincronização reais.
O QR Code é identificado na interface como demonstração.

## Organização

- `src/medalhive/`: interface adaptada do projeto desktop, catálogo e teclado.
- `src/medalhive/demo/store.js`: regras SQL portadas do Store original, sem Node
  ou acesso ao disco. Mantém centavos, reservas, idempotência e simulações.
- `demo/database.js`: adaptador para SQL.js e liberação de statements.
- `demo/session.js`: snapshot e persistência por aba, sem compartilhamento.
- `src/WebDemo.jsx`: aviso permanente e reinicialização local com confirmação.
- `tests/`: testes determinísticos de regras, recuperação e isolamento.

A interface e as regras foram copiadas de permedal-vm, sem alterar aquela pasta.
A versão web usa apenas artes próprias do MedalHive. Novas alterações devem
seguir [AGENTS.md](AGENTS.md).

SQL.js/WASM é empacotado localmente, sem CDN. A implementação segue a
[documentação oficial do SQL.js](https://sql.js.org/documentation/) e o tratamento
de [assets do Vite](https://vite.dev/guide/assets).

Esta entrega não inclui publicação, integração com a landing page ou upload ao
GitHub. A validação visual/interativa no navegador depende da permissão do
usuário e permanece pendente; build e testes de regras não a substituem.
