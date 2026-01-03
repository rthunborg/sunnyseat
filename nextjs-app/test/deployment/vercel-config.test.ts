import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

// Deployment tests don't need jsdom environment
describe('Vercel Deployment Configuration', () => {
  const projectRoot = process.cwd();
  const vercelJsonPath = join(projectRoot, 'vercel.json');

  describe('vercel.json', () => {
    it('should exist and be valid JSON', () => {
      const vercelJson = JSON.parse(readFileSync(vercelJsonPath, 'utf-8'));
      expect(vercelJson).toBeDefined();
      expect(typeof vercelJson).toBe('object');
    });

    it('should have correct build configuration', () => {
      const vercelJson = JSON.parse(readFileSync(vercelJsonPath, 'utf-8'));
      
      expect(vercelJson.buildCommand).toBe('npm run build');
      expect(vercelJson.outputDirectory).toBe('.next');
      expect(vercelJson.framework).toBe('nextjs');
      expect(vercelJson.installCommand).toBe('npm install');
    });

    it('should have cron jobs configured', () => {
      const vercelJson = JSON.parse(readFileSync(vercelJsonPath, 'utf-8'));
      
      expect(vercelJson.crons).toBeDefined();
      expect(Array.isArray(vercelJson.crons)).toBe(true);
      expect(vercelJson.crons.length).toBeGreaterThan(0);
    });

    it('should have all required cron jobs', () => {
      const vercelJson = JSON.parse(readFileSync(vercelJsonPath, 'utf-8'));
      const cronPaths = vercelJson.crons.map((cron: { path: string }) => cron.path);
      
      expect(cronPaths).toContain('/api/cron/weather-ingestion');
      expect(cronPaths).toContain('/api/cron/accuracy-metrics');
      expect(cronPaths).toContain('/api/cron/precomputation-schedule');
      expect(cronPaths).toContain('/api/cron/cache-warmup');
      expect(cronPaths).toContain('/api/cron/cleanup-old-data');
    });

    it('should have valid cron schedules', () => {
      const vercelJson = JSON.parse(readFileSync(vercelJsonPath, 'utf-8'));
      
      vercelJson.crons.forEach((cron: { path: string; schedule: string }) => {
        expect(cron.schedule).toBeDefined();
        expect(typeof cron.schedule).toBe('string');
        // Basic cron format validation (5 fields: minute hour day month weekday)
        const cronParts = cron.schedule.split(' ');
        expect(cronParts.length).toBe(5);
      });
    });

    it('should have valid cron paths', () => {
      const vercelJson = JSON.parse(readFileSync(vercelJsonPath, 'utf-8'));
      
      vercelJson.crons.forEach((cron: { path: string; schedule: string }) => {
        expect(cron.path).toBeDefined();
        expect(typeof cron.path).toBe('string');
        expect(cron.path).toMatch(/^\/api\/cron\//);
      });
    });
  });

  describe('Build Configuration', () => {
    it('should have next.config.ts with standalone output', () => {
      const nextConfigPath = join(projectRoot, 'next.config.ts');
      const nextConfigContent = readFileSync(nextConfigPath, 'utf-8');
      
      expect(nextConfigContent).toContain('output');
      expect(nextConfigContent).toContain('standalone');
    });

    it('should have package.json with build script', () => {
      const packageJsonPath = join(projectRoot, 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
      
      expect(packageJson.scripts).toBeDefined();
      expect(packageJson.scripts.build).toBe('next build');
    });
  });

  describe('Documentation', () => {
    it('should have deployment documentation', () => {
      const docsPath = join(projectRoot, 'docs', 'vercel-deployment.md');
      const docs = readFileSync(docsPath, 'utf-8');
      
      expect(docs).toBeDefined();
      expect(docs.length).toBeGreaterThan(0);
      expect(docs).toContain('Vercel Deployment Guide');
    });

    it('should have environment variables documentation', () => {
      const envDocsPath = join(projectRoot, 'docs', 'environment-variables.md');
      const envDocs = readFileSync(envDocsPath, 'utf-8');
      
      expect(envDocs).toBeDefined();
      expect(envDocs.length).toBeGreaterThan(0);
      expect(envDocs).toContain('Environment Variables Reference');
    });

    it('should document all required environment variables', () => {
      const envDocsPath = join(projectRoot, 'docs', 'environment-variables.md');
      const envDocs = readFileSync(envDocsPath, 'utf-8');
      
      const requiredVars = [
        'NEXT_PUBLIC_SUPABASE_URL',
        'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        'SUPABASE_SERVICE_ROLE_KEY',
        'JWT_SECRET',
        'CRON_SECRET',
        'NEXT_PUBLIC_APP_URL',
        'NODE_ENV',
      ];
      
      requiredVars.forEach((varName) => {
        expect(envDocs).toContain(varName);
      });
    });
  });
});
