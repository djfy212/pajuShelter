// api/chat.ts
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// 1) 규칙 기반 답변 함수
function getRuleBasedAnswer(userMessage: string): string | null {
  // 한글에는 lowerCase 영향은 적지만, 통일을 위해 사용
  const raw = userMessage.toLowerCase();
  const noSpace = raw.replace(/\s/g, ''); // 공백 제거

  console.log('[rule] raw   =', raw);
  console.log('[rule] noSpa =', noSpace);

  // ① "지진이 났는데 어떻게 해야 하나요?" 계열
  if (raw.includes('지진이')) {
    console.log('[rule] match: 지진이');
    return (
      '지진이 발생했을 때의 기본 행동 요령을 안내해 드리겠습니다.\n\n' +
      '1) 실내에 있다면 책상이나 침대처럼 튼튼한 가구 아래로 들어가 머리와 목을 두 팔로 감싸고, 흔들림이 멈출 때까지 움직이지 마세요.\n' +
      '2) 엘리베이터는 절대 사용하지 말고, 계단을 이용해 천천히 내려오세요.\n' +
      '3) 실외에 있다면 건물, 유리창, 간판, 전봇대에서 최대한 멀리 떨어져 넓은 공간으로 이동하세요.\n' +
      '4) 흔들림이 멈춘 뒤에는 가스 밸브와 전기 차단기를 확인하고, 피해가 의심되면 지정 대피소로 이동하세요.'
    );
  }

  // ② "집에서 나갈 때 무엇을 챙겨야 하나요?" 계열
  if (noSpace.includes('나갈때') || raw.includes('챙겨야')) {
    console.log('[rule] match: 나갈때/챙겨야');
    return (
      '집에서 급히 나가야 할 때는 다음과 같은 대피 준비물을 우선 챙기는 것이 좋습니다.\n\n' +
      '1) 지갑(신분증, 현금, 카드), 휴대폰과 보조배터리\n' +
      '2) 상비약, 개인이 복용 중인 약, 마스크\n' +
      '3) 생수와 간단한 비상식량(에너지바, 통조림 등)\n' +
      '4) 얇은 겉옷이나 담요, 휴지, 물티슈 등 기본 위생용품\n\n' +
      '손이 자유롭도록 배낭 형태의 가방에 넣어 한 번에 메고 나갈 수 있도록 미리 준비해 두는 것이 좋습니다.'
    );
  }

  // ③ "여진이 계속되는데 언제까지 대피소에 있어야 하나요?" 계열
  if (raw.includes('여진이') || raw.includes('여진 ') || raw.includes('대피소에')) {
    console.log('[rule] match: 여진/대피소에');
    return (
      '여진이 계속되는 동안에는 건물 안보다는 대피소처럼 안전이 확인된 장소에 머무르는 것이 좋습니다.\n\n' +
      '1) 지자체나 행정안전부에서 보내는 재난 문자를 통해 여진 상황과 귀가 가능 여부를 먼저 확인하세요.\n' +
      '2) 건물 안전 점검(균열, 붕괴 위험, 가스 누출 등)이 끝나고, 추가 여진 위험이 낮다고 판단될 때까지는 대피소에 머무르는 것이 안전합니다.\n' +
      '3) 일반적으로는 수 시간에서 수일 정도 소요될 수 있으므로, 안내 방송과 공지사항을 수시로 확인하세요.'
    );
  }

  // ④ "가족과 연락이 안 될 때는 어떻게 하나요?" 계열
  if (raw.includes('가족과') || noSpace.includes('연락이안될')) {
    console.log('[rule] match: 가족과/연락이안될');
    return (
      '가족과 연락이 잘 되지 않을 때는 다음과 같이 행동해 보세요.\n\n' +
      '1) 전화 통화보다는 문자메시지나 메신저로 짧게 안부를 전하는 것이 연결될 가능성이 더 높습니다.\n' +
      '2) 가족끼리 미리 정해 둔 만남 장소(예: 집 근처 공원, 학교 운동장)가 있다면, 서로 그 장소로 이동하도록 약속한 내용을 다시 떠올리세요.\n' +
      '3) 파주시와 같은 지자체의 재난 문자, 홈페이지, 안전 안내 방송을 통해 대피소 위치와 상황을 확인한 뒤, 대피소에서 가족 이름이나 연락처를 남겨두는 것도 도움이 됩니다.\n' +
      '4) 당황해서 계속 전화를 반복하기보다는, 짧은 문자와 약속된 만남 장소를 기준으로 차분히 행동하는 것이 중요합니다.'
    );
  }

  // 네 가지 패턴 어느 것도 아니면 null → LLM에게 넘김
  return null;
}

export default async function handler(req: any, res: any) {
  // ✅ CORS 허용 — 로컬 환경에서 Vercel 도메인 호출 가능하게
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');

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

    // 🔹 1) 마지막 user 메시지 찾아서 규칙 먼저 적용
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user')?.content;
    console.log('[handler] lastUserMessage =', lastUserMessage);

    if (lastUserMessage) {
      const ruleAnswer = getRuleBasedAnswer(lastUserMessage);
      if (ruleAnswer) {
        console.log('[handler] use rule-based answer');
        res.status(200).json({ reply: ruleAnswer });
        return; // ✅ 여기서 바로 종료해야 LLM을 안 부릅니다.
      }
    }

    // 🔹 2) 규칙에 안 걸린 경우에만 LLM 호출
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
