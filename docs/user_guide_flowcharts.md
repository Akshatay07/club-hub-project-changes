# Club Hub: User Guide Scenario Flowcharts

This document provides visual flowcharts and decision diagrams for all key user workflows and scenarios within the **Club Hub** platform. It acts as a visual companion to the [user_guide.md](file:///c:/Users/aksha/Desktop/club-hub-admin/club-hub-admin/docs/user_guide.md) and [architecture_breakdown.md](file:///c:/Users/aksha/Desktop/club-hub-admin/club-hub-admin/docs/architecture_breakdown.md).

---

## 1. Role-Based Platform Flowchart (Who Uses Club Hub)

This flowchart mirrors the **"Who Uses Club Hub"** hierarchy, branching directly from the **Club Hub Platform** into the three core user roles (**Student**, **Faculty**, and **Admin**), showing how each scenario flows under their respective portal and interacts with other roles.

### 📊 Visual Box Diagram

```
                                 ┌─────────────────────────────────┐
                                 │       Club Hub Platform         │
                                 │  (Role & Scenario Workflows)    │
                                 └────────────────┬────────────────┘
                                                  │
          ┌───────────────────────────────────────┼───────────────────────────────────────┐
          ▼                                       ▼                                       ▼
    ┌───────────┐                           ┌───────────┐                           ┌───────────┐
    │  Student  │                           │  Faculty  │                           │   Admin   │
    │ (Member)  │                           │(Club Head)│                           │ (College) │
    └─────┬─────┘                           └─────┬─────┘                           └─────┬─────┘
          │                                       │                                       │
   [Scenario A: Join & Register]           [Scenario B: Propose Event]             [Club & Faculty Setup]
   • Sign up with 6-digit OTP              • Draft title, date, venue              • Create clubs & set budget
   • Join club (+1 member count)           • Request budget (INR)                  • Assign faculty to clubs
   • Register for event                    • Upload flyers & posters                       │
          │                                       │                                        │
          │                                       ▼                                        ▼
          │                                [Submit Proposal] ───────────────────> [Review Event & Budget]
          │                                                                                │
          │                                                                        ┌───────┴───────┐
          │                                                                        ▼               ▼
          │ <────────────────────────────── [Publish Event] <──────────────── [Approve]        [Reject]
          │                                                                                        │
          ▼                                       │                                                ▼
   [Scenario C: Event Check-In]            [Scenario C: Live Session]                      [Notify Faculty]
   • Arrive at event venue                 • Project Dynamic QR on screen
   • Scan screen QR with phone             • Watch live attendance count
          │                                       │
          └──────── (Real-Time Scan) ───────────> │
                                                  • Auto-mark absents (Sweeper)
                                                  • Download signed PDF sheet
                                                          │
          ┌───────────────────────────────────────────────┘
          ▼
   [Scenario D: Feedback & Ratings]        [Scenario D: Respond to Feedback]
   • Submit 1-5 stars & comment ─────────> • Read reviews on dashboard
   • Receive email with reply <─────────── • Write reply to student
          │                                       │
          ▼                                       ▼
   [Scenario E: Messaging]                 [Scenario E: Messaging]                 [Scenario F: Club Health]
   • Chat with Faculty Coordinator <─────> • Chat with Students & Admins <───────> • Track Health Score (0-100)
                                                                                   • Healthy / Warning / Critical
```

### 🔀 Interactive Multi-Role Flowchart

```mermaid
flowchart TD
    Platform["🏛️ Club Hub Platform<br/>(System & Roles)"]
    
    Platform --> StudentRole["👨‍🎓 Student<br/>(Club Member & Attendee)"]
    Platform --> FacultyRole["👩‍🏫 Faculty<br/>(Club Head & Coordinator)"]
    Platform --> AdminRole["👑 Admin<br/>(College Administration)"]

    %% Student Scenarios
    subgraph StudentPath["👨‍🎓 Student Portal Pathways"]
        direction TB
        StudentRole --> S_A["<b>Scenario A: Join & Register</b><br/>• Verify Email via 6-digit OTP<br/>• Discover & Join Club<br/>• Register for Approved Event"]
        S_A --> S_C["<b>Scenario C: Live Check-In</b><br/>• Scan Venue Dynamic QR Code<br/>• Instant Confirmation: 'Present'"]
        S_C --> S_D["<b>Scenario D: Feedback & Ratings</b><br/>• Submit 1–5 Star Rating & Review<br/>• Receive Email on Faculty Reply"]
        S_D --> S_E["<b>Scenario E: In-App Chat</b><br/>• Chat with assigned Faculty Head"]
    end

    %% Faculty Scenarios
    subgraph FacultyPath["👩‍🏫 Faculty Portal Pathways"]
        direction TB
        FacultyRole --> F_B["<b>Scenario B: Event Planning</b><br/>• Propose Event & Upload Flyers<br/>• Submit Budget Request (INR)"]
        F_B --> F_C["<b>Scenario C: Live Attendance</b><br/>• Project Dynamic Session QR Code<br/>• Live WebSocket Attendee Sync<br/>• Download Signed PDF Register"]
        F_C --> F_D["<b>Scenario D: Review Feedback</b><br/>• Read Student Feedback on Portal<br/>• Send Official Reply to Student"]
        F_D --> F_E["<b>Scenario E: In-App Chat</b><br/>• Chat with Students & Admins"]
    end

    %% Admin Scenarios
    subgraph AdminPath["👑 Admin Portal Pathways"]
        direction TB
        AdminRole --> A_Gov["<b>Club & Faculty Setup</b><br/>• Create Clubs & Allocate Budgets<br/>• Assign/Reassign Faculty Heads"]
        A_Gov --> A_B["<b>Scenario B: Approval Gateway</b><br/>• Review Event & Budget Proposal<br/>• Decision: Approve or Reject"]
        A_B --> A_F["<b>Scenario F: Club Health Scoring</b><br/>• Automated Health Score (0–100)<br/>• 🟢 Healthy | 🟡 Warning | 🔴 Critical"]
        A_F --> A_E["<b>Scenario E: Universal Messenger</b><br/>• Coordinate with Anyone"]
    end

    %% Cross-Role Scenario Connections
    F_B -.->|1. Submit Proposal for Review| A_B
    A_B -.->|2. Approved: Broadcast to Students| S_A
    F_C -.->|3. Dynamic QR Projected on Screen| S_C
    S_C -.->|4. Real-Time Check-In Sync| F_C
    S_D -.->|5. Review Submitted to Dashboard| F_D
    F_D -.->|6. Automated Reply Notification| S_D
    S_E <.->|7. Direct Messaging| F_E
    F_E <.->|8. Direct Messaging| A_E
```

---

## 2. Detailed Scenario Flowcharts

---

### 🔹 Scenario A: Student Onboarding, Club Joining & Event Registration

This workflow illustrates how a new student registers, validates their account via email OTP, joins a college club, and books an event seat.

```mermaid
flowchart TD
    Start([New Student]) --> Reg["Fill Registration Form\n(Name, Email, Student ID, Password)"]
    Reg --> OTP["System Generates & Emails 6-Digit OTP"]
    OTP --> EnterOTP{"Enters OTP in App"}
    
    EnterOTP -->|Invalid / Expired| OTPFail["Display Error: Invalid OTP"] --> EnterOTP
    EnterOTP -->|Valid| AuthSuccess["Account Verified & JWT Issued\nRedirected to Dashboard"]
    
    AuthSuccess --> BrowseClubs["Browse Active Clubs Directory"]
    BrowseClubs --> JoinClub["Click 'Join Club'"]
    JoinClub --> UpdateClub["Club Member Count Increments (+1)\nStudent added to Club Room"]

    UpdateClub --> BrowseEvents["Browse Upcoming Approved Events"]
    BrowseEvents --> RegEvent["Click 'Register Now'"]
    RegEvent --> CheckSeats{"Seats Available?"}
    
    CheckSeats -->|No| Waitlist["Capacity Full Notice"]
    CheckSeats -->|Yes| Confirmed["Registration Confirmed\nConfirmation Email Sent with Unique Code"]
    
    Confirmed --> CancelOpt{"Cancel before 2 hrs of event?"}
    CancelOpt -->|Yes| CancelReg["Cancel Registration\nSeat Freed"]
    CancelOpt -->|No| LockReg["Registration Locked for Event"]
```

---

### 🔹 Scenario B: Event Planning, Budget Request & Admin Approval

This workflow outlines how faculty club coordinators propose events, request funds, and submit them for college administrative approval before publishing to students.

```mermaid
flowchart TD
    FacStart([Faculty Coordinator]) --> CreateEvt["Create New Event Proposal"]
    CreateEvt --> FillDetails["Enter Title, Date, Venue, Capacity,\nProjection (Internal/External), Budget (INR),\n& Upload Event Flyers"]
    FillDetails --> SubmitEvt["Submit Proposal\n(Status = 'pending')"]

    SubmitEvt --> AdminAlert["Admin Dashboard Updated via WebSockets\nProposal Added to Pending Queue"]
    
    AdminAlert --> AdminReview{"College Admin Decision"}
    
    AdminReview -->|Needs Changes / Disapproved| RejectEvt["Status: 'rejected'\nFeedback sent back to Faculty"]
    RejectEvt --> FacStart
    
    AdminReview -->|Approve Budget & Event| ApproveEvt["Status: 'approved'\nAllocates Budget to Event"]
    
    ApproveEvt --> Broadcast["System Emits 'event:created' Socket Event\nPublished on Student Portal"]
    Broadcast --> OpenReg["Students Can Now Discover & Register"]
```

---

### 🔹 Scenario C: Live Event QR Check-In & Automated Attendance Sweeper

This workflow maps real-time venue check-in using dynamically generated QR tokens, instant attendee sync, and automated background sweeping for no-shows.

```mermaid
flowchart TD
    subgraph VenueHost["Venue Display (Faculty)"]
        F_Start([Event Starts]) --> GenQR["Faculty clicks 'Generate Check-in QR'"]
        GenQR --> ShowQR["Dynamic QR Code & Short Code\nProjected on Screen"]
        ShowQR --> LiveView["Live Attendees Counter & Roster"]
    end

    subgraph StudentCheckIn["Student App (Phone)"]
        S_Arrive([Student Arrives at Venue]) --> ScanQR["Open Club Hub App & Scan Screen QR\n(or type short code)"]
        ScanQR --> ValReq["POST /api/attendance/scan\n(Sends QR Token + JWT)"]
    end

    subgraph BackendEngine["Backend & Real-Time Sync"]
        ValReq --> Validate{"Valid Check-In?"}
        Validate -->|Not Registered| Fail1["Check-In Failed: Not Registered for Event"]
        Validate -->|Already Attended| Fail2["Notice: Attendance Already Recorded"]
        Validate -->|Valid Token & Registered| MarkPresent["Update Status to 'attended' (Present)"]
        
        MarkPresent --> SocketEmit["Socket.io emits 'attendance-update'"]
        SocketEmit --> LiveView
        MarkPresent --> SuccessScreen["Student App: 'Check-in Successful! Welcome!'"]
    end

    subgraph AutoSweeper["Background Automated Job (node-cron)"]
        CronTimer["Cron Job Sweeper runs every 5 minutes"] --> CheckFinished{"Event Ended & Past Start Time?"}
        CheckFinished -->|Yes| Sweeper["Find all status = 'registered'\nUpdate to 'absent'"]
        CheckFinished -->|No| WaitNext["Wait for Next Interval"]
        Sweeper --> FinalRoster["Final Attendance Ledger Closed"]
    end

    FinalRoster --> ExportPDF["Faculty Downloads A4 Signed PDF via PDFKit"]
```

---

### 🔹 Scenario D: Post-Event Feedback & Response Loop

This workflow covers post-event student ratings, public reviews, and direct faculty responses with automated notification emails.

```mermaid
flowchart TD
    StudentAttended([Student Marked as 'Present']) --> UnlockFeedback["Event Feedback Tab Unlocks"]
    UnlockFeedback --> SubmitRev["Submit 1–5 Star Rating & Review Comment"]
    
    SubmitRev --> SaveRev["Saved to Database & Recalculates Event Rating"]
    SaveRev --> NotifyFac["Faculty Dashboard Highlights New Review"]
    
    NotifyFac --> FacReview["Faculty Reads Comment"]
    FacReview --> FacReply["Faculty Writes & Submits Response"]
    
    FacReply --> MailNotice["System Sends Email Notification with Faculty Response to Student"]
    MailNotice --> Done([Feedback Loop Complete])
```

---

### 🔹 Scenario E: Real-Time In-App Messaging & Role Permissions

This workflow illustrates direct messaging capabilities, security boundaries, and WebSocket delivery between platform users.

```mermaid
flowchart TD
    UserOpensChat([User Opens Messages Tab]) --> RoleCheck{"Identify Sender Role"}
    
    RoleCheck -->|Student| StudentRule["Permission: Can message assigned Faculty Coordinators only"]
    RoleCheck -->|Faculty| FacultyRule["Permission: Can message Students & College Admins"]
    RoleCheck -->|Admin| AdminRule["Universal Permission: Can message any Student, Faculty, or Admin"]
    
    StudentRule & FacultyRule & AdminRule --> Compose["Select Contact & Send Message"]
    
    Compose --> SaveDB["Save Message to MongoDB (/api/messages)"]
    SaveDB --> SocketRoute["Socket.io sends payload to recipient's private user room"]
    
    SocketRoute --> CheckOnline{"Recipient Online?"}
    CheckOnline -->|Yes| InstantChat["Instant message bubble & chime in active chat UI"]
    CheckOnline -->|No| BadgeCount["Unread badge count increments on next login"]
```

---

### 🔹 Scenario F: Club Lifecycle Administration & Health Scoring

This workflow explains how administrators govern clubs and how the system dynamically scores club performance.

```mermaid
flowchart TD
    AdminInit([College Admin]) --> CreateClub["Create New Club Record\n(Name, Category, Description, Assets)"]
    CreateClub --> AssignFac["Assign Faculty Coordinator & Set Annual Budget"]
    
    AssignFac --> ActiveOps["Club Operations Ongoing\n(Events, Registrations, Check-ins, Proofs)"]
    
    ActiveOps --> HealthEngine["Automated Club Health Calculator (Score out of 100)"]
    
    subgraph MetricFactors["Calculation Breakdown"]
        HealthEngine --> M1["Event Frequency: Up to 40 pts"]
        HealthEngine --> M2["Member Participation: Up to 30 pts"]
        HealthEngine --> M3["Actual Attendance Rate: Up to 20 pts"]
        HealthEngine --> M4["Proof Uploads: Up to 30 pts"]
        HealthEngine --> M5["Budget Efficiency: Up to 20 pts"]
        HealthEngine --> M6["Membership Size Bonus: Up to 10 pts"]
    end
    
    MetricFactors --> HealthScore["Computed Total Score"]
    
    HealthScore --> Classify{"Health Status Category"}
    
    Classify -->|Score ≥ 70| Green["🟢 Healthy\nHigh attendance, frequent events, efficient budget"]
    Classify -->|40 ≤ Score < 70| Yellow["🟡 Warning\nModerate activity; needs boost in attendance/events"]
    Classify -->|Score < 40| Red["🔴 Critical\nInactive club or poor attendance rates"]
    
    Green & Yellow & Red --> AdminDash["Displayed on Admin Overview Dashboard for Resource Allocation"]
```
