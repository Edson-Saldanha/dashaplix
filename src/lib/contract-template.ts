// Geração do texto do contrato a partir dos dados do formulário.
import { brl } from "./format";

export type ContractData = {
  contract_number?: string;
  contratante_name: string;
  contratante_doc?: string | null;
  contratante_address?: string | null;
  contratante_city?: string | null;
  contratante_state?: string | null;
  contratante_zip?: string | null;
  contratante_rep?: string | null;
  contratante_email?: string | null;
  contratante_phone?: string | null;
  contratada_name: string;
  contratada_doc: string;
  contratada_address: string;
  contratada_city: string;
  contract_type: string;
  platform?: string | null;
  start_date: string;
  duration?: string | null;
  loyalty_period?: string | null;
  notice_days: number;
  cancel_fee_pct: number;
  service_description?: string | null;
  accounts_count?: number | null;
  ads_count?: number | null;
  included_services: string[];
  excluded_services: string[];
  total_value: number;
  monthly_value?: number | null;
  payment_method?: string | null;
  installments?: number | null;
  due_date?: string | null;
  payment_notes?: string | null;
  per_account_billing?: boolean;
  single_account?: boolean;
  proportional_adjust?: boolean;
  service_hours?: string | null;
  channels: string[];
  contacts: string[];
  optional_clauses: string[];
};

const MESES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

export const dataExtenso = (iso: string) => {
  const d = new Date(iso + (iso.length === 10 ? "T00:00:00" : ""));
  return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
};

const optClauseText: Record<string, { title: string; body: string }> = {
  "isencao_precificacao": {
    title: "ISENÇÃO SOBRE PRECIFICAÇÃO",
    body: "A CONTRATADA não se responsabiliza por valores de venda, promoções ou precificações determinadas pelo CONTRATANTE, sendo estas de total responsabilidade da parte contratante.",
  },
  "ads_facil": {
    title: "ADS FÁCIL – NÃO RESPONSABILIDADE DA EMPRESA",
    body: "Quaisquer campanhas, configurações, otimizações ou alterações realizadas por meio do ADS Fácil não fazem parte da gestão contratada e não são de responsabilidade da CONTRATADA. A ativação da ferramenta pode ocorrer com apenas um clique e não há meios para rastrear quem realizou esta ação. Todos os custos e efeitos gerados são de responsabilidade exclusiva do CONTRATANTE.",
  },
  "nao_reembolsavel": {
    title: "MENSALIDADE DA GESTÃO – SERVIÇO NÃO REEMBOLSÁVEL",
    body: "A mensalidade referente ao serviço de gestão é não reembolsável, considerando que se trata de serviço intelectual, estratégico e contínuo, cuja execução inicia-se no primeiro dia do período contratado.",
  },
  "campanhas_oficiais": {
    title: "CAMPANHAS OFICIAIS DA PLATAFORMA",
    body: "As campanhas promocionais internas da plataforma, incluindo Datas Duplas e ações específicas, não são planejadas, gerenciadas ou garantidas pela CONTRATADA. Eventuais participações serão comunicadas com antecedência, mas sua execução e resultados independem do controle da CONTRATADA. A CONTRATADA poderá planejar e realizar campanhas promocionais próprias em datas comemorativas.",
  },
  "oferta_relampago": {
    title: "OFERTA RELÂMPAGO",
    body: "A CONTRATADA não se responsabiliza por erros de precificação inseridos pelo CONTRATANTE em Ofertas Relâmpago, assim como pelos prejuízos, cancelamentos ou impactos decorrentes desses erros. Recomenda-se que o CONTRATANTE revise cuidadosamente todos os preços antes de publicar ofertas relâmpago.",
  },
  "afiliados": {
    title: "PORCENTAGEM DE AFILIADOS – NÃO RESPONSABILIDADE DA EMPRESA",
    body: "A CONTRATADA não se responsabiliza pela ativação de afiliados na conta do CONTRATANTE, nem pela porcentagem configurada nas campanhas. A funcionalidade pode ser ativada com apenas um clique e não existe rastreabilidade que permita identificar a origem da ativação. Qualquer impacto decorrente é de inteira responsabilidade do CONTRATANTE.",
  },
  "sem_garantia": {
    title: "SEM GARANTIA DE RESULTADO",
    body: "A CONTRATADA se compromete exclusivamente com a execução do serviço contratado, não havendo garantia de faturamento, lucro, crescimento ou qualquer resultado específico. Os resultados dependem de múltiplos fatores, incluindo qualidade de produtos, precificação, demanda de mercado, concorrência e ações do próprio CONTRATANTE.",
  },
  "confidencialidade": {
    title: "CONFIDENCIALIDADE",
    body: "Ambas as partes se comprometem a manter sigilo absoluto sobre todas as informações comerciais, estratégicas, técnicas, financeiras e operacionais às quais tiverem acesso em razão deste contrato, mesmo após o seu encerramento.",
  },
  "extincao": {
    title: "EXTINÇÃO CONTRATUAL",
    body: "Será extinto o presente contrato quando ocorrer: (i) morte ou extinção de qualquer das partes; (ii) conclusão do serviço; (iii) rescisão por falta de pagamento ou impossibilidade de continuidade por força maior; (iv) declaração formal do CONTRATANTE estabelecendo a finalização do contrato.",
  },
  "foro": {
    title: "FORO",
    body: "Para dirimir quaisquer controvérsias oriundas deste contrato, as partes elegem o foro da Comarca de Nova Serrana/MG, renunciando a qualquer outro, por mais privilegiado que seja.",
  },
};

