'use strict';
require('dotenv').config();

// ─── Model Config ────────────────────────────────────────────────────────────
const MODELS = {
    ANALYSIS:  'google/gemini-2.5-flash-preview',   // Reasoning lourd
    AGENT:     'google/gemini-2.5-flash-preview',   // Conversationnel
    SCRIPT:    'google/gemini-2.5-flash-preview',   // Brief vocal
    FALLBACK:  'google/gemini-2.0-flash-001',       // Fallback universel
};

const MAX_RETRIES    = 3;
const BASE_DELAY_MS  = 800;
const TIMEOUT_MS     = 50000;  // 50s — Gemini peut être lent sur gros contexte

// ─── Helpers ─────────────────────────────────────────────────────────────────
function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function isRetryableStatus(status) {
    return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}

/**
 * Appelle OpenRouter avec retry exponentiel + fallback model.
 *
 * @param {Array}  messages  - Format OpenAI [{role, content}]
 * @param {Object} options   - { temperature, maxTokens, model, stream }
 * @returns {Promise<string>} - Contenu brut de la réponse LLM
 */
async function callLLM(messages, options = {}) {
    const {
        temperature = 0.3,
        maxTokens   = undefined,
        model       = MODELS.AGENT,
    } = options;

    const candidates = [model];
    if (model !== MODELS.FALLBACK) candidates.push(MODELS.FALLBACK);

    let lastError;

    for (const currentModel of candidates) {
        for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
            const controller = new AbortController();
            const timeoutId  = setTimeout(() => controller.abort(), TIMEOUT_MS);

            try {
                const reqBody = { model: currentModel, messages, temperature };
                if (maxTokens) reqBody.max_tokens = maxTokens;

                const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                        'Content-Type':  'application/json',
                        'HTTP-Referer':  'https://onework.app',
                        'X-Title':       'OneWork AI Assistant',
                    },
                    body:   JSON.stringify(reqBody),
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errText = await response.text().catch(() => '');
                    const err     = new Error(`OpenRouter [${currentModel}] ${response.status}: ${errText.slice(0, 300)}`);
                    err.status    = response.status;

                    // Erreurs client non-retryables (sauf 429)
                    if (response.status >= 400 && response.status < 500 && !isRetryableStatus(response.status)) {
                        throw err;
                    }
                    throw err;
                }

                const data    = await response.json();
                const content = data.choices?.[0]?.message?.content;
                if (!content) throw new Error(`Réponse vide du modèle ${currentModel}`);

                // Log usage pour monitoring
                if (data.usage) {
                    const u = data.usage;
                    console.log(`[LLM] ${currentModel} — ${u.prompt_tokens}p + ${u.completion_tokens}c tokens`);
                }

                return content.trim();

            } catch (err) {
                clearTimeout(timeoutId);
                lastError = err;

                const isLast   = attempt === MAX_RETRIES;
                const isAbort  = err.name === 'AbortError';

                if (isLast || (!isRetryableStatus(err.status) && !isAbort)) break;

                const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
                console.warn(`[LLM] ${currentModel} tentative ${attempt}/${MAX_RETRIES}: ${err.message} → retry dans ${delay}ms`);
                await sleep(delay);
            }
        }

        if (currentModel !== candidates[candidates.length - 1]) {
            console.warn(`[LLM] Bascule sur modèle fallback après échec de ${currentModel}`);
        }
    }

    throw lastError || new Error('Toutes les tentatives LLM ont échoué');
}

/**
 * Parse JSON depuis la réponse LLM.
 * Gère les code fences markdown et le texte parasite autour.
 *
 * @param {string} content
 * @returns {Object|Array}
 * @throws {SyntaxError}
 */
function parseJSON(content) {
    const stripped = content
        .replace(/^```json\s*/im, '')
        .replace(/^```\s*/im, '')
        .replace(/```\s*$/im, '')
        .trim();

    // Essaie d'extraire le premier objet/tableau JSON valide
    const match = stripped.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    const target = match ? match[1] : stripped;
    return JSON.parse(target);
}

/**
 * Tronque intelligemment un tableau d'items pour limiter la taille du contexte.
 * Garde les items les plus récents/importants.
 *
 * @param {Array}  arr
 * @param {number} maxItems
 * @param {string} [bodyField]  - Champ texte à tronquer
 * @param {number} [maxBodyLen] - Longueur max du champ texte
 * @returns {Array}
 */
function smartSlice(arr, maxItems, bodyField = null, maxBodyLen = 200) {
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, maxItems).map(item => {
        if (!bodyField || !item[bodyField]) return item;
        const body = String(item[bodyField]);
        if (body.length <= maxBodyLen) return item;
        return { ...item, [bodyField]: body.slice(0, maxBodyLen) + '…' };
    });
}

module.exports = { callLLM, parseJSON, smartSlice, MODELS };
