import { createMongoAbility } from '@casl/ability';
import type { MongoAbility } from '@casl/ability';

export type Actions = 'manage' | 'create' | 'read' | 'update' | 'delete';
export type AppAbility = MongoAbility<[Actions, any]>;

const getInitialRules = () => {
    if (typeof window !== 'undefined') {
        try {
            const rulesStr = localStorage.getItem("auth_rules");
            if (rulesStr) {
                return JSON.parse(rulesStr);
            }
        } catch (e) {
            console.error("Failed to parse initial CASL rules:", e);
        }
    }
    return [];
};

// Export the singleton ability instance initialized with rules from localStorage if available
export const ability = createMongoAbility<AppAbility>(getInitialRules());

/**
 * Update the singleton ability rules dynamically.
 * @param rules Array of raw CASL rules
 */
export function updateAbility(rules: any[]) {
    ability.update(rules);
}
