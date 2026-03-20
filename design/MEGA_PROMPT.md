# My Team — Church Volunteer Team Management App

## Build Prompt for Developer

You are building **My Team**, a responsive web application for managing church volunteer teams. The app integrates with **Planning Center Online (PCO)** for team/member data and adds features for goals, feedback, and guides that PCO doesn't provide. The app is built with **Next.js** (App Router), **Prisma** (PostgreSQL), and **GraphQL**. PCO sync into the database already exists. The GraphQL API exists but may need new queries/mutations for the features below.

Reference the exported design screens in `design-exports/` and the `.pen` design file at `my-team.pen` for pixel-perfect implementation.

---

## Tech Stack

- **Framework**: Next.js (App Router) with TypeScript
- **Database**: PostgreSQL via Prisma ORM
- **API**: GraphQL (existing, extend as needed)
- **Auth**: Planning Center OAuth (SSO — "Sign in with Planning Center")
- **External Integration**: Planning Center Online API (teams, members, roles already synced)
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Font**: Outfit (weights 400, 500, 600, 700) via Google Fonts

---

## Design System / Tokens

All colors, spacing, and typography follow these design tokens. Implement as CSS custom properties:

```css
:root {
  --accent: #3D8A5A;
  --accent-dark: #4D9B6A;
  --accent-light: #C8F0D8;
  --bg-page: #F5F4F1;
  --bg-card: #FFFFFF;
  --bg-elevated: #FAFAF8;
  --bg-muted: #EDECEA;
  --border: #E5E4E1;
  --border-strong: #D1D0CD;
  --text-primary: #1A1918;
  --text-secondary: #6D6C6A;
  --text-tertiary: #9C9B99;
  --text-tab-inactive: #A8A7A5;
  --text-on-accent: #FFFFFF;
  --coral: #D89575;
  --error: #D08068;
  --success: #4D9B6A;
  --warning: #D4A64A;
}
```

### Typography
- Font: `Outfit`
- Page titles: 26-28px, weight 600, letter-spacing -0.5px
- Section labels: 12px, weight 600, letter-spacing 1px, uppercase, `--text-tertiary`
- Body: 14-15px, weight 400-500
- Small/meta: 12-13px

### Component Patterns
- **Cards**: White bg, cornerRadius 16px, subtle shadow (`0 2px 12px rgba(26,25,24,0.03)`)
- **Buttons (primary)**: `--accent` bg, white text, cornerRadius 10-12px, weight 600
- **Buttons (secondary/outline)**: No bg, `--accent` border 1.5px, `--accent` text
- **Input fields**: `--border` stroke, cornerRadius 8-12px
- **Pill badges**: cornerRadius 10-12px, `--accent-light` bg with `--accent` text, or `--bg-muted` bg with `--text-tertiary` text

---

## Responsive Layout

### Mobile (< 768px) — 402px design width
- **No sidebar** — content fills full width
- **Bottom tab bar**: Pill-shaped container (cornerRadius 36px, white bg, `--border` stroke 1px, height 62px, padding 4px) with 4 tabs:
  - MY TEAMS (lucide `users`)
  - GOALS (lucide `target`)
  - GUIDES (lucide `book-open`)
  - SETTINGS (lucide `settings`)
- Active tab: Green pill (`--accent` bg, white icon+text, weight 600, cornerRadius 26px)
- Inactive tabs: `--text-tertiary` icon+text, weight 500
- Tab labels: 10px uppercase, letter-spacing 0.5px
- Status bar: height 62px

### Desktop (>= 768px) — 1440px design width
- **Left sidebar**: 260px wide, white bg, right border `--border`
  - Logo: Lucide `church` icon (22px, `--accent`) + "My Team" (Outfit 20px, 600)
  - Nav items: 4 items stacked vertically, gap 4px
    - Each: horizontal, icon (20px) + label (15px, 500), padding 10px 14px, cornerRadius 8px
    - Active: `--accent` bg, white icon+text, weight 600
    - Inactive: `--text-secondary` icon+text
  - Divider line (`--border`)
  - Profile button at bottom: `--accent-light` bg, cornerRadius 8px, avatar circle (36px, `--accent` bg, white initials) + name (`--accent`, 14px, 600) + chevron-right
