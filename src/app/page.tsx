'use client';

import dynamic from 'next/dynamic';
import Navbar from '@/components/landing/Navbar';
import HeroSection from '@/components/landing/HeroSection';
import ProblemSection from '@/components/landing/ProblemSection';
import SolutionSection from '@/components/landing/SolutionSection';
import HowItWorksSection from '@/components/landing/HowItWorksSection';
import IdentitySection from '@/components/landing/IdentitySection';
import AccessControlSection from '@/components/landing/AccessControlSection';
import AssetLifecycleSection from '@/components/landing/AssetLifecycleSection';
import BlockchainSection from '@/components/landing/BlockchainSection';
import IPFSSection from '@/components/landing/IPFSSection';
import ArchitectureSection from '@/components/landing/ArchitectureSection';
import SecuritySection from '@/components/landing/SecuritySection';
import DashboardPreview from '@/components/landing/DashboardPreview';
import CTASection from '@/components/landing/CTASection';
import Footer from '@/components/landing/Footer';

const GridBackground = dynamic(() => import('@/components/ui/GridBackground'), { ssr: false });

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <GridBackground />
      <Navbar />
      <HeroSection />
      <ProblemSection />
      <SolutionSection />
      <HowItWorksSection />
      <IdentitySection />
      <AccessControlSection />
      <AssetLifecycleSection />
      <BlockchainSection />
      <IPFSSection />
      <ArchitectureSection />
      <SecuritySection />
      <DashboardPreview />
      <CTASection />
      <Footer />
    </main>
  );
}
