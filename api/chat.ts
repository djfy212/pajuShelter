//api/chat.ts
// import type { VercelRequest, VercelResponse } from '@vercel/node';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY, // Vercel 환경변수에서 가져옴
});

// 1) 규칙 기반 답변 함수 
function getRuleBasedAnswer(userMessage: string): string | null {
  const msg = userMessage.replace(/\s/g, '').toLowerCase(); // 공백 제거

  // ① 지진 행동 요령
  if (msg.includes('행동 대처')) {
    return (
      '지진이 발생하면 우선 머리와 몸을 보호하는 것이 가장 중요합니다.\n' +
      '실내에서는 튼튼한 책상 아래로 들어가 머리와 목을 팔로 감싸고, 흔들림이 멈출 때까지 이동하지 마세요.\n' +
      '엘리베이터는 사용하지 말고, 계단을 이용해 밖으로 대피해야 합니다.\n' +
      '실외에서는 건물, 유리창, 간판, 전봇대에서 최대한 멀리 떨어져 넓은 공간으로 이동하세요.\n' +
      '흔들림이 멈춘 뒤에는 가스와 전기를 점검하고, 필요하면 지정 대피소로 이동하세요.'
    );
  }

  // ② 대피 준비물
  if (msg.includes('대피') || msg.includes('준비') || msg.includes('준비물')) {
    return (
      '지진 대피를 위해 최소한 다음 준비물을 가방에 모아두는 것이 좋습니다.\n' +
      '1) 신분증, 현금, 중요 서류 복사본\n' +
      '2) 생수와 비상식량(통조림, 에너지바 등) 2~3일 분량\n' +
      '3) 개인 상비약, 처방 약, 마스크, 휴지, 손 소독제\n' +
      '4) 휴대폰 보조배터리, 손전등, 여분의 건전지\n' +
      '5) 얇은 담요나 겉옷, 간단한 세면도구\n' +
      '손이 자유롭도록 배낭 형태의 가방에 넣어두면 실제 대피 시에 도움이 됩니다.'
    );
  }

  // ③ 여진·대피소에 얼마나 있어야 하는지
  if (msg.includes('여진') || msg.includes('언제까지') || msg.includes('얼마나')) {
    return (
      '본진 이후에는 크고 작은 여진이 여러 차례 발생할 수 있어, 충분한 시간 동안 주의가 필요합니다.\n' +
      '일반적으로는 건물에 대한 안전 점검이 끝나고, 추가 여진 위험이 낮다고 판단될 때까지 대피소에 머무르는 것이 안전합니다.\n' +
      '지자체 안내 방송, 문자를 통해 귀가 가능 여부를 확인한 뒤 이동하세요.\n' +
      '귀가 전에는 건물 외벽과 벽의 균열, 유리 파손, 가스 누출 여부를 꼭 확인하는 것이 좋습니다.'
    );
  }

  // ④ 가족 연락 / 안부 확인
  if (msg.includes('가족 연락') || msg.includes('안부')) {
    return (
      '재난 상황에서는 전화 통화가 잘 되지 않을 수 있으므로, 문자메시지나 메신저로 짧게 안부를 전하는 것이 좋습니다.\n' +
      '가족끼리 미리 정해 둔 만남 장소(집 근처 공원, 학교 운동장 등)를 정해 두면 서로 연락이 안 될 때 큰 도움이 됩니다.\n' +
      '서울·경기 지역에서는 안전신문고 앱과 지자체 재난 문자, 방송을 통해 대피소 위치와 연락처를 확인할 수 있습니다.\n' +
      '가족 구성원의 평소 이동 경로(학교, 직장, 학원 등)를 미리 공유해 두는 것도 중요합니다.'
    );
  }

  // 위 네 가지에 안 걸리면 null → LLM에게 넘김
  return null;
}

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
      temperature: 0.2,
      max_tokens: 400,
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