- **Main content**: fills remaining width, padding 40px 48px

---

## Data Model (Prisma extensions needed)

The following models need to be ADDED to the existing Prisma schema. PCO-synced models (Team, Person, TeamMember, Role, etc.) already exist.

```prisma
// Goals set by team members, approved by leaders
model Goal {
  id          String   @id @default(cuid())
  title       String
  description String?
  progress    Int      @default(0) // 0-100
  status      GoalStatus @default(PENDING)
  dueDate     DateTime?
  personId    String
  person      Person   @relation(fields: [personId], references: [id])
  teamId      String
  team        Team     @relation(fields: [teamId], references: [id])
  reviewedBy  String?
  reviewer    Person?  @relation("GoalReviewer", fields: [reviewedBy], references: [id])
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

enum GoalStatus {
  PENDING    // Awaiting leader approval
  APPROVED
  DECLINED
  COMPLETED
}

// Feedback from leaders to team members
model Feedback {
  id         String       @id @default(cuid())
  content    String
  type       FeedbackType
  authorId   String
  author     Person       @relation("FeedbackAuthor", fields: [authorId], references: [id])
  recipientId String
  recipient  Person       @relation("FeedbackRecipient", fields: [recipientId], references: [id])
  teamId     String
  team       Team         @relation(fields: [teamId], references: [id])
  isShared   Boolean      @default(false) // visible to recipient?
  createdAt  DateTime     @default(now())
}

enum FeedbackType {
  ENCOURAGEMENT
  GROWTH_AREA
  GENERAL
}

// Guides/SOPs created by leaders
model Guide {
  id           String      @id @default(cuid())
  title        String
  content      String      // Rich text / markdown
  category     GuideCategory
  status       GuideStatus @default(DRAFT)
  authorId     String
  author       Person      @relation(fields: [authorId], references: [id])
  teamId       String
  team         Team        @relation(fields: [teamId], references: [id])
  roleId       String?     // Optional: tie to specific role
  role         Role?       @relation(fields: [roleId], references: [id])
  isPinned     Boolean     @default(false)
  isVisibleToTeam Boolean  @default(true)
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
}

enum GuideCategory {
  QUICK_START
  TROUBLESHOOTING
  SOP
}

enum GuideStatus {
  DRAFT
  PUBLISHED
}
```

---

## Screens & Routes

### 1. Login (`/login`)
**Auth**: Unauthenticated only
- Mobile: Decorative icon cluster (heart-handshake, users, calendar-check in green circles) above a centered login card
- Laptop: Split layout — left half with community stock photo + green gradient overlay, right half with login card
- Login card: Church icon, "My Team" title, "Serving together, growing together" tagline, green "Sign in with Planning Centre" button
- OAuth flow redirects to PCO, returns to `/teams`

### 2. My Teams (`/teams`)
**Auth**: Authenticated
- Shows all teams the current user belongs to
- Each team card: Team name, campus, member count, next serving date, role badge
- Cards link to `/teams/[teamId]`
- **Empty state**: Icon in circle + "No Teams Yet" title + "You haven't been added to any teams..." description

### 3. Team View (`/teams/[teamId]`)
**Auth**: Authenticated team member
- Header: Back button, team name, campus name
- **Leader indicator**: If user is a team leader, show "Lead" badge (mobile) or "Team Lead" badge (laptop) in header, plus action buttons:
  - "Write Feedback" (green, solid) → `/teams/[teamId]/feedback/new`
  - "Review Goals (N)" (outlined) → `/teams/[teamId]/goals/review`
  - "New Guide" (outlined) → `/teams/[teamId]/guides/new`
- Sections:
  - **About**: Team description
  - **My Upcoming Serving**: Next scheduled dates with role badges (from PCO)
  - **Team Roles**: List of roles with member counts, links to `/teams/[teamId]/roles/[roleId]`
  - **Team Goals**: Progress bars showing team goal completion
  - **Leader Feedback**: Recent feedback quotes with left border accent, author attribution
  - **Guides**: Quick Start/SOP cards linked to the team, with role badges
  - **Team Members**: Avatar + name + role list
