import { gatekeeperLogic } from './core';
import { Action, GatekeeperConfig } from './types';

export const withGatekeeper = (
    handler: ExportedHandlerFetchHandler,
    config: GatekeeperConfig
): ExportedHandlerFetchHandler => {
    return async (request, env, ctx) => {
        const result = await gatekeeperLogic(request, config, env);

        if (result.action === Action.CHALLENGE_402) {
            return new Response('Payment Required', {
                status: 402,
                headers: {
                    'WWW-Authenticate': result.challenge,
                    'Link': `<${result.checkoutUrl}>; rel="payment"`,
                    'Content-Type': 'text/plain',
                },
            });
        }

        return handler(request, env, ctx);
    };
};
