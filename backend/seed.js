import mongoose from "mongoose"
import dotenv from "dotenv"
import User from "./models/User.js"
import Club from "./models/Club.js"
import Event from "./models/Event.js"
import Complaint from "./models/Complaint.js"
import Budget from "./models/Budget.js"
import Notification from "./models/Notification.js"
import Feedback from "./models/Feedback.js"
import EventRegistration from "./models/EventRegistration.js"

dotenv.config()

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI)
  console.log("Connected. Seeding...")

  await Promise.all([
    User.deleteMany(),
    Club.deleteMany(),
    Event.deleteMany(),
    Complaint.deleteMany(),
    Budget.deleteMany(),
    Notification.deleteMany(),
    Feedback.deleteMany(),
    EventRegistration.deleteMany(),
  ])

  const clubs = await Club.insertMany([
    { name: "Coding Club",      category: "technical", status: "healthy",  membersCount: 180, rating: 4.5, description: "Build, hack, and innovate.", founded: "2018" },
    { name: "Robotics Club",    category: "technical", status: "critical", membersCount: 120, rating: 3.2, description: "Engineering the future.",    founded: "2019" },
    { name: "Dance Club",       category: "cultural",  status: "warning",  membersCount: 150, rating: 4.6, description: "Express through movement.",  founded: "2017" },
    { name: "Photography Club", category: "arts",      status: "healthy",  membersCount: 90,  rating: 4.8, description: "Capture and tell stories.",  founded: "2020" },
    { name: "Debate Club",      category: "other",     status: "healthy",  membersCount: 75,  rating: 4.3, description: "Sharpen your voice.",         founded: "2016" },
  ])

  const [coding, robotics, dance, photo, debate] = clubs

  const users = await User.create([
    { name: "Dr. Arjun Mehta",    email: "admin@clubhub.edu",    password: "Admin@2024",   role: "admin",   department: "Administration" },
    { name: "Prof. Kavitha Rajan",email: "kavitha@clubhub.edu",  password: "Faculty@123",  role: "faculty", assignedClub: coding._id,   department: "Computer Science" },
    { name: "Prof. Ramesh Iyer",  email: "ramesh@clubhub.edu",   password: "Faculty@123",  role: "faculty", assignedClub: robotics._id, department: "Mechanical Engg" },
    { name: "Prof. Priya Nair",   email: "priya@clubhub.edu",    password: "Faculty@123",  role: "faculty", assignedClub: dance._id,    department: "Arts" },
    // { name: "Aditya Kumar",       email: "aditya@student.edu",   password: "Student@123",  role: "student", department: "Computer Science" },
    // { name: "Sneha Patel",        email: "sneha@student.edu",    password: "Student@123",  role: "student", department: "Electronics" },
    // { name: "Riya Sharma",        email: "riya@student.edu",     password: "Student@123",  role: "student", department: "Arts" },
    { name: "Aditya Kumar",       email: "aditya@student.edu",   password: "Student@123",  role: "student", department: "Computer Science", regNo: "U24CS01A000001"},
    { name: "Sneha Patel",        email: "sneha@student.edu",    password: "Student@123",  role: "student", department: "Electronics",  regNo: "U24EC01A000002"}   ,
    { name: "Riya Sharma",        email: "riya@student.edu",     password: "Student@123",  role: "student", department: "Arts",          regNo: "U24AR01A000003" }  ,
  ])

  const [admin, kavitha, ramesh, priya, aditya, sneha, riya] = users

  await Club.findByIdAndUpdate(coding._id,   { faculty: kavitha._id })
  await Club.findByIdAndUpdate(robotics._id, { faculty: ramesh._id })
  await Club.findByIdAndUpdate(dance._id,    { faculty: priya._id })

  const events = await Event.insertMany([
    { name: "Hackathon 2026",    clubId: coding._id,   clubName: "Coding Club",      status: "approved", date: "2026-04-10", time: "09:00 AM", venue: "CS Lab 1",        maxCapacity: 60,  tags: ["coding"],     facultyId: kavitha._id },
    { name: "Web Dev Workshop",  clubId: coding._id,   clubName: "Coding Club",      status: "approved", date: "2026-04-20", time: "02:00 PM", venue: "Seminar Hall A",  maxCapacity: 40,  tags: ["react"],      facultyId: kavitha._id },
    { name: "Robo Wars",         clubId: robotics._id, clubName: "Robotics Club",    status: "pending",  date: "2026-05-05", time: "10:00 AM", venue: "Mech Workshop",   maxCapacity: 30,  tags: ["robotics"],   facultyId: ramesh._id },
    { name: "Spring Dance Fest", clubId: dance._id,    clubName: "Dance Club",       status: "approved", date: "2026-04-15", time: "06:00 PM", venue: "Auditorium",      maxCapacity: 200, tags: ["dance"],      facultyId: priya._id },
    { name: "Photo Walk",        clubId: photo._id,    clubName: "Photography Club", status: "approved", date: "2026-04-18", time: "07:00 AM", venue: "Main Campus",     maxCapacity: 25,  tags: ["photography"],facultyId: kavitha._id },
  ])

  const [hack, webdev, robo, dancefest, photowalk] = events

  // await EventRegistration.insertMany([
  //   { event: hack._id,      student: aditya._id, status: "attended" },
  //   { event: webdev._id,    student: aditya._id, status: "registered" },
  //   { event: dancefest._id, student: riya._id,   status: "registered" },
  //   { event: photowalk._id, student: riya._id,   status: "attended" },
  //   { event: robo._id,      student: sneha._id,  status: "registered" },
  // ])
  const eventRegistrations = await EventRegistration.insertMany([
    { eventId: hack._id,      studentId: aditya._id, confirmationCode: "CONF-001", status: "attended" },
    { eventId: webdev._id,    studentId: aditya._id, confirmationCode: "CONF-002", status: "registered" },
    { eventId: dancefest._id, studentId: riya._id,   confirmationCode: "CONF-003", status: "registered" },
    { eventId: photowalk._id, studentId: riya._id,   confirmationCode: "CONF-004", status: "attended" },
    { eventId: robo._id,      studentId: sneha._id,  confirmationCode: "CONF-005", status: "registered" },
  ]);

  await Feedback.insertMany([
    { studentId: aditya._id, targetType: "event", targetId: hack._id,      rating: 5, comment: "Best hackathon ever!" },
    { studentId: aditya._id, targetType: "club",  targetId: coding._id,    rating: 5, comment: "Incredibly well organized." },
    { studentId: riya._id,   targetType: "event", targetId: photowalk._id, rating: 4, comment: "Campus looked stunning at dawn." },
    { studentId: sneha._id,  targetType: "club",  targetId: robotics._id,  rating: 3, comment: "Needs more equipment." },
  ])

  await Notification.insertMany([
    { userId: aditya._id, title: "Registered for Hackathon 2026",  description: "Confirmed for Apr 10.",              type: "success", read: false },
    { userId: aditya._id, title: "New event: Web Dev Workshop",     description: "Open for registration.",             type: "info",    read: false },
    { userId: riya._id,   title: "Spring Dance Fest approved",      description: "See you on Apr 15!",                type: "success", read: false },
    { userId: sneha._id,  title: "Robo Wars pending approval",      description: "Awaiting admin approval.",           type: "warning", read: true  },
  ])

  await Complaint.insertMany([
    { content: "AC not working during Dance Fest rehearsal.", type: "facility", status: "open",     studentId: riya._id },
    { content: "Robotics club rating has dropped.",           type: "rating",   status: "open",     studentId: sneha._id },
    { content: "Hackathon prizes delayed by 2 weeks.",        type: "alert",    status: "resolved", studentId: aditya._id },
  ])

  // await Budget.create({ budgetUsed: 85000, budgetTotal: 150000, photosUploaded: 320, reportsPending: 3 })
  await Budget.create({
    purpose: "Annual tech fest equipment and arrangements",
    amount: 85000,
    clubId: coding._id,
    facultyId: kavitha._id,
    status: "approved"
  });

  console.log("\n✅ Seed complete!\n")
  console.log("👑 ADMIN    admin@clubhub.edu       / Admin@2024")
  console.log("🎓 FACULTY  kavitha@clubhub.edu     / Faculty@123  → Coding Club")
  console.log("🎓 FACULTY  ramesh@clubhub.edu      / Faculty@123  → Robotics Club")
  console.log("🎓 FACULTY  priya@clubhub.edu       / Faculty@123  → Dance Club")
  console.log("🎒 STUDENT  aditya@student.edu      / Student@123")
  console.log("🎒 STUDENT  sneha@student.edu       / Student@123")
  console.log("🎒 STUDENT  riya@student.edu        / Student@123\n")

  process.exit()
}

seed().catch(err => { console.error(err); process.exit(1) })