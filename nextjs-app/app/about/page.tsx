import { Metadata } from 'next';
import { AboutContent } from './AboutContent';

export const metadata: Metadata = {
  title: 'Om SunnySeat',
  description: 'Läs om hur SunnySeat hjälper dig hitta soliga uteplatser i Göteborg.',
};

export default function AboutPage() {
  return <AboutContent />;
}
