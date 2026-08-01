
# Módulo: Atualização Cadastral de Clientes

Nova página `/clientes/atualizacao-cadastral` para supervisores atualizarem Ramo de Atividade, Telefone e E-mail dos clientes dos seus RCAs, com trilha de auditoria e exportação.

## 1. Importação da base (planilha 302.xlsx)

Sua planilha traz **4.187 clientes** com as colunas:
`CODCLI, CLIENTE, TIPOFJ, CGCENT (CNPJ), RAMO, FANTASIA, ENDERECO, BAIRRO_NOVO, RCA, NOME_RCA1, SITUACAO, TELENT, EMAIL`.

⚠️ **Não há colunas "Cidade" e "UF"** na planilha. Vou:
- Guardar `endereco` e `bairro` como estão.
- Deixar `cidade` e `uf` como campos opcionais no banco (nulos por enquanto, aparecem em branco na tabela). Se você tiver essa informação em outra planilha depois, importamos por cima.

## 2. Modelo de dados (Cloud)

**Tabela `clientes_cadastro`** — base master (1 linha por CODCLI):
- `codcli` (PK), `razao_social`, `nome_fantasia`, `cnpj`, `tipo_fj`
- `endereco`, `bairro`, `cidade`, `uf`
- `cod_rca`, `nome_rca`, `situacao`
- `ramo_atividade`, `telefone`, `email` (campos "vivos", começam com o valor da planilha)
- `status_atualizacao` ('pendente' | 'atualizado') — default 'pendente'
- `atualizado_em`, `atualizado_por` (uid), `atualizado_por_nome`

**Tabela `clientes_cadastro_historico`** — 1 linha por edição:
- `cliente_codcli`, `cod_rca`, `nome_rca`
- `ramo_anterior`, `ramo_novo`, `telefone_anterior`, `telefone_novo`, `email_anterior`, `email_novo`
- `alterado_em`, `alterado_por` (uid), `alterado_por_nome`, `alterado_por_email`

RLS: admin vê tudo; supervisor/gestor/usuário vê apenas clientes cujo `cod_rca` esteja nas equipes dele (via `teams_vendors`). Admin pode importar/resetar.

## 3. Página `/clientes/atualizacao-cadastral`

**Topo — Dashboard**
- 4 cards: Total, Atualizados, Pendentes, % Conclusão
- Barra de progresso azul com o percentual

**Filtros**
- Combobox **RCA** (lista os RCAs a que o usuário tem acesso; admin vê todos)
- Campo de **pesquisa** (Código / Razão Social / Fantasia / CNPJ)
- Filtro rápido de status (Todos / Pendentes / Atualizados)
- Botão **Exportar Atualizações** (xlsx)

**Tabela paginada** (20 por página)
Colunas: Código · Razão Social · Cidade · UF · Ramo de Atividade · Telefone · E-mail · Status · **Editar**

**Diálogo de edição**
- Somente leitura: Código, Razão Social, CNPJ, Cidade, UF
- Editáveis: Ramo de Atividade (obrigatório), Telefone (máscara BR, obrigatório), E-mail (validado, obrigatório)
- Botões Salvar / Cancelar
- Ao salvar: grava snapshot no histórico, atualiza a base, marca status = "Atualizado" com data/hora/usuário

## 4. Exportação

Botão gera **XLSX** a partir de `clientes_cadastro_historico`, respeitando filtro/RCA ativo, com as colunas:
`RCA · Código · Razão Social · Ramo Anterior · Novo Ramo · Telefone Anterior · Novo Telefone · E-mail Anterior · Novo E-mail · Data · Hora · Usuário`.

## 5. Navegação

- Card no Home (para admin/supervisor): "Atualização Cadastral"
- Rota protegida `/clientes/atualizacao-cadastral`

## 6. Visual

Azul primário do sistema, cantos arredondados, ícones (lucide), tabela responsiva (vira lista em cards no mobile), toques ≥44px.

## Ordem de execução

1. Migration: criar as duas tabelas + RLS + GRANTs + índices
2. Importar os 4.187 clientes da planilha (via insert em lote)
3. Página + diálogo de edição + dashboard + filtros + paginação
4. Exportação XLSX
5. Rota + card no Home
6. Teste rápido do fluxo

## Perguntas rápidas antes de começar

1. Quem pode **editar**? Supervisor + Gerente + Admin? Ou qualquer usuário aprovado que "veja" o RCA?
2. Quem pode ver **todos os RCAs**? Só admin? Ou também gerente/coordenador?
3. A base importada substitui qualquer coisa existente? (não há hoje — vou importar do zero)
4. Confirma que Cidade/UF ficam vazios até você enviar outra planilha com esses dados?