export const OPTIONAL_CLAUSES: { key: string; label: string }[] = [
  { key: "isencao_precificacao", label: "Isenção sobre precificação" },
  { key: "ads_facil", label: "Não responsabilidade por Ads Fácil" },
  { key: "nao_reembolsavel", label: "Mensalidade não reembolsável" },
  { key: "campanhas_oficiais", label: "Campanhas oficiais da plataforma" },
  { key: "oferta_relampago", label: "Oferta relâmpago" },
  { key: "afiliados", label: "Porcentagem de afiliados" },
  { key: "sem_garantia", label: "Sem garantia de resultado" },
  { key: "confidencialidade", label: "Confidencialidade" },
  { key: "extincao", label: "Extinção contratual" },
  { key: "foro", label: "Foro em Nova Serrana/MG" },
];

export type ContractSection = { title: string; paragraphs: string[] };

export function buildContractSections(d: ContractData): ContractSection[] {
  const sections: ContractSection[] = [];

  // Título
  sections.push({
    title: `INSTRUMENTO PARTICULAR DE PRESTAÇÃO DE SERVIÇO DE ${d.contract_type.toUpperCase()}`,
    paragraphs: d.contract_number ? [`Contrato Nº ${d.contract_number}`] : [],
  });

  // Qualificação
  const enderecoCt = [d.contratante_address, d.contratante_city && d.contratante_state ? `${d.contratante_city} – ${d.contratante_state}` : d.contratante_city || d.contratante_state, d.contratante_zip ? `CEP ${d.contratante_zip}` : ""].filter(Boolean).join(", ");
  sections.push({
    title: "QUALIFICAÇÃO DAS PARTES",
    paragraphs: [
      `CONTRATANTE: ${d.contratante_name}${d.contratante_doc ? `, inscrito(a) sob CPF/CNPJ ${d.contratante_doc}` : ""}${enderecoCt ? `, com sede/endereço em ${enderecoCt}` : ""}${d.contratante_rep ? `, representado(a) por ${d.contratante_rep}` : ""}.`,
      `CONTRATADA: ${d.contratada_name}, inscrita sob o CNPJ ${d.contratada_doc}, com sede em ${d.contratada_address}.`,
      "As partes acima identificadas, doravante denominadas CONTRATANTE e CONTRATADA, têm entre si justo e contratado o presente Contrato de Prestação de Serviços, regido pelas cláusulas e condições a seguir estipuladas.",
    ],
  });

  // Cláusula 1 – Objeto
  const objetoLinhas: string[] = [];
  objetoLinhas.push(`A CONTRATADA compromete-se a prestar ao CONTRATANTE os serviços de ${d.contract_type}${d.platform ? ` na plataforma ${d.platform}` : ""}, conforme descrito a seguir.`);
  if (d.service_description) objetoLinhas.push(d.service_description);
  if (d.included_services?.length) objetoLinhas.push("Serviços inclusos:\n• " + d.included_services.join("\n• "));
  const detalhes: string[] = [];
  if (d.accounts_count) detalhes.push(`${d.accounts_count} conta(s) gerenciada(s)`);
  if (d.ads_count) detalhes.push(`até ${d.ads_count} anúncios criados ou otimizados por mês`);
  if (detalhes.length) objetoLinhas.push("Escopo: " + detalhes.join("; ") + ".");
  if (d.excluded_services?.length) objetoLinhas.push("Serviços não inclusos:\n• " + d.excluded_services.join("\n• "));
  objetoLinhas.push("Os serviços serão executados com autonomia técnica, sempre em comum acordo com o CONTRATANTE.");
  sections.push({ title: "CLÁUSULA 1 – DO OBJETO", paragraphs: objetoLinhas });

  // Cláusula 2 – Prazo e Fidelidade
  sections.push({
    title: "CLÁUSULA 2 – DO PRAZO E FIDELIDADE",
    paragraphs: [
      `O presente contrato é celebrado por ${d.duration || "prazo indeterminado"}, iniciando-se em ${dataExtenso(d.start_date)}.`,
      d.loyalty_period && d.loyalty_period !== "Sem fidelidade"
        ? `Fica estabelecida fidelidade mínima de ${d.loyalty_period}, contados a partir da data de início deste contrato.`
        : "Não há período mínimo de fidelidade.",
      `O cancelamento solicitado pelo CONTRATANTE antes do término da fidelidade implicará multa correspondente a ${d.cancel_fee_pct}% do valor da mensalidade vigente.`,
      `Após o cumprimento do período de fidelidade, o CONTRATANTE poderá rescindir o contrato sem multa, mediante aviso prévio mínimo de ${d.notice_days} dias.`,
    ],
  });

  // Cláusula 3 – Obrigações da CONTRATANTE
  sections.push({
    title: "CLÁUSULA 3 – DAS OBRIGAÇÕES DA CONTRATANTE",
    paragraphs: [
      "Fornecer à CONTRATADA todas as informações, acessos e materiais necessários à execução dos serviços.",
      "Efetuar os pagamentos nas datas e valores ajustados.",
      "Cumprir com obrigações fiscais e tributárias relacionadas aos serviços contratados.",
      "Revisar preços, promoções e configurações antes de publicações que dependam de sua aprovação.",
      "Validar informações estratégicas quando solicitado pela CONTRATADA.",
    ],
  });

  // Cláusula 4 – Obrigações da CONTRATADA
  sections.push({
    title: "CLÁUSULA 4 – DAS OBRIGAÇÕES DA CONTRATADA",
    paragraphs: [
      "Executar os serviços com zelo, ética e conforme especificações acordadas.",
      "Manter sigilo sobre todas as informações do CONTRATANTE, mesmo após o encerramento contratual.",
      "Emitir notas fiscais correspondentes aos serviços prestados.",
      "Cumprir prazos de execução e respeitar normas aplicáveis.",
      "Utilizar dados e documentos do CONTRATANTE exclusivamente para execução contratual.",
      "A CONTRATADA é isenta de responsabilidade por falhas, indisponibilidades ou limitações das plataformas de marketplace.",
    ],
  });

  // Cláusula 5 – Horário
  sections.push({
    title: "CLÁUSULA 5 – HORÁRIO DE FUNCIONAMENTO",
    paragraphs: [
      `A CONTRATADA presta serviços no seguinte horário: ${d.service_hours || "Segunda a sexta-feira, das 9h às 18h"}.`,
      d.channels?.length ? `Canais oficiais de atendimento: ${d.channels.join(", ")}.` : "Solicitações fora do horário serão atendidas no próximo dia útil.",
      d.contacts?.length ? `Contatos disponibilizados ao CONTRATANTE: ${d.contacts.join(", ")}.` : "",
    ].filter(Boolean),
  });

  // Cláusula 6 – Pagamento
  const pgto: string[] = [];
  pgto.push(`O valor total dos serviços é de ${brl(d.total_value)}${d.duration ? `, referente ao período de ${d.duration}` : ""}.`);
  if (d.monthly_value) pgto.push(`Para fins de referência, o valor mensal equivalente corresponde a ${brl(d.monthly_value)}.`);
  if (d.payment_method) pgto.push(`Forma de pagamento: ${d.payment_method}${d.installments && d.installments > 1 ? ` em ${d.installments}x` : ""}${d.due_date ? `, vencimento ${d.due_date}` : ""}.`);
  if (d.per_account_billing) pgto.push("Fica estabelecido que a cobrança é realizada por conta gerenciada, sendo cada conta uma fração proporcional do valor total contratado.");
  if (d.single_account) pgto.push("O presente contrato abrange uma única conta do CONTRATANTE que será gerenciada pela CONTRATADA.");
  if (d.proportional_adjust) pgto.push("Em caso de inclusão ou exclusão de contas durante a vigência, o valor total será ajustado proporcionalmente ao número de contas efetivamente gerenciadas e ao período restante.");
  if (d.payment_notes) pgto.push(d.payment_notes);
  sections.push({ title: "CLÁUSULA 6 – PAGAMENTO", paragraphs: pgto });

  // Cláusula 7 – Rescisão
  sections.push({
    title: "CLÁUSULA 7 – RESCISÃO CONTRATUAL",
    paragraphs: [
      `Após o término do período de fidelidade, o CONTRATANTE poderá solicitar o cancelamento sem multa, mediante aviso prévio de ${d.notice_days} dias.`,
      `Caso o cancelamento ocorra sem aviso prévio, ou antes do cumprimento do período de fidelidade, será aplicada multa de ${d.cancel_fee_pct}% do valor da mensalidade vigente.`,
      "O contrato também poderá ser rescindido por descumprimento contratual, independentemente de aviso prévio.",
      "Tolerâncias pontuais de qualquer das partes não configuram renúncia de direitos.",
    ],
  });

  // Cláusulas opcionais
  let n = 8;
  for (const key of d.optional_clauses) {
    const c = optClauseText[key];
    if (!c) continue;
    sections.push({ title: `CLÁUSULA ${n} – ${c.title}`, paragraphs: [c.body] });
    n++;
  }

  return sections;
}

export function buildSignatureBlock(d: ContractData) {
  return {
    location: `${d.contratada_city}, ${dataExtenso(new Date().toISOString().slice(0,10))}.`,
    contratada: d.contratada_name,
    contratante: d.contratante_rep || d.contratante_name,
    contratanteRole: "CONTRATANTE",
  };
}
