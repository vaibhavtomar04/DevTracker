# Chapter 5: Technology Stack

This document details the technology stack of DevTrack 2.0, describing the purpose, version, selection rationale, and alternatives considered for each component.

---

## 5.1 Backend Technologies

### 1. Spring Boot
- **Purpose**: Core application framework, MVC routing, dependency injection, and JPA management.
- **Version**: 3.3.4
- **Reason for Selection**: Rapid scaffolding, built-in production-ready features (actuators, security), and mature ORM integration (Hibernate).
- **Alternatives Considered**: Node.js/Express (lacks out-of-the-box JPA/security ecosystem stability for enterprise database mapping), Go/Gin (requires manual SQL writing and lacks mature ORM capabilities).

### 2. Spring Security
- **Purpose**: Enforce role-based access control, manage CORS/CSRF configurations, and orchestrate JWT filters.
- **Version**: 6.3.3
- **Reason for Selection**: Highly customizable security filter chains that integrate natively with Spring Boot.
- **Alternatives Considered**: Keycloak (requires running a separate server, adding operations overhead), manual security filters (too error-prone).

### 3. MySQL
- **Purpose**: Relational database storage.
- **Version**: 8.0+
- **Reason for Selection**: Strict relational integrity, transaction locks, reliability, and widespread developer familiarity.
- **Alternatives Considered**: PostgreSQL (strong alternative, MySQL chosen for existing client hosting alignment), MongoDB (lack of strong foreign key guarantees and transactional constraints).

### 4. JSON Web Tokens (JWT)
- **Purpose**: Stateless client authentication.
- **Version**: JJWT v0.12.x
- **Reason for Selection**: Prevents the need to store session states in the backend memory, allowing easy scale-out.
- **Alternatives Considered**: Session cookies (requires sticky sessions or Redis session replication).

### 5. Flyway
- **Purpose**: Database schema migration tracking.
- **Version**: Core 10.x
- **Reason for Selection**: Schema migrations are versioned SQL scripts committed to git, avoiding schema drift.
- **Alternatives Considered**: Liquibase (uses verbose XML/YAML files; Flyway's pure SQL approach is preferred by DBAs).

### 6. JavaMail
- **Purpose**: Send SMTP emails for alerts and MFA notifications.
- **Version**: Spring Boot Starter Mail (Jakarta Mail)
- **Reason for Selection**: Standardized API with built-in connection pooling and asynchronous template dispatch.
- **Alternatives Considered**: Direct HTTP API integrations (e.g. SendGrid Client, AWS SES Client) - binds application code to specific vendors.

---

## 5.2 Frontend Technologies

### 1. React
- **Purpose**: Component-based single-page application framework.
- **Version**: 18.2+
- **Reason for Selection**: Virtual DOM performance, rich component ecosystems (Lucide, Framer Motion), and declarative state mapping.
- **Alternatives Considered**: Angular (steeper learning curve, heavier bundle size), Vue (lighter, but React has a wider collection of UI blueprints).

### 2. TypeScript
- **Purpose**: Static type checking.
- **Version**: 5.x
- **Reason for Selection**: Catches component property bugs and state changes during compile-time.
- **Alternatives Considered**: Vanilla JavaScript (unsafe, harder to maintain as codebase scales).

### 3. Zustand
- **Purpose**: Global client state management.
- **Version**: 4.5.x
- **Reason for Selection**: Zero boilerplate compared to Redux, extremely lightweight, and integrates perfectly with local storage synchronization.
- **Alternatives Considered**: Redux Toolkit (unnecessary boilerplate for a medium-scale platform), React Context API (re-renders all sub-components on any state change).

### 4. Framer Motion
- **Purpose**: Fluent micro-animations and gesture animations.
- **Version**: 11.x
- **Reason for Selection**: High-performance CSS transitions, exit animation states (`AnimatePresence`), and simple declarative props.
- **Alternatives Considered**: Anime.js or GSAP (more complex to integrate with React life-cycles).

### 5. Playwright
- **Purpose**: End-to-end (E2E) testing framework.
- **Version**: 1.4x
- **Reason for Selection**: Fast parallel executions, headless browser testing, and simple auto-waiting selectors.
- **Alternatives Considered**: Cypress (runs inside browser context making multi-tab and system integrations harder), Selenium (slow, requires manual driver installations).
