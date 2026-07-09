# Chapter 1: Executive Summary

## 1.1 Project Vision
DevTrack 2.0 is an enterprise-grade Change Request (CR) management and deployment tracking platform. It bridges the gap between software development lifecycle (SDLC) activities and operational audit needs by providing an end-to-end trace of code approvals, test suite runs, and deployment environments. The platform empowers developers, testers, and administrators with clear dashboard workspaces, multi-factor security, and automated deployment records.

## 1.2 Business Objectives
- **Standardize CR Flow**: Enforce rigorous state transitions from draft development to production rollout.
- **Traceability & Auditing**: Maintain a chronological, tamper-proof history of every state change, code review approval, and user interaction.
- **Controlled Testing Lifecycles**: Prevent uncoordinated testing by assigning clear tester ownership and enforcing retesting pipelines for bugs.
- **MFA Compliance**: Enforce Multi-Factor Authentication (MFA) via Microsoft Authenticator to secure administrative and developer workspaces.

## 1.3 Target Users
- **Developers**: Create CRs, upload unit testing results, update code reviews, and address bugs.
- **Testers / QA Specialists**: Manage testing pool, self-assign tasks, log bugs, and sign off on SIT/UAT results.
- **Administrators**: Manage roles, approve code reviews, execute force reassignments, and audit platform activity.
- **Project Managers / Stakeholders**: View engineering analytics, audit trails, and deployment timelines.

## 1.4 Business Benefits
- **Decreased Deployment Lead Time**: Streamlined approvals and direct visibility of UAT state transitions speed up deployment cycles.
- **Zero-Trust Compliance**: High-grade MFA validation and security auditing logs protect production deploy sequences.
- **Enhanced Software Quality**: Clear tester boundaries, sticky bug assignments, and mandatory test artifact collection reduce regression leaks.

## 1.5 Technical Highlights
- **Spring Boot 3.3 Backend**: Powered by Java 21, JPA/Hibernate, and Spring Security.
- **React 18 / Vite Frontend**: SPA built with TypeScript, Tailwind CSS, Framer Motion, and Lucide React.
- **Atomic Database Locks**: Race-safe SQL queries for tester assignment preventing concurrent pick-ups.
- **Flyway Migrations**: Automated, versioned schema management keeping development and production databases synchronized.
- **TOTP / MFA Engine**: Fully offline verification using standard RFC 6238 TOTP algorithms.

## 1.6 Key Features
- **MFA Secure Sign-on**: Multi-factor authentication via Authenticator app with backup recovery codes.
- **Role-Based Workspaces**: Customized layouts and operations tailored to Developer, Tester, and Admin roles.
- **Sequential Pipeline**: Code approval directly unlocks UAT deployment and testing pools.
- **Sticky Testing Pool**: Testing queue allowing testers to self-assign tasks while preventing double-ownership.
- **Comprehensive Auditing**: Global trace showing SIT/UAT deploy/complete dates, code review approvals, and bug lifecycles.

## 1.7 Application Scope
- **In Scope**: CR lifecycle management, user management, TOTP MFA registration and verification, unit test artifact storage, bug tracking, and global auditing reports.
- **Out of Scope**: Direct Git hosting provider hosting (handled via branch/PR links), automated server hosting virtualization (deployments are logged manually or via webhooks).

## 1.8 Future Roadmap
- Deep integrations with GitHub, GitLab, and Azure DevOps for automated state movement on PR merges.
- AI-driven bug description and reproduction step parsing.
- Slack and Microsoft Teams notification channels.
