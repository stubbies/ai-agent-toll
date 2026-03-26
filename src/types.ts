import { IncomingRequestCfProperties } from "@cloudflare/workers-types";

export enum PricingStrategy {
    PAY = 'PAY',
    FREE = 'FREE',
    BLOCK = 'BLOCK',
}

export interface TokenConfig {
    address: `0x${string}`;
    chainId: number;
    name: string;
}

export interface PricingRule {
    pattern: string;         // Regex pattern (e.g., "^/api/.*")
    price: string;           // Price in USDC (e.g., "0.05")
    token: TokenConfig;      // The network/token to use
    strategy: PricingStrategy;
    duration?: number;
}

export interface GatekeeperConfig {
    /** The wallet address where USDC payments should be sent */
    paymentAddress: `0x${string}`;

    /** Optional: Custom checkout URL if the user hosts their own UI */
    checkoutUrl?: string;

    /** The default list of pricing rules */
    rules: PricingRule[];

    /** 
     * Optional: How strictly to block. 
     * 'strict' = block all suspected bots, 
     * 'lax' = only block high-confidence bots. 
     */
    mode?: 'strict' | 'lax';

    /** The default tokens to use */
    defaultTokens: TokenConfig[];

    /** Default seconds a payment lasts (e.g., 86400 for 1 day) */
    defaultDuration?: number; 
}

export enum Action {
    CHALLENGE_402 = 'CHALLENGE_402',
    ALLOW = 'ALLOW',
    BLOCK = 'BLOCK',
}

export enum Reason {
    SIGNATURE_ALREADY_USED = 'signature_already_used',
}

export type GatekeeperResult =
    | {
        action: Action.CHALLENGE_402;
        challenge: string;
        checkoutUrl?: string;
        reason?: Reason;
    }
    | {
        action: Action.ALLOW;
    }
    | {
        action: Action.BLOCK;
        reason: Reason;
    };



export interface ExtendedBotManagement {
    score: number;
    verifiedBot: boolean;
    staticResource?: boolean;
    ja3Hash?: string;
    ja4?: string;
    detectionIds?: number[];
}

export type GatekeeperIncomingRequest = Request & {
    cf: IncomingRequestCfProperties & {
        botManagement?: ExtendedBotManagement;
    };
};
