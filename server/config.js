'use strict';

// Config. The AI key is OPTIONAL — the rule-based engine works fully without it;
// Claude just enriches natural-language edits + WHY explanations when present.
module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 4000,
  CLAUDE_API_KEY: process.env.CLAUDE_API_KEY || '',
  hasAI() { return !!process.env.CLAUDE_API_KEY; },
  // Cape Town city centre — default coordinates until the user's stay is set.
  CAPE_TOWN: { lat: -33.9249, lon: 18.4241 },
};