- Mobile: Gradient scroll fade overlay at bottom above tab bar
- **Empty state**: "No team data" centered message

### 4. Role View (`/teams/[teamId]/roles/[roleId]`)
**Auth**: Authenticated team member
- Header: Back button, role name (e.g., "Camera Operator"), team name
- Sections:
  - **Description**: Role responsibilities
  - **Current OKRs/Goals**: Progress bars with percentage
  - **Historic Goals**: Completed goals list
  - **Others in This Role**: Member avatars + names
  - **Guides**: Role-specific guides (filtered by roleId)
- Mobile: Single column, scroll fade overlay
- **Empty state**: "No role data" centered message

### 5. Goals & Feedback (`/goals`)
**Auth**: Authenticated
- **Segment control tabs**: "Goals" (default) and "Feedback"
- **Goals tab**:
  - Header with title + subtitle
  - Leader CTA buttons: "Write Feedback" + "Review (N)" showing pending count
  - "ACTIVE GOALS" section label
  - Goal cards: Title, description, progress bar with percentage, due date
  - "New Goal" button (green, top right on laptop)
- **Feedback tab** (`/goals?tab=feedback`):
  - Segment control switches to Feedback view
  - "RECENT FEEDBACK" label
  - Quote cards: Left border accent (green or coral), feedback text in quotes, author name + role, date
  - Two-column grid on laptop
- **Empty states** for both tabs: Centered icon + title + description

### 6. Guides (`/guides`)
**Auth**: Authenticated
- Header with title, subtitle, and **"New Guide" / "+" button** (visible to leaders only)
- Search bar
- Sections:
  - **QUICK START**: Guide cards with play icon, green accent
  - **STANDARD OPERATING PROCEDURES**: Guide cards with file-text icon, muted accent
- Each guide card shows: Category icon, title, description, **role badge** (e.g., "Sound Tech", "All Roles"), chevron
- Role badges: `--accent-light` bg + `--accent` text for specific roles, `--bg-muted` bg + `--text-tertiary` text for "All Roles"
- Cards link to `/guides/[guideId]`
- **Empty state**: "No Guides Yet" centered message

### 7. Guide Detail (`/guides/[guideId]`)
**Auth**: Authenticated
- Header: Back button + guide title
- Content: Rich text sections with headings, paragraphs, numbered lists
- Mobile: Card-based sections
- Laptop: Sidebar nav + main content area

### 8. Settings (`/settings`)
**Auth**: Authenticated
- Header: "Settings" title
- **Profile Card**: Avatar, name, email, role
- **PREFERENCES section**: Card with rows for:
  - Notifications (toggle)
  - Appearance / Theme
  - Language
  - Help & Support (chevron)
- Sign Out button (coral/error outline)
- Version footer text
- Laptop: Single column layout (no two-column needed)

### 9. Profile (`/profile`)
**Auth**: Authenticated
- Accessed by tapping the profile button in the sidebar (laptop) or settings area
- **Left column**: Profile card (large avatar, name, role title, email) + Account Information card (Phone, Church, Campus, Member Since)
- **Right column**: Your Teams list (team cards with icons, names, role, member count, chevrons) + Actions section with Sign Out button
- Mobile: Single column stack

---

## Management Screens (Leader-Only)

These screens are only accessible to users with a **leader role** on a team. Implement role-based access control checking the PCO team position/role data.

### 10. Write Feedback (`/teams/[teamId]/feedback/new`)
**Auth**: Team leader
- **For**: Member selector showing avatar, name, and role
- **Feedback type**: Radio/segment — Encouragement, Growth Area, General
- **Content**: Text area for feedback body
- **Visibility toggle**: "Share with team member" on/off
- **Submit**: Green "Submit Feedback" button
- Laptop: Centered form card (max ~600px), sidebar with Goals & Feedback nav active

### 11. Approve Goals (`/teams/[teamId]/goals/review`)
**Auth**: Team leader
- **Segment tabs**: Pending (default), Approved, Declined
- **Pending count badge** in header
- **Goal cards**: Member avatar + name + role, goal title, description, due date
- **Action buttons per card**: Green "Approve" + coral/error outline "Decline"
- Laptop: Table/card grid layout, sidebar with Goals & Feedback nav active

