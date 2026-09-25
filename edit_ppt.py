from pptx import Presentation
from pptx.util import Inches, Pt

prs = Presentation('SIH2025-IDEA-Presentation-Format.pptx')

# Slide 1: Title
slide_1 = prs.slides[0]
for shape in slide_1.shapes:
    if not shape.has_text_frame: continue
    text = shape.text
    if 'Problem Statement Title' in text:
        shape.text = (
            "Problem Statement Title - Blockchain-Based Secure Platform for Identity, Access Control, and Digital Asset Management\n"
            "Theme - Cybersecurity / Blockchain\n"
            "PS Category - Software\n"
            "Team ID - TBA\n"
            "Team Name (Registered on portal) - BEL SENTINEL"
        )
        for p in shape.text_frame.paragraphs:
            p.font.size = Pt(16)

# Slide 2: Idea Title
slide_2 = prs.slides[1]
for shape in slide_2.shapes:
    if not shape.has_text_frame: continue
    if 'IDEA TITLE' in shape.text:
        shape.text = "BEL SENTINEL - Decentralized Identity & Asset Platform"
    elif 'Proposed Solution' in shape.text:
        shape.text = (
            "Proposed Solution (Decentralized Architecture):\n\n"
            "• Unified platform integrating decentralized identity, NFT-based asset ownership, and strict RBAC.\n"
            "• Users receive Decentralized Identifiers (DIDs) for self-sovereign authentication.\n"
            "• Digital & physical assets are minted as NFTs (ERC-721) for uniqueness, traceability, and immutable ownership.\n"
            "• Smart Contracts automatically govern asset minting, role-based allocation, and transfer rights.\n"
            "• All operations are immutably recorded via batched Merkle roots on-chain, ensuring a tamper-proof audit trail."
        )
        for p in shape.text_frame.paragraphs:
            p.font.size = Pt(15)
    elif 'Your Team Name' in shape.text:
        shape.text = "Team BEL SENTINEL"

# Slide 3: Tech Approach
slide_3 = prs.slides[2]
for shape in slide_3.shapes:
    if not shape.has_text_frame: continue
    if 'Technologies to be used' in shape.text:
        shape.text = (
            "Technologies & Methodology:\n\n"
            "• Frontend/API: Next.js 16 (App Router), TypeScript, TailwindCSS for responsive UI.\n"
            "• Smart Contracts: Solidity 0.8.x, OpenZeppelin, deployed on EVM (Polygon/Hardhat).\n"
            "• Database: Supabase (PostgreSQL) with RLS for hybrid off-chain metadata & role syncing.\n"
            "• Decentralized Storage: IPFS/Pinata for immutable documents; Cloudflare R2 for biometric data.\n"
            "• Methodology: Web3 Self-Custodial wallet connections (wagmi/viem) integrated with Web2 UX. Batched Merkle trees are used for gas-efficient audit logging."
        )
        for p in shape.text_frame.paragraphs:
            p.font.size = Pt(15)
    elif 'Your Team Name' in shape.text:
        shape.text = "Team BEL SENTINEL"

# Slide 4: Feasibility
slide_4 = prs.slides[3]
for shape in slide_4.shapes:
    if not shape.has_text_frame: continue
    if 'Analysis of the feasibility' in shape.text:
        shape.text = (
            "Feasibility & Viability:\n\n"
            "• High Feasibility: Utilizes proven Web3 standards (ERC-721, DIDs) combined with scalable Web2 infrastructure (Supabase).\n"
            "• Challenge: High Gas Costs for on-chain audit logging.\n"
            "• Strategy: Implemented Off-chain queue + periodic Merkle root anchoring, reducing gas by ~100x.\n"
            "• Challenge: User key management and wallet loss risks.\n"
            "• Strategy: Developed a Guardian-based Social Recovery system allowing authorized personnel to restore access safely."
        )
        for p in shape.text_frame.paragraphs:
            p.font.size = Pt(15)
    elif 'Your Team Name' in shape.text:
        shape.text = "Team BEL SENTINEL"

# Slide 5: Impact
slide_5 = prs.slides[4]
for shape in slide_5.shapes:
    if not shape.has_text_frame: continue
    if 'Potential impact' in shape.text:
        shape.text = (
            "Impact and Benefits:\n\n"
            "• Security: Eliminates single points of failure common in centralized IAM, preventing mass data breaches.\n"
            "• Transparency: Ensures 100% verifiable chain-of-custody for digital and physical assets.\n"
            "• Operational Efficiency: Automates compliance, auditing, and role management via smart contracts.\n"
            "• Privacy: Supports GDPR compliance and Zero-Trust Architecture through selective disclosure and encrypted field storage."
        )
        for p in shape.text_frame.paragraphs:
            p.font.size = Pt(15)
    elif 'Your Team Name' in shape.text:
        shape.text = "Team BEL SENTINEL"

# Slide 6: Research
slide_6 = prs.slides[5]
for shape in slide_6.shapes:
    if not shape.has_text_frame: continue
    if 'Details / Links' in shape.text:
        shape.text = (
            "Research & References:\n\n"
            "1. Decentralized Identity Foundation (DIF) DID Specifications.\n"
            "2. NIST Special Publication 800-207 (Zero Trust Architecture).\n"
            "3. ERC-721 Non-Fungible Token Standard (Ethereum Improvement Proposals).\n"
            "4. Merkle Tree based off-chain scaling solutions for EVM audit logs."
        )
        for p in shape.text_frame.paragraphs:
            p.font.size = Pt(15)
    elif 'Your Team Name' in shape.text:
        shape.text = "Team BEL SENTINEL"

# Delete Slide 7
rId = prs.slides._sldIdLst[-1].rId
prs.part.drop_rel(rId)
del prs.slides._sldIdLst[-1]

prs.save('SIH2025-IDEA-Presentation-BEL-SENTINEL.pptx')
