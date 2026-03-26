import { DEFAULT_CHECKOUT_URL } from './constants';
import { Action, GatekeeperConfig, GatekeeperIncomingRequest, GatekeeperResult, PricingStrategy, Reason } from './types';
import { isSessionValid, matchRule, verifyAccessGrant } from './utils';

export async function gatekeeperLogic(req: Request, config: GatekeeperConfig, env: any): Promise<GatekeeperResult> {
    const { pathname } = new URL(req.url);
    const rule = matchRule(pathname, config.rules);

    if (!rule || rule.strategy !== PricingStrategy.PAY) return { action: Action.ALLOW };


    const cookieHeader = req.headers.get('Cookie') || '';
    const validSession = await isSessionValid(cookieHeader, req.url, env);
    if (validSession) return { action: Action.ALLOW };

    const cf = (req as GatekeeperIncomingRequest).cf;
    const botScore = cf?.botManagement?.score; // pro feature

    // TODO: Check JA4 reputation
    // const ja4 = cf?.botManagement?.ja4; // TLS Fingerprint (enterprise feature)
    // if (ja4 && await checkJa4Reputation(ja4)) isAgent = true; 

    const isMarkdown = req.headers.get('Accept')?.includes('text/markdown');

    const isAgent = (botScore !== undefined && botScore < 30) || isMarkdown;

    if (rule.strategy === PricingStrategy.PAY && !isAgent && config.mode === 'lax') {
        return { action: Action.ALLOW };
    }

    const duration = rule.duration || config.defaultDuration || 3600;
    const challenge = `Gatekeeper ` +
        `price="${rule.price}", ` +
        `duration="${duration}", ` +
        `token="${rule.token.address}", ` +
        `chain_id="${rule.token.chainId}", ` +
        `network="eip155:${rule.token.chainId}", ` + // EIP-155 network identifier, provides a globally unique chain ID for AI discovery.
        `recipient="${config.paymentAddress}"`;

    const authHeader = req.headers.get('Authorization');
    if (authHeader?.startsWith('Gatekeeper ')) {
        const isValid = await verifyAccessGrant(authHeader, req.url, env, rule.price, rule.token.address);

        if (isValid) {
            const signature = authHeader.split('.')[1];
            const sigHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(signature))
                .then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join(''));

            const alreadyUsed = await env.GATEKEEPER_CONFIG.get(`used:${signature}`);

            if (alreadyUsed) {
                return { action: Action.CHALLENGE_402, challenge, reason: Reason.SIGNATURE_ALREADY_USED };
            }

            await env.GATEKEEPER_CONFIG.put(`used:${sigHash}`, '1', { expirationTtl: duration });
            return { action: Action.ALLOW };
        }
    }

    const checkoutUrl = `${config.checkoutUrl ?? DEFAULT_CHECKOUT_URL}?to=${env.PAYMENT_ADDRESS}&amount=${rule.price}`;
    return { action: Action.CHALLENGE_402, challenge, checkoutUrl };
}