### 12. Guide Editor (`/teams/[teamId]/guides/new` or `/guides/[guideId]/edit`)
**Auth**: Team leader
- **Guide type chips**: Quick Start (play icon), Troubleshooting (wrench icon), SOP (file-text icon) — pill-shaped selectors, active one is green
- **Role selector**: Dropdown to assign guide to a specific role (or "All Roles")
- **Title input**: Large text field
- **Rich text editor**: Toolbar with bold, italic, heading, list, ordered list, link, image buttons
- **Content area**: Editable rich text
- **Right panel (laptop)**: Guide Details metadata card (Status badge, Author, Team, Role dropdown, Last Edited) + Visibility card (team visibility toggle, pin to top toggle)
- **Buttons**: "Save Draft" (outlined) + "Publish" (green)

---

## Navigation Flow

```
Login → My Teams (home)
  └── Team View
        ├── Role View
        ├── Write Feedback (leader only)
        ├── Approve Goals (leader only)
        └── New Guide (leader only)

Bottom tabs / Sidebar:
  ├── My Teams (/teams)
  ├── Goals & Feedback (/goals)
  │     ├── Goals tab
  │     └── Feedback tab
  ├── Guides (/guides)
  │     └── Guide Detail
  └── Settings (/settings)
        └── Profile (/profile)
```

---

## Key Behaviors

1. **PCO Data (read-only from PCO)**: Teams, team members, roles, serving schedules, campus info. This data syncs from PCO — the app does NOT manage team membership. Don't build any team member add/remove UI.

2. **App-Native Data (CRUD in this app)**: Goals, Feedback, Guides. These are created, read, updated, and deleted within the app, stored in PostgreSQL.

3. **Role-Based Access**:
   - **All members**: View teams, goals, feedback (their own), guides, settings
   - **Team leaders**: Write feedback, approve/decline goals, create/edit/publish guides, see "Lead" badge and action buttons

4. **Empty States**: Every list/section needs an empty state with: centered icon in a circle (48-56px, `--bg-muted` or `--accent-light` bg), title (15-16px, 600), description (13-14px, `--text-secondary`). No action buttons on empty states except "New Goal" on Goals.

5. **Responsive**: Every screen has mobile (402px) and laptop (1440px) designs. Use Tailwind breakpoints. Mobile gets bottom tab bar, laptop gets left sidebar.

6. **Scroll fade**: On mobile screens with content that clips behind the tab bar, add a gradient overlay (transparent → `--bg-page`) positioned absolutely above the tab bar.

7. **Guide role badges**: Guides can optionally be tied to a specific role. When tied, show a role badge pill on the card. When not tied, show "All Roles" badge in muted style.

---

## GraphQL Schema Extensions

Add these to the existing GraphQL schema:

```graphql
type Goal {
  id: ID!
  title: String!
  description: String
  progress: Int!
  status: GoalStatus!
  dueDate: DateTime
  person: Person!
  team: Team!
  reviewer: Person
  createdAt: DateTime!
}

type Feedback {
  id: ID!
  content: String!
  type: FeedbackType!
  author: Person!
  recipient: Person!
  team: Team!
  isShared: Boolean!
  createdAt: DateTime!
}

type Guide {
  id: ID!
  title: String!
  content: String!
  category: GuideCategory!
  status: GuideStatus!
  author: Person!
  team: Team!
  role: Role
  isPinned: Boolean!
  isVisibleToTeam: Boolean!
  createdAt: DateTime!
  updatedAt: DateTime!
}

# Queries
extend type Query {
  goals(teamId: ID, personId: ID, status: GoalStatus): [Goal!]!
  pendingGoals(teamId: ID!): [Goal!]!
  feedback(teamId: ID, recipientId: ID): [Feedback!]!
  guides(teamId: ID, roleId: ID, category: GuideCategory): [Guide!]!
  guide(id: ID!): Guide
}

# Mutations
extend type Mutation {
  createGoal(input: CreateGoalInput!): Goal!
  updateGoalStatus(id: ID!, status: GoalStatus!, reviewerId: ID): Goal!
  updateGoalProgress(id: ID!, progress: Int!): Goal!

  createFeedback(input: CreateFeedbackInput!): Feedback!

  createGuide(input: CreateGuideInput!): Guide!
  updateGuide(id: ID!, input: UpdateGuideInput!): Guide!
  publishGuide(id: ID!): Guide!
  deleteGuide(id: ID!): Boolean!
}
```

