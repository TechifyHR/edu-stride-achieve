# GrowPath LMS

Project Name

TechifyHR LMS

Product Vision

Build a modern, responsive Learning Management System (LMS) for SMEs with approximately 20–200 employees. This LMS is the first module of a larger modular HRIS platform, so the architecture must be scalable and reusable.

The design should follow modern SaaS principles with a clean white interface, green primary brand color (#1D7A3E or similar), rounded cards, subtle shadows, and a professional corporate feel.

Future modules such as Employee Management, Leave, Performance, Recruitment, Payroll, and Documents will be added later.

The navigation should already accommodate these future modules.

User Roles

Super Admin

Can manage organizations.

HR Administrator

Can

 Create courses

 Upload learning content

 Assign learning

 View reports

 Issue certificates

 Manage employees

Manager (Future)

Can monitor direct reports.

Employee

Can

 View assigned courses

 Continue learning

 Take quizzes

 Download certificates

 View learning history

Sidebar

Dashboard

Learning

 My Learning

 Course Library

 Certificates

Administration

 Courses

 Employees

 Reports

Coming Soon

 People

 Leave

 Attendance

 Payroll

 Performance

 Recruitment

Settings

Dashboard

Display

Welcome back

Learning Progress Card

Assigned Courses

Completed Courses

Overdue Courses

Certificates Earned

Recent Learning

Upcoming Due Courses

Progress Chart

Completion Rate

Recent Certificates

Employee Dashboard

Employee sees only assigned learning.

Cards

 Assigned

 In Progress

 Completed

 Certificates

Below

Continue Learning

Recent Activity

Upcoming Deadlines

Achievements

Course Model

Each course contains

Course Title

Description

Category

Thumbnail

Estimated Duration

Difficulty

Status

Mandatory

Due Date

Certificate Enabled

Quiz Enabled

Passing Score

Minimum Video Completion %

Lessons

A course contains one or more lessons.

Supported lesson types

YouTube Video

Admin pastes a YouTube URL.

Example

https://youtube.com/watch?v=XXXXXXXX

The system automatically

 extracts the video ID

 displays the thumbnail

 embeds the video inside the LMS

 never redirects users to YouTube

 saves watch progress continuously

Employees must remain inside the LMS.

Uploaded Video

Upload MP4

PDF

Embedded PDF Viewer

PowerPoint

Upload PPT/PPTX

Render slides.

Text Lesson

Rich text editor

External Resource

URL

Video Tracking

For embedded YouTube videos

Track

Current Position

Highest Position Viewed

Total Watch Time

Completion %

Store

Started At

Completed At

Paused At

Last Position

Completion Rules

Admin selects

Minimum Watch %

Example

90%

The Next Lesson remains locked until completion requirement is met.

Quiz remains locked until completed.

Course cannot finish until all required lessons meet completion requirements.

Quiz

Support

Multiple Choice

True/False

Multiple Answer

Random Question Order

Time Limit

Attempts

Pass Mark

After successful completion

Unlock certificate automatically.

Certificate Engine

Automatically generate a professional PDF certificate.

Include

Employee Name

Course Name

Completion Date

Certificate Number

Organization Logo

Authorized Signature

QR Verification Placeholder

Employee can

Preview

Download PDF

My Certificates

Employee sees

Certificate

Course

Date

Download

Search

Course Builder

HR clicks

Create Course

Step 1

Basic Information

Step 2

Add Lessons

Add

YouTube Video

Video Upload

PDF

PowerPoint

Text

External Link

Drag-and-drop lesson ordering.

Step 3

Quiz

Step 4

Certificate

Step 5

Assignment

Assignment

Assign

Individual Employee

Department

Job Role

Entire Company

Due Date

Reminder Frequency

Reports

Dashboard

Completion %

Average Score

Learning Hours

Overdue Learning

Most Viewed Courses

Export

Excel

PDF

CSV

Employee Record

Only minimal data for now.

Employee ID

First Name

Last Name

Email

Department

Job Title

Manager

Employment Status

Date Joined

This module must be reusable by future HR modules.

Notifications

Notify employees when

Course Assigned

Reminder

Course Due

Course Overdue

Certificate Ready

Notifications appear

Inside App

Email

Search

Global Search

Courses

Employees

Certificates

UI Style

Minimal

Modern SaaS

White background

Primary Green

Rounded corners

Soft shadows

Responsive

Desktop first

Tablet

Mobile

Tech Stack

Frontend

React

TypeScript

Tailwind

Backend

Supabase

Authentication

Supabase Auth

Database

PostgreSQL

Storage

Supabase Storage

Charts

Recharts

Forms

React Hook Form

Validation

Zod

Icons

Lucide

Database Tables

Design normalized tables for:

 organizations

 users

 employees

 departments

 courses

 course_lessons

 lesson_progress

 course_assignments

 quizzes

 quiz_questions

 quiz_answers

 quiz_attempts

 certificates

 notifications

 activity_logs

Include proper foreign keys, timestamps, and soft delete support where appropriate.

Future-ready Architecture

Build using a modular architecture where each feature is isolated into reusable components and services. Shared entities (users, employees, departments, notifications) should be designed so they can be reused by future HR modules such as Leave Management, Performance Management, Payroll, Recruitment, Attendance, and Employee Documents without requiring major schema changes.

One additional recommendation

I would also ask Lovable to build the LMS as a multi-tenant application from the start, even if your first client has only 30–35 employees. Add an Organization layer so each company has its own isolated data, branding, and users. This adds little complexity now but saves a major redesign when you onboard additional clients.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://edu-stride-achieve.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/099b67fd-af9a-4c3e-bf92-c88e8c2ba70d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
