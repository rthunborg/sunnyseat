import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';

describe('Root layout metadata', () => {
  const layoutPath = join(__dirname, '..', '..', 'app', 'layout.tsx');
  const layoutContent = readFileSync(layoutPath, 'utf-8');

  it('has title containing SunnySeat and Göteborg', () => {
    expect(layoutContent).toContain('SunnySeat');
    expect(layoutContent).toContain('Göteborg');
  });

  it('has meta description', () => {
    expect(layoutContent).toContain('description');
    expect(layoutContent).toContain('soliga uteserveringar');
  });

  it('has Open Graph title', () => {
    expect(layoutContent).toContain('openGraph');
    expect(layoutContent).toContain("title: 'SunnySeat");
  });

  it('has Open Graph locale set to sv_SE', () => {
    expect(layoutContent).toContain("locale: 'sv_SE'");
  });

  it('has Twitter card meta', () => {
    expect(layoutContent).toContain('twitter');
    expect(layoutContent).toContain("card: 'summary_large_image'");
  });

  it('html lang is set to sv', () => {
    expect(layoutContent).toContain('lang="sv"');
  });
});

describe('Venue detail page metadata', () => {
  const venuePath = join(__dirname, '..', '..', 'app', 'v', '[slug]', 'page.tsx');
  const venueContent = readFileSync(venuePath, 'utf-8');

  it('generates dynamic title with venue name', () => {
    expect(venueContent).toContain('generateMetadata');
    expect(venueContent).toContain('${venue.name}');
    expect(venueContent).toContain('SunnySeat');
  });

  it('generates Open Graph tags', () => {
    expect(venueContent).toContain('openGraph');
  });
});
