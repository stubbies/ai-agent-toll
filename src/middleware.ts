import { Context, Next } from 'hono';
import { Action, GatekeeperConfig } from './types';
import { gatekeeperLogic } from './core';

export const gatekeeper = (config: GatekeeperConfig) => {
    return async (c: Context, next: Next) => {
        const result = await gatekeeperLogic(c.req.raw, config, c.env);
        if (result.action === Action.CHALLENGE_402) {
            return c.text('Payment Required', 402, {
                'WWW-Authenticate': result.challenge || '',
                'Link': `<${result.checkoutUrl}>; rel="payment"`,
                'X-Gatekeeper-Error': result.reason || '',
            });
        }
        await next();
    }
};
