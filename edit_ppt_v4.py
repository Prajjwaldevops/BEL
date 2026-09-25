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
            "EXECUTIVE SUMMARY & DETAILED ANALYSIS:\n"
            "• Objective: Eradicate single points of failure in centralized Identity & Access Management (IAM).\n"
            "• Architecture Flow: User Wallet -> Next.js Frontend -> Smart Contracts -> Merkle-Batched Audit Log.\n"
            "• Market Context: Modern security demands absolute Zero-Trust; current active-directory models act as lucrative honeypots.\n"
            "• Tech Stack Integration: Next.js (UX/UI), Supabase (PostgreSQL RLS for off-chain speed), Solidity EVM (Immutable logic), Cloudflare R2 / IPFS (Decentralized Object Storage)."
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
            "Detailed Proposed Solution & Core System Flow:\n"
            "1. Decentralized Identifiers (DIDs):\n"
            "   ➔ Users link a self-custodial wallet to receive an untransferable 'Soulbound' Identity NFT.\n"
            "   ➔ Cryptographically proves identity without storing passwords in a central database.\n"
            "2. Immutable Asset Lifecycle (NFTs):\n"
            "   ➔ Physical/Digital assets minted as ERC-721 NFTs. Status flows strictly: CREATED ➔ ASSIGNED ➔ ACTIVE ➔ TRANSFERRED ➔ DECOMMISSIONED.\n"
            "3. Hybrid Role-Based Access Control (RBAC):\n"
            "   ➔ Off-Chain: Supabase Row Level Security (RLS) handles fast, high-volume reads.\n"
            "   ➔ On-Chain: Solidity RoleManager contract enforces immutable write-permissions.\n"
            "4. Merkle-Batched Auditing (Gas Optimized):\n"
            "   ➔ 1,000+ access logs are hashed into a single Merkle Root off-chain, then anchored to the EVM periodicially (saves 99% gas fees).\n"
            "5. Guardian Social Recovery:\n"
            "   ➔ Mitigates key-loss risks by requiring an M-of-N consensus of 'Guardian' wallets to recover a lost identity."
        )
        for p in shape.text_frame.paragraphs:
            p.font.size = Pt(12)
            p.space_after = Pt(2)
    elif 'Your Team Name' in shape.text:
        shape.text = "Team BEL SENTINEL"

# Slide 3: Tech Approach & Architecture Details
slide_3 = prs.slides[2]
for shape in slide_3.shapes:
    if not shape.has_text_frame: continue
    if 'Technologies to be used' in shape.text:
        shape.text = (
            "Technical Approach & Flow Architecture:\n"
            "• Front-End (Web2 UX): Next.js 16 App Router + TailwindCSS.\n"
            "  ➔ Seamless wallet connection via Wagmi/Viem, hiding Web3 friction.\n"
            "• Back-End Data Layer: Supabase (PostgreSQL 14+ with pgcrypto).\n"
            "  ➔ Handles encrypted biometric data hashes, robust relational metadata, and confidential logs.\n"
            "• Blockchain Layer (Web3): Solidity 0.8.28 + OpenZeppelin.\n"
            "  ➔ IdentityRegistry.sol, AssetNFT.sol, RoleManager.sol deployed on local Hardhat (production: Polygon).\n"
            "• Storage Layer: IPFS/Pinata (Immutable Documents) & Cloudflare R2 (Biometric Images).\n\n"
            "FLOW: User Wallet Signature ➔ Frontend Validates ➔ Backend Syncs Metadata ➔ Smart Contract Mints NFT ➔ Off-chain Indexer Updates UI."
        )
        for p in shape.text_frame.paragraphs:
            p.font.size = Pt(12)
            p.space_after = Pt(2)
    elif 'Your Team Name' in shape.text:
        shape.text = "Team BEL SENTINEL"

# Slide 4: Feasibility & RBAC Diagram
slide_4 = prs.slides[3]
for shape in slide_4.shapes:
    if not shape.has_text_frame: continue
    if 'Analysis of the feasibility' in shape.text:
        shape.text = (
            "Feasibility, Scalability, and Risk Mitigation:\n"
            "• Proven Infrastructure: Built on mature OpenZeppelin standards and enterprise-ready Supabase.\n"
            "• Challenge (Gas Costs): Writing every log on-chain is too expensive.\n"
            "  ➔ Solution: Off-chain event queue + Merkle root anchoring.\n"
            "• Challenge (Key Management): Users losing wallet keys locks out their identity.\n"
            "  ➔ Solution: Guardian-based multi-sig recovery protocol.\n"
            "• Challenge (Data Privacy): Public blockchains expose data.\n"
            "  ➔ Solution: Store PII off-chain in R2/Supabase, anchor only cryptographic hashes/ZK proofs on-chain."
        )
        for p in shape.text_frame.paragraphs:
            p.font.size = Pt(12)
            p.space_after = Pt(2)
    elif 'Your Team Name' in shape.text:
        shape.text = "Team BEL SENTINEL"

# Insert generated RBAC abstract image if exists
img_path = r'C:\Users\prajj\.gemini\antigravity-ide\brain\01d4c5a8-7bba-48fa-a275-1a8a49ce4744\rbac_abstract_1790365577429.jpg'
if os.path.exists(img_path):
    slide_4.shapes.add_picture(img_path, Inches(4.5), Inches(2.0), width=Inches(5))

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
            "• Broad Applicability:\n"
            "  ➔ Defense: Tracking classified gear & personnel clearance.\n"
            "  ➔ Healthcare: Securing patient access logs.\n"
            "  ➔ Supply Chain: Verifying authentic goods and transfer of custody."
        )
        for p in shape.text_frame.paragraphs:
            p.font.size = Pt(13)
            p.space_after = Pt(2)
    elif 'Your Team Name' in shape.text:
        shape.text = "Team BEL SENTINEL"

# Slide 6: Research & Detailed Summary (Last Page)
slide_6 = prs.slides[5]
for shape in slide_6.shapes:
    if not shape.has_text_frame: continue
    if 'Details / Links' in shape.text:
        shape.text = (
            "DETAILED ANALYSIS SUMMARY & REFERENCES:\n"
            "• Market Gap: Current centralized IAM solutions are honey-pots. Decentralization is the definitive evolution of enterprise security.\n"
            "• Core Strength: The dual-layer approach (PostgreSQL + EVM) achieves Web2 speed with Web3 immutability. No other platform offers Merkle-batched audit logs out-of-the-box.\n"
            "• Regulatory Alignment: GDPR Article 17 (Right to Erasure) is satisfied by off-chain PII deletion (leaving only anonymous hashes on-chain).\n"
            "• References & Standards:\n"
            "  1. Decentralized Identity Foundation (DIF) - DID Core v1.0.\n"
            "  2. NIST SP 800-207 - Zero Trust Architecture Guidelines.\n"
            "  3. ERC-721 Standard - Non-Fungible Tokens (EIPs).\n"
            "  4. Merkle Tree Off-Chain Scaling architectures."
        )
        for p in shape.text_frame.paragraphs:
            p.font.size = Pt(12)
            p.space_after = Pt(2)
    elif 'Your Team Name' in shape.text:
        shape.text = "Team BEL SENTINEL"

prs.save('SIH2025-IDEA-Presentation-BEL-SENTINEL-Detailed.pptx')
