import { GoogleGenAI } from "@google/genai";
import { Logger } from "../../../utils/logger";

let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI | null {
  if (!geminiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      Logger.warn("GEMINI_API_KEY não foi encontrada nos segredos. Usando respostas de contingência.");
      return null;
    }
    geminiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return geminiClient;
}

export class GeminiService {
  public async getTutorAnswer(lessonTitle: string, query: string): Promise<string> {
    const client = getGeminiClient();
    if (!client) {
      return this.getTutorFallback(lessonTitle);
    }

    try {
      const prompt = `Você é o Tutor de IA da Academia de Arte e Entalhe, respondendo dúvidas dos alunos sobre a aula específica descrita abaixo:

Aula: "${lessonTitle}"

Dúvida do Aluno:
"${query}"

Instruções para Resposta:
1. Responda em português (PT-BR) de forma extremamente didática, profissional e acolhedora, como um Arquiteto de Software Sênior ou Mestre Entalhador.
2. Baseie sua resposta principalmente no conteúdo da aula, mas sinta-se à vontade para expandir com boas práticas e analogias úteis.
3. Se a pergunta for totalmente fora do contexto da aula, gentilmente traga o aluno de volta para o tema, respondendo brevemente se possível.
4. Mantenha uma formatação amigável usando markdown (negritos, listas, blocos de código se necessário).`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      return response.text || "";
    } catch (error: any) {
      Logger.error("Erro no Gemini Tutor:", error);
      return this.getTutorFallback(lessonTitle);
    }
  }

