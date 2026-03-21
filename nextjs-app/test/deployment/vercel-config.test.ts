import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

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
      expect(vercelJson.installCommand).toContain('npm install');
    });
  });

  describe('Build Configuration', () => {
    it('should have next.config.ts', () => {
      const nextConfigPath = join(projectRoot, 'next.config.ts');
      const nextConfigContent = readFileSync(nextConfigPath, 'utf-8');

      // Vercel handles output mode natively — standalone is not required
      expect(nextConfigContent).toContain('NextConfig');
    });

    it('should have package.json with build script', () => {
      const packageJsonPath = join(projectRoot, 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

      expect(packageJson.scripts).toBeDefined();
      expect(packageJson.scripts.build).toBe('next build');
    });

    it('should have package.json with test script', () => {
      const packageJsonPath = join(projectRoot, 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));

      expect(packageJson.scripts.test).toBe('vitest run');
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
