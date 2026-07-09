# Chapter 6: Project Structure

This document details the folder hierarchy, packaging patterns, naming conventions, and file organization of DevTrack 2.0.

---

## 6.1 Root Directory Hierarchy
```
DevTracker/
├── backend/               # Spring Boot 3.3.4 Source Code
├── frontend/              # React + Vite + TS SPA Source Code
├── docs/                  # System Technical Reference Manuals (This Folder)
└── README.md
```

---

## 6.2 Backend Directory Structure
The backend is structured as a standard Maven single-module layout. The Java classes reside under `src/main/java/com/devtrack/api/` and resources under `src/main/resources/`.

```
backend/
├── pom.xml
└── src/
    └── main/
        ├── java/com/devtrack/api/
        │   ├── DevtrackApplication.java      # Boot Entry Point
        │   ├── config/                       # CORS, Web MVC, WebSocket configs
        │   ├── controller/                   # REST API Controllers
        │   ├── dto/                          # Data Transfer Objects (Payload models)
        │   ├── event/                        # Spring ApplicationEvent definitions
        │   ├── model/                        # JPA Entities (Hibernate mappings)
        │   ├── notification/                 # Email templates and dispatchers
        │   ├── repository/                   # JPA Repositories (Database access)
        │   ├── security/                     # Spring Security filters & JWT utilities
        │   └── services/                     # Business services & workflow execution
        └── resources/
            ├── application.properties        # App configs, Database credentials
            ├── db/migration/                 # Flyway SQL schema scripts (V1 -> V10)
            └── templates/                    # Thymeleaf email templates
```

### Packaging Conventions
- `config/`: Contains beans for third-party setup (Web Security, WebSockets, AppConfig).
- `controller/`: REST layer endpoints. Direct interactions with database entities are strictly avoided here; business services are invoked instead.
- `model/`: Defines database table structures using `@Entity` annotations.
- `repository/`: Extension of `JpaRepository` representing CRUD operations.
- `services/`: Contains interfaces and implementation classes containing transactions (`@Transactional`).

---

## 6.3 Frontend Directory Structure
The client app is a single page application built on Vite + React + TypeScript.

```
frontend/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── src/
    ├── main.tsx             # React SPA mounting root
    ├── App.tsx              # Base router and layout binding
    ├── index.css            # Custom CSS styles
    ├── components/
    │   ├── shared/          # Reusable drawer panels and modals
    │   └── ui/              # Atom level elements (Button, Cards, Input)
    ├── pages/               # Routed page panels (Dashboards, Sprints, Login)
    ├── services/            # Mock schemas & API connection clients
    └── store/               # Zustand global store files (authStore, taskStore)
```

---

## 6.4 Naming Conventions

### File & Class Names
- **Java Classes**: PascalCase (e.g. `TaskController`, `WorkflowExecutionService`).
- **TypeScript Component Files**: PascalCase (e.g. `DeveloperDashboard.tsx`, `BugDetailModal.tsx`).
- **TypeScript Store Files**: camelCase (e.g. `taskStore.ts`, `authStore.ts`).
- **Database Tables**: Plural lowercase with underscores (e.g. `tasks`, `bugs`, `audit_logs`).
- **Database Columns**: snake_case (e.g. `testing_started_date`, `assigned_developer_id`).

### Code Style Guidelines
- **Braces**: K&R style (braces open on the same line as the statement).
- **Indentation**: 2 spaces for TypeScript/CSS, 4 spaces for Java/XML.
- **REST Resource Paths**: plural-lowercase (e.g. `/api/tasks`, `/api/bugs`).
