# Chapter 3: Software Requirement Specification (SRS)

This document establishes the hardware, software, browser, network, and third-party dependencies required to run, build, and deploy DevTrack 2.0.

---

## 3.1 System Requirements

### Hardware Requirements
- **Development Workstation / Server Host**:
  - **CPU**: Quad-core x86_64 processor (Intel Core i5/AMD Ryzen 5 or equivalent, minimum; 8-core recommended for enterprise deployment).
  - **Memory (RAM)**: Minimum 8 GB (16 GB recommended to run backend Spring Boot services, local MySQL instance, and React build watcher concurrently).
  - **Storage**: Minimum 10 GB free space (SSD recommended for fast build compiles).
- **Client (End User Workstation)**:
  - **Memory (RAM)**: Minimum 4 GB.
  - **Screen Resolution**: Minimum 1280x800 px (1920x1080 px recommended for dashboard layouts).

---

## 3.2 Software Requirements

### Development & Build Tools
- **Java Development Kit (JDK)**: JDK 17 or JDK 21 (Temurin / Adoptium build recommended).
- **Node.js**: v18.x or v20.x (LTS releases).
- **Build Managers**:
  - **Backend**: Apache Maven 3.8.x or 3.9.x.
  - **Frontend**: Vite 8.x with TypeScript compilation (`tsc`).
- **Database Engine**: MySQL 8.0+ or MariaDB 10.5+.
- **Database Migrations**: Flyway Core (integrated in Spring Boot build path).

---

## 3.3 Browser Support
DevTrack 2.0 uses modern styling paradigms including Glassmorphism (backdrop-filters), CSS grid layouts, and Framer Motion hardware-accelerated animations.
- **Google Chrome**: Version 100+ (fully supported).
- **Mozilla Firefox**: Version 102+ (fully supported).
- **Microsoft Edge**: Version 100+ (fully supported).
- **Apple Safari**: Version 15+ (fully supported).
- *Internet Explorer is not supported.*

---

## 3.4 Network Requirements
- **Protocol**: HTTP/1.1 or HTTP/2 over TLS (HTTPS) on production.
- **WebSocket Protocol**: `ws://` (development) and `wss://` (production) for in-app notification synchronization.
- **Port Allocations**:
  - **Port 8080**: Spring Boot web container (API and static assets server).
  - **Port 5173**: React local Vite hot-reload server (development only).
  - **Port 3306**: MySQL database daemon.
- **SMTP Gateway Access**: Outbound access on ports 25, 465, or 587 to connect to external email relays (SendGrid, AWS SES, or corporate Exchange servers).

---

## 3.5 Third-party Dependencies

### Backend (Spring Boot Core Starter Packages)
- `spring-boot-starter-web`: API routing and Tomcat servlet.
- `spring-boot-starter-security`: BCrypt encoding, JWT filter chains, and security configurations.
- `spring-boot-starter-data-jpa`: Hibernate ORM engine.
- `mysql-connector-j`: Database driver.
- `flyway-core` & `flyway-mysql`: Versioned database migration executor.
- `spring-boot-starter-websocket`: Real-time notification socket controller.
- `spring-boot-starter-mail`: SMTP client.
- `jjwt-api`, `jjwt-impl`, `jjwt-jackson`: JWT token parsing and generation.

### Frontend (npm Packages)
- `react` & `react-dom` (v18.x / v19.x)
- `react-router-dom` (v6.x)
- `zustand` (v4.x) - Light-weight state management.
- `framer-motion` & `lucide-react` - UI animation and iconography.
- `chart.js` & `react-chartjs-2` - Analytic visualization charts.
- `jspdf` & `html2canvas` - Client-side report exports.

---

## 3.6 Supported Operating Systems
- **Production Server**: Ubuntu Server 20.04 LTS / 22.04 LTS, Red Hat Enterprise Linux 8/9, or Windows Server 2019/2022.
- **Developer Local Environment**: Windows 10/11 (PowerShell/CMD), macOS (Ventura/Sonoma), or Linux (Ubuntu/Debian/Fedora).
