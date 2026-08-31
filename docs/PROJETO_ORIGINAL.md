# DJ Solar — estado recuperado do projeto original

Fonte de continuidade: documento `PROJETO_DJ_SOLAR.md` recuperado da biblioteca de conversas do GPT.

## Pausa original — 21/08/2026

O projeto estava publicado em `dj-solar-dimensionamento.dirleibispo.chatgpt.site` e o registro indicava aproximadamente 50% da versão profissional planejada concluída.

### Funcionalidades que já existiam

- Painel profissional responsivo para celular, tablet e computador.
- Cadastro de clientes.
- Catálogo básico de módulos e inversores.
- Consumo médio mensal ou histórico completo de 12 meses.
- Média automática do consumo anual.
- Tipo de ligação: monofásica, bifásica ou trifásica.
- Percentual de compensação e perdas configuráveis.
- Potência necessária em kWp.
- Quantidade de módulos e potência instalada.
- Geração mensal estimada.
- Área total ocupada pelos módulos.
- Memória de cálculo.
- Projetos salvos e consultados.
- Compatibilidade elétrica módulo × inversor.
- Voc corrigida pela temperatura mínima.
- Vmp calculada para temperatura elevada.
- Faixa mínima e máxima de módulos por string.
- Corrente calculada por MPPT.
- Relação CC/CA e oversizing.
- Alertas verde, amarelo e vermelho para incompatibilidades.

## Ponto exato de continuação

A última entrega concluída era **Compatibilidade módulo × inversor** dentro da área **Projetos**.

A próxima etapa definida era **dimensionamento do telhado e distribuição física dos módulos**, com:

- comprimento e largura de cada área;
- inclinação e orientação;
- obstáculos e recuos;
- instalação vertical ou horizontal;
- espaçamento entre módulos;
- quantidade máxima de placas;
- comparação entre modelos/dimensões;
- representação visual da disposição.

Depois: irradiação por localização, cabos e proteções, lista de materiais, cálculo financeiro, proposta em PDF, sistemas híbridos/off-grid, PWA, APK e publicação.

## Regras preservadas

- Não inventar dados técnicos de equipamentos.
- Catálogo deve aceitar cadastro, edição e futura importação CSV/Excel.
- Fórmulas separadas da interface e documentadas.
- Exibir memória de cálculo e unidades.
- Validar limites elétricos e bloquear configurações incompatíveis.
- Manter regras normativas/regulatórias configuráveis.
- Cálculos executivos devem ser conferidos por profissional habilitado.
- Priorizar serviços gratuitos durante o desenvolvimento.
- Não deixar telas ou botões decorativos.
- Testar cálculos críticos automaticamente.
- Rolagem horizontal deve ser local por seção; nunca no corpo inteiro da página.

## Reconstrução no GitHub — 31/08/2026

A versão em GitHub foi reconstruída usando Next.js + TypeScript, mantendo a lógica principal do projeto original. O armazenamento em nuvem ainda deverá ser religado ao Supabase; enquanto isso, os cadastros e projetos da interface reconstruída usam armazenamento local do navegador para não bloquear a continuidade.
