# Club Hub: Non-Technical User & Functional Guide

Welcome to the **Club Hub** functional guide. This document explains how the platform works, who uses it, and how the different portals interact in real-time to manage college clubs, organize events, check attendance, and enable messaging.

---

## 1. What is Club Hub?
Club Hub is a central platform for college clubs and activities. It connects **Students**, **Faculty Club Coordinators**, and **College Admins** to make club registration, event planning, and attendance tracking smooth and instant.

---

## 2. Who Uses Club Hub?

```
                       ┌──────────────────────┐
                       │  Club Hub Platform   │
                       └──────────┬───────────┘
                                  │
         ┌────────────────────────┼────────────────────────┐
         ▼                        ▼                        ▼
   ┌───────────┐            ┌───────────┐            ┌───────────┐
   │ Student   │            │  Faculty  │            │   Admin   │
   │ (Member)  │            │(Club Head)│            │(College)  │
   └───────────┘            └───────────┘            └───────────┘
```

### 👨‍🎓 Students (Club Members & Event Attendees)
* Discover active college clubs and join or leave them.
* Browse upcoming approved events and reserve seats.
* Scan QR codes at events to check in.
* Write reviews and give ratings on events they attend.
* Chat directly with their club’s Faculty coordinator.

### 👩‍🏫 Faculty (Club Heads & Coordinators)
* Oversee their assigned club's member roster.
* Plan and propose new events (dates, locations, projection sheets, and flyers).
* Request funding budgets from the college administration.
* Run live attendance sessions via QR Codes and download official sign-in sheets.
* Read student feedback and reply to reviews.
* Chat with Students and College Admins.

### 👑 Admins (College Administration & Supervisors)
* Create new college clubs and allocate annual budgets.
* Assign faculty members to lead clubs.
* Review, approve, or reject event proposals.
* Manage uploaded flyers, brochures, and documents (with a Trash bin for soft-deletes).
* Monitor "Club Health Scores" to see which clubs are active and efficient.
* Chat with anyone on the platform.

---

## 3. Real-Time Workflows (How It Works in Practice)

### Scenario A: Joining a Club & Registering for an Event
1. **Onboarding**: A new student signs up. They receive a 6-digit verification code in their email, type it into the app, and log in.
2. **Joining a Club**: The student browses the "Clubs" page. They click **Join** on the "Coding Club". The system instantly updates the club's member count, and the student starts receiving updates.
3. **Registering for an Event**: The student sees an upcoming "Web Dev Hackathon" scheduled for next Friday. They click **Register Now**. They immediately receive a confirmation email containing a unique booking code.

---

### Scenario B: Planning & Approving an Event
1. **Creation**: The Coding Club coordinator (Faculty) logs in and clicks **Create Event**. They fill in details:
   - Event Title: *Web Dev Hackathon*
   - Projection: *100 students internal, 20 external*
   - Budget requested: *INR 5,000*
   - Flyer upload: *Hackathon.png*
2. **Review**: The event is added as `"pending"`. The College Admin's dashboard is updated in real-time. The Admin reviews the details and requested budget directly from their pending approvals feed.
3. **Approval & Going Live**: The Admin clicks **Approve**. The event status updates to `"approved"`, instantly publishing it onto the Student portal, making it available for registration.

---

### Scenario C: Live Event QR Check-In (Real-Time)
At the event venue, checking in students is quick and paperless:

```
[ Faculty Screen ]                   [ Student Phone ]
Displays dynamic QR Code  ───────>   Scans with Camera / App
                                            │
                                            ▼
[ Live Dashboard Updates ]  <────────   Check-in Successful!
Updates attendance list instantly
```

1. **Host Setup**: The Faculty member opens the event details on a projector screen and clicks **Generate Check-in QR**. A large QR code appears on the screen.
2. **Student Scan**: Arriving students open the Club Hub app on their phones and scan the projector screen (or type in the short code shown below it).
3. **Instant Sync**:
   - The student's screen flashes **Check-in Successful! Welcome!**
   - The Faculty's dashboard dashboard updates *live*, immediately changing that student's status to **Present** and updating the live attendee counter.
4. **Auto-Absent**: If a registered student fails to show up, a background system automatically marks them as **Absent** 5 minutes after the event ends.
5. **Print Register**: The Faculty coordinator clicks **Download PDF** to get a formatted A4 attendance sheet with signatures lines, ready to print and submit.

---

### Scenario D: Feedback & Ratings
1. **Submitting Feedback**: Once marked as **Present** at the Hackathon, the student is unlocked to give reviews. They rate the event 5 stars and add a comment: *"Loved the coding challenges!"*
2. **Responding**: The Faculty member reads the comment on their feedback dashboard and replies: *"Thanks! See you at the next one."* The student receives an email notification with the reply.

---

### Scenario E: Real-Time Chat Messenger
* A student has a question about the Hackathon rules. They open the **Messages** tab, select their Faculty coordinator, and type a message.
* The message is delivered instantly. A notification bubble appears on the Faculty coordinator's screen, allowing them to reply immediately.
* **Security Rule**: Students can only message Faculty coordinators to keep communications professional, while Faculty and Admins can message anyone.

---

## 4. Club Health & Statistics
Rather than manually reviewing performance reports, college admins can monitor the automated **Club Health Score** (rated out of 100). The platform calculates this automatically using:
* **Event Frequency**: How many events the club hosts (Active clubs get up to 40 points).
* **Participation**: The total number of members in the club.
* **Attendance Rate**: How many registered students actually checked in at events.
* **Budget Efficiency**: How well the club utilizes the allocated funds compared to events held.

Clubs are graded as:
- 🟢 **Healthy** (70–100 points) — The club is active, has high attendance, and spends budget efficiently.
- 🟡 **Warning** (40–69 points) — The club is moderately active but needs to boost attendance or event counts.
- 🔴 **Critical** (Under 40 points) — The club has been inactive or has poor attendance.
