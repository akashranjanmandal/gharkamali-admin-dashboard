# Ghar Ka Mali — Complete Project Documentation (V1.0)

## 📌 1. Executive Summary
**Ghar Ka Mali (GKM)** is an end-to-end, tech-enabled gardening service platform designed to bring professional landscaping and plant care to urban homes. The **Admin Dashboard** serves as the central orchestration layer, connecting customers with a network of verified gardeners and field supervisors. 

This document provides a descriptive breakdown of the platform's architecture, workflows, and operational capabilities.

---

## 🏗️ 2. Platform Architecture & Ecosystem
The GKM ecosystem consists of three interconnected layers:
1.  **Customer Layer**: A mobile-first interface where users book one-time visits or subscribe to recurring maintenance plans.
2.  **Service Layer (Gardeners & Supervisors)**: A field-ops network that executes tasks, tracks availability, and ensures quality.
3.  **Control Layer (Admin Dashboard)**: The "Nerve Center" used by the headquarters to manage the catalog, audit finances, and monitor service level agreements (SLAs).

---

## 🔄 3. Core Business Workflows

### 3.1. The Booking Lifecycle
A booking (whether on-demand or subscription-based) moves through several critical stages:
*   **Discovery & SEO**: Users find the service via city-specific landing pages (SEO optimized).
*   **Serviceability Check**: Using the **Geofencing** system, the platform validates if the user's address falls within a supported zone.
*   **Payment & Scheduling**: Users pay via the wallet or gateway. The system schedules the visit based on Gardener availability.
*   **Assignment**: The "Auto-Allocation" engine matches the nearest qualified gardener.
*   **Visit Execution**: The gardener arrives, verifies the session via a **Customer OTP**, performs the service, and uploads "Before/After" logs.
*   **Closing & Feedback**: The session ends; ratings are collected, and revenue is settled.

### 3.2. Subscription Management
Unlike one-time visits, subscriptions are long-term commitments. The dashboard allows admins to:
*   **Pause/Resume**: Handle customer vacations or seasonal needs.
*   **Manual Scheduling**: Adjust the specific days a gardener visits a recurring client.
*   **Surge Pricing**: Implement dynamic weekend pricing or holiday hikes.

---

## 🛠️ 4. Feature Deep-Dive

### 📈 4.1. Dashboard & Analytics
The dashboard provides high-level visibility into business health via:
*   **Revenue Tracking**: 30-day trends, daily earnings, and average ticket value.
*   **Operational Stats**: Total active customers, gardener utilization rates, and open complaints.
*   **Heatmaps**: Visualization of booking density across different geofenced zones.

### 👥 4.2. People Management (CRM)
*   **Customer Profiles**: Complete history of every visit, plant identified at their home, and subscription status.
*   **Gardener Onboarding**: A rigorous workflow where gardeners are registered, their documents verified, and their status set to "Approved" before they can receive jobs.
*   **Supervisor Role**: Field managers who oversee gardener performance and resolve on-ground escalations.

### 🌿 4.3. Catalog & Dynamic Configuration
A highlight of the GKM system is its **no-code flexibility**:
*   **Dynamic Plans**: Admins can change plan names, taglines, feature lists, and even visual themes (colors/icons) in real-time without developer intervention.
*   **Add-On Services**: Managing optional upsells like fertilizers, pesticide treatments, or tool rentals.
*   **Geofencing (Zones)**: Creating polygon-based service areas on a map to define where the business operates.

---

## ⚠️ 5. Quality Control & Operations

### ⏱️ 5.1. SLA Monitor (Service Level Agreements)
The platform tracks "Breaches" in real-time:
*   **Late Arrival**: If a gardener isn't within the geofence at the scheduled time.
*   **No-Show**: If a booking remains unassigned or unstarted past its window.
*   **Resolution**: Admins can manually reassign these jobs to "Standby" gardeners.

### 🎫 5.2. Complaints & Resolution
A centralized ticketing system for:
*   **Service Quality**: Issues with the technical work performed.
*   **Behavioral Escalations**: Safety or etiquette concerns.
*   **Billing Disputes**: Refund requests or wallet discrepancies.
Each ticket is assigned a priority (Low/Medium/High) and a supervisor for closing.

---

## 🔍 6. Content & SEO Strategy
To drive organic growth, the dashboard includes:
*   **City-Specific Pages**: Unique metadata, H1 headings, and "About" text for every city (e.g., Noida, Gurgaon) to rank on Google.
*   **Blog Engine**: A content management system for gardening tips, plant care guides, and seasonal advice.
*   **Plant History**: A log of every plant a user has, allowing for personalized "Care Notification" pushes.

---

## 🚀 7. Future Roadmap
*   **AI Diagnostics**: Using photos uploaded by gardeners to diagnose plant diseases automatically.
*   **Inventory Tracking**: Managing the stock of seeds and fertilizers across different supervisor hubs.
*   **Gardener Training Modules**: In-app training videos and certifications for field staff.

---

## 💻 8. Tech Stack Summary
*   **Frontend**: Next.js (Fast, SEO-friendly), Zustand (State), React Query (Data fetching).
*   **Backend**: Node.js API with a MySQL persistent layer.
*   **Maps**: Leaflet/OpenStreetMap for Geofencing and live tracking.
*   **UI/UX**: Custom Design System with a focus on "Premium Earth Tones" (Forest Green & Gold).

---
*Generated by GKM Admin Documentation System — March 30, 2026*
