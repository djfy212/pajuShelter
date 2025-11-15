//api/chat.ts
// import type { VercelRequest, VercelResponse } from '@vercel/node';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY, // Vercel 환경변수에서 가져옴
});

export default async function handler(req: any, res: any) {
    // ✅ CORS 허용 — 로컬 환경에서 Vercel 도메인 호출 가능하게
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  
  // Vercel이 OPTIONS preflight 요청을 자동으로 보냄 → 미리 처리해줘야 함
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { messages } = req.body as {
      messages: { role: 'user' | 'assistant' | 'system'; content: string }[];
    };

    // 안전 가이드 역할을 고정하는 system 메시지
    const systemMessage = {
      role: 'system' as const,
      content:
                '너는 한국 파주시 기준의 지진 대피 안전 가이드야. ' +
        '지진이나 여진 상황에서 시민이 당장 실천할 수 있는 현실적인 행동 요령만 간단하고 침착하게 설명해. ' +
        '답변은 한국어로 하고, 너무 길지 않게 핵심 위주로 정리해. ' +
        '마크다운 문법(별표 **, # 제목, - 목록, ``` 코드블록 등)은 절대 사용하지 말고, ' +
        '일반 문장이나 1) 2) 3) 형식의 번호 정도만 사용해. ' +
        '같은 내용을 반복해서 늘어놓지 말고, 중복되는 문장은 쓰지 마.',
    };

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [systemMessage, ...messages],
      temperature: 0.3,
      max_tokens: 512,
    });

    const reply =
      completion.choices[0]?.message?.content ??
      '지금은 답변을 생성하지 못했습니다. 잠시 후 다시 시도해주세요.';

    res.status(200).json({ reply });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: 'Groq 요청 중 오류가 발생했습니다.' });
  }
}