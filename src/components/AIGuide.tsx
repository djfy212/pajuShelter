//src/AIGuide.tsx
import { useState, useEffect, useRef } from 'react';
import { Send, User, AlertTriangle, Package, Home, Navigation } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// 🔹 로컬 개발일 때만 Vercel 도메인 사용
const API_BASE_URL = import.meta.env.DEV
  ? 'https://paju-shelter.vercel.app' // 본인 Vercel 도메인
  : ''; // 배포 환경에서는 같은 도메인의 /api/chat 사용

export default function AIGuide() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        '안녕하세요! 지진 대피 AI 가이드입니다. 지진 발생 시 행동 요령, 대피 준비물, 대피소 정보 등에 대해 질문해주세요.',
      timestamp: new Date(),
    },
  ]);

  const [input, setInput] = useState('');
  const [sessionId] = useState(() => crypto.randomUUID());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickQuestions = [
    '지진이 났는데 어떻게 해야 하나요?',
    '집에서 나갈 때 무엇을 챙겨야 하나요?',
    '여진이 계속되는데 언제까지 대피소에 있어야 하나요?',
    '가족과 연락이 안 될 때는 어떻게 하나요?',
  ];

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  /** 🔥 서버리스 API 호출 */
  const getAIResponse = async (userMessage: string): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!response.ok) throw new Error('API error');

    const data = await response.json();
    return data.reply as string;
  } catch (e) {
    console.error(e);
    return '죄송합니다. 현재 AI 서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
  }
};

  /** 🔥 메시지 전송 */
  const handleSend = async () => {
    if (!input.trim()) return;

    const userInput = input;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userInput,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    // AI 응답 가져오기
    const aiReply = await getAIResponse(userInput);

    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: aiReply,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);

    // Supabase 저장
    supabase.from('chatbot_conversations').insert({
      session_id: sessionId,
      user_message: userInput,
      bot_response: aiReply,
    });
  };

  /** 빠른 질문 버튼 */
  const handleQuickQuestion = (question: string) => {
    setInput(question);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">AI 대피 가이드</h1>
          <p className="text-sm text-gray-600">
            지진 발생 시 필요한 모든 정보를 AI가 실시간으로 안내해드립니다.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* ------------------ 채팅 영역 ------------------ */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col h-[600px]">
              <div className="p-3 border-b border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-white border">
                    <img src="/charater.jpg" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">AI 안전 가이드</h3>
                    <p className="text-xs text-green-600">온라인</p>
                  </div>
                </div>
              </div>

              {/* 메시지 리스트 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`flex items-start space-x-3 max-w-[80%] ${
                        message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-full overflow-hidden flex items-center justify-center ${
                          message.role === 'user' ? 'bg-blue-600' : 'bg-white border'
                        }`}
                      >
                        {message.role === 'user' ? (
                          <User className="w-4 h-4 text-white" />
                        ) : (
                          <img src="/charater.jpg" className="w-full h-full object-cover" />
                        )}
                      </div>

                      <div
                        className={`rounded-lg px-3 py-2 text-sm ${
                          message.role === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <div className="whitespace-pre-line">{message.content}</div>
                        <div
                          className={`text-xs mt-1 ${
                            message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                          }`}
                        >
                          {message.timestamp.toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <div ref={messagesEndRef} />
              </div>

              {/* 입력창 */}
              <div className="p-3 border-t border-gray-200">
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="질문을 입력하세요..."
                    className="flex-1 px-3 py-2 text-sm border rounded-lg focus:ring focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSend}
                    className="p-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* ------------------ 우측 패널 ------------------ */}
          <div className="space-y-6">
            {/* FAQ */}
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <h3 className="font-semibold text-sm mb-3">자주 묻는 질문</h3>
              <div className="space-y-2">
                {quickQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickQuestion(q)}
                    className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>

            {/* 긴급 행동 */}
            <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border p-4">
              <div className="flex items-start space-x-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <div>
                  <h3 className="font-semibold text-sm mb-1">긴급 상황 대응</h3>
                  <p className="text-xs">지진이 발생하면 즉시 아래 행동을 취하세요.</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="bg-white rounded-lg p-2 flex items-center space-x-2 text-xs">
                  <Package className="w-4 h-4 text-blue-600" />
                  <span>1. 몸을 보호하세요</span>
                </div>
                <div className="bg-white rounded-lg p-2 flex items-center space-x-2 text-xs">
                  <Home className="w-4 h-4 text-blue-600" />
                  <span>2. 탁자 아래로 대피</span>
                </div>
                <div className="bg-white rounded-lg p-2 flex items-center space-x-2 text-xs">
                  <Navigation className="w-4 h-4 text-blue-600" />
                  <span>3. 대피소로 이동</span>
                </div>
              </div>

              <button className="w-full mt-3 bg-red-600 text-white text-sm rounded-lg py-2 hover:bg-red-700">
                긴급 대피소 찾기
              </button>
            </div>

            {/* 준비도 */}
            <div className="bg-white rounded-xl shadow-sm border p-4">
              <h3 className="font-semibold text-sm mb-3">대피 준비도 점검</h3>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">비상 연락망</span>
                  <span className="text-sm text-green-600 font-medium">완료</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">비상 물품</span>
                  <span className="text-sm text-yellow-600 font-medium">60%</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm">대피 경로</span>
                  <span className="text-sm text-gray-400 font-medium">미완료</span>
                </div>
              </div>

              <button className="w-full mt-3 bg-blue-600 text-white text-sm rounded-lg py-2 hover:bg-blue-700">
                준비도 향상하기
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
