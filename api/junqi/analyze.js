const TYPESAFE_ENDPOINT = 'https://api.typesafe.ai/v1/systemone';

const send = (res, status, body) => {
  res.status(status).json(body);
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return send(res, 405, { error: 'method_not_allowed' });
  }

  const apiKey = process.env.TYPESAFE_API_KEY;
  if (!apiKey) {
    return send(res, 503, { error: 'jev_not_configured' });
  }

  const body = req.body ?? {};
  const state = body.state;
  const candidates = Array.isArray(body.candidates) ? body.candidates : [];

  if (!state || candidates.length < 2 || candidates.length > 24) {
    return send(res, 400, { error: 'invalid_request' });
  }

  const criteria = {};
  for (const candidate of candidates) {
    if (
      !candidate ||
      typeof candidate.id !== 'string' ||
      typeof candidate.description !== 'string' ||
      candidate.id.length > 48 ||
      candidate.description.length > 800
    ) {
      return send(res, 400, { error: 'invalid_candidate' });
    }
    criteria[candidate.id] = candidate.description;
  }

  const payload = {
    model: 'jev-latest',
    state,
    questions: {
      best_move: {
        type: 'choice',
        instructions:
          'Choose the strongest move in this Chinese Junqi (Military Chess) position. ' +
          'Use only the observable state and supplied belief probabilities. Balance expected material outcome, ' +
          'flag safety, positional control, mobility, information gain, and downside risk. Do not assume hidden identities.',
        criteria,
      },
    },
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4500);

  try {
    const upstream = await fetch(TYPESAFE_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const data = await upstream.json().catch(() => null);

    if (!upstream.ok) {
      return send(res, 502, {
        error: 'jev_upstream_error',
        status: upstream.status,
      });
    }

    const answer = data?.answers?.best_move;
    if (!answer || answer.type !== 'choice') {
      return send(res, 502, { error: 'jev_invalid_response' });
    }

    return send(res, 200, {
      model: data.model ?? 'jev-latest',
      choice: answer.choice,
      probabilities: answer.probabilities ?? {},
      confidence: answer.confidence ?? null,
      usage: data.usage ?? null,
    });
  } catch (error) {
    return send(res, 504, {
      error: error?.name === 'AbortError' ? 'jev_timeout' : 'jev_request_failed',
    });
  } finally {
    clearTimeout(timeout);
  }
}
