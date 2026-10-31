# Validação da cópia web

Criada em 31/10/2026 a partir dos fontes do MedalHive desktop, sem copiar Git,
Electron, executáveis, histórico de vendas, bases SQLite, arquivos de ambiente
ou credenciais da máquina original. As artes próprias foram convertidas para
WebP somente na cópia. O original permanece intacto.

## Verificado

- `npm run lint`: aprovado.
- `npm test`: dez testes aprovados com SQLite WASM real no Node.
- `npm run build`: aprovado, com WASM e imagens empacotados localmente.
- `npm audit --omit=dev`: zero vulnerabilidades na consulta desta data.
- A instalação completa reportou cinco avisos moderados de desenvolvimento;
  não foi usado `audit fix --force` nem alteradas regras para esconder falhas.

Os testes cobrem catálogo e acesso demo, preços em centavos, idempotência,
reservas, rollback de entradas inválidas, falhas e cancelamento de pagamento,
entrega sequencial, relatórios, recuperação e retomada após recarga,
sincronização simulada, queda de rede, isolamento e persistência por aba,
armazenamento corrompido, bloqueado ou cheio e ausência de gravações a cada poll.

## Limites

Não foi acessado navegador, conforme a restrição do usuário. Interações de
interface, layout em diferentes dispositivos, teclado virtual, CSP e
inicialização WASM em navegadores reais precisam de revisão com permissão.
Os testes Node e o build não substituem essa verificação.

Não há backend ou autenticação real, cobrança, hardware ou transmissão de
sincronização. Não foi feito deploy, upload ao GitHub ou integração com a landing
page. A versão é destinada exclusivamente à demonstração com dados fictícios.
