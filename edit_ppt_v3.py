from pptx import Presentation
from pptx.util import Inches, Pt
import os

prs = Presentation('SIH2025-IDEA-Presentation-Format.pptx')

# Slide 1: Title & Detailed Summary
slide_1 = prs.slides[0]
for shape in slide_1.shapes:
    if not shape.has_text_frame: continue
    text = shape.text
    if 'Problem Statement Title' in text:
        shape.text = (
            "Problem Statement Title - Blockchain-Based Secure Platform for Identity, Access Control, and Digital Asset Management\n"
            "Theme - Cybersecurity / Blockchain | PS Category - Software\n"
            "Team ID - TBA | Team Name (Registered on portal) - BEL SENTINEL\n\n"
            "DETAILED PROJECT ANALYSIS:\n"
            "• Objective: Overcome single points of failure in centralized IAM systems using a hybrid Web2/Web3 architecture.\n"
            "• Core Innovation: Immutable NFT-based asset tracking combined with self-custodial DIDs and batched Merkle root auditing.\n"
            "• Target: Enterprise and government sectors requiring military-grade, zero-trust infrastructure without sacrificing UX.\n"
            "• Tech Stack: Next.js, Supabase (PostgreSQL), Solidity (EVM), Cloudflare R2, IPFS."
        )
        for p in shape.text_frame.paragraphs:
            p.font.size = Pt(13)

# Slide 2: Idea Title & Proposed Solution
slide_2 = prs.slides[1]
for shape in slide_2.shapes:
    if not shape.has_text_frame: continue
    if 'IDEA TITLE' in shape.text:
        shape.text = "IDEA: BEL SENTINEL - Decentralized Identity & Asset Ecosystem"
    elif 'Proposed Solution' in shape.text:
        shape.text = (
            "Detailed Proposed Solution & Core Workflow:\n"
            "• Decentralized Identifiers (DIDs): Every user controls a self-custodial wallet linked to a non-transferable Identity NFT, providing absolute cryptographic proof of identity.\n"
            "• Immutable Asset Lifecycle: Physical/Digital assets are minted as unique ERC-721 NFTs. The smart contract automatically enforces state transitions (CREATED → ASSIGNED → TRANSFERRED → DECOMMISSIONED).\n"
            "• Hybrid Role-Based Access Control (RBAC): Supabase Row Level Security (RLS) handles fast off-chain reads, while Solidity smart contracts enforce strict administrative role checks for on-chain writes.\n"
            "• Merkle-Batched Auditing: To prevent exorbitant gas fees, thousands of access logs are hashed into a single Merkle Root off-chain, and only the root is anchored to the EVM blockchain periodically.\n"
            "• Guardian Social Recovery: Mitigates key-loss risks by allowing a multisig consensus of 'Guardian' wallets to securely migrate an identity to a new address."
        )
        for p in shape.text_frame.paragraphs:
            p.font.size = Pt(12)
            p.space_after = Pt(4)
    elif 'Your Team Name' in shape.text:
        shape.text = "Team BEL SENTINEL"

# Slide 3: Tech Approach & Flowchart
slide_3 = prs.slides[2]
for shape in slide_3.shapes:
    if not shape.has_text_frame: continue
    if 'Technologies to be used' in shape.text:
        shape.text = (
            "Technical Approach & Architecture Integration:\n"
            "• Next.js App Router & TailwindCSS: Delivers a responsive, glassmorphic UI, abstracting blockchain complexities via wagmi/viem.\n"
            "• Supabase (PostgreSQL): Stores encrypted biometric data hashes, robust relational metadata, and high-frequency confidential access logs.\n"
            "• EVM Smart Contracts: IdentityRegistry, AssetNFT, and RoleManager deployed on a local Hardhat network (production-ready for Polygon/Arbitrum).\n"
            "• Decentralized Storage: IPFS (Pinata) stores immutable documents; Cloudflare R2 secures time-bound biometric image URLs."
        )
        for p in shape.text_frame.paragraphs:
            p.font.size = Pt(11)
            p.space_after = Pt(2)
    elif 'Your Team Name' in shape.text:
        shape.text = "Team BEL SENTINEL"

