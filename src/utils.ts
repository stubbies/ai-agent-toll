import { verifyTypedData, type Address } from 'viem';
import { PricingRule } from './types';

/**
 * Finds the first matching pricing rule for a given path.
 * Tip: Users should put specific paths at the top of their array.
 */
export function matchRule(path: string, rules: PricingRule[]): PricingRule | undefined {
    return rules.find((rule) => {
        try {
            const regex = new RegExp(rule.pattern);
            return regex.test(path);
        } catch (e) {
            console.error(`Gatekeeper: Invalid regex pattern "${rule.pattern}"`);
            return false;
        }
    });
}

export interface AccessGrantPayload {
    recipient: Address;
    token: Address;
    price: string;
    path: string;
    expiry: number;
    uid: string;
}

/**
 * Verifies the EIP-712 AccessGrant from the Authorization header.
 * Expects format: "Gatekeeper <base64_json_payload>.<hex_signature>"
 */
export async function verifyAccessGrant(
    authHeader: string,
    currentUrl: string,
    env: any,
    requiredPrice: string,
    requiredTokenAddress: Address
): Promise<boolean> {
    try {
        // 1. Parse the Standard Authorization Header
        const [scheme, token] = authHeader.split(' ');
        if (scheme !== 'Gatekeeper' || !token) return false;

        const [base64Payload, signature] = token.split('.');
        if (!base64Payload || !signature) return false;

        // 2. Decode the Payload
        const payload: AccessGrantPayload = JSON.parse(atob(base64Payload));
        const { pathname } = new URL(currentUrl);

        if (!isPathAuthorized(payload.path, pathname)) {
            return false;
        }

        // 3. Logic Validation (Check if the payment matches the request)
        const isExpired = payload.expiry < Math.floor(Date.now() / 1000);
        const isWrongPath = payload.path !== pathname && payload.path !== '*';
        const isWrongToken = payload.token.toLowerCase() !== requiredTokenAddress.toLowerCase();
        const isWrongPrice = parseFloat(payload.price) < parseFloat(requiredPrice);
        const isWrongRecipient = payload.recipient.toLowerCase() !== env.PAYMENT_ADDRESS.toLowerCase();

        if (isExpired || isWrongPath || isWrongToken || isWrongPrice || isWrongRecipient) {
            return false;
        }

        // 4. Cryptographic Validation (EIP-712)
        // The 'uid' acts as the signer's address or a link to the txHash
        const isValid = await verifyTypedData({
            address: payload.uid as Address,
            domain: {
                name: 'Gatekeeper',
                version: '1',
                chainId: 8453, // Base Mainnet
            },
            types: {
                AccessGrant: [
                    { name: 'recipient', type: 'address' },
                    { name: 'token', type: 'address' },
                    { name: 'price', type: 'string' },
                    { name: 'path', type: 'string' },
                    { name: 'expiry', type: 'uint256' },
                    { name: 'uid', type: 'string' },
                ],
            },
            primaryType: 'AccessGrant',
            message: payload as any,
            signature: signature as `0x${string}`,
        });

        return isValid;
    } catch (error) {
        console.error('Gatekeeper Verification Error:', error);
        return false;
    }
}

/**
 * Checks if the requested path is covered by the AccessGrant path.
 * Supports exact matches and trailing wildcards (e.g., /api/*)
 */
function isPathAuthorized(authorizedPath: string, requestedPath: string): boolean {
    if (authorizedPath === '*') return true;
    if (authorizedPath === requestedPath) return true;

    if (authorizedPath.endsWith('/*')) {
        const prefix = authorizedPath.slice(0, -1); // e.g., "/api/"
        return requestedPath.startsWith(prefix);
    }

    return false;
}

/**
 * Checks if the session is valid by verifying the access grant
 * @param cookieHeader - The cookie header from the request
 * @param req - The request object
 * @param env - The environment object
 * @returns True if the session is valid, false otherwise
 */
export async function isSessionValid(cookieHeader: string, currentUrl: string, env: any): Promise<boolean> {
    const sessionMatch = cookieHeader.match(/x402_grant=([^;]+)/);
    if (sessionMatch) {
        const sessionToken = decodeURIComponent(sessionMatch[1]);
        return await verifyAccessGrant(sessionToken, currentUrl, env, "0", "0x0"); 
    }
    return false;
}