---

## File Structure Suggestion

```
app/
├── (auth)/
│   └── login/page.tsx
├── (app)/
│   ├── layout.tsx          # Sidebar (desktop) + Tab bar (mobile)
│   ├── teams/
│   │   ├── page.tsx        # My Teams
│   │   └── [teamId]/
│   │       ├── page.tsx    # Team View
│   │       ├── roles/[roleId]/page.tsx
│   │       ├── feedback/new/page.tsx    # Write Feedback (leader)
│   │       ├── goals/review/page.tsx    # Approve Goals (leader)
│   │       └── guides/new/page.tsx      # Guide Editor (leader)
│   ├── goals/page.tsx      # Goals & Feedback
│   ├── guides/
│   │   ├── page.tsx        # Guides list
│   │   └── [guideId]/
│   │       ├── page.tsx    # Guide Detail
│   │       └── edit/page.tsx  # Guide Editor (leader)
│   ├── settings/page.tsx
│   └── profile/page.tsx
components/
├── layout/
│   ├── Sidebar.tsx
│   ├── MobileTabBar.tsx
│   └── ScrollFade.tsx
├── ui/
│   ├── Card.tsx
│   ├── Button.tsx
│   ├── Badge.tsx
│   ├── SegmentControl.tsx
│   ├── ProgressBar.tsx
│   ├── Toggle.tsx
│   ├── EmptyState.tsx
│   └── Avatar.tsx
├── goals/
│   ├── GoalCard.tsx
│   └── GoalApprovalCard.tsx
├── feedback/
│   ├── FeedbackCard.tsx
│   └── FeedbackForm.tsx
├── guides/
│   ├── GuideCard.tsx
│   ├── GuideEditor.tsx
│   └── RoleBadge.tsx
└── teams/
    ├── TeamCard.tsx
    ├── RoleCard.tsx
    └── LeaderActions.tsx
```

---

## Implementation Priority

1. **Phase 1 — Core Shell**: Layout (sidebar, tab bar, responsive), auth (PCO OAuth), My Teams page, Team View page
2. **Phase 2 — Read Screens**: Role View, Settings, Profile, empty states
3. **Phase 3 — Goals & Feedback**: Goals list, feedback list, segment control, goal cards, feedback quotes
4. **Phase 4 — Guides**: Guides list, guide detail, role badges, search
5. **Phase 5 — Leader Management**: Write Feedback form, Approve Goals workflow, Guide Editor with rich text
6. **Phase 6 — Polish**: Scroll fades, animations, loading states, error handling

---

## Design Reference

All 36 screens have been exported to:
- **PDF** (all screens): `design-exports/export.pdf`
- **Individual PNGs**: `design-exports/screens/` (one per screen)
- **Source design file**: `my-team.pen`

Screen inventory (18 page sections × 2 form factors):
| Section | Mobile | Laptop | Extras |
|---------|--------|--------|--------|
| Login | ✓ | ✓ | |
| My Teams | ✓ | ✓ | + Empty (M/L) |
| Team View | ✓ | ✓ | + Empty (M/L) |
| Role View | ✓ | ✓ | + Empty (M/L) |
| Goals & Feedback | ✓ | ✓ | + Empty (M/L), Feedback tab (M/L) |
| Guides | ✓ | ✓ | + Empty (M/L), Detail (M/L) |
| Settings | ✓ | ✓ | |
| Profile | ✓ | ✓ | |
| Write Feedback | ✓ | ✓ | Leader only |
| Approve Goals | ✓ | ✓ | Leader only |
| Guide Editor | ✓ | ✓ | Leader only |
