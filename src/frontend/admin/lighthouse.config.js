/**
 * Lighthouse CI configuration
 * Defines performance budgets and assertions for automated testing
 */
module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      startServerCommand: "npm run preview",
      startServerReadyPattern: "Local:",
      url: ["http://localhost:4173", "http://localhost:4173/v/test-venue"],
    },
    assert: {
      assertions: {
        // Performance - Start with achievable targets, increase over time
        "categories:performance": ["warn", { minScore: 0.8 }],
        "categories:accessibility": ["error", { minScore: 0.9 }],
        "categories:seo": ["error", { minScore: 0.9 }],
        "categories:pwa": ["warn", { minScore: 0.7 }],
        "categories:best-practices": ["warn", { minScore: 0.9 }],

        // Core Web Vitals
        "first-contentful-paint": ["warn", { maxNumericValue: 2000 }],
        "largest-contentful-paint": ["warn", { maxNumericValue: 2500 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "total-blocking-time": ["warn", { maxNumericValue: 300 }],

        // Resource budgets
        "resource-summary:script:size": ["warn", { maxNumericValue: 500000 }], // 500KB
        "resource-summary:stylesheet:size": [
          "warn",
          { maxNumericValue: 100000 },
        ], // 100KB
        "resource-summary:document:size": ["warn", { maxNumericValue: 50000 }], // 50KB
        "resource-summary:font:size": ["warn", { maxNumericValue: 200000 }], // 200KB
        "resource-summary:image:size": ["warn", { maxNumericValue: 300000 }], // 300KB
      },
    },
    upload: {
      target: "temporary-public-storage",
    },
  },
};
