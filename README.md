# DJ Solar Dimensionamento

Plataforma profissional da **DJ Solar Engenharia** para dimensionamento de sistemas fotovoltaicos.

## Estado recuperado

Em 31/08/2026 foi localizado na biblioteca das conversas do GPT o documento técnico original `PROJETO_DJ_SOLAR.md`, que registrava a pausa do projeto em 21/08/2026. A versão original estava aproximadamente 50% concluída e havia chegado ao módulo de **compatibilidade elétrica módulo × inversor**.

A reconstrução no GitHub restaura:

- painel responsivo;
- cadastro de clientes;
- consumo médio ou histórico de 12 meses;
- média automática do histórico;
- ligação monofásica, bifásica ou trifásica;
- perdas e percentual de compensação configuráveis;
- potência necessária em kWp;
- quantidade de módulos;
- potência instalada;
- geração mensal estimada;
- área ocupada pelos módulos;
- memória de cálculo;
- catálogo técnico básico de módulos e inversores;
- Voc corrigida para temperatura mínima;
- Vmp para temperatura elevada;
- mínimo e máximo de módulos por string;
- corrente por MPPT;
- relação CC/CA e oversizing;
- alertas de compatibilidade em verde, amarelo e vermelho;
- histórico local de clientes e projetos.

## Próxima etapa

**Dimensionamento do telhado e distribuição física dos módulos**:

1. comprimento e largura de cada área;
2. inclinação e orientação;
3. obstáculos e recuos;
4. instalação vertical/horizontal;
5. espaçamento;
6. quantidade máxima de módulos;
7. comparação entre módulos;
8. representação visual da disposição.

Depois serão desenvolvidos irradiação por localização, cabos/proteções, lista de materiais, financeiro, proposta PDF, sistemas híbridos/off-grid e recursos PWA.

## Persistência

O projeto original registrava clientes/projetos na nuvem. Nesta reconstrução a interface usa `localStorage` temporariamente. A próxima etapa de infraestrutura é religar a persistência ao **Supabase**, sem colocar segredos no repositório.

## Stack atual

- Next.js App Router
- React
- TypeScript
- CSS responsivo
- GitHub
- Vercel

Veja `docs/PROJETO_ORIGINAL.md` para o registro de continuidade recuperado.
