import { RegressionCase } from "../types.js";

export const REGRESSION_CASES: RegressionCase[] = [
  {
    id: "RC-001",
    name: "Simple login feature",
    tags: ["auth", "basic"],
    expectedMinScore: 6.5,
    expectedUserStoriesCount: { min: 2, max: 5 },
    expectedAcPerStory: { min: 3, max: 8 },
    input: {
      format: "free_text",
      content: `Users need to be able to log in to the application using their email and password.
There should be a "Remember me" option. Users who forget their password should be able to reset it via email.
After 5 failed login attempts, the account should be locked for 15 minutes.`,
    },
  },
  {
    id: "RC-002",
    name: "Jira ticket - search functionality",
    tags: ["search", "ticket"],
    expectedMinScore: 6.0,
    expectedUserStoriesCount: { min: 1, max: 4 },
    expectedAcPerStory: { min: 3, max: 10 },
    input: {
      format: "jira_ticket",
      content: `PROJ-123: Add product search
Summary: As a customer I want to search for products so I can find what I'm looking for quickly.
Description:
- Full text search across product name, description, SKU
- Filter by category, price range, availability
- Sort by relevance, price, newest
- Show 20 results per page with pagination
- Search should return results in < 500ms
Priority: High
Labels: search, performance, mvp`,
    },
  },
  {
    id: "RC-003",
    name: "PRD excerpt - notifications",
    tags: ["notifications", "prd"],
    expectedMinScore: 6.5,
    expectedUserStoriesCount: { min: 3, max: 8 },
    expectedAcPerStory: { min: 2, max: 8 },
    input: {
      format: "prd",
      content: `## Notifications System

### Overview
Users need to receive timely notifications about important events in the system.

### Requirements
1. In-app notifications: real-time, shown as badge on bell icon
2. Email notifications: configurable per notification type
3. Push notifications: mobile only, requires opt-in
4. Notification preferences: users can enable/disable each type per channel
5. Notification history: last 90 days, paginated
6. Mark as read: individually or bulk

### Non-functional
- Notification delivery < 2s for in-app
- Email delivery < 5 minutes
- Support 10k concurrent users`,
    },
  },
];