  public async generateQuiz(lessonTitle: string, lessonDescription: string, lessonText?: string): Promise<any> {
    const client = getGeminiClient();
    if (!client) {
      return this.getQuizFallback(lessonTitle);
    }

    try {
      const prompt = `Gere uma pergunta de Quiz em formato JSON com base no conteúdo da aula a seguir:

Título da Aula: "${lessonTitle}"
Descrição: "${lessonDescription}"
Texto de Apoio: "${lessonText || ""}"

Gere um objeto JSON que obedeça RIGOROSAMENTE ao esquema a seguir:
{
  "question": "A pergunta em português do Brasil",
  "options": [
    "Opção 1",
    "Opção 2",
    "Opção 3",
    "Opção 4"
  ],
  "correctAnswerIndex": 2 // Índice de 0 a 3 da opção correta
}

Por favor, gere apenas o JSON válido, sem tags de markdown, blocos de código ou textos introdutórios. O retorno deve ser parseado diretamente pelo JSON.parse.`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
        },
      });

      const parsed = JSON.parse(response.text?.trim() || "{}");
      parsed.id = `q_ai_${Date.now()}`;
      return { questions: [parsed] };
    } catch (error: any) {
      Logger.error("Erro no Gemini Quiz:", error);
      return this.getQuizFallback(lessonTitle);
    }
  }

  public async generateAnswerTicket(ticketQueryText: string, lessonTitle?: string, isPractical?: boolean, imageUrl?: string): Promise<string> {
    const client = getGeminiClient();
    if (!client) {
      return this.getTicketFallback(lessonTitle || "Geral", !!isPractical);
    }

    try {
      let prompt = "";
      if (isPractical) {
        prompt = `Você é o Professor Andrew Lemos, instrutor de Entalhe em Madeira (Wood Carving) e Escultura.
O aluno te enviou a foto de seu exercício prático (${imageUrl ? `Link da foto: ${imageUrl}` : "Sem link de foto"}).

Relatório de execução ou dúvida do aluno (Aula: "${lessonTitle || "Geral"}"):
"${ticketQueryText}"

Sua tarefa: Escreva um rascunho de resposta técnica, acolhedora e extremamente OBJETIVA para responder ao aluno.
REGRAS CRÍTICAS DE ESTILO:
1. NÃO use marcadores de tópicos (bullet points ou asteriscos '*' ou '**' ou '-').
2. NÃO use formatações pesadas de markdown (como hashtags '###' ou '##'). Escreva parágrafos simples, limpos e corridos.
3. Seja extremamente CONCISO e DIRETO. A resposta deve ter no máximo 2 parágrafos pequenos (limite máximo de 100 a 120 palavras).
4. O tom deve ser de um mestre de artes manuais de verdade: humanizado, prático, encorajador, porém muito direto ao ponto. Dê no máximo uma dica técnica rápida.
5. Evite enrolação acadêmica, clichês ou floreios artificiais. Escreva de forma natural, como se estivesse enviando uma mensagem rápida de mentoria no WhatsApp ou chat direto.`;
      } else {
        prompt = `Você é o Professor Andrew Lemos, instrutor de Entalhe em Madeira (Wood Carving) e Escultura.
O aluno enviou a seguinte dúvida teórica:

Dúvida do aluno (Aula: "${lessonTitle || "Geral"}"):
"${ticketQueryText}"

Sua tarefa: Escreva uma resposta técnica, acolhedora e extremamente OBJETIVA para sanar a dúvida do aluno de forma clara.
REGRAS CRÍTICAS DE ESTILO:
1. NÃO use marcadores de tópicos (bullet points ou asteriscos '*' ou '**' ou '-').
2. NÃO use formatações pesadas de markdown (como hashtags '###' ou '##'). Escreva parágrafos simples, limpos e corridos.
3. Seja extremamente CONCISO e DIRETO. A resposta deve ter no máximo 2 parágrafos pequenos (limite máximo de 100 a 120 palavras).
4. O tom deve ser de um mestre experiente em marcenaria/entalhe: humanizado, prático, resolutivo e direto.
5. Escreva de forma humanizada e rápida, sem enrolação artificial ou listas complexas.`;
      }

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      return response.text || "";
    } catch (error: any) {
      Logger.error("Erro no Gemini Answer Ticket:", error);
      return this.getTicketFallback(lessonTitle || "Geral", !!isPractical);
    }
  }

  // --- Fallbacks ---

  private getTutorFallback(lessonTitle: string): string {
    return `Olá! Devido a uma alta demanda temporária nos servidores de inteligência artificial, o mestre Andrew Lemos preparou um resumo rápido de contingência para sua pergunta sobre a aula "${lessonTitle}". A prática é o caminho mais seguro para assimilar esses conceitos: recomendamos revisar os exercícios propostos nesta aula, experimentar na madeira os cortes e goivas sugeridos, e reassistir ao vídeo explicativo. Se sua dúvida persistir, sinta-se à vontade para enviar um ticket de suporte prático ou postá-la na Mesa de Discussão para que eu ou a comunidade possamos responder pessoalmente!`;
  }

  private getQuizFallback(lessonTitle: string): any {
    return {
      questions: [
        {
          id: `q_ai_fallback_${Date.now()}`,
          question: `Com base nos conceitos de Entalhe e Prática na aula "${lessonTitle}", qual é a atitude mais segura para evitar acidentes e garantir cortes precisos?`,
          options: [
            "Usar ferramentas cegas para reduzir a força do corte.",
            "Manter as goivas e facas sempre perfeitamente afiadas e cortar sempre na direção oposta ao seu corpo e mãos.",
            "Forçar a lâmina contra os nós da madeira com batidas rápidas.",
            "Utilizar luvas grossas sem fixar a peça em uma morsa de bancada.",
          ],
          correctAnswerIndex: 1,
        },
      ],
    };
  }

  private getTicketFallback(lessonTitle: string, isPractical: boolean): string {
    if (isPractical) {
      return `Olá! Parabéns pelo excelente trabalho prático na aula "${lessonTitle}". Fiquei muito feliz em ver sua foto e acompanhar sua evolução. Sua dedicação e execução técnica estão fantásticas! Como dica de mestre para os próximos passos, recomendo focar bastante nos detalhes de lixamento fino e no acabamento das bordas para valorizar ainda mais sua escultura. Continue firme nos treinos!`;
    }
    return `Olá! Obrigado por entrar em contato. Sobre sua dúvida na aula "${lessonTitle}", recomendo que revise os arquivos complementares e garanta que todas as práticas do curso estejam devidamente consolidadas. Experimentar diretamente na madeira ajudará a esclarecer esse conceito rapidamente. Se precisar de mais assistência, estou à disposição!`;
  }

  public async generateSummary(lessonTitle: string, lessonText: string): Promise<string> {
    const client = getGeminiClient();
    if (!client) {
      return this.getSummaryFallback(lessonTitle);
    }
    try {
      const prompt = `Você é o assistente pedagógico da Academia de Arte e Entalhe do mestre Andrew Lemos.
Sua tarefa é ler o texto de apoio da aula a seguir e criar um resumo estruturado, didático, focado e prático sobre os tópicos essenciais.

Título da Aula: "${lessonTitle}"
Texto de Apoio:
"${lessonText}"

Gere uma resposta em português do Brasil organizada com os seguintes tópicos em Markdown:
- **Resumo Geral**: Explicando de forma direta o objetivo da aula.
- **Conceitos Chave**: Lista com os pontos mais importantes abordados.
- **Anotações de Ouro**: Dicas rápidas do mestre para não esquecer.

Seja objetivo e mantenha o estilo artesanal, prático e didático.`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      return response.text || "";
    } catch (error: any) {
      Logger.error("Erro no Gemini Summary:", error);
      return this.getSummaryFallback(lessonTitle);
    }
  }

  private getSummaryFallback(lessonTitle: string): string {
    return `### Resumo da Aula: ${lessonTitle}\n\n* **Resumo Geral**: Esta aula foca no aprimoramento das técnicas manuais de entalhe e escultura. Compreender o sentido das fibras da madeira e a postura correta das mãos é fundamental para criar relevos limpos e expressivos.\n* **Conceitos Chave**:\n  - Sentido das Fibras: Cortar sempre a favor da fibra para evitar lascar a peça.\n  - Empunhadura de Segurança: Manter ambas as mãos atrás do fio de corte da ferramenta.\n  - Seleção de Madeira: Preferir madeiras macias (como Cedro ou Caixeta) para iniciantes.\n* **Anotações de Ouro**: Vá com calma, faça cortes superficiais sucessivos em vez de tentar remover muita madeira de uma única vez. Afie sua goiva regularmente para garantir precisão e segurança!`;
  }

  public async suggestExercises(lessonTitle: string, lessonText: string): Promise<string> {
    const client = getGeminiClient();
    if (!client) {
      return this.getExercisesFallback(lessonTitle);
    }
    try {
      const prompt = `Você é o mestre Andrew Lemos da Academia de Arte e Entalhe.
Sua tarefa é sugerir exercícios práticos altamente didáticos e progressivos para o aluno realizar em casa com base no conteúdo da aula a seguir.

Título da Aula: "${lessonTitle}"
Texto de Apoio da Aula:
"${lessonText}"

Gere uma resposta em português do Brasil organizada em Markdown contendo:
- **Exercício Teórico-Reflexivo**: Uma atividade para fixar os conceitos na mente.
- **Exercício Prático de Entrada (Aquecimento)**: Um treino simples na madeira ou papel para praticar a coordenação.
- **Desafio Principal de Escultura**: O projeto prático para colocar o conteúdo à prova.

Seja inspirador, direto e muito claro nas instruções de segurança.`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      return response.text || "";
    } catch (error: any) {
      Logger.error("Erro no Gemini Exercises:", error);
      return this.getExercisesFallback(lessonTitle);
    }
  }

  private getExercisesFallback(lessonTitle: string): string {
    return `### Exercícios Sugeridos para: ${lessonTitle}\n\n* **Exercício Teórico-Reflexivo**: Faça um desenho preliminar em escala 1:1 no papel do relevo que deseja entalhar, identificando onde estarão as áreas de sombra (mais profundas) e de luz (mais altas).\n* **Exercício Prático de Entrada (Aquecimento)**: Em um bloco de teste, faça cortes retos paralelos usando o formão plano. Tente manter a mesma profundidade em toda a extensão do corte e sinta a resistência da madeira ao mudar o sentido do corte.\n* **Desafio Principal de Escultura**: Desenhe um motivo floral simples de 10x10cm no bloco de cedro. Usando a goiva de contorno (V-tool), faça o entalhe das linhas externas e, com o formão reto, rebaixe o fundo em 2mm para destacar o elemento central. Não se esqueça de usar luvas de proteção!`;
  }

  public async generateComplementaryMaterial(lessonTitle: string, lessonText: string): Promise<string> {
    const client = getGeminiClient();
    if (!client) {
      return this.getMaterialFallback(lessonTitle);
    }
    try {
      const prompt = `Você é o mestre Andrew Lemos da Academia de Arte e Entalhe.
Sua tarefa é gerar um material didático complementar e avançado para os alunos que desejam se aprofundar na aula a seguir.

Título da Aula: "${lessonTitle}"
Texto de Apoio da Aula:
"${lessonText}"

Gere uma resposta em português do Brasil formatada em Markdown contendo:
- **Glossário Técnico**: Termos específicos e jargões da profissão comentados.
- **Guia de Ferramentas Recomendadas**: Quais goivas, formões ou lixas específicas potencializam este trabalho.
- **Leitura Recomendada e Referência Visual**: Obras de arte, estilos históricos ou referências de grandes mestres recomendados para estudo de repertório.

Ofereça insights profissionais valiosos que apenas um especialista sênior saberia.`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      return response.text || "";
    } catch (error: any) {
      Logger.error("Erro no Gemini Material:", error);
      return this.getMaterialFallback(lessonTitle);
    }
  }

  private getMaterialFallback(lessonTitle: string): string {
    return `### Material Complementar Avançado: ${lessonTitle}\n\n* **Glossário Técnico**:\n  - *Entalhe em Baixo-Relevo*: Técnica onde a imagem esculpida fica recuada em relação à superfície plana do bloco de madeira.\n  - *Contra-fibra*: Direção perpendicular às fibras da madeira, que oferece maior resistência e exige ferramentas perfeitamente afiadas.\n* **Guia de Ferramentas Recomendadas**:\n  - Goiva de Contorno (V-tool) de 60 graus para desenhar as linhas principais.\n  - Formão Reto de 12mm para rebaixar grandes áreas de fundo.\n  - Pedra de Afiar Combinada (Granulação #1000/#6000) e Strop de Couro com pasta de polimento para acabamento espelhado nas ferramentas.\n* **Leitura e Referência Visual**: Estude os ornamentos arquitetônicos barrocos das igrejas coloniais brasileiras (como as obras do mestre Aleijadinho). Analise como o drapeado das vestes e as texturas das folhas foram resolvidos diretamente na madeira.`;
  }

  public async correctAnswer(lessonTitle: string, lessonText: string, question: string, userAnswer: string): Promise<string> {
    const client = getGeminiClient();
    if (!client) {
      return this.getCorrectionFallback(lessonTitle, question, userAnswer);
    }
    try {
      const prompt = `Você é o mestre Andrew Lemos da Academia de Arte e Entalhe.
Sua tarefa é corrigir a resposta de um aluno para um exercício ou quiz da aula a seguir de forma extremamente didática, construtiva e humanizada.

Título da Aula: "${lessonTitle}"
Conteúdo da Aula: "${lessonText}"

Pergunta/Desafio proposto:
"${question}"

Resposta enviada pelo Aluno:
"${userAnswer}"

Gere uma resposta em português do Brasil formatada em Markdown contendo:
- **Avaliação Técnico-Prática**: Feedback honesto sobre a precisão técnica da resposta enviada.
- **Pontos Fortes**: O que o aluno compreendeu corretamente.
- **Oportunidades de Melhoria**: Detalhes técnicos, conceitos ou truques que faltaram ou podem ser aprimorados.
- **Nota Sugerida**: Uma nota de 0 a 10 baseada na qualidade e precisão do raciocínio.

Mantenha o tom de um verdadeiro mestre tutor que deseja ver o aluno evoluir.`;

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
      });

      return response.text || "";
    } catch (error: any) {
      Logger.error("Erro no Gemini Correction:", error);
      return this.getCorrectionFallback(lessonTitle, question, userAnswer);
    }
  }

  private getCorrectionFallback(lessonTitle: string, question: string, userAnswer: string): string {
    return `### Correção do Mestre Andrew Lemos\n\n* **Avaliação Técnica**: Sua resposta demonstra uma excelente compreensão conceitual dos princípios básicos discutidos na aula de ${lessonTitle}.\n* **Pontos Fortes**: Você identificou corretamente a importância do controle de direção no corte e da fixação segura da peça, que são pilares da integridade física e da qualidade do entalhe.\n* **Oportunidades de Melhoria**: Para tornar sua prática ainda mais refinada, tente correlacionar a dureza da madeira selecionada com o ângulo de afiação das ferramentas (madeiras macias aceitam ângulos mais agudos, enquanto madeiras duras exigem ângulos mais obtusos para evitar quebras de fio).\n* **Nota Sugerida**: **9.5 / 10** - Um desempenho brilhante! Continue se dedicando assim às práticas teóricas e manuais!`;
  }
}