# Insert arch.png if exists
if os.path.exists('arch.png'):
    slide_3.shapes.add_picture('arch.png', Inches(4.5), Inches(2.5), width=Inches(5))

# Slide 4: Feasibility & RBAC Flow
slide_4 = prs.slides[3]
for shape in slide_4.shapes:
    if not shape.has_text_frame: continue
    if 'Analysis of the feasibility' in shape.text:
        shape.text = (
            "Feasibility, Scalability, and Risk Mitigation:\n"
            "• High Feasibility: Built entirely on mature, audited OpenZeppelin standards combined with enterprise-ready Supabase infrastructure.\n"
            "• Challenge - Network Congestion & Gas Costs: Addressed via our custom Merkle-tree batching algorithm, reducing transaction costs by 99%.\n"
            "• Challenge - User UX Friction: Addressed by abstracting wallet approvals through a modern dashboard and seamless auth flows.\n"
            "• Challenge - Data Privacy on Public Ledger: Overcome by storing only cryptographic hashes and zero-knowledge proofs on-chain, keeping PII secured in R2/Supabase."
        )
        for p in shape.text_frame.paragraphs:
            p.font.size = Pt(12)
            p.space_after = Pt(2)
    elif 'Your Team Name' in shape.text:
        shape.text = "Team BEL SENTINEL"

# Insert rbac.png if exists
if os.path.exists('rbac.png'):
    slide_4.shapes.add_picture('rbac.png', Inches(4.5), Inches(2.5), width=Inches(5))

# Slide 5: Impact
slide_5 = prs.slides[4]
for shape in slide_5.shapes:
    if not shape.has_text_frame: continue
    if 'Potential impact' in shape.text:
        shape.text = (
            "Strategic Impact and Enterprise Benefits:\n"
            "• Unprecedented Security (Zero-Trust): Cryptographic verification eliminates phishing, password breaches, and internal lateral movement.\n"
            "• Absolute Transparent Provenance: Asset histories cannot be forged, manipulated, or deleted, guaranteeing 100% accurate audits.\n"
            "• Economic Efficiency: Automates manual compliance reporting and role-lifecycle management through deterministic smart contracts.\n"
            "• Broad Applicability: Essential for Defense (tracking classified gear), Healthcare (securing patient access), and Supply Chain (verifying authentic goods)."
        )
        for p in shape.text_frame.paragraphs:
            p.font.size = Pt(13)
            p.space_after = Pt(4)
    elif 'Your Team Name' in shape.text:
        shape.text = "Team BEL SENTINEL"

# Slide 6: Research & Detailed Summary (Last Page)
slide_6 = prs.slides[5]
for shape in slide_6.shapes:
    if not shape.has_text_frame: continue
    if 'Details / Links' in shape.text:
        shape.text = (
            "DETAILED ANALYSIS SUMMARY & REFERENCES:\n"
            "• Market Gap: Current IAM solutions (Okta, AD) are honeypots. Decentralization is the definitive evolution of enterprise security.\n"
            "• Core Strength: The dual-layer approach (PostgreSQL + EVM) achieves Web2 speed with Web3 immutability. No other platform offers Merkle-batched audit logs out-of-the-box.\n"
            "• References & Standards:\n"
            "  1. Decentralized Identity Foundation (DIF) - DID Core v1.0.\n"
            "  2. NIST SP 800-207 - Zero Trust Architecture Guidelines.\n"
            "  3. ERC-721 Standard - Non-Fungible Tokens (EIPs).\n"
            "  4. GDPR Article 17 (Right to Erasure) - Satisfied via off-chain PII deletion."
        )
        for p in shape.text_frame.paragraphs:
            p.font.size = Pt(12)
            p.space_after = Pt(3)
    elif 'Your Team Name' in shape.text:
        shape.text = "Team BEL SENTINEL"

# Delete Slide 7
rId = prs.slides._sldIdLst[-1].rId
prs.part.drop_rel(rId)
del prs.slides._sldIdLst[-1]

prs.save('SIH2025-IDEA-Presentation-BEL-SENTINEL-Detailed.pptx')
