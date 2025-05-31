
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { GoogleGenAI, Chat, GenerateContentResponse } from '@google/genai';
import { Card } from './ui/Card';
import Input from './ui/Input';
import Button from './ui/Button';
import { AvailableIndicatorForTerminal, MergedTerminalChartDataPoint } from '../types';

const PaperAirplaneIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
  </svg>
);

interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: Date;
  isLoading?: boolean;
}

interface TerminalChatInterfaceProps {
  selectedIndicators: AvailableIndicatorForTerminal[];
  chartData: MergedTerminalChartDataPoint[];
}

const TerminalChatInterface: React.FC<TerminalChatInterfaceProps> = ({ selectedIndicators, chartData }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState<string>('');
  const [isLoadingAiResponse, setIsLoadingAiResponse] = useState<boolean>(false);
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  useEffect(() => {
    if (!process.env.API_KEY) {
      console.error("API_KEY is not set for Gemini.");
      setMessages(prev => [...prev, { id: 'system-error-apikey', role: 'system', text: "Erro de configuração: A chave da API para o serviço de IA não está definida.", timestamp: new Date() }]);
      return;
    }
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      chatSessionRef.current = ai.chats.create({
        model: 'gemini-2.5-flash-preview-04-17',
        config: {
          systemInstruction: "Você é um assistente financeiro especializado em analisar dados macroeconômicos brasileiros e gráficos de séries temporais. Seja conciso e foque nos dados fornecidos."
        }
      });
      setMessages([{ id: 'system-init', role: 'system', text: "Olá! Como posso ajudar a analisar os indicadores e o gráfico?", timestamp: new Date() }]);
    } catch (error) {
      console.error("Error initializing Gemini Chat:", error);
      setMessages(prev => [...prev, { id: 'system-error-init', role: 'system', text: "Erro ao inicializar o assistente de IA.", timestamp: new Date() }]);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const prepareChatContext = (): string => {
    let context = "Contexto atual:\n";
    if (selectedIndicators.length > 0) {
      context += `Indicadores selecionados no gráfico: ${selectedIndicators.map(ind => ind.name).join(', ')}.\n`;
    } else {
      context += "Nenhum indicador selecionado no gráfico.\n";
    }

    if (chartData.length > 0) {
      const startDate = chartData[0]?.timestamp ? new Date(chartData[0].timestamp).toLocaleDateString('pt-BR') : 'N/D';
      const endDate = chartData[chartData.length - 1]?.timestamp ? new Date(chartData[chartData.length - 1].timestamp).toLocaleDateString('pt-BR') : 'N/D';
      context += `O gráfico exibe dados de ${startDate} até ${endDate}.\n`;
    } else {
      context += "Nenhum dado carregado no gráfico.\n";
    }
    return context;
  };

  const handleSendMessage = useCallback(async () => {
    if (!userInput.trim() || isLoadingAiResponse || !chatSessionRef.current) return;

    const userMessageContent = userInput.trim();
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: userMessageContent,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setIsLoadingAiResponse(true);

    const loadingMessageId = `model-loading-${Date.now()}`;
    setMessages(prev => [...prev, { id: loadingMessageId, role: 'model', text: "Pensando...", timestamp: new Date(), isLoading: true }]);

    try {
      const fullPrompt = `${prepareChatContext()}\n\nUsuário: ${userMessageContent}`;
      
      const result: GenerateContentResponse = await chatSessionRef.current.sendMessage({message: fullPrompt});

      if (!isMounted.current) return;

      setMessages(prev => prev.filter(msg => msg.id !== loadingMessageId)); 

      const aiResponseText = result.text;
      setMessages(prev => [...prev, {
        id: `model-${Date.now()}`,
        role: 'model',
        text: aiResponseText || "Não foi possível obter uma resposta.",
        timestamp: new Date(),
      }]);

    } catch (error: any) {
      console.error("Error sending message to Gemini:", error);
      if (!isMounted.current) return;
      setMessages(prev => prev.filter(msg => msg.id !== loadingMessageId));
      setMessages(prev => [...prev, {
        id: `system-error-send-${Date.now()}`,
        role: 'system',
        text: `Erro ao comunicar com a IA: ${error.message || "Falha desconhecida"}`,
        timestamp: new Date(),
      }]);
    } finally {
      if (isMounted.current) {
        setIsLoadingAiResponse(false);
      }
    }
  }, [userInput, isLoadingAiResponse, selectedIndicators, chartData]);

  return (
    <Card className="flex flex-col h-[500px] shadow-premium">
      <Card.Header>
        <Card.Title>Chat com IA Financeira</Card.Title>
      </Card.Header>
      <Card.Content className="flex-grow overflow-y-auto p-4 space-y-3 bg-slate-100 dark:bg-slate-800/70">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] p-2.5 rounded-xl shadow-subtle break-words ${
                msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' :
                msg.role === 'model' ? `bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-bl-none ${msg.isLoading ? 'italic text-slate-500 dark:text-slate-400' : ''}` :
                'bg-yellow-100 dark:bg-yellow-700/30 text-yellow-700 dark:text-yellow-200 text-xs p-2 w-full text-center italic rounded-md'
              }`}
            >
              {msg.isLoading ? (
                <div className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {msg.text}
                </div>
              ): (
                msg.text.split('\n').map((line, idx) => (
                  <p key={idx} className={line.startsWith('###') ? 'text-lg font-semibold mt-2 mb-1' : line.startsWith('##') ? 'text-md font-semibold mt-1 mb-0.5' : ''} 
                     dangerouslySetInnerHTML={{ __html: line
                    .replace(/^###\s*(.*)/g, '$1') 
                    .replace(/^##\s*(.*)/g, '$1')  
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') 
                    .replace(/\*(.*?)\*/g, '<em>$1</em>')      
                    .replace(/^\s*-\s(.*)/gm, '<ul class="list-disc list-inside ml-4"><li>$1</li></ul>') 
                  }} />
                ))
              )}
              {msg.role !== 'system' && !msg.isLoading && (
                <div className="text-xs mt-1.5 opacity-60 text-right">
                  {msg.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </Card.Content>
      <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80">
        <div className="flex items-center space-x-2">
          <Input
            type="text"
            id="chat-input"
            placeholder="Pergunte sobre os dados..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isLoadingAiResponse && handleSendMessage()}
            disabled={isLoadingAiResponse || !chatSessionRef.current}
            className="flex-grow"
            aria-label="Mensagem para IA"
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoadingAiResponse || !userInput.trim() || !chatSessionRef.current}
            aria-label="Enviar mensagem"
            size="md"
            className="p-2.5 aspect-square" 
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </Button>
        </div>
         <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 text-center">
           IA pode cometer erros. Verifique informações importantes.
        </p>
      </div>
    </Card>
  );
};

export default TerminalChatInterface;
