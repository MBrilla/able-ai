---
title: "[]{#_39zs2pbfafil .anchor}👥 User Authentication & Session
  Management"
---

Allow users to securely access the platform via a single account, manage
their active role (Buyer/Worker), and have their session/context
remembered.

**MVP vs. Post-MVP:**

- **MVP:**

  - Secure registration (WEB-A01, SVR-A01, SVR-A04).

  - Email verification upon registration (send magiclink for verify +
    > optional resend button on login page).

  - Secure login (WEB-A02 partial - role restore, SVR-A02, SVR-A03).

  - Role switching mechanism (WEB-A03).

  - Full password recovery flow (WEB-A05, WEB-A06, SVR-A05).

  - Two-Factor Authentication (2FA).

  - Last role restoration.

- **Post-MVP:**

  - Secure logout (WEB-A04).

  - Session persistence (WEB-A02), (24hrs with 5 min about to expire
    > toast).

  - lastView restoration (complex state management).

  - Social logins (Google, etc.).

  - \"Remember Me\" functionality with longer session duration (7 days).

📝 WEB-A01 Unified Registration

This is the entry point for new users. A simple, unified registration
process reduces friction and encourages sign-ups, allowing us to capture
potential Buyers and Gig Workers within a single user base.

## **User Story** {#user-story .unnumbered}

- **As a** guest visitor,

- **I want to** register for a single AbleAI user account by providing
  > my name, phone number, email, and password.

- **so that** I can access the platform\'s features.

- **Acceptance Criteria:**

  - A registration form (e.g., on the OpeningScreen) collects name,
    > phone number, email, and password.

  - The password is securely hashed.

  - A single User record is created in the database (default role might
    > be USER initially, or determined by the first action).

  - Upon success, the user is logged in and redirected to the primary
    > webapp interface (e.g., StepOneScreen to choose initial intent or
    > a default home screen).

  - Error messages for invalid input or an existing email.

![](media/image22.png){width="2.5268449256342955in"
height="4.193486439195101in"}

**Definition of Done (DoD):**

- A user can access the registration form/screen (e.g., OpeningScreen).

- The form collects Name, phone number, Email, and Password fields.

- Validate Input and provide feedback for users.

  - Basic format checks for email,

  - The password should follow NIST 800‑63: ≥10 chars, with no
    > composition rules; and the platform should block the top 10k
    > passwords that have been breached.

- Submission attempts to create a new User record in the database after
  > email or phone verification.

- Email confirmation for account verification, send a magic link for
  > verification, and an optional resend button on the login page.

- Email uniqueness is enforced; attempting to register with an existing
  > email shows an error.

- Passwords are securely hashed (verified via checking DB, not plain
  > text).

- On successful creation, the user is automatically logged in (session
  > created).

- User is redirected to StepOneScreen.

- Relevant error messages are clearly displayed to the user on failure.

REVIEWING\... **Could you please review and confirm whether the user
stories have been implemented correctly, or let me know if there are any
issues or improvements needed?**

🚪 WEB-A02 Unified Login & Context Restoration

Provides secure access for returning users and improves user experience
by restoring their context (lastRole), reducing the need for users to
re-select their mode each time and making the app feel more personalized
and efficient.

## **User story** {#user-story-1 .unnumbered}

- **As a** registered user,

- **I want to** log in using my email and password,

- **so that** I can access the platform and resume where I left off.

- **Acceptance Criteria:**

  - Login form accepts email/password.

  - Upon successful validation, a session is created.

  - The system retrieves the user\'s last role (Buyer or Worker) stored
    > in the database/profile.

  - The user is redirected to the appropriate webapp home screen
    > (BuyerHome or GigWorkerHome) based on lastRole.

  - If lastRole is not set (e.g., first login after registration changes
    > or closes the browser before selecting a role), redirects to
    > StepOneScreen.

  - **(Stretch Goal/Client-Side):** The app attempts to restore the
    > lastView (e.g., specific screen like Calendar, Profile) the user
    > was on, potentially using local storage or session storage.

  - Error messages for invalid credentials or account status
    > (banned/disabled).

**Table: Login handling for banned / disabled accounts**

<table>
<colgroup>
<col style="width: 28%" />
<col style="width: 23%" />
<col style="width: 22%" />
<col style="width: 25%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Phase in the request</strong></th>
<th><strong>What the user sees</strong></th>
<th><strong>Why this pattern</strong></th>
<th><strong>Notes for devs</strong></th>
</tr>
<tr class="odd">
<th>Username + password sent (credentials may be wrong)</th>
<th><p>Always return a generic failure message:</p>
<p>“Email or password is incorrect.”</p></th>
<th>Prevents account enumeration: an attacker can’t learn whether the
address exists, or whether it is merely disabled. OWASP explicitly
recommends consistent error text.</th>
<th>Use identical HTTP code (401) and comparable response time for all
negative outcomes.</th>
</tr>
<tr class="header">
<th><p>Credentials are correct, but the account flag is
“<strong>LOCKED_TEMP.”</strong></p>
<p>(e.g. 5 bad attempts → 15‑min lock)</p></th>
<th>“Your account is temporarily locked because of multiple unsuccessful
sign-in attempts. Try again in 15 min or reset your password.”</th>
<th>No enumeration risk once the password is known; clear feedback
reduces support calls and stops the user from retrying. Both
<strong>NIST SP 800‑63B</strong> and <strong>OWASP</strong> emphasize
usability once identity is proven.</th>
<th>Include the remaining lock timer in the JSON (e.g., retryAfter=900).
Auto-email a self-service unlock link if <strong>MFA</strong> is
enabled.</th>
</tr>
<tr class="odd">
<th>Credentials are correct but the account flag is BANNED /
DISABLED_PERM</th>
<th>“This account has been disabled. If you believe this is an error,
please message via our Discord channel with reference ID BLOCKED.”</th>
<th>User needs to know the situation. We still avoid exposing why the
ban was imposed (e.g., policy violation, chargeback, etc.).</th>
<th>Return <strong>HTTP 403</strong> with error=account_disabled.
Immediately send an email that explains the ban reason and the appeal
path.</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

#### **Why does this strike the right security ↔ UX balance** {#why-does-this-strike-the-right-security-ux-balance .unnumbered}

- **Enumeration defence remains intact** -- outsiders still get the same
  > "incorrect" message unless they also know the password. (OWASP WSTG
  > section *Account Enumeration*).

- **Legitimate users aren't left guessing** once they have proven
  > knowledge of the secret. NIST SP 800‑63B highlights "clear,
  > meaningful and actionable feedback" after authentication.

- **Attack surface stays small** -- you rate‑limit attempts (3--5),
  > enforce exponential back‑off, and expire temporary locks
  > automatically.

**Definition of Done (DoD):**

- User can access the login form/screen (e.g., OpeningScreen).

- Form collects Email and Password.

- Submission validates credentials against stored, hashed passwords.

- On successful validation, a user session is created and associated
  > cookie is set.

- The system retrieves the user\'s stored lastRole preference.

- User is redirected to the correct webapp home screen (GigWorkerHome or
  > BuyerHome) based on lastRole.

- If lastRole is missing, a selection screen (StepOneScreen) is shown.

- Appropriate, non-specific error messages are shown for invalid
  > credentials or account issues (banned/disabled).

- **(Post-MVP DoD):** lastView restoration logic is implemented (client
  > or server-side) and navigates the user closer to their previous
  > state.

- For banned/disabled accounts:

1.  **Flags & thresholds  
    > **

> enum AuthStatus { ACTIVE, LOCKED_TEMP, DISABLED_PERM }
>
> const MAX_FAILS = 5
>
> const TEMP_LOCK = 15 \* 60 // seconds

2.  **Pipeline  
    > **

    - Look up user by email (constant‑time).

    - If DISABLED_PERM → verify password ⇒ show *disabled* message.

    - If LOCKED_TEMP and lockUntil \> now ⇒ verify password ⇒ show
      > *locked* message.

    - Verify password.

      - Fail ⇒ increment counter, maybe set LOCKED_TEMP.

      - Pass ⇒ reset counter, continue login.

3.  **Audit & alerting  
    > **

    - Log every status transition with IP, UA, geo.

    - Notify security if a banned account has \>3 further login
      > attempts.

4.  **Self‑service unlock (optional post‑MVP)  
    > **

    - Email magic‑link after lock period, or allow password reset to
      > clear the temporary lock.

> By gating detailed feedback **only after** a correct password, Able
> gains the security of non‑enumerable error messages while delivering a
> humane UX for genuine users who have been locked or banned.

REVIEWING\... **Could you please review and confirm whether the user
stories have been implemented correctly, or let me know if there are any
issues or improvements needed?**

🔁 WEB-A03 Role Switching

Caters to users who act as both Buyers and Gig Workers, providing a
seamless way to switch contexts within the same session, enhancing
usability and engagement for dual-role users.

## **User Story** {#user-story-2 .unnumbered}

- **As an** authenticated user in the webapp,

- **I want to** use the \"Switch to Buyer/Worker\" toggle in the header
  > section,

- **so that** I can change my current view and operational mode within
  > the webapp.

- I should get the ***"You will lose unsaved changes"*** **confirmation
  > modal** before switching.

**Acceptance Criteria:**

- A toggle/button is present in the webapp footer/settings.

- Activating the toggle switches the displayed interface between the
  > Buyer and Worker home screens and related views.

- The user\'s lastRole preference is updated in the database/profile.

- The switch happens seamlessly within the webapp without a full page
  > reload if possible (or via navigation).

![](media/image11.png){width="2.4218755468066493in"
height="4.321384514435696in"}![](media/image15.png){width="2.4114588801399823in"
height="4.314377734033246in"}

**Definition of Done (DoD):**

- A clearly identifiable UI element (e.g., RoleToggle component) exists
  > in a header section.

- The element visually indicates the current active role.

- Interacting with the toggle updates the user\'s active role state
  > within the application.

- The application UI dynamically updates to reflect the newly selected
  > role (e.g., navigates to the corresponding home screen, updates
  > available actions/menus).

- The role change should completely clear the state associated with the
  > previous role, except role-independent features like account
  > settings, help/support, and general notifications.

- The user\'s lastRole preference is persisted (e.g., updated in the
  > database) for future sessions.

🏃 WEB-A04 Logout

Provides a standard and essential security feature, allowing users to
explicitly end their session, especially important on shared or public
devices.

## **User Story** {#user-story-3 .unnumbered}

- **As an** authenticated user in the webapp,

- **I want to** log out via an option (likely within Settings),

- **so that** my session is securely ended.

- **Acceptance Criteria:**

  - Logout option available in the webapp settings menu.

  - Clicking destroys the session cookie.

  - User redirected to the login/opening screen.

> ![](media/image6.png){width="2.807292213473316in"
> height="5.028713910761155in"}

**Definition of Done (DoD):**

- A \"Logout\" button/link is present in the Settings screen, and [it
  > can also be included in a dropdown accessible via a profile/avatar
  > icon in the top-right corner of the header]{.mark}.

- Clicking the logout option successfully destroys the user\'s session
  > on the server.

- The session cookie is cleared/invalidated in the user\'s browser.

- The user is redirected to an [OpeningScreen (the login/registration
  > screen).]{.mark}

- Attempting to access protected pages after logging out redirects back
  > to the registration / Login page.

🔑 WEB-A05 Password Recovery Request

Essential account recovery mechanism that prevents users from being
permanently locked out, reducing support load and improving user
retention.

## **User Story** {#user-story-4 .unnumbered}

- As a user who forgot their password,

- I want to use a \"Forgot Password\" feature in the webapp to receive a
  > reset link via email,

- so I can regain account access.

**Acceptance Criteria:**

- A \"Forgot Password\" link is available on the login page.

- Upon clicking the link, the user is prompted to enter their email
  > address.

- A password reset link is sent to the provided email address.

- The email contains a unique, time-sensitive link.

- Clicking the link redirects the user to a page where they can set a
  > new password.

- After successfully setting a new password, the user is able to log in
  > with their new credentials.

- The password reset link expires after 24 hours.

- The system handles cases where the email address is not found.

**Definition of Done (DoD):**

- A \"Forgot Password?\" link is visible on the login screen.

- Clicking the link leads to a simple form asking for the user\'s
  > registered email address.

- Upon submission, the backend checks if the email exists.

- A secure, unique token (which will expire after 24 hours) is generated
  > and stored if the email exists.

- The SendGrid email provider will be used.

- An email containing a link with this token is *sent* to the user\'s
  > email address (for testing, logging the link/token is sufficient for
  > DoD). This is the sample email:

> *Subject: Reset Your Able Password*
>
> *Hi \[First Name\],*
>
> *We received a request to reset your Able password. If this was you,
> click the button below:*
>
> *\[Reset My Password\]*
>
> *This link will expire in 24 hours. If you didn't request this, you
> can safely ignore this email.*
>
> *Thanks,*
>
> *The Able Team*
>
> *Be Good. Be Fair. Be Kind.*

- A generic success message is displayed to the user, regardless of
  > whether the email exists (prevents email enumeration).

🛑 WEB-A06 Password Reset Execution

Completes the account recovery loop, allowing users who have proven
ownership of their email address to securely set a new password and
regain access.

## **User story:** {#user-story-5 .unnumbered}

As a user who clicked a password reset link,

I want to be directed to a secure webapp page to set and confirm a new
password,

so I can finalize the reset process.

Acceptance Criteria:

- Given a user clicks a valid password reset link, they are redirected
  > to a dedicated, secure web page.

- When the user lands on the password reset page, they are presented
  > with fields to enter and confirm a new password.

- When the user enters matching passwords that meet defined complexity
  > requirements and submits the form, their password is reset
  > successfully.

- When the password reset is successful, the user is notified and
  > provided with options to log in.

- If the user enters non-matching passwords or passwords that do not
  > meet complexity requirements, they are shown clear error messages
  > and prompted to correct their input.

- If the password reset link is invalid or expired, the user is informed
  > and provided with instructions on how to request a new password
  > reset.

**Definition of Done (DoD):**

- A dedicated route/page exists (e.g., /reset-password) that accepts the
  > token from the URL.

- The backend validates the token (exists, not expired, not used).

- If the token is valid, a form is displayed allowing the user to enter
  > and confirm a new password.

- Password complexity rules are enforced on the new password input.

- Upon successful submission (passwords match and meet complexity), the
  > new password is securely hashed and updated for the associated user.

- The password reset token is marked as used in the database.

- A success message is displayed, and the user is redirected to the
  > login page.

- Appropriate error messages are shown for invalid/expired tokens,
  > password mismatch, or weak passwords.

📦 SVR-A01 User Storage

Foundational requirement for any user-based system. Securely and
accurately storing user data enables login, personalization, and
role-based access control.

**System Story**

The system must securely store user credentials (hashed passwords),
name, email, unique ID, and assigned roles (User, plus potentially
Buyer/Worker flags/profiles).

**Definition of Done (DoD):**

- User model defined in the Drizzle schema includes fields for

  - id,

  - email (unique),

  - password (string),

  - name,

  - role (enum),

  - createdAt,

  - updatedAt,

  - phoneNumber: Required during registration and useful for KYC and
    > notifications,

  - lastActiveRole: To support role switching and context restoration on
    > login,

  - isEmailVerified: Boolean flag for managing email confirmation
    > status.

  - hasBuyerCompletedOnboarding & hasSellerCompletedOnboarding: Boolean
    > flags to track whether a user has gone through the StepOneScreen
    > and the respective basic setup.

  - Other role-specific details (e.g., skills, rates, badges, gigfolios)
    > should remain in the BuyerProfile and GigWorkerProfile.

- The User model should stay clean and focused on universal identity and
  > access management, while profiles handle contextual data.

- GigWorkerProfile, BuyerProfile, and AdminProfile models exist and have
  > a one-to-one relationship with User based on role.

- The UserFlags model exists with relevant flags (isBanned, isDisabled)
  > and a one-to-one relationship with User.

- Database migration successfully creates these tables and
  > relationships.

- The password field is confirmed to store *hashed* values, not plain
  > text.

🗃️ SVR-A02 Session Management

Enables users to stay logged in across requests and browser sessions,
providing a seamless experience while maintaining security through
session expiration and secure cookie handling.

[The ability to stay logged in across sessions improves UX, especially
for repeat users like regular gig workers or business buyers. Shorter
idle timeouts (e.g. 30--60 min) could be explored later if security
becomes a concern.]{.mark}

**User Story**

- **As an** authenticated user,

- **I want to** remain logged in across browser sessions (within session
  > duration),

- **so that** I avoid repeated logins.

**System Story**

The system must manage user sessions securely, including session
creation on login and destruction on logout.

**Definition of Done (DoD):**

- Next, createCookieSessionStorage is configured in auth.server.js with
  > a strong secret (SESSION_SECRET from env).

- Cookie flags (secure, httpOnly, sameSite, maxAge) are appropriately
  > set for production/development environments.

- Login function (createUserSession) successfully creates a session,
  > stores the userId, and sets the session cookie in the response
  > headers.

- [Standard session: maxAge = 24 hours (86,400 seconds).]{.mark}

- [With "Remember Me" selected: maxAge = 7 days (604,800
  > seconds).]{.mark}

- [Security flags should be applied as follows:]{.mark}

  - [httpOnly: true (prevents client-side JS from accessing
    > cookies)]{.mark}

  - [secure: true in production (false in development)]{.mark}

  - [sameSite: Lax (secure against CSRF, still allows login
    > flows)]{.mark}

- Logout function successfully destroys the session and clears the
  > cookie.

- Helper functions (getUserSession, getUserId, requireUserId) correctly
  > retrieve session data or trigger redirects.

🫂 SVR-A03 Role & Context Persistence

Enhances user experience for dual-role users by remembering their last
active mode, reducing friction and making the app feel more intuitive
upon return.

**System Story**

The system must store and retrieve the user\'s lastRole (Buyer/Worker)
preference to restore the correct webapp view upon login. (Storing
lastView server-side is optional, can be client-side).

**Definition of Done (DoD):**

- A field (e.g., lastActiveRole on User) is added to the Drizzle schema
  > to store the last role used (BUYER or GIG_WORKER).

- The Role Switching mechanism (WEB-A03) updates this database field
  > when the user switches roles.

- The Login logic (WEB-A02) reads this field after successful
  > authentication to determine the initial redirect/view.

🧑‍💻 DSH-A01 Admin Login

Provides secure, role-based access to the administrative backend,
enabling authorized personnel to manage the platform, moderate content,
and view operational data according to their designated permissions.

**User Story**

- **As an** Admin user (Super Admin, Admin, or QA),

- **I want to** log in using my specific admin credentials,

- **so that** I can access the Admin Panel.

- **Acceptance Criteria:**

  - Admin users use the same login form as regular users.

  - Upon successful login, the system identifies the admin role.

  - User is redirected to the Admin Panel entry point (e.g., /admin).

**Definition of Done (DoD):**

- Admin users successfully authenticate using the *same* login
  > form/endpoint as regular users (WEB-A02).

- The backend login logic correctly identifies the user\'s role as
  > SUPER_ADMIN, ADMIN, or QA.

- Upon successful authentication, the user is redirected specifically to
  > the main admin panel route /admin, then is redirected to
  > /admin/dashboard.

- The user session correctly reflects their administrative role.

- Admin users *cannot* log in if their account is marked as banned or
  > disabled.

**Questions & Clarifications:**

- What is the exact entry route for the admin panel after login (e.g.,
  > /admin, /admin/analytics)?

- Should there be any visual distinction on the login page for potential
  > admin users (probably not, for security)?

🔐 DSH-A02 Admin Panel Access Control

Crucial security measure to prevent unauthorized users (regular Buyers
or Gig Workers) from accessing administrative functions, data, and
configuration settings, safeguarding platform integrity and user
privacy.

**User story**

- **As an** authenticated non-Admin user (Worker or Buyer),

- **I want to** be prevented from accessing the /admin routes,

- **so that** sensitive administrative functions are protected.

- **Acceptance Criteria:**

  - Routes under /admin are protected by a loader function that checks
    > for appropriate admin roles (SUPER_ADMIN, ADMIN, QA).

  - Users without the required roles attempting to access /admin routes
    > are redirected (e.g., to their dashboard or the login page).

**Definition of Done (DoD):**

- Basic route-level protection (requireAdmin) should enforce:

  - Only SUPER_ADMIN, ADMIN, or QA can access /admin/\... routes.

<!-- -->

- A top-level route (app/routes/admin.jsx) acts as a layout and entry
  > point for all admin sections.

- The loader function for this admin.jsx route (and potentially all
  > child routes) uses a helper function (e.g., requireAdmin from
  > auth.server.js) to check the logged-in user\'s role.

- The requireAdmin function verifies if the user\'s role is one of
  > SUPER_ADMIN, ADMIN, or QA.

- If the user is authenticated but does *not* have an appropriate admin
  > role, they are immediately redirected away from any /admin/\... URL
  > they attempt to access.

- The redirection target for unauthorized access attempts is back to
  > their user dashboard (/buyer or /gig-worker).

- Unauthenticated users attempting to access /admin are redirected to
  > /login.

👣 DSH-A03 Admin Logout

Standard security practice for administrative interfaces. Allows admins
to securely terminate their privileged session, especially important
when accessing the panel from potentially less secure environments or
shared computers.

**User Story**

- **As an** authenticated Admin user,

- **I want to** be able to log out of the Admin Panel,

- **so that** my administrative session is securely ended.

- **Acceptance Criteria:**

  - A \"Logout\" option is available within the Admin Panel interface.

  - Logging out destroys the session and redirects to the login page.

**Definition of Done (DoD):**

- A \"Logout\" button/link is consistently available within the Admin
  > Panel UI in the top-right corner of the header and the sidebar.

- Clicking the admin logout option triggers the standard logout process
  > (same backend logic as WEB-A04).

- The user\'s session is destroyed server-side.

- The session cookie is cleared/invalidated in the browser.

- The user is redirected away from the Admin Panel to a public page
  > (typically the main login screen /login).

- Subsequent attempts to access /admin routes require re-authentication.

🧑‍🔧 Gig Worker Experience

Enable Gig Workers to easily manage their profile, availability, offers,
and earnings through the primary webapp interface.

**MVP vs. Post-MVP:**

**MVP:**

- AI-driven onboarding chat (WEB-S01). Basic profile setup/editing (bio,
  > pic, one skill with rate/exp) (WEB-S02 partial, SVR-S01, SVR-S02).

- View the list of *all* pending offers (defer AI ranking) (WEB-S06
  > simplified).

- Video upload/management (WEB-S03).

- Accept/Decline offers (WEB-S07).

- Simple availability (mark full days unavailable) (WEB-S04 partial,
  > SVR-S03 partial).

- View the list of accepted gigs on calendar (WEB-S05).

- AI-ranked offer suggestions, 5 most recent ones (WEB-S06 advanced,
  > SVR-S04 advanced).

- View list of completed payments (earnings summary) (WEB-S08).

- View received reviews/would work with again rating (WEB-S09).

- Qualifications & Equipment management.

- Badge display and awarding logic.

- Complex recurring availability rules (WEB-S04 advanced).

- Recommendation/reference link generation/handling (WEB-S10).

- Full referral program implementation (WEB-S11, SVR-S05, SVR-S06).

**Post-MVP:**

- Link to secondary dashboard (WEB-S12).

- Video recording management (WEB-S03).

- Advanced filtering/sorting/reporting in Dashboard views.

- Basic Dashboard views (DSH-S01, DSH-S02, DSH-S03) showing raw lists.

## MVP {#mvp .unnumbered}

Desirables:

- Have different types of users to test

  - [Basic Gig Worker (1 skill, no gigs yet)]{.mark}

  - [Active Gig Worker (several accepted gigs)]{.mark}

  - [Dual-role User (Buyer & Gig Worker)]{.mark}

- Define the Geolocation closeness range

> **MVP**

- Assume that the gig worker is willing to travel.

- Ultimately, the AI should match with proximity in mind, making this
  > step non-essential.

> **Post-MVP**
>
> 🔧 Default Matching Logic (MVP)
>
> • Default range: 15 miles (used for both buyers and freelancers unless
> otherwise specified)
>
> • Purpose: Used to rank and filter potential matches in gig
> search/matching engine
>
> • This can be tweaked algorithmically later (e.g. weighting proximity,
> supply/demand imbalance)
>
> ⚙️ User Settings Implementation
>
> We'll add an optional user preference setting titled:

For Freelancers:

> • Label: "Maximum travel distance"
>
> • Description/help text: "Only show me gigs within this distance from
> my location."
>
> For Buyers:
>
> • Label: "Preferred worker distance"
>
> • Description/help text: "Prioritise matches within this range from
> the job location."
>
> Options (dropdown or slider):
>
> • 5 miles
>
> • 10 miles
>
> • 15 miles (default)
>
> • 20 miles
>
> • 30+ miles (or "no limit")
>
> 📌 Matching Engine Behaviour
>
> • Matching engine still considers proximity as a weighted factor, even
> when users don't set a preference.
>
> • If a setting is chosen, it filters out options outside the selected
> range.
>
> 🧠 Notes:
>
> • Keep the setting optional so users don't hit dead ends during
> early-stage rollout.
>
> • Later we can explore:
>
> • Smart suggestions ("Try expanding your range?")
>
> • Dynamic adjustments based on location density
>
> • A/B testing to optimise default ranges

MVP

**Needed:**

- What information is needed for the recommendation link page (WEB-S10)?

- What\'s the precise logic/trigger for the referral reward (WEB-S11,
  > SVR-S06)?

- How is the intro video handled (upload? link to external service like
  > YouTube/Vimeo)? Storage implications? Moderation needed?

- What criteria determine the \"most relevant\" offers for the AI
  > suggestion (WEB-S06)? Simple recency? Skill match? Pay rate?
  > Location?

- Have a baseline ceil limit on AI ranking or iterate continuously on
  > improve answers

- Geolocation refinement and other heuristics for matching

- Define Referral links flows

**Desirables:**

- What would happen if an accident happened at the last minute? What if
  > the worker finishes quickly and wants to start another contract
  > earlier? To avoid booking issued/inconsistencies.

- What if an offer is retired at the same time a freelancer is accepting
  > it?

- Set a loading time limit

WEB-S01 Profile Setup - AI Chat

Improves the onboarding experience for new workers by making profile
creation less daunting and more interactive than a traditional form,
potentially increasing profile completion rates and getting workers
ready for gigs faster.

**User Story**

As a new Gig Worker using the webapp, I want to be guided by Able AI
through a conversational interface to set up my initial profile (bio,
picture, first skill, etc.), so the process is engaging.

![](media/image13.png){width="3.2343755468066493in"
height="5.842741688538933in"}

**Definition of Done (DoD):**

- After identifying as a worker on StepOneScreen, the user is presented
  > with a modal content like *"Let's set up your profile in 2 minutes
  > using our AI helper"*

  - If declined, users go straight to manual profile setup.

  - If accepted, progress is saved in real time.

- **The AI flow is optional but encouraged**:

  - **Tone and Personality of the AI should be** Warm, supportive, and
    > concise.

  - Tone should reflect Able's brand: **Fair, human, intelligent, and
    > encouraging.**

  - Example tone: *"Hey there! I'm here to help you showcase your skills
    > in just a few taps. Let's make your profile shine ✨"*

- The AI Chat interface should be a **guided onboarding flow**, ideally
  > presented as a **full-width card or modal** overlay during the
  > initial setup. It should:

  - Use a conversational style (chat bubble format)

  - Be visually lightweight and mobile-friendly

  - Include **clear skip/back options**

  - Start with **simple, structured prompts** for MVP.

  - Design as a friendly wizard-style flow using:

    - **Multiple choice buttons** (e.g. suggested skills or availability
      > presets)

    - **Short answer fields** with soft validation

    - **Tone** that feels conversational, but **logic** that's clear and
      > rule-based

  - Example:

    - *"What's one skill you'd like to earn money from first?"*

    - *"Got it. What experience do you have and why are you good at
      > that? Just 1--2 sentences."*

    - *"What's your typical hourly rate for that kind of work?"*

    - *"Our buyers love to see evidence of training and qualifications -
      > what do you have?*

  - **Post-MVP Enhancements**: Use GPT-style NLP to summarise worker
    > responses into summaries, Voice input for accessibility, Adaptive
    > chat that learns preferences over time, AI's suggestions during
    > the flow. At every step, users should be able to:

    - Accept the AI's suggestion

    - Edit it before saving

    - Skip the question

    - Return later to refine their profile manually

  - Once complete, the user is directed to their editable **Gigfolio**.

- The AI prompts the user sequentially for key profile information
  > (e.g., \"Tell me a bit about yourself for your bio\", \"Let\'s add
  > your first skill\", \"Tell me about your experience with
  > \[skill\]?\", \"What hourly rate would you like for \[skill\]?\"
  > "what training and qualifications do you have").

- User responses are captured via text input or simple controls within
  > the chat interface.

- This information is used to populate the GigWorkerProfile and initial
  > Skill records in the database. AI agent creates hashtags from the
  > video bio and conversation with the user.

###  The AI chat handle profile picture upload,  {#the-ai-chat-handle-profile-picture-upload}

- Auto-generate a still frame from the user's 30-second video bio.

- Use that clickable frame as their [default profile video
  > bio]{.underline} (no picture. video).

- Frame should be selected at the midpoint (\~15 seconds), or the first
  > frame where the user's face is clearly visible.

- [This frame is cropped/resized to fit the profile picture
  > format]{.mark}

- [Stored as a lightweight image on the same CDN or media store as the
  > video]{.mark}

- Allow user to change the frame manually from the video, or upload a
  > custom picture later (Post-MVP).

<!-- -->

- The AI should collect and populate the following fields automatically
  > from the response:

1.  **Skill titles** (e.g., "Bartender", "Receptionist")

2.  **Skills hastags** (key words)

3.  **Suggested hourly rate** (based on skill, local market)

4.  **Location  
    > **

5.  **Availability start times** (basic preferences)

6.  **Suggested badge prompts** (e.g., "Would you say you're great under
    > pressure?" → suggests "Crisis Hero")

7.  QR code to create a shareable public/ buyer view gigfolio

> Follow-ups:

- Suggest tags or equipment (e.g., "Do you have your own cocktail kit?")

<!-- -->

- The flow covers the *minimum* required fields to make a profile viable
  > for matching.

> To be considered **"active" and searchable** by Buyers in the MVP, a
> Gig Worker profile must include the following **minimum fields** for
> at least one skill:

| **Required Fields**                                           | **Notes**                                                   |
|---------------------------------------------------------------|-------------------------------------------------------------|
| **Skill title and years of Experience**                       | E.g., "Waiter", "Event Assistant"                           |
| **Video bio**                                                 | 30 second summary answering "Why are you good at this?"     |
| **Hourly rate**                                               | Numeric field, negotiable toggle optional                   |
| **Availability (this is at the profile not the skill level)** | Calendar block or at least one recurring rule (see SVR-S05) |
| **RTW is pending or completed**                               | To ensure buyer trust and legal compliance                  |
| **Phone / email verified**                                    | Used for trust, KYC, and urgent comms                       |
| **External recommendation**                                   | At least one from their previous employer or supervisor     |
| **Hashtags**                                                  | Extracted from conversations with AI                        |
| **QR code**                                                   | Generated by the system                                     |

- Only users who meet the above criteria will appear in search results
  > or be eligible for AI-matching suggestions.

<!-- -->

- Upon completion, the user is directed to their main GigWorkerHome.

- User is ranked on profile completeness, so is encouraged to create a
  > video bio. AI agent provides draft script with helpful instructions
  > (see Gig worker experience detail)

📘 QR Code for Public Profile Sharing

✅ User Story

As a freelancer,

I want a QR code I can easily share that links directly to my public
profile,

So that I can promote myself in-person or online without needing to copy
a URL.

✅ Acceptance Criteria

Every user with a public profile (i.e., profileVisibility = public) has
a QR code generated on demand.

QR code links to:

https://able.global/profile/\[username or userId\]

Users can access their QR code from:

Their Gigfolio in the app

Their dashboard (optional Post-MVP)

QR code can be:

Downloaded (PNG or SVG)

Copied to clipboard or embedded elsewhere

Optional: Include Able logo watermark on the QR

\-\--

🔧 Developer Notes

Use a QR code library (e.g., qrcode.react, qrcode-generator, or any
backend QR service)

Generate QR on the fly or cache it as a static image URL

QR should not be available if:

Account is disabled or banned

WEB-Stripe configuration

### **Register with Stripe to Receive Payments** {#register-with-stripe-to-receive-payments .unnumbered}

**[U]{.underline}ser Story**

**As a** freelancer,

- **I want** to connect my bank account securely during onboarding,

- **So that** I can receive payment as soon as I complete a gig.

### **🎯 Acceptance Criteria** {#acceptance-criteria .unnumbered}

- When a freelancer completes onboarding (RTW + video + rates), they are
  > shown:  
  >   
  > "To receive payment, connect your Stripe account now."

- Clicking **Connect Stripe** opens:

  - Stripe Connect onboarding flow (hosted by Stripe)

  - Identity verification (name, DOB, ID document)

  - Bank details entry

- Once verified:

  - Store their stripe_account_id in the GigWorker record

  - Block payment if missing

  - Show status in dashboard:  
    >   
    > ✅ Stripe Connected or ⚠️ Setup Required

![](media/image33.png){width="6.267716535433071in"
height="9.402777777777779in"}

WEB-S02 Gigfolio Management

The Gigfolio is the worker\'s primary tool for showcasing their value to
potential buyers. Keeping it up-to-date and comprehensive directly
impacts their ability to get hired. Providing easy editing in the
primary webapp is crucial for maintenance.

**User Story**

As a Gig Worker using the webapp, I want to access my \"Gigfolio\"
section to add/edit/view my bio, profile picture, skills (with
experience/rate), qualifications, and equipment, so I can maintain an
accurate professional presence.

![](media/image20.png){width="3.0989588801399823in"
height="5.589360236220473in"}

**Definition of Done (DoD):**

- An accessible \"Gigfolio\" option exists within the webapp (likely via
  > IconGrid on GigWorkerHome).

- This section displays the worker\'s current profile picture, bio, list
  > of skills (with rate/exp), qualifications, and equipment.

- Profile STILLS are automatically generated from the user's uploaded
  > video. No separate upload is required for MVP. BUT there isnt really
  > a picture - should just be a video.

- Mechanism:

  - On video upload (see previous detail added), the system captures a
    > still frame (preferably from \~15 seconds in, or the clearest face
    > frame)

  - This frame is cropped/resized to fit the profile picture format

  - Stored as a lightweight image on the same CDN or media store as the
    > video

- Future enhancement: users may optionally upload or select a different
  > frame (post-MVP).

- Clear \"Edit\" or \"Add\" buttons/icons are available for each section
  > (bio, picture, skills, quals, equip).

- Activating edit/add opens simple modal-based forms or inline
  > accordion-style forms with

  - Text inputs for titles (e.g. skill name, qualification)

  - Number inputs or dropdowns for years/months of experience

  - Optionally, radio/select buttons for predefined options where
    > applicable (e.g. institutions or certifications)

  - Keep the UI minimal for MVP --- aim for single-click access to edit
    > and light validation.

- AI agent can always be asked to edit any content.

- Saving changes updates the corresponding records in the database
  > (GigWorkerProfile, Skill, Qualification, Equipment).

- The displayed Gigfolio reflects the saved changes immediately or after
  > a refresh.

- [Max 4 Skills per user (premium users will be able to add 8. Post
  > MVP).]{.mark}

- [No hard limit for Qualifications or Equipment, but for UI purposes,
  > suggest:]{.mark}

  - [10 items per category as soft ceiling]{.mark}

  - [Encourage prioritisation through drag-and-drop sorting
    > (post-MVP)]{.mark}

- [Users can copy or download their QR code from profile view]{.mark}

- The **MVP Gigfolio Form** should collect the following for each
  > **skill** a user adds:

#### **1. Skill Title** {#skill-title .unnumbered}

- Free-text or AI-suggested (e.g., "Barista", "Waitstaff")

#### **2. Skill hashtags**  {#skill-hashtags .unnumbered}

- AI assist, key words extracted from conversation and video bio.

- Major brands freelancer has worked with are here

#### **3. Hourly Rate** {#hourly-rate .unnumbered}

- User-defined (numeric)

- Optional: allow tagging rate as negotiable

- Optional: enable rates in alternative currencies (e.g. GBP, Bitcoin
  > label only)

> 4\. **Years of experience**

#### **5 Availability (this is at the profile not skill level so just repeats across skills)**  {#availability-this-is-at-the-profile-not-skill-level-so-just-repeats-across-skills .unnumbered}

- Tied into structured availability model (see SVR-S05)

#### **6. Video Upload** {#video-upload .unnumbered}

- Max 30 seconds

- Stored at low resolution (see earlier note)

- Required to appear in premium search (optional otherwise)

#### **7. Equipment Owned** {#equipment-owned .unnumbered}

####  **(optional)** {#optional .unnumbered}

- Text or checkbox list depending on skill (e.g., "Cocktail kit", "DSLR
  > camera")

- Form validations:

  - **Mandatory fields**: Skill title, rate, hashtags, one
    > reference/recommendation, Video bio, location, years of experience

  - Basic input validation: no scripts, no excessive length

- Up to **eight distinct skill gigfolios** per user.

- **Post-MVP Enhancements** (for backlog):

  - Industry-specific guidelines or tips per skill type

WEB-S03 Intro Video

Video allows workers to add personality and build trust beyond text and
photos, potentially making their profile stand out and increasing their
chances of being hired.

**User story**

As a Gig Worker editing my Gigfolio in the webapp, I want an option to
record or upload a short intro video, so I can personalize my profile.

![](media/image27.png){width="2.7968755468066493in"
height="5.043856080489939in"}

**Definition of Done (DoD):**

- An option (button/link) to \"Add Intro Video\" is present within the
  > Gigfolio editing interface.

- The option allows direct video upload (requires storage integration)
  > or initiates device camera for recording (Post MVP).

- Uploaded videos are processed, stored, and linked to the profile.

- Moderation workflow is triggered for uploaded videos.

- Technical constraints for a video to be uploaded

<table>
<colgroup>
<col style="width: 24%" />
<col style="width: 75%" />
</colgroup>
<thead>
<tr class="header">
<th><blockquote>
<p><strong>Constraint</strong></p>
</blockquote></th>
<th><blockquote>
<p><strong>Value</strong></p>
</blockquote></th>
</tr>
<tr class="odd">
<th><blockquote>
<p><strong>Duration</strong></p>
</blockquote></th>
<th><blockquote>
<p>Max 30 seconds</p>
</blockquote></th>
</tr>
<tr class="header">
<th><strong>File size</strong></th>
<th><blockquote>
<p>≤ 20MB</p>
</blockquote></th>
</tr>
<tr class="odd">
<th><blockquote>
<p><strong>Formats</strong></p>
</blockquote></th>
<th><blockquote>
<p>.mp4, .mov (H.264/AAC)</p>
</blockquote></th>
</tr>
<tr class="header">
<th><blockquote>
<p><strong>Resolution</strong></p>
</blockquote></th>
<th><blockquote>
<p>480p (640×360 or less)</p>
</blockquote></th>
</tr>
<tr class="odd">
<th><blockquote>
<p><strong>Upload method</strong></p>
</blockquote></th>
<th><blockquote>
<p>Client uploads using UploadCare or use <strong>Cloudflare
Stream</strong> for simpler media pipeline</p>
</blockquote></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

- These constraints balance mobile compatibility, speed, and cost
  > control.

- Videos will be stored in **UploadCare on MVP**.

- Post-MVP: Evaluate **Cloudflare Stream** for video pipeline automation
  > (encoding, privacy, playback)

- The uploaded videos will be reviewed to ensure videos are safe,
  > appropriate, and representative of the platform's values.

> **MVP Process**:

- Videos are marked as **"pending review"** after upload

- Users can apply to gigs but are not shown in **Top Matches** until
  > video is approved

- Admin dashboard includes:

  - Video preview

  - Approve/Reject toggle

  - Optional reason/comment field for rejections

> **Post-MVP**:

- Implement **AI-assisted flagging** (e.g., nudity, hate speech
  > detection using Amazon Rekognition or Hive)

- User can request re-review if video is rejected

##  {#section .unnumbered}

##  {#section-1 .unnumbered}

## **Technical Implementation: Video Bio Upload (MVP)** {#technical-implementation-video-bio-upload-mvp .unnumbered}

### **Core Specifications** {#core-specifications .unnumbered}

- **Max Duration**: 30 seconds

- **Max File Size**: \~20MB

- **Accepted Formats**: .mp4, .mov (encoded in H.264 + AAC)

- **Resolution Limit**: 480p or lower (e.g. 640x360)

- **Storage**:

  - UploadCare

### **Why This Works for Able** {#why-this-works-for-able .unnumbered}

- Keeps infrastructure light and fast

- Maintains full control of user content and branding

- Prevents distractions and privacy concerns associated with
  > YouTube/Vimeo

- Supports low-bandwidth environments

- Scales affordably as usage grows

### **Security & Privacy Considerations** {#security-privacy-considerations .unnumbered}

- Files stored with unique, non-guessable URLs

- Videos are **private** by default, only viewable via embedded Able
  > player

- Option for admins to **flag or moderate content  
  > **

## **User Experience Guidelines** {#user-experience-guidelines .unnumbered}

### **Upload Flow** {#upload-flow .unnumbered}

1.  Prompt user to record or upload a 30s video after selecting a skill

2.  Preview before saving

3.  AI agent generates a sample script following and providing guidance:

    - "Tell buyers what makes you great at this skill"

    - "Record somewhere quiet, in front of a black space. Appear smart,
      > clean and speak clearly and smile -- this is your intro video"

4.  Allow re-recording or replacing later

### **Gigfolio Integration** {#gigfolio-integration .unnumbered}

- Video sits alongside:

  - Skill summary

  - Availability calendar

  - Rate per hour

  - Equipment list (if applicable)

  - Badges and recognition

## **Next Steps** {#next-steps .unnumbered}

- Set up S3 bucket and IAM permissions

- Integrate frontend component (using React Dropzone +
  > FFmpeg/WebAssembly for local compression if needed)

- Backend endpoint to accept upload, store, and return reference URL

- Embed lightweight player (e.g. Plyr.js or native HTML5)

WEB-S04 Calendar - Availability

Accurate availability is critical for the matching system and prevents
frustrating booking attempts for buyers. Providing a simple way to
manage this in the primary webapp encourages workers to keep it updated.

**User story**

As a Gig Worker using the webapp Calendar view, I want simple tools to
mark specific dates or recurring times as unavailable, so my
availability is accurate for AI matching and buyers.

![](media/image30.png){width="3.182292213473316in"
height="5.748655949256343in"}

**Definition of Done (DoD):**

- The webapp includes a basic Calendar view accessible from the
  > GigWorkerHome.

- This view displays *at least* upcoming booked gigs.

- A mechanism exists to mark *specific dates* as \"Unavailable\" (e.g.,
  > tapping a date on a simple monthly view, a dedicated \"Set
  > Unavailable Date\" button leading to a date picker).

- Marking a date as unavailable updates the worker\'s availability data
  > (e.g., adds to an excludedDates list within the JSONB field) in the
  > database (SVR-S03).

- The system correctly interprets these unavailable dates when checking
  > availability for buyers (SVR-B02).

- [For MVP, we support both:]{.mark}

  - [Specific Date Blocks (e.g., 10 May 2025, 09:00--13:00 or full day
    > off)]{.mark}

  - [Simple Recurring Patterns (e.g., every Monday 09:00--12:00)]{.mark}

  - [These are stored in a unified availability field as a JSONB object
    > per user, structured as:]{.mark}

> **{**
>
> **\"recurringAvailability\": \[**
>
> **{ \"day\": \"Monday\", \"start\": \"09:00\", \"end\": \"13:00\" },**
>
> **{ \"day\": \"Friday\", \"start\": \"15:00\", \"end\": \"20:00\" }**
>
> **\],**
>
> **\"specificUnavailableDates\": \[**
>
> **{ \"date\": \"2025-05-15\", \"start\": \"10:00\", \"end\": \"13:00\"
> },**
>
> **{ \"date\": \"2025-05-16\", \"fullDay\": true }**
>
> **\],**
>
> **\"timezone\": \"Europe/London\"**
>
> **}**

- **(Post-MVP DoD):** Interface allows setting recurring unavailability
  > (e.g., \"Unavailable every Monday morning\").

## **Dev Story --- Gig Worker Availability, Conflict Handling & Offer Integrity (MVP)** {#dev-story-gig-worker-availability-conflict-handling-offer-integrity-mvp .unnumbered}

### **0 · Objective** {#objective .unnumbered}

Deliver a **calendar‑driven availability system** that:

- Lets workers declare any number of **hour‑level blocks** per day
  > (e.g. 09:00--12:00, 15:00--18:00, 21:00--24:00) with an optional
  > **"repeat weekly"** toggle.

- Handles real‑world edge‑cases (late cancellations, early finishes,
  > concurrent offer updates) **without corrupting data or frustrating
  > users**.

- Feeds clean availability data to the AI ranking & offer engine.

### **1 · Availability Data Model & API** {#availability-data-model-api .unnumbered}

| **Item**       | **Detail**                                                                |
|----------------|---------------------------------------------------------------------------|
| **Storage**    | UserAvailability document in Postgres JSONB                               |
| **Timezone**   | One TZ string per user (Europe/London); server converts everything to UTC |
| **JSON shape** |                                                                           |

{

\"recurringAvailability\": \[

/\* Multiple blocks per weekday allowed \*/

{ \"day\": \"Monday\", \"start\": \"09:00\", \"end\": \"12:00\" },

{ \"day\": \"Monday\", \"start\": \"15:00\", \"end\": \"18:00\" },

{ \"day\": \"Monday\", \"start\": \"21:00\", \"end\": \"24:00\" },

{ \"day\": \"Wednesday\", \"start\": \"12:00\", \"end\": \"20:00\" }

\],

\"specificUnavailableDates\": \[

/\* One‑off overrides \*/

{ \"date\": \"2025-05-10\", \"start\": \"09:00\", \"end\": \"13:00\" },

{ \"date\": \"2025-05-11\", \"fullDay\": true }

\],

\"timezone\": \"Europe/London\"

}

\| **Validation rules** \|

\| • start \< end and both in HH:00 format (whole hours)

• No overlap within the same list or across lists after UTC conversion

• Auto‑merge adjacent blocks (12:00--15:00 + 15:00--18:00 ⇒
12:00--18:00)

• Reject if clashes with **accepted gigs** \|

\| **API** \|

GET /availability · PUT /availability (*full replace, validated before
commit*) \|

### **2 · Calendar UI (CAL‑A01)** {#calendar-ui-cala01 .unnumbered}

- **Add Slot** modal --- day picker, start‑time, end‑time, **"Repeat
  > every week"** (default ✓).

- **Drag‑copy** --- drag slot to another weekday to duplicate.

- **Conflict badge** on slots locked by accepted gigs.

- **Edge warnings** --- message if save fails due to overlap with booked
  > gigs.

### **3 · Emergency Gig Cancellation Flow** {#emergency-gig-cancellation-flow .unnumbered}

1.  **Worker** taps "Cancel gig" → selects reason, *optional* delegate
    > worker.

2.  **System** records cancellation, offers delegate to Buyer.

3.  **Buyer** approves delegate **or** requests new match.

4.  **Admin** log entry; repeat late cancels flagged for ranking
    > penalty.

### **4 · Early Finish / Instant Availability** {#early-finish-instant-availability .unnumbered}

- Worker presses **"I'm now free"** ➜ system deletes or shortens the
  > active *specificUnavailableDates* block.

- Triggers **re‑rank** for any open offers.

### **5 · Offer Race‑condition Guard** {#offer-racecondition-guard .unnumbered}

- **Atomic check** inside ACCEPT_OFFER tx:  
  >   
  > WHERE offer.id = :id AND offer.status = \'pending\' AND no gig
  > overlap

- On success → set status = accepted, latch worker ID.

- On fail → return \"Gig has just been filled\" message.

### **6 · Offer‑matching Timeout UX** {#offermatching-timeout-ux .unnumbered}

- Max 5 s search.

- If exceeded → show empty‑state card with "Still searching... try
  > refresh".

- Spinner continues polling in background for 15 s before giving up.

### **7 · Related Tickets** {#related-tickets .unnumbered}

- **AI Ranking** -- AVR‑A01

- **Offer Model & Matching** -- OFF‑A01...A03

- **Calendar UX** -- CAL‑A01 (this story)

- **Gigfolio Integration** -- PFL‑A02

### **Definition of Done** {#definition-of-done .unnumbered}

- JSON schema & DB migration deployed.

- UI passes unit & Cypress tests for add / edit / delete slots including
  > overlaps.

- API enforces validators; AI ranking can query canonical availability
  > endpoint.

- End‑to‑end case: worker adds multi‑slot Monday, books gig inside slot,
  > slot shows locked badge, booking prevents overlapping save.

### **"Keep‑it‑simple" UI for marking one‑off unavailability** {#keepitsimple-ui-for-marking-oneoff-unavailability .unnumbered}

| **Principle**                                    | **Rationale**                                                                                                                               | **Quick spec**                                                                                                                              |
|--------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------|
| **Stay in the calendar**                         | Context is everything: the worker already thinks in days & hours, so forcing a separate list means mental mapping ("Is 10 May a Saturday?") | Use the **same weekly grid** you're showing for recurring availability, but add a lightweight *"Block time"* interaction.                   |
| **Tap‑or‑drag to paint a red block**             | Mirrors Google Calendar & iPhone sleep‑schedule --- no learning curve                                                                       | *Desktop*: click‑drag across hour cells → red overlay appears. *Mobile*: tap a cell → bottom‑sheet with start/end pickers & "✓ Block time". |
| **One floating "Blocked time" list for editing** | List view is only needed for precision edits (change 09:00 → 10:00)                                                                         | Beneath the calendar, show all upcoming unavailability as pill rows: **10 May 09‑13 ✏️ ✕**. Edits here sync back to grid.                   |
| **All‑day toggle**                               | 80 % of doctor‑visits / holidays are full‑day                                                                                               | In the bottom‑sheet include **"All day"** switch; if on, collapse time pickers.                                                             |
| **Conflict catch inline**                        | Instant feedback beats toast errors                                                                                                         | If they try to block hours already locked by an accepted gig, show a strikethrough overlay and tooltip "Gig booked".                        |
| **Undo by tap‑delete**                           | Fast exit reduces anxiety                                                                                                                   | Clicking a red block (desktop) or long‑pressing (mobile) reveals "Delete" and "Edit" actions.                                               |

#### **Why not a separate "Unavailability" tab?** {#why-not-a-separate-unavailability-tab .unnumbered}

- **Extra clicks** -- Worker must switch tabs, remember dates, and then
  > switch back to see the result.

- **Harder to spot overlaps** -- Visual clash with accepted gigs only
  > obvious on the calendar grid.

- **Mobile friction** -- Lists are scrollable but less scannable than a
  > mini‑calendar.

#### **Implementation summary (MVP)** {#implementation-summary-mvp .unnumbered}

1.  **Weekly grid component** (7 columns × 24 rows, hour resolution).

2.  **Interaction  
    > **

    - *Add*: click‑drag (desktop) / tap‑sheet (mobile).

    - *Edit/Remove*: click/long‑press block → action bar.

3.  **Data bridge  
    > **

    - On save, create/patch specificUnavailableDates entries.

    - Grid re‑renders from canonical JSON after every change.

4.  **Edge guards  
    > **

    - Block creation if gig.status = accepted overlaps.

    - Merge adjacent blocks before POST.

This single‑surface approach keeps cognitive load low, works on both
form‑factors, and requires only one component plus a compact list for
fine‑tuning --- the simplest path that still meets usability and
data‑integrity needs.

WEB-S05 Calendar - View Gigs

Provides workers with a quick, accessible way to check their upcoming
work commitments and pending decisions directly within the main app
interface.

**User story**

As a Gig Worker using the webapp Calendar view, I want to see a
simplified overview of my upcoming accepted gigs and pending offers, so
I know my schedule at a glance.

![](media/image19.png){width="3.0781255468066493in"
height="5.560483377077865in"}

**Definition of Done (DoD):**

- The webapp Calendar view fetches and displays upcoming gigs (status =
  > ACCEPTED) and offers (status = PENDING) for the worker.

- **Display Mode  
  > **

  - A **compact list view** grouped by date (e.g., header: "Mon 6 May"
    > with gig cards underneath).

  - Prioritize **list over month-view calendar** to enhance scannability
    > and avoid empty-grid appearance.

- **Date Range:**

  - Show only the **next 7 days** (rolling window).

- **Sorting**

  - Sort gigs **chronologically**, grouped by: for power users to access
    > the detailed Day/Week/Month dashboard (DSH‑S01)

    - **Accepted gigs** (top).

    - **Pending offers** (below accepted, but still sorted by time).

- **Pagination / Virtualization**

  - **Cap the display to \~25 items**.

  - Implement **lazy-loading** for older items (beyond the 7-day window)
    > when scrolling.

- **Empty State**

  - If no gigs exist in the next 7 days:

    - Show a **friendly illustration**.

    - Include a **call to action**:  
      > *"Add more detail or another skill to boost your gigfolio"*.

- **Navigation**

  - Include a **"Full calendar ▶︎" header button** for power users to
    > access the detailed Day/Week/Month dashboard (DSH‑S01).

- Each item clearly shows the gig title, date/time, and status
  > (Accepted/Pending).

- Clicking an item potentially navigates to the detailed gig/offer view.

**Notifications to freelancers to keep their calendars updated:**

### **Keeping calendars fresh -- notification & penalty design** {#keeping-calendars-fresh-notification-penalty-design .unnumbered}

| **Layer**                     | **Recommendation**                                                                                                                                                                                                                                                        | **Details**                                                                                                                                                                                              |
|-------------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **1. Staleness rule**         | Flag a calendar as \**"stale" if the worker has not:*                                                                                                                                                                                                                     | • **added / edited / deleted** any availability block **in the last 14 days** **and**• has **no accepted gigs** in the upcoming 14‑day window (active gigs imply the calendar is implicitly up‑to‑date). |
| **2. Reminder cadence**       | • Day 14: Soft push + email → "Quick heads‑up: check your calendar so you don't miss gigs."• Day 21: Stronger push + email banner → "Your calendar looks out of date. Update now to stay visible."• Day 28: Final notice + badge in app ("⚠ Hidden from instant matches") | Push comes via FCM/APNS; email uses existing SendGrid template engine so copy can be A/B‑tested.                                                                                                         |
| **3. Escalation badge in UI** | Show a yellow warning pill on the dashboard header: **"Calendar needs update -- Update now"**. Disappears on first successful change.                                                                                                                                     |                                                                                                                                                                                                          |
| **4. Algorithm penalty**      | Modify the match score with a **staleness factor** S:S = 1 -- min(days_stale / 30, 1) \* 0.3                                                                                                                                                                              | • Fresh calendars (≤14 days) → S = 1 (no penalty).• 28 days stale → S = 0.7 (max 30 % down‑weight).Factor multiplies the final composite score so other signals can still rescue a good fit.             |
| **5. Re‑activation bonus**    | When the worker updates availability after being stale **≥21 days**, temporarily boost S to **1.05 for 48 h** to reward prompt action and accelerate re‑engagement.                                                                                                       |                                                                                                                                                                                                          |
| **6. Admin visibility**       | Compliance dashboard gets a "Stale Calendars" filter showing workers at Day 21+, so CX can nudge VIPs manually.                                                                                                                                                           |                                                                                                                                                                                                          |
| **7. A/B test guard‑rail**    | Roll penalties out to 25 % of workers first; track fill‑rate and complaint tickets to ensure we aren't hurting supply.                                                                                                                                                    |                                                                                                                                                                                                          |

#### **Implementation steps** {#implementation-steps .unnumbered}

1.  **Cron job** (daily, 02:00 UTC):

    - Compute days_stale for every worker.

    - Enqueue notifications by rule above.

2.  **DB fields  
    > **

    - lastCalendarUpdateAt (timestamp).

    - calendarStaleNotifiedAt (timestamp) to avoid duplicate sends.

3.  **Push / email templates and notifcations  
    > **

    - Use merge field {daysSince} to personalise urgency.

4.  **Matcher update  
    > **

    - Add stalenessFactor to the Scoring middleware; store in offer
      > debug log for audit.

5.  **Analytics  
    > **

    - Dashboard card: "Average days‑since‑update" + funnel showing
      > reminder → update conversion.

This structure gives freelancers fair warning, offers clear
instructions, and applies a **measurable, reversible** penalty that
encourages upkeep without kicking them out of the marketplace
altogether.

### **🏅 "Calendar conscious" badge --- design & implementation** {#calendar-conscious-badge-design-implementation .unnumbered}

| **Aspect**                 | **Decision**                                                                                                                                                                                            | **Reasoning**                                                                                      |
|----------------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------|
| **Badge name & copy**      | **Calendar Reliable**(tooltip: "This worker has kept their availability up‑to‑date for the last 30 days.")                                                                                              | Neutral, self‑explanatory; avoids value‑loaded words like *elite* or *pro*.                        |
| **Eligibility rule (MVP)** | Worker qualifies when **all** of these are true:1. lastCalendarUpdateAt ≤ 7 days ago (fresh).2. No stale‑calendar warning sent in the **past 30 days**.3. No late‑cancellation penalty in past 30 days. | Simple to compute daily; one‑week cadence is easy for workers to remember.                         |
| **Renewal / loss**         | Badge is **evaluated nightly**. If any rule fails, the badge is removed next day (no "grace" period).                                                                                                   | Keeps logic transparent; workers instantly see the consequence of slipping.                        |
| **Display surfaces**       | *Buyer list cards* and *Gig offer chat header* --- tiny green shield icon + tooltip.*Worker dashboard* --- green pill "Calendar Reliable" under the avatar.                                             | Gives buyers confidence and gives workers a visible reward.                                        |
| **Algorithm boost**        | Add **+0.05** to final match score (reliabilityBonus).                                                                                                                                                  | Small but meaningful; stacks with staleness factor so badge holders always outrank stale profiles. |
| **Worker education**       | In "Your Calendar" settings show a progress bar:"You've had a fresh calendar for 12/30 days. Keep it updated to earn the Calendar Reliable badge!"                                                      | Turns the badge into a behavioural nudge.                                                          |

#### **Data & job logic** {#data-job-logic .unnumbered}

flowchart TD

nightlyCron\[02:00 UTC Cron\]

nightlyCron \--\> checkBadge\[Query workers\nlastUpdate ≤ 7 days\nno
stale warnings ≥ 30 days\nno lateCancel ≥ 30 days\]

checkBadge \--\>\|qualify\| setBadge\[badge = true, badgeAwardedAt =
today\]

checkBadge \--\>\|disqualify\| clearBadge\[badge = false\]

- **DB fields** (User table)calendarReliable (boolean, default false)
  > calendarReliableSince (date)

- **Scheduled job** runs after the staleness job; idempotent update.

#### **UI snippets** {#ui-snippets .unnumbered}

// Buyer worker‑card snippet

{worker.calendarReliable && (

\<Tooltip content=\"This worker keeps their calendar up‑to‑date\"\>

\<ShieldCheck className=\"w-4 h-4 text-green-500 inline-block ml-1\" /\>

\</Tooltip\>

)}

// Worker dashboard banner

\<Badge variant=\"success\" icon={\<ShieldCheck /\>}\>

Calendar Reliable

\</Badge\>

#### **Future iterations** {#future-iterations .unnumbered}

| **Sprint +2**                                                   | **Sprint +4**                                                                         |
|-----------------------------------------------------------------|---------------------------------------------------------------------------------------|
| Add **streak counter** (e.g. "45‑day streak") to gamify upkeep. | Tie badge into public profile search filters ("Show only Calendar Reliable workers"). |

This badge pairs the *stick* of staleness penalties with a visible
*carrot*, rewarding proactive freelancers and signalling reliability to
buyers with minimal engineering lift.

WEB-S06 Offers - AI Suggested

Saves workers time by highlighting the most suitable job opportunities
first, increasing the likelihood of relevant gigs being accepted quickly
and improving worker engagement.

**User story**

As a Gig Worker accessing \"Offers\" in the webapp, I want Able AI to
present me with a prioritized list of the top 5 most relevant pending
gig offers, so I can focus on the best opportunities first.

![](media/image18.png){width="2.776042213473316in"
height="5.014784558180227in"}

**Definition of Done (DoD):**

- Accessing the \"Offers\" section from GigWorkerHome loads the
  > GigOffersScreen.

- The screen displays a maximum of 5 most recent pending gig offers.

- These offers are selected and ordered based on relevance criteria
  > defined by the system (SVR-S04).

- **(MVP DoD):** Relevance might simply be \"most recent offers\".

- **(Post-MVP DoD):** Relevance incorporates skill match, rate, location
  > proximity, etc.

- Each offer card displays

  - Job Title

  - Venue name and Location Address

  - Buyer contact name

  - Role-specific Requirements (from buyer)

  - Start and End Time

  - Pay per hour

  - Total Pay

  - time to accept (before it becomes stale and is passed to another
    > user)

  - Accept & Decline CTAs

  - A link/button exists to \"View all available offers\" (leading to
    > DSH-S02).

WEB-S07 Offers - Accept/Decline

Core functionality allowing workers to act on job opportunities, driving
the booking process forward. Clear, simple actions are essential for
efficiency.

**User Story**

As a Gig Worker viewing a specific offer in the webapp, I want clear
\"Accept\" and \"Decline\" buttons, so I can respond quickly.

![](media/image18.png){width="2.776042213473316in"
height="5.014784558180227in"}

**Definition of Done (DoD):**

- Within the \"Offers\" view (WEB-S06) or a detailed offer view,
  > \"Accept\" and \"Decline\" buttons are present for each pending
  > offer.

- Clicking \"Accept\" sends a request to the backend to update the gig
  > status to ACCEPTED.

- Clicking \"Decline\" sends a request to the backend to update the gig
  > status to REJECTED (or potentially remove the worker association).

- The UI updates to reflect the action

  - Replace the card content with a brief confirmation message in place
    > (e.g., "✅ Offer accepted" or "❌ Offer declined") and Undo CTA,
    > which persists for 2--3 seconds.

  - Then, remove or collapse the card with a light animation to keep the
    > UI clean and provide feedback.

  - Optionally, a small toast notification (top or bottom of screen)
    > could reinforce the action with messaging like "You've accepted a
    > gig offer from \[Buyer Name\]".

  - The gig detail is now findable in the calendar and at the bottom of
    > \'Offers\'

- Backend logic (SVR-B03) handles the status update and triggers
  > notifications to the Buyer.

- Accepting an offer should block that time in their availability data
  > (excludedDates) to avoid double-bookings. This ties into **SVR-S03**
  > and **SVR-B02**, which track availability and matching logic,
  > respectively.

- Upon declining, we could show a **drop-down** with common reasons
  > (e.g., double-booked, rate too low, not interested) and an "Other"
  > option with free text. These inputs can be valuable for improving
  > match quality and buyer insight, but we won't require it to proceed.

WEB-S08 Earnings Summary

Provides workers with convenient access to essential financial
information within the primary app, allowing them to quickly check
recent income without needing the full dashboard.

**User story**

As a Gig Worker accessing \"Earnings\" in the webapp, I want to see a
summary of recent earnings and payout status, so I have a quick
financial overview.

![](media/image31.png){width="2.5208333333333335in" height="4.375in"}

**Definition of Done (DoD):**

- An \"Earnings\" section is accessible from GigWorkerHome.

- The screen displays a list of the *most recent* (e.g., last 5-10)
  > completed and paid gigs/payments.

- Each item shows basic details (gig title/buyer, date completed, amount
  > earned).

- (Post MVP) May display a summary total for a recent period (e.g.,
  > \"Last 30 days earnings\") and filtering.

- A clear link/button exists to \"View Full Earnings History\" (leading
  > to DSH-S03).

WEB-S09 Reputation View

Allows workers to easily see how they are perceived on the platform,
understand feedback, and see the badges that help them stand out to
buyers, all within their main profile view.

**User Story**

As a Gig Worker viewing my Gigfolio in the webapp, I want sections
showing my average would work with again rating, received badges, and
recent approved reviews/recommendations, so I can monitor my reputation.

![](media/image21.png){width="3.0270581802274714in"
height="5.322082239720035in"}

**Definition of Done (DoD):**

- The Gigfolio section (WEB-S02) includes distinct areas for displaying:

  - Would work again percentage, yes/no, and responsiveness rate metric

  - A list/grid of awarded Badges (icons/names).

  - A list of the all *approved* Reviews and Recommendations /
    > references.

- Data is fetched dynamically based on the worker\'s profile and
  > associated reviews/badges.

- Each recognition entry can be marked as:

  - **Public**

  - **Private (visible only to the worker)**

  - **Hidden from reputation view** (but still stored in backend for
    > potential appeals or future use).

####   {#section-2 .unnumbered}

#### **Worker View (Full Reputation Tab)** {#worker-view-full-reputation-tab .unnumbered}

**Display:**

- All **recognition entries** (public + private) listed chronologically.

- Each entry includes:

  - The full text (if applicable)

  - Date of gig

  - Whether it's currently public or private (with toggle option)

- **"Would you work with this person again?"**:

  - Display count and % (e.g., "8 out of 10 buyers said yes")

- **Badges earned**:

  - Show all badges with short tooltips on how they were earned.

- **AI-generated keyword summary** (see more below)

- Option to download full reference history (optional MVP feature)

**Controls:**

- Worker can **toggle visibility** of each recognition (public/private)

- Cannot delete a recognition once given (ensures integrity)

- All references are public **or not shown at all** --- no semi-private
  > display to buyers.

#### **👁️‍🗨️**  {#section-3 .unnumbered}

#### **Buyer View (on Gigfolio)** {#buyer-view-on-gigfolio .unnumbered}

**Display:**

- A **curated set of public recognitions** selected by the freelancer
  > (e.g., up to 5 favourites)

- **"Would you work with this person again?"** percentage (if enough
  > data exists)

- All **badges** with short explanation/tooltips

- **AI-generated "Feedback Keywords"** section --- summarises common
  > praise across recognitions

  - E.g., "Punctual, friendly, great under pressure, repeat hired"

- **Buyer names and specific dates**

- Badge icon to id where a badge, or more, was awarded

**Rules:**

- Buyers only see **public references**.

- The **worker chooses which recognitions appear** on their public
  > profile (curated highlights). All recognitions appear on their
  > private profile

- No numerical ratings or ~~reviews~~. just would work with again rating
  > and yes reviews

#### **🧠 AI-Generated Feedback Keywords** {#ai-generated-feedback-keywords .unnumbered}

- A **summary block** on the gigfolio tab showing key themes from
  > recognitions.

- Generated by AI using natural language processing to extract
  > **frequent and positive descriptors** from public recognitions only.

- Examples:

  - "Highly recommended, fast turnaround, great attitude"

  - "Team player, creative problem-solver, reliable"

**Implementation notes:**

- Stored alongside the user profile as a structured field

- Recalculated whenever a new public recognition is added

- Exclude those marked private

WEB-S10 Recommendation Link

Enables workers to leverage their external network to build credibility
on the platform, especially useful for new workers who may not have
internal reviews yet.

**User story**

As a Gig Worker in the webapp Gigfolio/Settings, I want to generate a
unique shareable link to request recommendations from external contacts,
so I can build social proof.

![](media/image32.png){width="2.984880796150481in"
height="5.309738626421697in"}![](media/image2.png){width="2.962361111111111in"
height="5.26905293088364in"}

**Definition of Done (DoD):**

- A button/feature exists in the Gigfolio or Settings area labeled
  > \"Request Recommendation\".

- Clicking it generates a unique URL (SVR-S05).

- The UI displays this URL and provides an easy way to copy it.

- Clicking the link leads to a simple public form (RecommendationForm
  > component reuse) where an external contact can submit a
  > recommendation tied to the worker. Backend needs to handle
  > associating this external recommendation.

- That allows someone outside the platform to:

  - Enter their name

  - Describe how they know the worker

  - Submit a short recommendation message

- Externally submitted recommendations:

  - Appear in a separate section labeled "External Recommendations" at
    > the bottom.

  - Once submitted, a recommendation is stored in the database and
    > tagged as source = EXTERNAL.

- A recommendation in the database should include:

  - Worker ID

  - Message

  - Name of recommender

  - email of recommender

  - relationship with worker ID

  - Timestamp

- System should gather the recommender email for verification or
  > follow-up if needed.

- Internally generated recognition (from buyers after gigs) appears
  > under "Reviews".

- And kept at the top after approval.

- Worker can make an Able review public or private but all external
  > references are public

WEB-S11 Referral Banner Interaction

Promotes the platform\'s growth marketing strategy by making it easy for
existing users to participate in the referral program directly from
their main interface.

**User story**

As a Gig Worker seeing the referral banner in the webapp, I want to be
able to easily get my referral link or learn more about the £5
incentive, so I can participate in the program.

![](media/image34.png){width="3.1406255468066493in"
height="5.596022528433946in"}

**Definition of Done (DoD):**

- The ReferralBanner component is displayed on the GigWorkerHome.

- The banner clearly states the incentive (£5 for referring a business).

- A button/link on the banner (e.g., \"Get Link\", \"Learn More\")
  > allows the user to:

  - Easily copy their unique referral link (generated by SVR-S05).

  - Potentially navigate to a page/modal with more details about the
    > program rules.

- For MVP, the button should **directly copy the referral link to
  > clipboard**, with a **confirmation toast** like:  
  >   
  > *"✅ Your referral link has been copied!"  
  > *

- If users want more info, we can add a secondary **"Learn More" link**
  > on the banner that opens a page or modal with:

  - How the referral programme works

  - What counts as a successful referral

  - How/when they'll get paid

- There should be **one universal referral link** per user that tracks:

  - Who shared the link (referrer ID)

  - Whether the referred user signs up as a **buyer** or **worker  
    > **

<!-- -->

- On sign-up, the system records:

  - referrerId

  - referralRole (derived from the new user's chosen role)

- This allows us to run rewards for either path: e.g., £5 for a buyer
  > who books, or for a worker who completes their first gig.

- Referral banner contains:

  - Primary CTA: **"Copy Your Referral Link"  
    > **

  - Secondary link (optional): **"Learn More"** (opens modal/page)

- Backend:

  - Referral links generated by SVR-S05

  - Tracking handled via query param: ?ref=UNIQUECODE

- Referral rewards logic handled separately (see SVR-S06 for triggers)

WEB-S12 Dev Dashboard Link

Provides a necessary escape hatch from the simplified webapp to the more
powerful, data-rich dashboard for users who need more detailed
information or advanced features, useful for devs and QAs to debug weird
issues with data.

**User Story**

As a dev (likely in Settings), I want a link to access the secondary Gig
worker dashboard, more detailed, \"Worker Dashboard\", so I can view
comprehensive lists, history, or analytics if needed. This can be used
only on dev environment to debug data corruption.

**Definition of Done (DoD):**

- A link labeled clearly (e.g., \"View Full Dashboard (Dev)\",
  > \"Advanced View (Dev)\") is present within the webapp, in the
  > Settings screen of the gig worker webapp.

- Clicking this link navigates the user to the main entry point of the
  > secondary worker dashboard (e.g., /dashboard/worker).

WEB-S13 Right to work

A suggested flow for RTW, which should determine whether a user is
'verified' or not.

This could be a separate wizard, "Click here to start your right to work
checks".

Should include a statement that states that this is a basic process, and
we will have a smoother, less manual one coming soon.

#### **1 · Goal & scope** {#goal-scope .unnumbered}

Enable Able to hold *minimum‑viable* statutory evidence that every
worker may legally work in the UK **without integrating a third‑party
SDK**.

▲ Branch 1 = *British / Irish citizen* → buyer checks original passport
at first shift.

▲ Branch 2 = *Non‑UK citizen* → worker supplies Home‑Office share‑code;
Able back‑office confirms online.

**2 · User‑facing flow (happy paths)**

| **Step** | **Actor**                       | **UK‑national path**                                                                                         | **Non‑UK path**                                                             |
|----------|---------------------------------|--------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------|
| 1        | **Worker**                      | Onboarding → **"What is your nationality?"** radio: ● UK / Irish ● Non‑UK                                    | same                                                                        |
| 2        | **Worker**                      | If UK/Irish chosen → status **Waiting for passport check**; checklist shows "Bring passport to first shift". | Form asks: Share‑code (9 chars) + Date of birth → status **Pending review** |
| 3        | **Buyer**                       | Gig card shows yellow banner: "Verify passport on day 1 -- tap to upload pictures."                          | No buyer action needed; card shows grey "RTW pending Able review".          |
| 4        | **Buyer (shift start)**         | Opens mobile uploader → takes ① passport photo page, ② worker holding passport.                              | ---                                                                         |
| 5        | **System**                      | Creates evidence record; status **In review**; emails aw@able.global                                         | Creates evidence record with share‑code; status **In review**               |
| 6        | **Compliance (aw@able.global)** | Checks images match worker ↔ name ↔ validity                                                                 | Looks up share‑code + DOB on GOV.UK "View a job applicant's right to work"  |
| 7        | **Compliance**                  | Click **Approve** → status **Verified** (or **Reject** + reason)                                             | same                                                                        |
| 8        | **System**                      | ✔ Verified → green tick on worker profile; removes buyer banner for future gigs.                             | same                                                                        |

#### **3 · Edge & failure handling** {#edge-failure-handling .unnumbered}

- Reject → worker + buyer notified; gig payout blocked until resolved.

- Missing buyer images (UK path) triggers reminder email at H + 4 hrs;
  > auto‑escalate to support at H + 24 hrs.

- Share‑code expires or passport expiry \< 90 days → cron sends "renew
  > evidence" notice 30 days before.

#### **4 · Data & API** {#data-api .unnumbered}

| **Table / field**         | **Notes**                                                                                                                                                                                                                                 |
|---------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **RightToWorkEvidence**   | id · workerId · buyerId? · gigId? · nationality (enum: uk, non_uk) · shareCode · dob · status (enum: waiting_passport, pending_review, in_review, verified, rejected) · images (JSON array S3 keys) · reviewedBy · reviewedAt · expiresAt |
| POST /rtw/declare         | body { nationality } → returns status                                                                                                                                                                                                     |
| POST /rtw/share-code      | worker adds code + dob                                                                                                                                                                                                                    |
| POST /rtw/passport-images | buyer multipart upload                                                                                                                                                                                                                    |
| PATCH /rtw/:id/verify     | admin approve / reject                                                                                                                                                                                                                    |

#### **5 · Frontend components** {#frontend-components .unnumbered}

- **Worker** -- "Compliance" tile shows real‑time status tag; modal to
  > enter share‑code.

- **Buyer** -- Shift‑banner & camera uploader (same UX as receipt
  > upload).

- **Admin (Compliance)** -- Table filter status IN (in_review,
  > rejected); side‑panel with side‑by‑side image + GOV.UK result;
  > Approve / Reject buttons.

#### **6 · Definition of Done** {#definition-of-done-1 .unnumbered}

- DB migration + Drizzle model above.

- Presigned‑URL S3 upload with server‑side AV scan.

- Email + push templates for all status changes.

- Audit‑log every state transition.

- Evidence retained **2 years** post‑last‑gig, then hard‑deleted.

#### **7 · Known limitations (accepted for MVP)** {#known-limitations-accepted-for-mvp .unnumbered}

1.  **Manual compliance workload** -- \~2 min per worker; plan to
    > automate with Onfido/Yoti in Phase 2.

2.  **Buyer image quality risk** -- guide overlay helps, but blurry
    > photos may cause rejects.

3.  **No liveness / spoof checks** -- rely on buyer's in‑person match
    > for UK passports and on Home‑Office service for non‑UK share
    > codes.

#### **8 · Next iterations** {#next-iterations .unnumbered}

| **Sprint +2**                                                        | **Sprint +4**                                                                             |
|----------------------------------------------------------------------|-------------------------------------------------------------------------------------------|
| Auto‑pull Home‑Office check result via API wrapper; pre‑fill expiry. | Replace passport photo flow with automated document + liveness scan; remove buyer burden. |

This rewrite inserts the **"UK vs Non‑UK" self‑declaration** up‑front
and routes workers down the appropriate minimal‑evidence path while
keeping development effort light for launch.

WEB-S14 Starting a Shift

Provides a visual feedback for gig offer status.

**User Story**

**As a** gig worker,

- **I want to** mark when I've started a shift,

- **So that** the system records my attendance and enables time-tracking
  > or payout flows to begin.

**Acceptance Criteria:**

- A button labelled **"Mark you have started your shift"** appears once
  > a gig is accepted.

- Tapping this:

  - Stores a timestamp (gigStartTime) against the booking.

  - Updates the UI to show the next step (e.g., "Mark as complete").

  - Optional: Disable edits to gig timing once shift has started (or
    > mark edits as post-hoc).

- Event logged for audit and payment validation.

![](media/image3.png){width="2.240570866141732in"
height="4.195785214348207in"}

WEB-S15 Request for gig amendment

Provides ability for a gig woker to negotiate or change gig details.

**User Story**

**As a** gig worker,

- **I want to** suggest changes to a gig's time, rate, or terms,

- **So that** I can negotiate fair pay or realistic expectations before
  > accepting the gig.

**Acceptance Criteria:**

- A **"Negotiate or change gig details"** button is visible before the
  > gig is accepted.

- Tapping opens an **Amendment screen** with:

  - A free text input to describe requested changes.

  - Preview of updated gig terms (AI-assisted or pre-filled if logic is
    > added).

  - Price difference and platform fees are auto-recalculated in the UI.

- Upon submission:

  - A notification is sent to the buyer for review.

  - The updated gig is stored with status proposed_update_pending.

  - Buyer can confirm the change, which finalises the new terms.

- Original gig is updated only upon confirmation.

![](media/image25.png){width="3.0439905949256345in"
height="5.098958880139983in"}![](media/image12.png){width="2.8489588801399823in"
height="5.141479658792651in"}

WEB-S16 Feedback & Submit for payment

Enables gig workers to give feedback for the buyer and to submit payment
request.

**User Story**

**As a** gig worker,

- **I want to** confirm the hours I worked, give feedback on the
  > experience, and log expenses,

- **So that** I can be paid accurately and help improve trust on the
  > platform.

### **Acceptance Criteria:** {#acceptance-criteria-1 .unnumbered}

1.  **Access Point:  
    > **

    - After tapping **"Mark as complete"**, user is taken to the
      > "Confirm Hours & Feedback" screen. (called complete gig: gigee
      > view in uizard)

    - Screen includes gig summary (role, location, duration, earnings).

2.  **Core Actions:  
    > **

    - **Confirm hours worked** (read-only or editable if gig allows
      > flexibility).

    - **Submit written feedback** ( encouraged with "earn awards"
      > tooltip).

    - **Answer "Would you work with this buyer again?"** (thumbs
      > up/down).

    - **Award the buyer option** using pre-set badge buttons (e.g., "Top
      > communicator").

    - **Log expenses** with:

      - Text input

      - Option to upload receipts or photos

    - Optional: **Edit gig timing** or **add tips** (if functionality is
      > enabled)

3.  **Submit Button:  
    > **

    - Button labeled **"Submit for Payment"  
      > **

    - Upon submission:

      - gigStatus updates to awaiting_payment

      - All inputs (feedback, hours, expenses) are stored on the backend

      - Trigger backend payout logic (or admin review queue, depending
        > on flow)

![](media/image3.png){width="2.8802088801399823in"
height="5.376388888888889in"}![](media/image8.png){width="2.932292213473316in"
height="5.354166666666667in"}

### **📎 Notes for Developers:** {#notes-for-developers .unnumbered}

- Submission is **final** --- changes can only be made via the admin
  > panel post-submission (unless editing is enabled).

- Badges and feedback should be linked to buyer reputation metrics (used
  > in AI profile scoring).

- Expenses should be exportable for tax documentation.

WEB-S17 Report an Issue

### Report and Resolve a Gig Issue with AI Assistance First {#report-and-resolve-a-gig-issue-with-ai-assistance-first .unnumbered}

**User Story**

**As a** gig worker,

- **I want to** report an issue related to my gig and get immediate
  > help,

- **So that** I can try to resolve problems quickly through the AI
  > assistant before needing human intervention.

### **Acceptance Criteria** {#acceptance-criteria-2 .unnumbered}

#### **🧭 Step 1: Issue Submission** {#step-1-issue-submission .unnumbered}

- User can report an issue via:

  - **Form submission** (dropdown + description)

  - **In-app chat** (e.g. "I haven't been paid" or "Buyer didn't show
    > up")

- The system **detects the issue type** using:

  - Form field, or

  - Intent detection in chat  
    > ![](media/image7.png){width="2.228849518810149in"
    > height="4.175016404199475in"}

#### **🤖 Step 2: AI Handling Attempt (Default Path)** {#step-2-ai-handling-attempt-default-path .unnumbered}

- AI assistant ("AbleBot") engages the user immediately via chat

- AI provides tailored guidance based on issue type:

  - **Payment Issue:** Checks if buyer confirmed hours; explains payment
    > timelines.

  - **Dispute:** Suggests clear documentation and outlines resolution
    > options.

  - **Safety:** Immediately escalates to human team and reassures user.

- If AI resolves the issue:

  - Issue is marked as **"Resolved by AI"  
    > **

  - Chat transcript and resolution are saved

  - User sees confirmation message and can rate the help

  - Option: "Still need help? Speak to support"

#### **🔁 Step 3: Escalation (Only if Needed)** {#step-3-escalation-only-if-needed .unnumbered}

- If the worker clicks to escalate or indicates unresolved issue:

  - AI logs chat history + attachments

  - Creates a support ticket

  - Notifies human support team

  - Status changes to awaiting_support_review

  - User sees: "We've raised this to our team --- you'll hear back
    > within 24h."

### **🧠 Developer & Design Notes** {#developer-design-notes .unnumbered}

- **AI capabilities include:  
  > **

  - Issue classification

  - Access to gig/payment status APIs

  - Structured escalation triggers

- **Worker experience should be seamless:  
  > **

  - Single thread with both AI and human handling

  - Clear status indicators for resolution

- **Metrics to track:  
  > **

  - % resolved by AI

  - Average time to resolution

  - User satisfaction post-chat

WEB-S18 Worker home page

This is the central navigation hub for gig workers. A well-organized,
actionable home screen ensures users can easily access all critical
features, increasing engagement and operational efficiency.

### **User Story** {#user-story-6 .unnumbered}

**As a logged-in gig worker,**

- I want to access a home dashboard with quick links to Gigfolio,
  > Offers, Calendar, and Earnings

- **so that** I can manage my gigs, review offers, track my earnings,
  > and update my profile efficiently.

### **Acceptance Criteria:** {#acceptance-criteria-3 .unnumbered}

- A contextual message appears at the top of the screen (e.g., \"Hi, if
  > you can be available next Tuesday you are 75% likely to get a
  > shift\").

- Four main feature buttons are displayed:

  - **Gigfolio**: Navigates to a screen showing the user\'s profile,
    > editable bio, work history, and skills.

  - **Offers**: Navigates to a list of current available gigs that the
    > user can browse and apply for.

  - **Calendar & Gigs**: Navigates to a calendar view showing upcoming,
    > pending, and in-progress gigs.

  - **Earnings & History**: Navigates to a view showing past gigs,
    > earnings breakdown, and filters (e.g., date range).

- A \"Switch to buyer\" toggle is present and changes the view to buyer
  > mode upon activation.

- A "Refer a business and earn £5" banner redirects to a referral form
  > for submitting business contacts.

- A gear icon in the bottom right corner opens the Settings screen with
  > options like Account, Notifications, Help, and Logout.

- All buttons and links are fully functional and redirect to their
  > respective screens/pages.

### **Definition of Done (DoD):** {#definition-of-done-dod .unnumbered}

- The home screen displays all components as per design (icons, labels,
  > contextual message, buttons).

- Navigation is fully implemented:

  - Gigfolio → Profile management screen

  - Offers → Available gigs list

  - Calendar → Calendar view of gigs

  - Earnings → Earnings and history view

  - Switch to buyer → Buyer dashboard

  - Refer a business → Referral form page

  - Settings → Settings screen

  - Notifications → Notifications screen

- Each redirection results in the appropriate screen being loaded
  > without errors.

- All buttons and toggles provide visual feedback on interaction (hover,
  > tap, etc.).

- The contextual message dynamically fetches relevant shift suggestions
  > based on availability.

- Navigation is responsive and accessible (keyboard/tab navigable and
  > screen-reader friendly).

- Proper role state is maintained across views (gig worker vs. buyer).

- All screens load relevant data based on the authenticated user.

DSH-S01 Full Calendar View

Offers a powerful scheduling tool for workers who need more than the
simplified webapp view, supporting detailed planning and management of
their time.

**User Story**

As a Gig Worker, I want to access a full Calendar view in the secondary
dashboard, with Day/Week/Month options and detailed gig info, so I can
perform complex schedule management.

**Definition of Done (DoD):**

- A dedicated Calendar page exists within the secondary dashboard
  > (/dashboard/worker/calendar).

- It utilizes a full-featured calendar component (e.g.,
  > react-big-calendar).

- Displays all accepted, pending, completed gigs, and Unavailable
  > periods accurately.

- Supports Day, Week, and Month views.

- Allows interaction (e.g., clicking events for details, potentially
  > drag-and-drop for rescheduling - Post-MVP).

- Provides robust tools for managing availability (recurring rules,
  > specific time blocks - Post-MVP).

#### **📌 Clicking a Gig Event:** {#clicking-a-gig-event .unnumbered}

When a user clicks on a gig calendar entry, they should be **navigated
to the full gig detail view**, using the route:  
/gig/:gigId  
  
![](media/image3.png){width="3.90625in" height="8.260416666666666in"}

- This page will show:

  - Full gig details (location, time, pay, contact etc)

  - Actions: **Accept**, **Mark shift started**, **Complete**, **Mark as
    > Paid  
    > **

  - Contextual buttons like **Negotiate**, **Delegate**, **Report an
    > issue  
    > **

  - Special instructions and attached Terms

**Why?**

- This avoids duplicating gig summary modals in the calendar.

- It brings the user straight into the workflow with all the needed
  > controls.

#### **🗓️ Other Calendar Entry Types:** {#other-calendar-entry-types .unnumbered}

- If the calendar event is a **non-gig item** (e.g., unavailable block):

  - Show a simple popover/modal with edit or delete options

  - No need to navigate to a separate page

DSH-S02 Full Offers List

Provides complete visibility into all potential work opportunities,
allowing workers to proactively search for gigs that might not have been
surfaced by the AI suggestions.

**User story**

As a Gig Worker, I want to access a comprehensive, filterable/sortable
list of *all* available gig offers in the secondary dashboard, so I can
browse beyond the AI suggestions.

**Definition of Done (DoD):**

- A dedicated \"Offers\" page exists in the secondary dashboard
  > (/dashboard/worker/offers).

- It displays *all* gigs with PENDING status assigned to the worker.

- The list is presented in a table or card format.

- Controls are available to filter offers (e.g., by date range, pay
  > rate, buyer).

> ✅ MVP Filters

- Status (Pending, Accepted, Declined, Expired)

- Timeframe (e.g., Offers this week, Offers in the last 30 days)

- Buyer Name

- Gig Role / Title

<!-- -->

- Controls are available to sort offers (e.g., by date, rate, distance).

> 🔃 MVP Sorting:

- Most Recent First (default)

- Soonest Gig First

- Highest Pay First (optional)

<!-- -->

- Each offer provides links to view full details and Accept/Decline
  > actions.

- If a user doesnt accept an offer within two hours it will move to
  > another freelancer

- Group offers into collapsible sections:

  - Pending Offers

  - Upcoming Gigs (Accepted)

  - Past Offers (Declined, Expired)

DSH-S03 Full Earnings History

Offers workers a complete financial record for accounting, tax purposes,
and income tracking, going beyond the simple summary available in the
webapp.

**User Story**

As a Gig Worker, I want to access a detailed Earnings History page in
the secondary dashboard, with filtering by date range and downloadable
reports, so I can manage my finances thoroughly.

**Definition of Done (DoD):**

- A dedicated \"Earnings\" page exists in the secondary dashboard
  > (/dashboard/worker/earnings).

- Displays a detailed list/table of all *received* payments (status
  > COMPLETED).

- Includes gig details, buyer, date paid, amount.

- Provides controls to filter earnings by date range.

- **(Post-MVP):** Includes an option to download earnings data (e.g.,
  > CSV).

SVR-S01 Worker Profile Storage

Provides the persistent data layer for storing all information related
to a gig worker\'s professional identity and activity on the platform,
enabling profile display, matching, and management.

**System story**

The system must store all worker profile attributes (bio, image URL,
availability JSONB, links to skills, quals, equipment, badges).

**Definition of Done (DoD):**

- The GigWorkerProfile model is correctly defined in schema.Drizzle with
  > fields for bio, profileImage, availability (Json?), responseRate
  > (nullable Float), etc.

- Correct Drizzle relations are established between GigWorkerProfile and
  > User (one-to-one), Skill (one-to-many), Qualification (one-to-many),
  > Equipment (one-to-many), Badge (many-to-many), and Gig
  > (one-to-many).

- Database migrations successfully create/update the necessary tables
  > and relationships.

- Server-side functions exist in user.server.js (or similar) to create,
  > read, and update GigWorkerProfile records, including associated
  > relations.

- Sensitive data (if any stored here, unlikely beyond PII in User) is
  > handled appropriately.

- Store QR code for users profile

- Response rate should be calculated automatically, and it must include
  > a promptness factor to reflect not just whether a worker responds,
  > but how quickly.

> 🔢 Calculation Logic:
>
> Base formula:
>
> responseRate = (number of offers responded to within window) / (total
> number of offers received).
>
> Promptness weighting:
>
> Add a tiered bonus or decay based on how fast the response was:
>
> • Response within 30 minutes: full credit (1.0)
>
> • Response within 1 hour: partial credit (e.g. 0.8)
>
> • Response within expiry window (e.g. 2hr): reduced credit (e.g. 0.5)
>
> • No response before expiry: 0
>
> Store both:
>
> • rawResponseRate (overall % responded)
>
> • promptResponseScore (weighted score factoring speed)
>
> • rawResponseRate = % of offers the worker responds to before expiry
>
> (e.g. 7 out of 10 = 0.7)
>
> • promptResponseScore = Quality-adjusted version, factoring speed
>
> (e.g. 3 within 30 mins = 3, 2 within 1 hr = 1.6, 2 just before expiry
> = 1.0
>
> ➝ total = 5.6 / 7 = \~0.8)
>
> 🤖 Effect in the Ranking System (SVR-B02):

- In the weighted AI ranking system:

  - We'll use promptResponseScore (not raw) as the input for the
    > "Response Rate" ranking factor.

  - This better reflects how engaged and responsive the freelancer is,
    > not just whether they eventually replied.

  - promptResponseScore is what affects the ranking, rawResponseRate is
    > just stored for reference or admin UI.

  - This supports surfacing the most engaged and responsive workers
    > during gig matching and ranking.

SVR-S02 Skill/Qual/Equip Storage

Enables the structured storage of worker capabilities and resources,
which is fundamental for accurate searching, filtering, and matching by
buyers, and for the worker to showcase their expertise.

**System story**

The system must store skills (name, experience, rate), qualifications,
and equipment records linked to worker profiles.

**Definition of Done (DoD):**

- Skill, Qualification, and Equipment models are defined in
  > schema.Drizzle with appropriate fields (e.g., Skill: name,
  > experience (Int - months), rate (Float); Qualification: title,
  > institution, year; Equipment: name).

- During onboarding, the AI agent prompts for H&E-relevant competencies
  > such as:

  - Allergen-aware service

  - Basic HACCP

  - EPoS familiarity

  - Personal licence to serve alcohol

  - Fine-dining table-side service

- These inputs are stored as structured skill tags (SkillTag model) and
  > flagged as "verified" or "self-declared".

- Each model has the correct foreign key relationship back to
  > GigWorkerProfile.

- Database migrations create/update these tables and relationships.

- Server-side functions exist (likely in user.server.js) to add, update,
  > and delete these associated records for a specific worker profile.

**Questions & Clarifications:**

- Should Skill names be free text or selected from a predefined list (or
  > both)? (Predefined list helps consistency).

> We will use a hybrid model to enable AI-structured consistency and
> user flexibility:
>
> • The AI will recommend skills based on the worker's video bio,
> previous gig history, or chat onboarding (e.g., "Looks like you
> mentioned barista -- would you like to add that?").
>
> • Users can also add a custom skill manually if it's not in the
> existing list.
>
> • All entered skills will be mapped to a normalised list behind the
> scenes to support accurate AI matching (e.g., "Barista", "Senior
> Barista", and "Coffee Service" all link to one primary category).
>
> \- hashtags can be used inside the gigfolio to give depth but
> predefined list is the go to and only new skills added on an exception
> basis when AI cannot assign to a predefined skill category

- Confirm data types and constraints (e.g., experience in months, rate
  > precision).

> Skills:
>
> • name: String (AI-mapped, allows free text with backend
> normalisation)
>
> \- hashtags (extracted from video bio)
>
> • experience: Int (stored in months)
>
> • rate: Float (stored with 2 decimal precision)
>
> • currency: String (default: GBP; allow symbol tag only in MVP)
>
> Qualifications and training:
>
> • title: String
>
> • institution/organisation: String
>
> • year: Int (4 digits, optional)
>
> Equipment:
>
> • name: String
>
> • Stored in relation to GigWorkerProfile (one-to-many for MVP;
> many-to-many if standardised libraries are introduced later)
>
> \- Ai NLP generated video bio script based on conversations with AI
> about skill
>
> Additional AI-first notes:
>
> • Keywords from skills and qualifications will also be extracted by AI
> and used for semantic matching and display (e.g. hashtags, badges,
> taglines).
>
> • AI may propose skill refinements or suggest rate ranges based on
> market data post-MVP.

SVR-S03 Availability Logic

This is the core logic enabling reliable booking. It prevents buyers
from attempting to book unavailable workers, reducing friction and
ensuring the platform\'s matching suggestions are actionable.

**System story**

The system must be able to parse and query the worker\'s availability
data (stored JSON) to determine if they are free for a given date/time
range.

**Definition of Done (DoD):**

- A server-side function (e.g., checkWorkerAvailability in
  > calendar.server.js) is implemented.

- The function accepts a workerId, startTime, and endTime as input.

- It fetches the worker\'s accepted/pending Gig records that overlap
  > with the requested time range.

- It fetches the worker\'s availability data (JSONB) from their
  > GigWorkerProfile.

- It correctly parses the availability data (handling excludedDates for
  > MVP, recurring rules Post-MVP).

- The function returns a boolean indicating availability (true if no gig
  > conflicts AND not marked as unavailable) and optionally details
  > about any conflicts.

- Unit tests cover various scenarios (no conflicts, gig conflict,
  > unavailable date conflict, edge cases like start/end times matching
  > exactly).

- Able will apply a default 30-minute buffer between gigs for all
  > workers.

- Implementation Details

  - This buffer is enforced by the matching engine (SVR-B02):

  - When evaluating whether a gig fits within a worker's availability,
    > the system:

    - Checks that no other gig ends within 30 minutes before the
      > proposed start time.

    - And that no other gig starts within 30 minutes after the proposed
      > end time.

  - This ensures:

    - Workers have realistic transition time.

    - Gig overlaps are avoided entirely at the matching level.

  - No action is required by the worker --- it's built into the AI
    > logic.

- Optional (Future Enhancements):

  - Let workers customise their buffer in settings (e.g., 15/30/60
    > minutes).

  - If "remote" gigs are introduced, allow gig-type-specific buffers
    > (e.g., 0 minutes between remote tasks, 30 for in-person).

🔍 MVP: To consider travel time, use buffer.

🚀 Post-MVP Matching Logic:

- The AI will use gig location vs worker base location to determine
  > match proximity.

- Matching includes:

- Straight-line (Haversine) distance in km or miles

- Only gigs within a defined distance threshold (e.g., 10mile or a
  > customisable radius) are considered eligible

- This logic is applied in tandem with availability windows and the
  > 30-minute buffer.

- Note: The system will not yet calculate real-world transit routes or
  > times (e.g., public transport or driving delays).

- Add route-based logic (e.g. "can reach in 40 mins")

- Enable dynamic availability based on sequential gigs and travel
  > feasibility

- Let workers set home base or preferred working zones

SVR-S04 Offer Matching/Ranking

Improves the worker experience by prioritizing the most
likely-to-be-accepted or most suitable offers, saving them time and
increasing the platform\'s efficiency in filling gigs.

**System story**

The system must implement logic (AI or rule-based) to rank pending
offers based on relevance to the worker for the webapp view.

**Definition of Done (DoD):**

- A server-side function exists (e.g., getSuggestedOffers in
  > gig.server.js) that takes a workerId and limit (e.g., 5).

- It retrieves all PENDING gigs assigned to the worker.

- **MVP**: List offers based on recency.

**(Post MVP DoD):**

- It implements a more sophisticated ranking algorithm considering
  > factors like skill match (if gigs have required skills), rate
  > comparison to worker\'s preferred rate, location proximity (requires
  > location data), buyer would work with again rating/history.

- Use AI Onboarding Data in Offer Ranking

- What the AI already knows:

> • Skills the freelancer has verbally confirmed
>
> • Tools or equipment they use
>
> • Roles or industries they feel confident in
>
> • Availability preferences
>
> • Workstyle (e.g. "prefer quiet shifts," "love busy, high-energy
> roles")
>
> • Past feedback or recognitions, if captured in free text

- How it's used in Ranking:

> 1\. Skills & Tag Enrichment:
>
> • The AI builds a private semantic skill profile from onboarding
> dialogue.
>
> • This includes both structured skills (e.g. "bartender") and inferred
> traits (e.g. "comfortable managing queues", "happy to lift gear").
>
> • These are stored as keywords or short phrases attached to the user
> profile and used in the match layer.
>
> 2\. Boosting Semantic Match:
>
> • When scoring "AI/NLP match" (15% of the ranking weight), the system
> compares:
>
> • Buyer gig description
>
> • Against:
>
> • Transcript of AI onboarding
>
> • Skill tags
>
> • Profile text & video bio transcript
>
> • Even if a freelancer never typed "event setup," the AI might know
> from conversation that they've done it, and that match gets scored.
>
> 3\. Contextual Suppression or Promotion:
>
> • If a worker has said, e.g., "I can't work past 8pm," or "I don't
> want bar work," the system can either:
>
> • Filter out gigs that don't fit, or
>
> • Score those matches much lower.

- The function returns the top N ranked offers.

- The logic is reasonably performant.

> {
>
> \"skills\": \[\"bartending\", \"event setup\", \"team leader\"\],
>
> \"traits\": \[\"calm under pressure\", \"fast learner\", \"good with
> tech\"\],
>
> \"avoid\": \[\"bar work\", \"overnight shifts\"\]
>
> }

- These are indexed for use in the AI/NLP match section of the offer
  > ranking function.

SVR-S05 Referral Link Generation

Provides the technical mechanism for the referral program, allowing the
platform to attribute new sign-ups or bookings to the referring user so
rewards can be accurately assigned.

**System story**

The system must generate unique referral links tied to user accounts.

**Definition of Done (DoD):**

- A mechanism exists (e.g., a server-side function
  > generateReferralLink(userId)) to create a unique referral code or
  > token associated with a specific user.

- This code/token is incorporated into a shareable URL (e.g.,
  > https://ableai.app/register?ref=UNIQUECODE).

  - Generate a short, unique alphanumeric code (e.g. alexB234) tied to
    > each user upon account creation.

  - This should be stored as a dedicated field on the User model (e.g.
    > referralCode)

  - This enables fast lookups and avoids the complexity of a separate
    > table for MVP.

  - Format: <https://able.global/r/alexB234>

- The registration process (WEB-A01/SVR-A01) is modified to check for
  > and store an incoming ref code if present, linking the new user to
  > the referrer.

- A way to retrieve a user\'s referral link via the backend is available
  > for the frontend (WEB-S11, WEB-B08).

SVR-S06 Referral Tracking & Reward

Fulfills the promise of the referral program by automating the tracking
and reward payout, ensuring referrers are compensated correctly and
encouraging further referrals.

**System story**

The system must track hires made via referral links and trigger the £5
reward process upon successful completion (requires linking to
payment/gig completion status).

**Definition of Done (DoD):**

- The system can identify users who were referred (based on data stored
  > during registration - SVR-S05).

- A mechanism (e.g., triggered after a gig status changes to COMPLETED
  > and Payment status is COMPLETED) checks if the buyer or worker
  > involved in that gig was referred *and* if this is their *first*
  > qualifying action (e.g., first completed hire for a referred buyer,
  > first completed gig for a referred worker).

- If qualification criteria are met, a reward record is created or a
  > payout process is initiated ( credit internal account, potentially
  > trigger a Stripe payout if automated - Post-MVP).

- The system prevents duplicate rewards for the same referral/action.

- Fully automated reward payout via Stripe or internal credits.

<!-- -->

- To track reward statuses, a new Referral table should be used with the
  > following fields:

> **{**
>
> **\"id\": string,**
>
> **\"referrerId\": string,**
>
> **\"referredUserId\": string,**
>
> **\"type\": \"buyer\" \| \"freelancer\",**
>
> **\"status\": \"pending\" \| \"earned\" \| \"paid\",**
>
> **\"createdAt\": Date,**
>
> **\"rewardIssuedAt\": Date (optional)**
>
> **}**

- Status is updated automatically on completion and payment confirmation
  > of the qualifying gig.

- This allows auditing, prevention of duplicate rewards, and easy admin
  > visibility.

## **🧾 Dev Story: Referral Reward Logic (Buyers & Freelancers) MVP** {#dev-story-referral-reward-logic-buyers-freelancers-mvp .unnumbered}

### **🎯 Objective** {#objective-1 .unnumbered}

Enable a referral system where **a £5 reward is paid** to any user
(buyer or freelancer) who refers a new **business** that hires and
**pays** for a gig via Able.

### **✅ Referral Workflow -- Trigger Conditions** {#referral-workflow-trigger-conditions .unnumbered}

#### **1. Referral Code / Link Tracking** {#referral-code-link-tracking .unnumbered}

- Each **user account** is assigned a **unique referral code** (e.g.
  > able.global/r/jack123).

- When a new **business buyer** signs up via a referral:

  - Their referredBy field is set to the referring user's ID

  - A referralType: "business" flag is stored

  - Status = pending

#### **2. Referral Matures When:** {#referral-matures-when .unnumbered}

- The referred buyer:

  - Hires at least one gig worker **via the platform**, and

  - **Completes payment** (status: paymentConfirmed = true)

- Once this happens:

  - The referral status is updated to earned

  - £5 credit (or cash, depending on implementation) is issued to the
    > referrer

### **⚙️ Technical Logic** {#technical-logic .unnumbered}

// pseudocode

onPaymentConfirmation(gigId) {

const gig = db.getGig(gigId);

const buyer = db.getUser(gig.buyerId);

if (buyer.referredBy && !referralAlreadyRewarded(buyer.id)) {

const referral = db.getReferral(buyer.referredBy, buyer.id);

if (referral && referral.type === \"business\" && referral.status ===
\"pending\") {

db.updateReferralStatus(referral.id, \"earned\");

db.creditWallet(referral.referrerId, 500); // £5 in pence

}

}

}

### **📦**  {#section-4 .unnumbered}

### **Data Models (Simplified)** {#data-models-simplified .unnumbered}

#### **Referral** {#referral .unnumbered}

{

id: string;

referrerId: string;

referredUserId: string;

type: \"business\";

status: \"pending\" \| \"earned\" \| \"rejected\";

createdAt: Date;

rewardIssuedAt?: Date;

}

#### **User** {#user .unnumbered}

{

id: string;

name: string;

referralCode: string;

referredBy?: string;

walletBalance?: number; // optional for credit payout

}

### **💷 Payout Handling** {#payout-handling .unnumbered}

For MVP:

- Use **wallet credits** --- user can see a "Referral Earnings" total in
  > dashboard

- Future: integrate with Stripe Connect for cashout or apply to future
  > Able fees

### **🧪**  {#section-5 .unnumbered}

### **Testing Scenarios** {#testing-scenarios .unnumbered}

1.  User refers a business → they hire → payment successful → referrer
    > gets reward ✅

2.  User refers but business never hires → no reward ❌

3.  Duplicate referrals or self-referrals → blocked ❌

4.  Buyer cancels gig → payment not made → reward not triggered ❌

### **💸 Referral Reward Logic -- Delayed Payout (30 Days)** {#referral-reward-logic-delayed-payout-30-days .unnumbered}

### **🎯 Rewards will be issued as internal credit stored on the user's account (e.g., in a walletBalance field).** {#rewards-will-be-issued-as-internal-credit-stored-on-the-users-account-e.g.-in-a-walletbalance-field. .unnumbered}

### **• Users will see their referral earnings in their dashboard.** {#users-will-see-their-referral-earnings-in-their-dashboard. .unnumbered}

### **Trigger Conditions (for either type of referral):** {#trigger-conditions-for-either-type-of-referral .unnumbered}

**A reward is eligible for payout when:**

1.  A referred **freelancer** completes and is paid for their **first
    > gig**, OR

2.  A referred **buyer** completes and pays for their **first hire  
    > **

Once triggered, the system logs:

- status: pending

- rewardEligibleDate = gigCompletionDate + 30 days

### **🕒**  {#section-6 .unnumbered}

### **30-Day Countdown** {#day-countdown .unnumbered}

- A **scheduler or cron job** runs daily to:

  - Check all pending referral records

  - If currentDate \>= rewardEligibleDate, status updates to earned

  - Internal credit is applied to the referrer's wallet (walletBalance
    > += rewardAmount)

### **💳**  {#section-7 .unnumbered}

### **Optional: Enable Withdrawal After That** {#optional-enable-withdrawal-after-that .unnumbered}

- Referrer may **withdraw** their balance **only after**:

  - They've passed KYC (if required by Stripe Connect)

  - They meet the **minimum balance** (e.g. £20)

  - A withdrawal request is initiated manually by the user (or
    > auto-payout weekly/monthly)

### **🧾**  {#section-8 .unnumbered}

### **Referral Table Example Fields** {#referral-table-example-fields .unnumbered}

| **Field**          | **Type** | **Example Value**     |
|--------------------|----------|-----------------------|
| referrerId         | UUID     | user_123              |
| referredUserId     | UUID     | user_456              |
| type               | String   | buyer / freelancer    |
| status             | String   | pending, earned, paid |
| rewardAmount       | Float    | 20.00                 |
| rewardEligibleDate | Date     | 2025-06-15            |
| rewardPaidAt       | Date     | null or 2025-06-17    |

SVR-S07 Extract Skills and Work Traits from AI

### **📍User Story -- Build AI-Driven Skill & Trait Profile from Onboarding Chat** {#user-story-build-ai-driven-skill-trait-profile-from-onboarding-chat .unnumbered}

Extract Skills and Work Traits from AI Onboarding Chat

**As an** AI system,

- **I want to** extract key skills, preferences, and behavioural traits
  > from the onboarding conversation with a freelancer,

- **So that** I can create a rich profile used for gig offer matching,
  > without requiring manual input from the user.

### **✅ Acceptance Criteria** {#acceptance-criteria-4 .unnumbered}

1.  **Trigger Point:  
    > **

    - When a new freelancer completes onboarding via chat with the AI
      > agent.

2.  **Extraction Logic:  
    > **

    - AI processes the conversation to identify:

      - **Explicit skills** (e.g. "I've been a barista for 3 years" →
        > barista)

      - **Implied capabilities** (e.g. "I'm fine with setting up and
        > breaking down events" → event setup)

      - **Work traits** (e.g. "I'm reliable and good with people" →
        > reliable, good with customers)

      - **Preferences or limitations** (e.g. "I prefer day shifts" →
        > avoid: night shifts)

3.  **Profile Output:  
    > **

    - Store extracted data in a semanticProfile JSONB field linked to
      > the freelancer's account:

> {
>
> \"skills\": \[\"barista\", \"event setup\", \"coffee service\"\],
>
> \"traits\": \[\"reliable\", \"calm under pressure\",
> \"customer-focused\"\],
>
> \"avoid\": \[\"night shifts\", \"bar work\"\]
>
> }

4.  **Usage:  
    > **

    - The semanticProfile is passed into the **AI/NLP match layer** (15%
      > weight) of offer ranking.

    - It enhances or overrides missing profile fields if the user didn't
      > enter skills manually.

5.  **Update Capability:  
    > **

    - The profile can be refreshed when:

      - The user uploads a new video bio

      - New recognitions are submitted

      - The user has an extended conversation with the AI

      - Manual override/edit tools are introduced (post-MVP)

### **🧠 Developer Notes** {#developer-notes .unnumbered}

- Use lightweight NLP or LLM prompt logic (e.g., GPT with tagging
  > prompts) to extract structured concepts.

- Validate critical skill classifications manually or with AI confidence
  > thresholds.

- Match logic should include synonym mapping (e.g. "coffee service" ↔
  > "barista").

###  **Confirmation: AI Intelligence in MVP Offer Ranking** {#confirmation-ai-intelligence-in-mvp-offer-ranking .unnumbered}

**The Able MVP will include:**

1.  **AI analysis of Gigfolio content**:

    - Video bio transcripts (if available)

    - Free-text bio

    - Skills, availability, rates, badges

2.  **AI-powered processing of onboarding chat**:

    - Extracts skills, preferences, traits, and limitations

    - Generates a structured semanticProfile for each worker

    - Stores as JSON for direct use in matching (no LLM inference needed
      > at runtime)

3.  **Genuine Intelligence in Offer Ranking**:

    - The offer ranking engine uses a weighted system informed by:

      - Behavioural data (response rate, login activity)

      - Content intelligence (skills, traits, past feedback)

      - NLP-driven match scoring (between buyer's description and worker
        > profile)

    - This system **goes beyond simple tag filtering** --- it applies
      > logic, language understanding, and behavioural signals to rank
      > candidates meaningfully

### **🔍 What This Means for Buyers:** {#what-this-means-for-buyers .unnumbered}

- Matches feel intuitive: "This person just *makes sense* for the job"

- They don't see the AI logic, but they feel the effect --- less effort,
  > better hires

### **🧠 What Makes It Intelligent:** {#what-makes-it-intelligent .unnumbered}

- Structured inference from unstructured inputs

- Continuous learning through feedback, response patterns, and
  > performance

- A flexible framework that can evolve into full semantic vector
  > matching in future

Able's MVP is **not a static job board** or keyword filter. It's a
lightweight but **truly intelligent gig-matching system**, powered by
natural language understanding and structured AI-led profiling.

SVR-S08-Push Notifications for Gig Offers

📘 **DEV STORY: SVR-S08 -- Push Notifications for Gig Offers**

🧑‍💼 **User Story**

As a freelancer,

- I want to receive instant push notifications when I'm offered a gig,

- So that I never miss an opportunity and can respond quickly.

✅ Acceptance Criteria

- When a gig offer is created and assigned to a freelancer,

  - The system sends a push notification via Firebase/OneSignal to that
    > freelancer.

  - With Message: "You've been offered a new gig: \[Role\], \[Date\],
    > \[Time\]. Tap to view."

<!-- -->

- Notification includes:

  - Role

  - Date/time

  - Tap action = deep link to offer in dashboard or app

<!-- -->

- MVP scope = web push (desktop + mobile Chrome/Safari)

- Users opt-in via standard browser prompt.

- Notification is triggered in parallel with email (but must not depend
  > on email success)

✅ Definition of Done (DoD)

- Web push notifications are implemented using Firebase Cloud Messaging
  > (FCM) or OneSignal.

- Freelancers are prompted to opt in to push notifications when they log
  > in via supported browsers.

- When a new gig offer is created (gig.status = OFFERED) and assigned to
  > a worker:

- A push notification is sent immediately with gig role, date, and time.

- Notification includes tap action that deep links to the freelancer's
  > dashboard or the specific gig offer.

- Notifications are sent in parallel with the existing email
  > notification

- Logged in the system for delivery diagnostics (e.g., PushLog table
  > with userId, timestamp, status).

- Users who opt out do not receive push messages.

- If push delivery fails (e.g., no device token), fallback is handled
  > silently --- no visible error.

- Confirmed working across latest versions of Chrome and Safari (desktop
  > & Android).

- Feature toggle available to enable/disable push in staging or
  > production.

🔧 **Developer Notes**

- Use Firebase Cloud Messaging (FCM) or OneSignal SDK

- Link user ID to device token upon opt-in

- Trigger push via gig offer creation logic in SVR-B03

- Log delivery attempts for diagnostics

🔁 **Post-MVP Enhancements**

- Push for payment confirmation, gig updates, chat replies

- iOS and Android native support (if mobile app added)

- User preferences for notification types (SVR-C02)

DSH-S04 -- Badges View

**User Story -- View and Understand My Badges**

View and Understand My Earned Badges

As a gig worker,

- I want to see all the badges I've earned, grouped and explained
  > clearly,

- So that I can understand how I'm being recognised and feel confident
  > presenting my reputation to buyers.

### ✅ Acceptance Criteria: {#acceptance-criteria-5 .unnumbered}

1.  Access Point:

    - User taps the "Badges" tab from their Reputation section or
      > dashboard.

    - Alternatively, badges may be summarised on the public gigfolio
      > view.

2.  Grouped View:

    - Badges are displayed in clearly labelled groups:

      - Core Values (e.g., "Kind," "Reliable")

      - Skills/Role Recognition (e.g., "Great Waitstaff," "Team Player")

      - Performance Milestones (e.g., "100% Attendance," "5 Jobs in a
        > Row")

3.  Badge Cards:

    - Each badge shows:

      - Icon or visual mark

      - Name

      - Tooltip or label explaining how it was earned (e.g., buyer
        > award, automatic milestone)

      - Optional: timestamp or "earned X times"

4.  Public vs. Private:

    - All badges shown are automatically public and appear on the
      > worker's gigfolio.

    - Badges are not user-curated --- if they're earned, they're
      > displayed.

5.  Future-ready:

    - MVP only includes static badges.

    - Post-MVP can support:

      - Badge expiry

      - Stackable badges (earned multiple times)

      - Filtering or sorting badges

**Should badges be grouped by type (e.g., soft skills, hard skills,
reliability)?**

**Answer:**

Yes, badges should be grouped into meaningful categories to help buyers
quickly interpret them. Suggested groupings:

- **Core Values** (e.g., "Reliable," "Kind," "Professional")

- **Skills Recognised** (e.g., "Great Bartender," "Team Leader," "Fast
  > Learner")

- **Performance Metrics** (e.g., "100% Attendance," "Highly Responsive")

Each category should have a short label and be visually distinct (e.g.
icons or colour-coded).

**❓ Should there be descriptions/tooltips for each badge explaining how
it was earned?**

**Answer:**

Yes. Every badge should include a **tooltip or small text label**
explaining:

- What the badge means

- How it was awarded (e.g., "Awarded automatically after 5 gigs with
  > 100% attendance" or "Given by a buyer after a 5-star review")

This supports transparency, trust, and helps newer buyers interpret
badge value quickly.

**❓ Should badges be visible to buyers even if the worker has no star
rating yet?**

**Answer:**

Yes. Badges are meant to provide **early signals of quality** and
credibility --- especially important for newer workers who haven't yet
built a full review history. This is aligned with Able's
**trust-before-stars** model. Buyers can still see:

- Any badges earned through automation or peer recognition

- Publicly shared recommendations

- "Would you work with this person again?" metrics

This helps newer users look trustworthy from day one.

Here are clear and structured answers to the open **questions and
clarifications** under **SVR-S07: Badge Assignment Logic** from your
epics document:

### **🔹**  {#section-9 .unnumbered}

### **What badges will exist in MVP?** {#what-badges-will-exist-in-mvp .unnumbered}

For MVP, the following **badges will be implemented**:

1.  **Calendar Conscious  
    > **

    - Earned if the worker has not missed or cancelled any gigs and has
      > kept availability current for 30+ days.

    - Tied to calendarReliable + calendarReliableSince backend fields.

    - Displayed on both worker profiles and buyer-facing cards.

2.  **Founding Freelancer  
    > **

    - Granted automatically to early users (within first 2 months).

    - Used for social proof and prioritisation boost in rankings.

3.  **Tip Magnet  
    > **

    - Awarded after receiving 3+ gigs with voluntary tips from buyers.

    - Shows the worker goes above and beyond.

4.  **Perfect Attendance  
    > **

    - No no-shows, cancellations, or lateness for 10+ gigs.

    - Higher trust signal for buyers.

5.  **First Gig Complete** *(Optional MVP)  
    > *

    - Shown after completing first verified gig.

#### **❤️**  {#section-10 .unnumbered}

#### **Values-Based Badges** {#values-based-badges .unnumbered}

Earned through recognitions or AI summarising worker feedback (e.g.,
post-gig reviews):

6.  **Is Good  
    > **

    - Recognised for strong work ethic, effort, and following through

7.  **Is Fair  
    > **

    - Recognised for honesty, fairness in rate negotiation, or resolving
      > issues calmly

8.  **Is Kind  
    > **

    - Repeatedly praised for kindness, helpfulness, and being pleasant
      > to work with

#### **🍸**  {#section-11 .unnumbered}

#### **Top 10 Hospitality & Events Skill Badges** {#top-10-hospitality-events-skill-badges .unnumbered}

Awarded automatically after successful gigs in a given skill/role (e.g.
3+ gigs or verified self-declaration plus endorsement):

9.  **Star Bartender  
    > **

10. **Table Service Pro  
    > **

11. **Event Setup Hero  
    > **

12. **Bar Back Specialist  
    > **

13. **Cloakroom Captain  
    > **

14. **Runner Extraordinaire  
    > **

15. **Host with the Most  
    > **

16. **Cash & Till Confident  
    > **

17. **Masterful Mixologist**

18. **Venue Shift Leader**

19. **Top Chef**

20. **Bountiful Barista  
    > **

### **🧠 Badge Assignment Logic** {#badge-assignment-logic .unnumbered}

- Some are **auto-awarded** based on data (e.g. completed gigs in a
  > role).

- Others are **AI-suggested** from language in reviews (e.g. "so helpful
  > and polite" → Be Kind).

- Worker profile stores these in a many-to-many relation with
  > timestamps.

- Admins can override, remove, or approve edge cases if necessary.

### **🔹**  {#section-12 .unnumbered}

### **Where is badge assignment logic stored?** {#where-is-badge-assignment-logic-stored .unnumbered}

- Badge logic will be implemented server-side, as **cron jobs or
  > event-triggered functions**.

- Fields like calendarReliable, tipCount, gigCompletionCount, and
  > cancellationRate will be stored in GigWorkerProfile.

- Badge assignment functions will evaluate eligibility periodically and
  > attach the badge (many-to-many relation with User).

### **🔹**  {#section-13 .unnumbered}

### **How are badges stored/displayed?** {#how-are-badges-storeddisplayed .unnumbered}

- **Drizzle schema:** Badge table with type (enum), name, description,
  > icon, and visibility (public/internal).

- **Relation:** User ↔ Badge (many-to-many)

- On frontend:

  - Shown as icons or tags in profile, offer cards, and dashboard.

  - Tooltip/hover states to explain meaning.

### **🔹**  {#section-14 .unnumbered}

### **Can badges be revoked?** {#can-badges-be-revoked .unnumbered}

Yes. Certain badges are **dynamic and revocable**, such as:

- **Calendar Reliable** (revoked after 3 missed gigs or stale
  > availability)

- **Perfect Attendance** (reset after a no-show or cancellation)

Others, like **Founding Freelancer** or **First Gig Complete**, are
**permanent** once earned.

🛒 Buyer Experience

Enable Buyers to easily find, book, and manage Gig Workers through the
primary webapp interface, using AI assistance.

**MVP vs. Post-MVP:**

**MVP:**

- AI chat interface for hiring (instead of simple prompts).

- Basic worker matching (skill, availability check) presenting top 3
  > available (WEB-B02, SVR-B02 partial).

- Ability to book a suggested worker (WEB-B03), triggering gig creation
  > (SVR-B03) and payment flow (SVR-B04).

- Simple webapp calendar view showing booked gigs (WEB-B05).

- Simple webapp payment summary (WEB-B06).

- Referral program integration (WEB-B08).

- Webapp quick chat access (WEB-B07).

- Vector DB integration for matching.

**Post-MVP:**

- Advanced AI matching ( location, etc.) (SVR-B02 advanced).

- Handle case of no matches gracefully.

- Link to secondary dashboard (WEB-B09).

- Full Dashboard features: Chat History (DSH-B07), Team Management
  > (DSH-B08), Workforce Analytics (DSH-B09), Invoice Generation
  > (SVR-B05).

- Basic Dashboard: Full hire list (DSH-B01), Gig details view (DSH-B02),
  > Payment list (DSH-B05).Amendments (DSH-B03), Issue Reporting
  > (DSH-B04), Full Calendar (DSH-B06),

## MVP {#mvp-1 .unnumbered}

Needed:

- Have a baseline ceil limit on AI ranking

- Define how the ranking will work

Desirables:

- Have different types of users to test

- Define the Geolocation closeness range

## Post-MVP {#post-mvp .unnumbered}

Needed:

- Define acceptable range of worker suggestion list parameters. What are
  > the key criteria for the AI worker matching (SVR-B02)? What are the
  > weights for Skills, rate, location proximity, rating, availability?
  > How are they weighted?

- Define payment arbitration rules. What happens if no suitable worker
  > and the buyer ask for a refund? What if the preferred worker becomes
  > unavailable mid-process?

- How are amendments handled? Does the worker need to re-accept? Does it
  > affect payment?

Desirables:

- Define conflict resolution for edge cases like Double-booking workers
  > due to race conditions or stale availability data

- Define what to do in cases like buyer requirements not matching any
  > worker type (i.e. very rare skill, or unclear requirements)

- What happens if all the matching workers are unavailable? What happens
  > if the AI finds *no* suitable matches?

- What constitutes an \"issue\" to be reported (DSH-B04)? What\'s the
  > resolution workflow?

- What level of detail is the minimum for the webapp summary views
  > (Calendar, Payments)?

- If AI suggests workers, but the user navigates away and comes back --
  > are suggestions persisted?

- What if Booking a gig spanning midnight or multiple days?

- Is it possible to amend a gig that\'s already started/completed?

- Is it possible to report an issue for a gig?

WEB-B01 Initiate Hire - AI Chat

Provides a streamlined, conversational starting point for hiring within
the primary web app, making it faster and potentially less intimidating
for buyers than navigating complex search forms immediately.

**User Story**

**As a** buyer,

- **I want** to describe what I need for a gig in natural language,

- **So that** the system can find and recommend the best freelancers
  > quickly and easily.

![](media/image36.png){width="3.0677088801399823in"
height="5.388153980752406in"}![](media/image4.png){width="2.6718755468066493in"
height="5.458110236220472in"}

###  {#section-15 .unnumbered}

###  {#section-16 .unnumbered}

###  {#section-17 .unnumbered}

### **Acceptance Criteria**  {#acceptance-criteria-6 .unnumbered}

1.  **Conversational Prompting:  
    > **

    - The AI assistant guides the user through a structured flow:

      - **"What do you need help with?"** → *role  
        > *

      - **"When do you need them and for how long?"** → *date and start
        > time  
        > *

      - **"Where is the gig?"** → *must include full street address and
        > postcode  
        > *

      - "Any special instructions?" → *notes*

      - *Prompt buyer: How many people do you need for this role? We can
        > assemble a team if you want"*

      - *  
        > *

2.  **Location Handling (Required Field):  
    > **

    - The AI must collect a **complete gig address**:

      - Street name

      - Postcode (required)

      - Venue or area name (optional)

    - If the buyer provides only a postcode or partial location, the AI
      > will prompt again:  
      >   
      > "We'll need the full address so your worker can find the venue.
      > Could you add that now?"

3.  **Structured Output:  
    > **

    - AI returns structured JSON:

> {
>
> \"role\": \"bartender\",
>
> \"date\": \"2025-06-20\",
>
> \"startTime\": \"18:00\",
>
> \"location\": {
>
> \"address\": \"123 Camden High Street\",
>
> \"postcode\": \"NW1 7JE\",
>
> \"city\": \"London\"
>
> },
>
> \"notes\": \"Bring your own bottle opener.\"
>
> }

4.  **Matching Trigger:  
    > **

    - Sends this to SVR-B02 → returns top 3 ranked matches

    - Hands off to WEB-B02 for display

5.  **Launch Offer Logic (Messaging):  
    > **

    - If the buyer is eligible for 0% Able fees (within 60 days of
      > account creation), AI adds:  
      >   
      > "You're eligible for 0% Able fees for your first two months!"

**Definition of Done (DoD):**

- AI hiring chat interface opens when the user selects "Hire".

- The interface prompts the buyer whether he need a single buyer or a
  > team.

  - For a gig, the interface conversationally prompts the buyer for
    > essential gig details:

    - Role needed (e.g., \"What role do you need to fill?\").

    - Key skills/requirements (e.g., \"Any specific skills like cocktail
      > making?\").

    - Date and Time (start/end).

    - Location.

    - Proposed hourly rate (can suggest a default based on role).

  - For a team,it additionally prompts the buyer for the

    - Number of gig workers

- User input is captured through simple text fields, date/time pickers,
  > or buttons within the chat flow.

- Location field uses address autocompletion (text only) for MVP; map
  > input is out of scope for now.

- Discount for zero Able fees is automatically applied in the backend
  > for new buyers during their first 2 months.

- These collected requirements are passed to the backend matching logic
  > (SVR-B02).

- To trigger a worker match, the AI assistant must collect at minimum:

  - Role (e.g. bartender, waiter, event setup)

  - Date and Start and End Time

  - Location address must include at least:

    - Street address

    - Postcode

    - Optional venue name

<!-- -->

- Discount logic for booking

  - Every new buyer account created during the launch period gets:

    - Two months of 0% Able fees on all bookings.

    - Stripe processing fees (1.5%) still apply and are shown
      > transparently.

    - The freelancer receives their full hourly rate with no Able
      > deductions.

> 🧾 Implementation Notes
>
> 1\. Upon Signup (Buyer):

- System logs accountCreatedAt date.

- Adds a launchFeeExemptionEndDate = accountCreatedAt + 60 days.

> 2\. On Booking:

- At checkout (WEB-B03), fee calculator checks if:

  - currentDate \< launchFeeExemptionEndDate

    - If true:

    - Apply 0% Able fee

    - Show savings line in UI: "Launch Offer: £0 Able fees today!"

> 3\. No Promo Code Needed

- Automatically applied for qualifying buyers.

- Optional backend flag to disable/override manually if needed.

### **🧠 Developer Notes** {#developer-notes-1 .unnumbered}

- Validate location via backend postcode/address service (optional MVP)

- Use OpenAI system prompt:  
  >   
  > "Extract gig booking info from chat. Required: role, date, time,
  > full address."

- Store raw and structured output for debugging and analytics

- Fallback to form after 3 failed attempts or if buyer prefers

### **🛠️ Implementation Notes:** {#implementation-notes .unnumbered}

- The AI should **prompt specifically** for a full address:  
  >   
  > *"What's the full address of the gig? (Include street name and
  > postcode)"  
  > *

- If only a postcode is given, AI should prompt again:  
  >   
  > *"Just to confirm, we'll need the full address so your worker can
  > find the venue --- could you add that now?"  
  > *

- The backend must store this in a structured location object:

> {
>
> \"addressLine1\": \"123 Camden High Street\",
>
> \"postcode\": \"NW1 7JE\",
>
> \"city\": \"London\"
>
> }

- Location may also be geocoded post-entry (optional for MVP), using
  > backend services (e.g. Google Maps API) for future proximity logic.

WEB-B02 View AI Worker Suggestions

## **📘 WEB-B02 -- View AI Worker Suggestions** {#web-b02-view-ai-worker-suggestions .unnumbered}

Accelerates the hiring process by presenting the most suitable
candidates directly to the buyer based on their stated needs and worker
availability, reducing the buyer\'s search effort. Present Top Matches
Based on Buyer's Hiring Request

### **User Story: See Ranked Gig Worker Matches** {#user-story-see-ranked-gig-worker-matches .unnumbered}

**As a** buyer,

- **I want** to see a shortlist of the most suitable gig workers
  > immediately after describing my needs,

- **So that** I can quickly compare and book the best candidate without
  > needing to search manually.

![](media/image26.png){width="3.119792213473316in"
height="5.413989501312336in"}

###  {#section-18 .unnumbered}

### **💬 Acceptance Criteria** {#acceptance-criteria-7 .unnumbered}

1.  **Trigger from AI Chat (WEB-B01):  
    > **

    - After completing the AI conversation, structured job requirements
      > are passed to the matching engine (SVR-B02).

2.  **Match Presentation:  
    > **

    - The frontend displays 5 **ranked worker cards**, each showing:

      - Profile image

      - Primary role or skill tag

      - "Would work again" score or badge

      - Rate per hour

      - Estimated total cost for that shift (inc. platform fee, if
        > applicable)

      - Video preview or "View Profile & Book" CTA

3.  **Zero-Match Handling:  
    > **

    - If no workers meet minimum match threshold:

      - Show message like: "No one's available just yet."

      - Prompt to:

        - Adjust requirements

        - Try another date/time

        - Join waitlist or notify if match becomes available

4.  **Responsive Design:  
    > **

    - Cards should stack for mobile and display in row/column format for
      > desktop/tablet.

###  {#section-19 .unnumbered}

###  {#section-20 .unnumbered}

### **🧠 Developer Story** {#developer-story .unnumbered}

**Goal:** Render AI worker suggestions after hiring request completion.

#### **Technical Flow:** {#technical-flow .unnumbered}

- Receive gig request object from WEB-B01:

> {
>
> \"role\": \"waiter\",
>
> \"date\": \"2025-06-15\",
>
> \"startTime\": \"18:00\",
>
> \"endTime\": \"23:00\",
>
> \"location\": {
>
> \"postcode\": \"N1 6PB\"
>
> }
>
> }

- Call backend API: POST /api/matchWorkers → returns top 5 ranked
  > candidates (from SVR-B02)

- Each candidate object includes:

> {
>
> \"workerId\": \"abc123\",
>
> \"name\": \"Ella R.\",
>
> \"rate\": 15,
>
> \"badge\": \"Perfect Attendance\",
>
> \"score\": 87,
>
> \"videoPreviewUrl\": \"https://\...\",
>
> \"totalCost\": 90
>
> }

- Render list using WorkerProfileCard component

- Attach View Profile & Book action per card → triggers WEB-B03

###  {#section-21 .unnumbered}

###  {#section-22 .unnumbered}

###  {#section-23 .unnumbered}

### **❓Questions & Clarifications Answered:** {#questions-clarifications-answered .unnumbered}

- How is total cost calculated?  
  >   
  > ((Hourly rate × duration) + Able fee (6.5%) + VAT (20%)) + 1.5%
  > stripe fee + 20p). This is displayed as £X for 5 hours.

- What if no matches found?

> 1\. Attempt a relaxed match using fallback rules:

- Expand radius slightly (e.g. from 15 miles to 25)

- Allow nearby roles or overlapping skills (e.g. event setup ↔ runner,
  > barback ↔ bartender)

- Lower rank threshold (e.g. allow match scores \>60 instead of \>75)

#### 2. If relaxed match succeeds: {#if-relaxed-match-succeeds .unnumbered}

- Display card(s) with a "Similar Match" or "May Still Be a Fit" label

- Add contextual note:  
  >   
  > "Not an exact match, but this worker is available and has a related
  > skill."

#### 3. If still no matches: {#if-still-no-matches .unnumbered}

- Show "No one's available just yet."

- Options:

  - Adjust role/date/time

  - Request to be notified if someone becomes available

  - "Try again" button

###  {#section-24 .unnumbered}

###  {#section-25 .unnumbered}

###  {#section-26 .unnumbered}

### 🔧 Developer Notes: {#developer-notes-2 .unnumbered}

- Add a matchType field to the match response:

  - \"exact\"

  - \"similarSkill\"

  - \"outsideLocation\"

  - \"lowScore\"

- Display badges like:

  - 🟡 "Flexible on location"

  - 🟠 "Related experience: Event Setup"

<!-- -->

- **Will this use OpenAI or relevance?  
  >   
  > ** Yes --- WEB-B01 handles parsing; this step only displays backend
  > results.

WEB-B03 Book Worker from Suggestions

## **📘 Epic: WEB-B03 -- Book Worker from Suggestions** {#epic-web-b03-book-worker-from-suggestions .unnumbered}

Provides a direct call-to-action from the suggested worker list,
allowing buyers to quickly move forward with their preferred candidate
within the streamlined webapp flow.

### **User Story: Confirm Booking and Send Offer (No Upfront Payment)** {#user-story-confirm-booking-and-send-offer-no-upfront-payment .unnumbered}

**As a** buyer,

- **I want** to book a worker from the shortlist and confirm gig
  > details,

- **So that** the system can send the offer to the freelancer for
  > acceptance --- and I'll only pay once the gig is complete.

![](media/image26.png){width="3.119792213473316in"
height="5.413989501312336in"}

###  {#section-27 .unnumbered}

### **💬 Acceptance Criteria** {#acceptance-criteria-8 .unnumbered}

1.  **Action Button:  
    > **

    - Each worker card shows a **"Book"** or **"Send Offer"** button.

    - Button opens a **confirmation screen**:

      - Gig role, date, time, address

      - Rate + estimated total cost (Display 2FREEABLE discount clearly
        > in booking and confirmation flow. (see SVR-PROMO01))

      - (if applicable) launch offer: *"0% Able fees -- your rate is
        > protected!"  
        > *

2.  **Confirm Booking:  
    > **

    - Buyer clicks **"Send Offer"  
      > **

    - System:

      - Creates Gig with status PENDING

      - Assigns freelancer

      - Sends offer notification to freelancer

      - Displays confirmation screen:  
        >   
        > *"Offer sent to \[Name\]! We'll let you know once they
        > accept."  
        > *

3.  **No Payment Yet:  
    > **

    - No payment or card entry is required at this stage.

    - Buyer is **not charged until the gig is completed** and marked
      > successful (handled in SVR-B04).

### **🧠 Developer Notes** {#developer-notes-3 .unnumbered}

- Gig creation logic should include:

  - status: pending

  - freelancerId, buyerId

  - rate, duration, location

- Create an OfferNotification object for the freelancer

- If buyer cancels before acceptance, gig status updates to cancelled

- Post-gig, the system will:

  - Confirm gig completion

  - Trigger invoice generation or payment (deferred until SVR-B04)

### **❓Key Behaviour Notes** {#key-behaviour-notes .unnumbered}

- **Buyer must be registered** (can't book as guest).

- **Worker must accept** before the gig becomes active.

- **No money is taken** unless the gig happens.

- **No cancellation charge for buyer** in MVP unless post-MVP policy is
  > introduced.

✅ **WEB-B03-Auto-offer - Hybrid Veto-on-Fallback Mode**

📘 Hybrid Veto Mode -- Auto-Offer to Next Best If Declined

🧑‍💼 User Story

As a buyer,

- I want the AI to automatically send the offer to the next most
  > suitable candidate if my first choice declines,

- But give me 15 minutes to veto that fallback,

- So that I maintain oversight while still filling gigs quickly.

**Acceptance Criteria**

- Buyer selects Candidate 1 and confirms booking.

- If Candidate 1 declines (or fails to respond within expiry window),
  > the system:

- Identifies Candidate 2 using the existing ranking engine

- Starts a 15-minute countdown

- Notifies buyer:

> *\> "Candidate 1 has declined. Candidate 2 will be offered this gig in
> 15 minutes unless you cancel."*

- Buyer can veto this fallback via a one-click action.

- If no action is taken, offer to Candidate 2 is sent automatically.

- The process may repeat for Candidate 3 if needed, based on config or
  > available match pool.

**🧑‍💻 Developer Notes**

- Use an autoFallbackQueue flag on the gig with:

  - fallbackCandidateId

  - fallbackOfferScheduledAt

- Fallback offers are only sent if:

  - Buyer hasn't vetoed (fallbackVetoed = false)

  - Scheduled time has passed

- Status updates and notifications are logged for audit.

WEB-B04 Booking Confirmation

## **Booking Confirmation / Gig Summary (with 2FREEABLE Promo)** {#booking-confirmation-gig-summary-with-2freeable-promo .unnumbered}

Provides immediate positive feedback to the buyer that their booking
request has been processed and sent to the worker, confirming the action
was successful.

### **🧾 User Story** {#user-story-7 .unnumbered}

> **As a** buyer on Able

- **I want** a clear confirmation of my gig booking, including any
  > discounts or promotions applied

- **So that** I understand what I'm paying (or saving) and feel
  > confident about my purchase

**Acceptance Criteria**

| **\#** | **Scenario**                                      | **Expected Behaviour**                                                                         |
|--------|---------------------------------------------------|------------------------------------------------------------------------------------------------|
| 1      | Booking confirmed with **no promo**               | User sees normal fee breakdown including Able's 6.5% + VAT platform fee and Stripe fee         |
| 2      | Booking confirmed with **2FREEABLE promo active** | Show promo callout: "🎉 You're not paying any Able fees for this gig!" above payment breakdown |
| 3      | Promo is in **final 5 days**                      | Show additional callout: "⏳ Your fee-free period ends soon! ..."                              |
| 4      | Promo is **expired**                              | Hide both callouts; return to standard fee structure                                           |
| 5      | User sees **Stripe fee info** regardless of promo | Stripe charge (e.g. 1.5%) remains visible in breakdown                                         |
| 6      | Callouts are visually distinct                    | Should be easily scannable without confusing main fee content                                  |

### **🧠 Dev Implementation Notes** {#dev-implementation-notes .unnumbered}

- Data Sources:

  - promoCode and promoActivatedAt pulled from **User** or **Buyer**
    > table (TBD).

- Logic:

  - Promo active: now \< promoActivatedAt + 60 days

  - Final days message: promoEndsAt - now \<= 5 days

- Component:

  - Inserted dynamically into the GigSummary component

  - Fallback to default UI if conditions not met

- Visibility:

  - Promo message automatically hides on expiry

- Stripe fee always shown (no conditional logic)

### **🎨 Design Considerations / Unanswered Questions** {#design-considerations-unanswered-questions .unnumbered}

1.  **Visual style**:

    - Should the promo message have a **unique style**? (e.g. coloured
      > banner, icon, or "toast" layout?)

    - Use standard notification pattern or create a distinct promo
      > style?

2.  **Iconography**:

    - Emoji (🎉/⏳) used in mock -- should these be replaced with SVGs
      > or system icons?

3.  **CTA**:

    - Do we want to encourage action when the promo is expiring (e.g.
      > "See pricing" or "Invite friends to unlock more time")?

4.  **Responsive layout**:

    - Should we truncate or collapse the promo message on mobile?

5.  **Accessibility**:

    - Does the message pass contrast and screen reader standards?

### **✅ Booking Confirmation UI Message (WEB-B04)** {#booking-confirmation-ui-message-web-b04 .unnumbered}

**🎁 Promo Callout (if promoCode = 2FREEABLE)**

> **🎉 You're not paying any Able fees for this gig!**
>
> As an early supporter, you've unlocked **two months of zero platform
> fees** with your **2FREEABLE** promo code.
>
> You'll still see Stripe's payment processing charge, but Able's 6.5%
> fee has been waived for this booking.

*(This message appears above the payment breakdown and is hidden once
the promo period ends.)*

### **✅ Optional Follow-Up Message (within the last 5 days of promo)** {#optional-follow-up-message-within-the-last-5-days-of-promo .unnumbered}

> ⏳ **Your fee-free period ends soon!**
>
> Your 2FREEABLE promo expires in **\[X\] days**. After that, Able's
> standard 6.5% platform fee will apply.

### **🧠 Dev Notes** {#dev-notes .unnumbered}

- Controlled via:

  - promoCode = \"2FREEABLE\"

  - now \< promoActivatedAt + 60 days

- Pulled from User or Buyer table.

- Dynamically shown/hidden in GigSummary component.

### **What specific information should the confirmation message contain?** {#what-specific-information-should-the-confirmation-message-contain .unnumbered}

The confirmation message must:

1.  **Acknowledge success** -- clearly confirm the gig is booked.

2.  **Summarise the booking** -- the who, what, when, and where.

3.  **Break down payment** -- show exactly what's been charged (and
    > what's been waived).

4.  **Highlight the promo (if active)** -- reinforce value and trust.

5.  **Set expectations** -- explain what happens next (e.g.
    > communication, changes, cancellation).

6.  **Reassure the user** -- e.g., "We've sent this info to your email"
    > or "You can view this booking anytime."

#### **📌 Suggested Structure (with 2FREEABLE logic)** {#suggested-structure-with-2freeable-logic .unnumbered}

- ✅ **"You're all set!"** -- headline confirming gig is booked

- 👤 **Worker Name** + 🔧 **Gig Type  
  > **

- 📅 **Date/time** + 📍 **Location  
  > **

- 💰 **Payment breakdown** (incl. Stripe fee, Able fee = £0 if promo
  > active)

- 🎁 **Promo message block**, if 2FREEABLE is active

- 🔄 "You can make changes or cancel from your dashboard."

- 📧 "Booking confirmation sent to \[email address\]"

Optional: small "Did something go wrong?" link for customer support.

### **What should be the next logical step/navigation offered to the user?** {#what-should-be-the-next-logical-stepnavigation-offered-to-the-user .unnumbered}

The booking flow should **guide users forward** from the confirmation
screen, not leave them in limbo. Depending on the platform UX strategy,
we suggest one of:

#### **✅ Default CTA (for all users)** {#default-cta-for-all-users .unnumbered}

#### **:** {#section-28 .unnumbered}

> **"View My Bookings"**

- Takes user to their gig dashboard to see active/past/future gigs

- Reinforces continuity, makes them feel in control

#### **✨ Bonus CTA (if 2FREEABLE active)** {#bonus-cta-if-2freeable-active .unnumbered}

#### **"Book Another Gig (No Fees!)"** {#book-another-gig-no-fees .unnumbered}

- Only shown if promo is still active

- Encourages additional engagement before promo expires

- Tied to behaviour-driven growth

#### **💡 Future-State CTA (optional for later):** {#future-state-cta-optional-for-later .unnumbered}

> **"Invite a Friend, Get More Free Time"**

- Supports referral or viral growth

- Could extend 2FREEABLE period if someone signs up through a code

### **🧠 UX Flow Summary** {#ux-flow-summary .unnumbered}

| **Moment**                 | **UX Purpose**          | **Message/CTA**                 |
|----------------------------|-------------------------|---------------------------------|
| Booking confirmation       | Reassurance + clarity   | "You're all set!" + gig details |
| Promo acknowledgement      | Recognition + retention | "You're not paying Able fees!"  |
| Next action (core)         | Navigation + control    | "View My Bookings"              |
| Next action (promo tie-in) | Incentivised re-use     | "Book Another Gig (No Fees!)"   |

WEB-B05 Calendar - View Bookings

## **📘 Epic: WEB-B05 -- Buyer Calendar View** {#epic-web-b05-buyer-calendar-view .unnumbered}

Offers buyers a quick, visual way to track their upcoming staffing
directly within the primary webapp interface, facilitating planning and
management.

### **User Story: View Upcoming and Past Gigs in Calendar** {#user-story-view-upcoming-and-past-gigs-in-calendar .unnumbered}

**As a** buyer,

- **I want** to see both upcoming and past gigs in a visual calendar,

- **So that** I can manage what's coming up and quickly reference who I
  > hired previously.

![](media/image24.png){width="3.244792213473316in"
height="5.630910979877515in"}

###  {#section-29 .unnumbered}

### **💬 Acceptance Criteria** {#acceptance-criteria-9 .unnumbered}

1.  **Calendar Scope:  
    > **

    - Calendar displays gigs from **14 days in the past** through to
      > **30 days in the future  
      > **

    - The calendar **defaults to "Today"** as the anchor point

    - User can scroll left/right or use arrow buttons to move between
      > weeks

2.  **Gig Display Logic:  
    > **

    - **Upcoming gigs** (Pending, Accepted, In Progress):

      - Shown in colour with status icon or tag

      - Click opens gig detail view (DSH-B02)

    - **Past gigs** (Completed):

      - Shown with faded styling (e.g. greyscale or 40% opacity)

      - Tick icon ✅ optional

      - Click opens read-only summary (same as "Earnings" record)

3.  **Interaction:  
    > **

    - Clicking a date with no gig: no action or shows "No gigs
      > scheduled"

    - Tapping on a gig opens the corresponding detail view

4.  **Mobile:  
    > **

    - Mobile version starts on **Today  
      > **

    - Option to switch to list view (optional post-MVP)

**Definition of Done (DoD):**

- A basic Calendar view is accessible from the BuyerHome.

- It fetches and displays upcoming gigs booked by the buyer.

- The display is simplified (list for next few days/week or basic
  > calendar markers).

- Each item clearly shows gig title/role, date/time, assigned worker (if
  > accepted), and current status (PENDING, ACCEPTED, IN_PROGRESS).

- A link/button \"View Full Calendar\" leads to the secondary dashboard
  > view (for dev & QA teams only).

- The default view should show gigs for the next 7 days, with a "Show
  > More" link to expand to 30 days. This keeps the main interface
  > lightweight and focused on immediate staffing needs.

<!-- -->

- Each gig item should display:

  - Role / Gig title

  - Date and time (should be clear from calendar view)

  - Worker name (if accepted)

  - Status (e.g. "Awaiting Response", "Confirmed", "In Progress")

  - Quick actions like "Chat" or "View Details"

- A clickable item should take the buyer to the **Gig Details View
  > (DSH-B02)**.

- The calendar tiles can use simple icons or status colour coding to
  > differentiate gig states (grey for pending, blue for confirmed/in
  > progress).

### **🧠 Developer Notes** {#developer-notes-4 .unnumbered}

- Calendar can be implemented using a weekly scroll view or date grid

- Gig data pulled from API with:

  - date \>= today - 14 days

  - date \<= today + 30 days

- Gigs should include a status field and optional isPast: boolean flag
  > for UI handling

WEB-B06 Payments Summary and Invoice generation

## **📘 Epic: WEB-B06 -- Buyer Payments Summary (Unified View)** {#epic-web-b06-buyer-payments-summary-unified-view .unnumbered}

Provides buyers with easy access to recent financial activity within the
main webapp, useful for quick checks without needing the full detailed
history from the dashboard.

### **User Story: View and Manage Gig Payments** {#user-story-view-and-manage-gig-payments .unnumbered}

**As a** buyer,

- **I want** to see a clear summary of all payments made for completed
  > gigs,

- **So that** I can track what I've paid, confirm totals, and repeat
  > successful bookings.

![](media/image10.png){width="2.8296839457567806in"
height="5.730109361329834in"}

### **💬 Acceptance Criteria** {#acceptance-criteria-10 .unnumbered}

1.  **Payments Section:  
    > **

    - Accessible via navigation item: **Payments  
      > **

    - Displays a list of completed gigs with payments processed,
      > including:

      - Freelancer name

      - Role / gig title

      - Date of gig

      - Total paid (including tip if relevant)

      - Breakdown toggle (optional for MVP)

2.  **Display Range:  
    > **

    - First view shows most recent **5--10 payments  
      > **

    - "View All Payments" button loads full list (paginated if needed)

3.  **Detail Available (MVP light):  
    > **

    - Each row expandable or clickable

    - Displays:

      - Worker rate × hours

      - Tip (if applicable)

      - Able fee + VAT

      - Stripe fee

      - Final total

      - Payment status: Paid / Pending

    - \[Repeat Gig\] button appears for completed gigs

4.  **Integration:  
    > **

    - Draws data from Stripe + internal records (Gig, Payment, Invoice)

    - Only shows payments with status Paid

5.  **Responsiveness:  
    > **

    - Mobile: condensed into stackable list

    - Desktop: structured rows or cards

**Definition of Done (DoD):**

- A \"Payments\" section is accessible from BuyerHome.

- It displays a list of the most recent (e.g., last 5-10) completed
  > payments made by the buyer.

- Each item shows basic details (worker name/gig title, date paid,
  > amount) and a "Repeat gig" button.

- (Post MVP) A clear link/button \"View Full Payment History\" leads to
  > the secondary dashboard view (for dev and QA teams only).

**Questions & Clarifications:**

- How many recent payments should be shown?

- Clarify the payment trigger: is payment always upfront, or can it be
  > due after gig completion? This affects what\'s shown here.

### **🧠 Developer Notes** {#developer-notes-5 .unnumbered}

- Merge all relevant payment entries into a single GET /payments API

- Include optional Stripe metadata (checkoutSessionId) for traceability

- Add repeatGig() function with pre-filled gig form or AI prompt

**What specific information must be included on the invoice (legal
requirements, company details, VAT info)?**

To comply with UK and general international standards, the following
details should be included:

- **Invoice number** (unique, sequential)

- **Date of invoice generation  
  > **

- **Buyer details** (name, business name if applicable, and address)

- **Freelancer details** (name, address, and Stripe ID or other
  > identifier)

- **Able AI Ltd details** (legal business name, address, company number,
  > VAT number if registered)

- **Gig details**: title, date, time, location

- **Itemised costs**:

  - Hourly rate × hours worked

  - Tips (separately indicated as not subject to Able fees)

  - Able platform fee (6.5% + VAT clearly stated)

  - Stripe fee (absorbed by buyer if applicable)

- **Total cost paid  
  > **

- **Payment method** (Stripe)

- **VAT breakdown** (if Able becomes VAT registered)

**2. What format is required (PDF essential for Post-MVP)?**

- **MVP:** JSON structured data is acceptable, displayed in a basic HTML
  > view (linked from DSH-B05 "Download Invoice" button).

- **Post-MVP:** PDF generation will be required. Recommended library:
  > pdfkit or puppeteer (for HTML to PDF rendering).

  - Invoices should be downloadable and optionally emailed.

  - Hosted on S3 or similar for secure storage.

**3. Where should generated invoices be stored?**

- **MVP:** No persistent storage needed. Just generate on request from
  > server-side function (generateInvoiceData(paymentId)).

**Post-MVP:** Store PDF invoices in secure cloud storage (e.g. Amazon
S3) and log a invoiceUrl in the Payment model. Allow retrieval via
dashboard.

Mock invoice:
https://drive.google.com/file/d/1W_9faFiB_iPj-Ryg9PP8vszBYiQjNALA/view?usp=sharing

WEB-B07 Quick Chat Access

## **📘 WEB-B07 -- Quick Chat Access** {#web-b07-quick-chat-access .unnumbered}

Facilitates direct communication between buyers and accepted workers
directly from relevant contexts within the webapp, improving
coordination and resolving questions quickly.

### **User Story: Structured Chat Before and After Gig Acceptance** {#user-story-structured-chat-before-and-after-gig-acceptance .unnumbered}

**As a** buyer,

- **I want** to ask a freelancer questions after sending them a gig
  > offer,

- **So that** I can clarify key details before and after they accept the
  > gig, while keeping everything on-platform.

![](media/image16.png){width="3.1302088801399823in"
height="5.046832895888014in"}

### **💬 Acceptance Criteria** {#acceptance-criteria-11 .unnumbered}

#### **1. Chat Access Phases** {#chat-access-phases .unnumbered}

| **Gig Status** | **Chat Available?** | **Rules**                                                     |
|----------------|---------------------|---------------------------------------------------------------|
| **PENDING**    | ❌                  | No chat. Offer not yet sent.                                  |
| **OFFER_SENT** | ✅ Limited          | Buyer may send **2 short questions**. Worker can reply.       |
| **ACCEPTED**   | ✅ Full Chat        | Ongoing conversation open for logistics, support, or updates. |
| **COMPLETED**  | ✅ Read-only        | Archived chat retained for reference (optional MVP feature).  |

#### **2. UI Indicators & Limits** {#ui-indicators-limits .unnumbered}

- Buyer sees prompt:  
  >   
  > *"Your offer is pending. You can send up to two questions while
  > waiting for a response."  
  > *

- Chat is shown in thread form (not real-time messaging)

- Responses are limited to text (no images or attachments in MVP)

- A banner states:  
  >   
  > *"Please keep messages on-platform. Sharing contact details is
  > against our terms."  
  > *

**Definition of Done (DoD):**

- Gig detail cards in the webapp include a \"Chat\" button/icon only for
  > gigs that are ACCEPTED or IN_PROGRESS.

- Clicking the chat button navigates the user to the dedicated chat
  > interface for that specific gig/worker.

- The chat access can also be provided from

- the Calendar view, on gigs marked ACCEPTED or IN_PROGRESS

- the Gig Summary Card in the buyer dashboard or main home view

- Notifications (post-MVP) if a new message is received

- Optionally, a "Messages" tab in the primary nav for all current gig
  > chats (grouped by gig date)

### **🧠 Developer Notes** {#developer-notes-6 .unnumbered}

- Status-based chat permissions tied to gig.status field

- Add messagesAllowed boolean to gig object, with max counter if in
  > OFFER_SENT phase

- Store messages under GigThread collection or similar

- Auto-block or flag content if message contains off-platform contact
  > terms (e.g., phone number, PayPal, email)

### **🔐 Optional Safeguards** {#optional-safeguards .unnumbered}

- Add auto-moderation keywords ("pay direct", "contact me at", "cash
  > deal")

- Add disclaimer before first message:  
  >   
  > *"Able protects your payment and reputation. Stay safe by keeping
  > everything in-app."  
  > *

WEB-B08 Referral Banner Interaction

Leverages the buyer network for growth marketing by making participation
in the referral program simple and accessible from the main buyer
interface.

**User Story**

As a Buyer seeing the referral banner in the webapp, I want to easily
get my referral link to share with other businesses, so I can earn the
£5 reward.

![](media/image35.png){width="3.1093755468066493in"
height="6.930299650043745in"}

**Definition of Done (DoD):**

- The ReferralBanner component is displayed on the BuyerHome.

- The banner clearly states the incentive (£5 for referring a business).

- A button/link on the banner allows the buyer to easily copy their
  > unique referral link.

- For MVP, the banner button should directly provide the referral link
  > to maximise usability and encourage sharing.

- A tooltip or small modal can appear with copy guidance (e.g. "Send
  > this link to another business -- you'll get £5 once they complete a
  > hire!").

- Post-MVP can introduce a more detailed info page for transparency and
  > optional T&Cs and might link to a page/modal with more program
  > details.

- There should be one universal referral link per user, since the
  > referred person chooses their role during onboarding.

- This keeps the system and UX simple.

- The backend can capture the referral context (e.g., referred user
  > chose 'Buyer') to determine the correct reward logic.

- This setup is already aligned with the backend structure described in
  > SVR-S05

WEB-B09 Dashboard Link

Provides the pathway for users needing more advanced features or
detailed data views than offered in the streamlined webapp, ensuring
power users are catered for.Useful for devs and QAs to debug weird
issues with data.

**User Story**

As a dev / QA , I want a link ( likely in Settings) to access the
secondary, more detailed \"Buyer Dashboard\", so I can view
comprehensive lists, history, reports, or manage team members.

**Definition of Done (DoD):**

- A clearly labeled link (e.g., \"View Full Dashboard\", \"Manage
  > Business\") is present within the webapp Settings screen.

- Clicking this link navigates the user to the main entry point of the
  > secondary buyer dashboard (e.g., /dashboard/buyer).

<!-- -->

- The link to the secondary "Buyer Dashboard" should be placed within
  > the **Settings** section of the primary buyer webapp, as that is the
  > most intuitive and non-intrusive location for advanced or
  > admin-level features.

- The recommended wording for the link is: **"View Full Dashboard"** or
  > **"Advanced Dashboard".** This ensures clarity that the feature
  > offers additional depth and is intended for power users, admins, or
  > devs/QA.

- Optionally, a tooltip or smaller label text could clarify: *"View
  > detailed hires, payments, team, and reports."*

- The link should navigate to: /dashboard/buyer

- This should only be visible to users with the correct permissions
  > (e.g. admin, dev, QA roles).

WEB-B10 Buyer home page

This is the main control panel for Buyers. A clean and informative home
screen allows businesses to efficiently manage their gig workforce,
explore potential hires, and track operational performance and expenses
in one place.

### **User Story** {#user-story-8 .unnumbered}

**As a logged-in buyer,  
** I want

- to access a home dashboard with quick links to Dashboard, Hire,
  > Calendar, and Payments

- **so that** I can monitor performance, recruit gig workers, manage
  > scheduled work, and review financial transactions with ease.

### **Acceptance Criteria:** {#acceptance-criteria-12 .unnumbered}

- A chat message appears at the top of the screen (e.g., "We have 10 new
  > bartenders join within 5 miles of you -- would you like to see their
  > profiles?").

- Four main feature buttons are displayed:

  - **Dashboard**: Navigates to analytics and performance metrics about
    > past and upcoming gigs, spend summaries, and workforce trends.

  - **Hire**: Redirects to a candidate pool or search page where buyers
    > can view profiles, filter by skill/location, and invite workers to
    > gigs.

  - **Calendar & Gigs**: Navigates to a scheduling view showing booked
    > gigs and workers' statuses.

  - **Payments & History**: Navigates to a page showing invoices,
    > completed gigs, payment status, and downloadable reports.

- A "Switch to seller" toggle switches the view to the gig worker
  > interface.

- A "Refer a business and earn £5" banner redirects to a referral form
  > to invite new businesses.

- A gear icon in the bottom right corner opens the Settings screen with
  > account preferences, support options, and logout.

### **Definition of Done (DoD):** {#definition-of-done-dod-1 .unnumbered}

- The buyer home view loads with all UI components (contextual message,
  > feature buttons, toggle, referral banner, and settings).

- Navigation works correctly:

  - Dashboard → Analytics and gig performance screen

  - Hire → Worker discovery and hiring interface

  - Calendar → Scheduled gigs and in-progress management view

  - Payments → Payment records and gig transaction history

  - Switch to seller → Redirects to gig worker page

  - Refer a business → Clicking on it should copy the referral link

  - Settings → Opens user settings page

  - Notifications → Opens user notifications page

- Each link redirects to the appropriate screen without errors and loads
  > relevant data.

- The contextual message dynamically reflects local worker activity
  > (e.g., new signups nearby).

- Role-based access ensures only buyers see this screen.

- The UI is responsive and accessible (mobile optimized, keyboard
  > friendly, screen-reader ready).

- Referral incentive is clearly displayed and functional (£5 credit per
  > successful business referral).

- Visual feedback (e.g., button animations, active states) is applied
  > consistently.

- All error states (e.g., network failure, empty data) have
  > user-friendly fallback messages.

DSH-B01 Full Hire/Search View

## **📘 DSH-B01 -- Full Hire List / Search View** {#dsh-b01-full-hire-list-search-view .unnumbered}

### Enable Filterable Search of Freelancers in the Buyer Dashboard.  {#enable-filterable-search-of-freelancers-in-the-buyer-dashboard. .unnumbered}

### Caters to buyers who prefer manual control over searching or need to find workers based on very specific criteria not easily captured by the initial AI flow. Provides a fallback if AI suggestions aren\'t suitable. {#caters-to-buyers-who-prefer-manual-control-over-searching-or-need-to-find-workers-based-on-very-specific-criteria-not-easily-captured-by-the-initial-ai-flow.-provides-a-fallback-if-ai-suggestions-arent-suitable. .unnumbered}

###  {#section-30 .unnumbered}

**As a buyer using the dashboard,**

- I want to browse and filter the full list of available freelancers,

- So that I can explore gig worker options manually when AI matching
  > isn't enough.

### 💬 Acceptance Criteria {#acceptance-criteria-13 .unnumbered}

1.  Entry Point:

    - Accessible from /dashboard/buyer

    - Navigation label: "Browse Freelancers" or "All Gig Workers"

    - Default view: list of available workers for the current week
      > (status: Verified + Available)

2.  Filter Panel (left or dropdown on mobile):

    - Skill tags (multi-select or autocomplete)

    - Hourly rate (min and max fields or slider)

    - Availability date (calendar range or "this week" / "next week"
      > presets)

    - Keyword search (searches: gigfolio title, bio, skill tags)

    - Optional toggle: "Suggested First" to use AI-weighted sort
      > (on/off)

    - Display slot status if mass hire (eg 1 of 3 accepted)

3.  Sort Options (top of results):

    - Hourly rate

    - "Would work again" score

    - Last login (recent activity)

4.  Freelancer Card Output:

    - Profile image

    - Main skill or badge highlights

    - Hourly rate

    - Short gigfolio description (1--2 lines)

    - Location radius (if known)

    - Buttons:

      - View Profile → opens freelancer full gigfolio

      - Send Offer → opens gig creation flow (reuse WEB-B03 logic)

**Definition of Done (DoD):**

- A dedicated Hire/Search page exists in the secondary dashboard
  > (/dashboard/buyer/hire).

- It includes comprehensive filtering options (skills, rate range,
  > location radius, availability dates, keywords, would work with again
  > rating).

> **MVP Filters:**
>
> • Skills (tag-based)
>
> • Hourly Rate Range (min-max slider or entry field)
>
> • Availability Dates (calendar selector)
>
> • Keyword Search (simple text input, matches gigfolio and video title)
>
> • AI-ranked "Suggested First" toggle (optional but useful)
>
> **Post-MVP Filters (can be flagged as future):**
>
> • Location Radius (e.g. within 1--10 miles)
>
> • Badge Filters (e.g. "Perfect Attendance", "Top Rated")
>
> • Equipment Required
>
> • Experience Level / Repeat Gigs

- Sorting Options (MVP):

  - Hourly Rate (ascending/descending)

  - Rating (descending)

  - Recent Activity (last login time)

- Results are displayed in a clear list or grid format, showing worker
  > summaries.

- Each worker links to their detailed profile/booking page
  > (/dashboard/buyer/hire/\$workerId - note: this might share
  > implementation with the webapp version).

- The same underlying /api/users/search endpoint will be reused, but:

> • The AI flow (WEB-B02) uses a weighted ranking algorithm to present a
> shortlist.
>
> • The dashboard search (DSH-B01) exposes a broader manual query
> builder, giving buyers direct control without AI prioritisation.

### 🧠 Developer Notes {#developer-notes-7 .unnumbered}

- Endpoint: /api/users/search

  - Accepts filters: skills, rateMin, rateMax, availableFrom,
    > availableTo, keywords

  - Returns structured array of user cards

- Sorting is server-side; fallback to client-side if backend limited

- Uses same GigWorkerCard component as other listings

- AI toggle applies ranking=true flag to endpoint for weighted
  > results**  
  > **

DSH-B02 Gig Details & Status Management

Provides a central place for buyers to manage the lifecycle of a
specific gig after booking, view all associated information, and take
necessary actions like confirming completion.

**User Story**

As a Buyer,

- I want to view and manage the full details of any booked gig from my
  > dashboard,

- So that I can track the status, contact the worker, cancel the gig if
  > necessary, and confirm completion when it's done.

![](media/image5.png){width="3.2968755468066493in"
height="7.277749343832021in"}

**Definition of Done (DoD):**

- A dynamic route (/dashboard/buyer/gigs/\$gigId) displays full details
  > of a specific gig (role, worker, date/time, location, rate,
  > description, status).

- Displays related information (e.g., link to worker profile, chat
  > history link).

- Provides action buttons relevant to the gig\'s current status:

- CANCEL button (if status is PENDING or ACCEPTED - before start time).

- Penalty:

  - For MVP, cancellation is free for now.

  - Post-MVP, cancellation windows (e.g., less than 24 hrs) may trigger
    > fees or penalties for the buyer.

  - This can be flagged to the admin for manual review if abuse is
    > suspected.

- MARK AS COMPLETE button (if status is IN_PROGRESS or ACCEPTED - after
  > end time).

  - The buyer can mark the gig as complete only after the scheduled end
    > time.

  - Additionally, the gig must have status ACCEPTED or IN_PROGRESS.

  - The buyer or freelancer can amend the gig timing right up to the end
    > of the gig.

- Actions update the gig status (SVR-B03) and trigger relevant
  > notifications/processes (e.g., payment becoming due).

- Admins can download all terms of agreements/contracts for dispute
  > resolution and compliance

**Questions & Clarifications:**

- Does the worker also need to confirm completion? (Two-sided
  > confirmation is common).

  - Two-sided confirmation is ideal: the gig only becomes eligible for
    > payment processing when both parties mark it as complete.

  - If one party marks it as complete but the other doesn't respond
    > within a defined window (e.g. 24 hours), the platform can
    > auto-complete the gig to avoid blocking payments.

  - This should be part of the gig status lifecycle in SVR-B03.

### **🛠️ Developer Story (DSH-B02)** {#developer-story-dsh-b02 .unnumbered}

The system must render a gig detail page (/dashboard/buyer/gigs/\$gigId)
containing:

- All relevant data: role, worker name (with link to profile),
  > date/time, address, agreed rate, gig description, total cost with
  > fee breakdown, current status.

- A status display (e.g., Pending, Accepted, In Progress, Completed).

- Return top n matches if mass hire search/match

- Display slot status if mass hire (eg 1 of 3 accepted)

- Action buttons, conditionally shown:

  - **Cancel Gig** if status is PENDING or ACCEPTED and the gig start
    > time is in the future.

  - **Mark as Complete** if status is IN_PROGRESS or ACCEPTED and the
    > scheduled end time has passed.

- Buttons should trigger appropriate backend status transitions via
  > SVR-B03, including notifications (SVR-C02).

- A link to relevant chat history (if exists).

- A button to amend gig details, which routes to DSH-B03.

- A button to report a gig issue (routes to DSH-B04).

- 

- Show fallback status and countdown timer (see WEB-B02)

DSH-B03 Amend Gig Details

## **📘 DSH-B03 -- Amend Gig Details (Buyer Side)** {#dsh-b03-amend-gig-details-buyer-side .unnumbered}

Allows for flexibility when gig requirements change after the initial
booking, providing a structured way to propose and confirm modifications
with the worker.

### **User Story** {#user-story-9 .unnumbered}

**As a** buyer,

- **I want** to amend key details of a gig I've booked (like time,
  > address, or rate),

- **So that** I can correct mistakes or update info without cancelling
  > and rebooking.

### **💬 Acceptance Criteria** {#acceptance-criteria-14 .unnumbered}

1.  **Access:  
    > **

    - "Amend Gig" button appears only if:

      - Status =PENDING, ACCEPTED or IN_PROGRESS

      - Scheduled start time is at least **30 minutes in the future  
        > **

    - Clicking the button opens the "Amend Gig" modal or page

2.  **Editable Fields:  
    > **

    - Role (optional -- if taxonomy changes)

    - Date & Start/End Time

    - Venue Address

    - Notes or instructions

    - Hourly rate (only upward changes for MVP to protect worker)

    - Tip (can be pre-added here)

3.  **Confirmation Prompt:  
    > **

    - Buyer must confirm:  
      >   
      > "These changes will be sent to your worker for approval. The gig
      > will remain scheduled, but they must confirm the new details to
      > continue."

4.  **On Submission:  
    > **

    - New amended_gig object is created (linked to original gig ID)

    - Status set to AMENDMENT_PENDING

    - Worker receives notification:  
      >   
      > "This gig has been amended. Please review and confirm the new
      > details."

    - If the worker accepts:

      - Original gig updates and status returns to ACCEPTED

    - If worker declines or no response in 24h:

      - Original gig remains unchanged

      - Buyer is notified and can reattempt or cancel

5.  **Visual Feedback:  
    > **

    - Gig card shows: "Amendment Sent -- Awaiting Response" banner

    - On worker confirmation: "Amendment Accepted"

    - On decline: buyer sees "Amendment Declined"

**Definition of Done (DoD):**

- An \"Amend Details\" button is available on the Gig Details page
  > (DSH-B02) for gigs with appropriate status (e.g., ACCEPTED, maybe
  > PENDING).

- Clicking opens a form pre-filled with current details, allowing
  > modification of fields like date, time, rate, note.

- Submitting the amendment sends a request/notification to the worker.

- The gig status might temporarily change (e.g., AMENDMENT_PENDING)
  > until the worker accepts/rejects the changes.

- Worker acceptance updates the gig details; rejection reverts or
  > requires further action.

**Questions & Clarifications:**

- How do amendments affect already processed payments (if the payment is
  > upfront)?

- For MVP: Payments are not collected upfront, so there's no impact on
  > existing Stripe transactions.

- Once amendments are confirmed, the payment amount is recalculated
  > before the gig is completed and payment is triggered post-gig.

### **🧠 Developer Notes** {#developer-notes-8 .unnumbered}

- Gig amendments should not overwrite the original gig immediately

- All changes stored in a pending amendment object:

> {
>
> \"gigId\": \"abc123\",
>
> \"proposedBy\": \"buyer\",
>
> \"fieldsChanged\": \[\"startTime\", \"rate\"\],
>
> \"newValues\": { \"startTime\": \"14:00\", \"rate\": 25 }
>
> }

- Backend must validate:

  - Gig is still editable (e.g., not in past or within 30 minutes)

  - Rate is not reduced below original

DSH-B04 Report Gig Issue

### **User Story: Report a Gig Issue (Buyer View)** {#user-story-report-a-gig-issue-buyer-view .unnumbered}

Provides a formal channel for buyers to report problems related to a
specific gig (e.g., worker no-show, performance issues, disputes),
enabling platform mediation and quality control.

**As a** buyer using the dashboard,

- **I want** a "Report an Issue" button on the gig details page,

- **so that** I can raise a concern about a gig and receive AI-led
  > support, followed by admin escalation if needed.

### **Definition of Done (DoD)** {#definition-of-done-dod-2 .unnumbered}

✅ A "Report Issue" button is visible on each eligible gig in the Gig
Details page (DSH-B02).

✅ Clicking the button opens a structured issue reporting form.

- allowing the buyer to describe the issue.

  - Worker did not show up

  - Worker was late

  - Work was unsatisfactory

  - Buyer was difficult

  - Dispute over payment

  - Something else (free-text field)

✅ Form captures:

- Issue category (e.g. No-show, Late arrival, Poor performance,
  > Incomplete work, Other)

- Text description

- Optional attachments (e.g. photo or screenshot) -- *Post-MVP  
  > *

✅ Upon submission:

- An **AI assistant** reviews the issue and attempts resolution or
  > clarification first via chat.

- If the issue remains unresolved (or is of a critical nature), it is
  > escalated to human moderation/admin.

✅ A record is created in a GigIssue table with:

- Gig ID

- Issue type

- Buyer ID

- Status (OPEN, AI_HANDLING, ESCALATED, RESOLVED)

- AI summary of attempted actions (e.g. refund initiated, clarification
  > provided)

✅ Issue appears in an **admin moderation queue**, with visibility into
the full gig and worker history.

✅ Status updates and resolution responses are communicated back to the
buyer within the dashboard or by notification.

✅ There is a link to Able discord channel for community guidance

### **Developer Story** {#developer-story-1 .unnumbered}

**As a** developer,

**I need to** build an issue reporting feature accessible from DSH-B02,

**so that** buyers can flag problems and trigger AI-driven resolution,
with admin backup.

### **Technical Implementation Requirements** {#technical-implementation-requirements .unnumbered}

- Endpoint: POST /dashboard/gigs/:gigId/report-issue

- DB Model: GigIssue (includes AI handling status)

- AI service integration (e.g., via OpenAI or Portkey) to triage issues
  > and store summaries

- Admin queue integration (/admin/gig-issues)

- Dashboard display for buyers to track issue status

- Notification system for updates

DSH-B05 Full Payment History

Offers buyers a comprehensive tool for financial tracking and
accounting, providing more detail and control than the simplified webapp
summary.

### **🧾 User Story** {#user-story-10 .unnumbered}

**As a Buyer**,

- I want a detailed **Payment History** page in the secondary dashboard,
  > with **filtering, sorting**, and **invoice download** capabilities.

### **✅ Definition of Done (DoD)** {#definition-of-done-dod-3 .unnumbered}

- A dedicated **Payments** page exists in the secondary dashboard
  > (/dashboard/buyer/payments).

- Displays a **detailed table** of all payments initiated by the buyer.

- Table includes columns:

  - **Date  
    > **

  - **Gig Title  
    > **

  - **Worker Name  
    > **

  - **Amount  
    > **

  - **Status** (Pending, Completed, Failed)

  - **Invoice Link  
    > **

- Filtering options

  - By date range, worker, gig title, and status.

- Sorting capabilities

  - By amount, gig date, payment status, alphabetical by worker name

- Functional **"Download Invoice"** link for completed payments
  > (integrated with SVR-B05).

- **"Pay Now"** buttons for pending payments (triggers Stripe flow) .

- Invoice generation requirements

  - **MVP**: Simple structured **HTML/JSON invoice** shown on click,
    > including:

    - Buyer & Worker names

    - Gig title, date, and time

    - Hours x Rate

    - **Able fee** (6.5% + VAT), **Stripe fee** Add 2FREEABLE promo flag
      > to gig payment row and receipt (see SVR-PROMO01)

    - 

    - **Net freelancer earnings  
      > **

  - **Post-MVP**: Use a tool like pdfkit or puppeteer to generate
    > downloadable PDF invoices with legal formatting and a secure
    > storage URL.

  - Mock invoice

> [[https://drive.google.com/file/d/1W_9faFiB_iPj-Ryg9PP8vszBYiQjNALA/view?usp=sharing]{.underline}](https://drive.google.com/file/d/1W_9faFiB_iPj-Ryg9PP8vszBYiQjNALA/view?usp=sharing)

DSH-B06 Full Calendar View

Provides buyers with a powerful visual tool to manage all their bookings
over different time scales, essential for planning and avoiding
scheduling conflicts, especially when managing multiple gigs.

### **User Story** {#user-story-11 .unnumbered}

**As a Buyer**,

- I want a full Calendar view in the dashboard with Day/Week/Month
  > options and detailed gig info so I can comprehensively manage my
  > schedule.

### **Definition of Done (DoD)** {#definition-of-done-dod-4 .unnumbered}

- A dedicated Calendar page exists at /dashboard/buyer/calendar.

- Built using a full-featured calendar component (e.g.,
  > react-big-calendar).

- Displays **all gigs** booked by the buyer, colour-coded or marked by
  > status:

  - **Pending  
    > **

  - **Accepted  
    > **

  - **InProgress  
    > **

  - **Completed  
    > **

- Supports **Day**, **Week**, and **Month** views.

- **Clicking** a gig event opens more details or links to the **Gig
  > Details page (DSH-B02)**.

- Buyers should be able to create new gigs directly from this calendar
  > view by clicking a time slot.

### **🧠 Suggestion from a UX Perspective:** {#suggestion-from-a-ux-perspective .unnumbered}

ref. **past gigs should appear in the calendar**. Based on this
feature's purpose and the current DoD:

- Yes --- **Completed gigs** are already included in this calendar view.

- That means buyers can scroll back in time to see completed bookings
  > --- **no changes needed**.

- This supports better visibility for repeat hires, payment reference,
  > and auditing.

DSH-B07 Full Chat History

**📌 DSH-B07 Full Chat History**

Provides a centralized place to review past communications related to
specific gigs, useful for reference, resolving disputes, or recalling
specific instructions.

**User Story**

As a Buyer,

- I want a dedicated Chat section in the dashboard to view complete
  > conversation histories for all gigs,

- so I can recall instructions, resolve disputes, or check
  > communications for accuracy.

**Definition of Done (DoD)**

- A dedicated "Chat" or "Messages" section exists in the secondary
  > dashboard (/dashboard/buyer/chat)

- Lists conversations grouped by **gig title** and **worker name**

- Selecting a conversation displays the full message history for that
  > specific gig/worker interaction

- Basic text messages are shown in chronological order with timestamp
  > and sender identification

- (Post-MVP): Enables initiating new messages only if the gig status is
  > Accepted or In Progress

- Uses same database store and formatting as main chat UI
  > (ChatScreen.jsx)

- Clear links from relevant gigs (in DSH-B02) lead directly to the chat
  > history for that gig

DSH-B08 Team Management

Allows larger businesses or teams to collaborate on hiring, enabling
multiple individuals to book and manage workers under a single company
account and billing profile.

### **User Story** {#user-story-12 .unnumbered}

**As a Buyer (account owner/admin),**

- I want a **Team Management section** in the dashboard

- So I can **add/remove team members** who are allowed to book and
  > manage gig workers under the business profile.

### **Definition of Done (DoD)** {#definition-of-done-dod-5 .unnumbered}

- A "Team" or "Users" section is available in the buyer dashboard
  > settings.

- It shows a **list of current team members** associated with the buyer
  > profile.

- There is an **"Add Team Member"** form that:

  - Collects name and email.

  - (Post-MVP) Optionally assigns a **role/permission level** (e.g.
    > HIRER, ADMIN, VIEWER).

- Buyers can **remove** existing team members.

- Backend logic (covered in SVR-B06) supports all linking/unlinking of
  > team members.

**Questions & Clarifications:**

- How are team members invited (email invitation? direct add?)?

DSH-B09 Workforce Analytics

Provides buyers with data-driven insights into their hiring activity,
helping them understand costs, identify effective workers, and optimize
their staffing strategy.

**User Story**

**As a Buyer**,

- I want an Analytics section in the dashboard showing charts and stats
  > about my hiring patterns, spend, and top-rated workers,

- so I can optimise future decisions and understand workforce trends.

### **📌 Definition of Done (DoD)** {#definition-of-done-dod-6 .unnumbered}

- A dedicated "Analytics" or "Reports" section exists in the buyer
  > dashboard.

- Displays key metrics:

  - **Total Spend  
    > **

  - **Number of Hires  
    > **

  - **Average Gig Cost  
    > **

  - **Average Worker** would work with again **Rating  
    > **

- Includes visualizations (using a charting library such as Chart.js or
  > Recharts):

  - **Spending trend over time** (bar or line chart)

  - **Breakdown of hires by role/skill** (pie or bar chart)

  - **List of most frequently hired or highest-rated workers**

  - **  
    > **

- Includes basic filters (e.g., **Date range** picker).

###  {#section-31 .unnumbered}

###  {#section-32 .unnumbered}

###  {#section-33 .unnumbered}

###  {#section-34 .unnumbered}

### **💬 Questions & Clarifications (Answered)** {#questions-clarifications-answered-1 .unnumbered}

| **❓ Question**                                                           | **✅ Response**                                                                                                                                        |
|---------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------|
| **What specific charts and metrics are most valuable for buyers in MVP?** | Total Spend, Total Gigs Booked, Avg Gig Cost, Top 5 Workers (by hire count or would work with again rating), Spend over time, Role/skill distribution. |
| **What date range filters are needed?**                                   | Simple options: "Last 30 days", "Last 90 days", "This year", and **Custom range** via date picker.                                                     |
| **Should filters update all charts dynamically?**                         | Yes, filtering by date range should dynamically update all data in the view.                                                                           |
| **How are top-rated workers calculated?**                                 | Based on the "Would work again" metric (yes=1, no=0), average score per worker. Ties broken by number of gigs.                                         |
| **Post-MVP Enhancements**                                                 | Export to CSV/PDF, breakdown by location, time-of-day analysis, worker badge breakdown, and workforce diversity metrics.                               |

SVR-B01 Buyer Profile Storage

Establishes the data foundation for buyer accounts, enabling
identification, company representation, team collaboration, and tracking
of buyer-specific activities and achievements within the platform.

### **✅ System Story** {#system-story .unnumbered}

The system must store buyer profile attributes, enabling identification,
company affiliation, collaboration across teams, and tracking of
buyer-specific activity within the Able platform.

### **✅ Definition of Done (DoD)** {#definition-of-done-dod-7 .unnumbered}

- **Database Schema  
  > **

  - BuyerProfile model defined in schema.Drizzle with fields:

    - companyName (nullable String)

    - industry (nullable String)

    - profileImage (nullable String)

    - Additional optional fields: VAT number, address, company URL as
      > per compliance review

  - companyName, and industry are required for team based buyers but not
    > enforced for individual buyers.

  - ⚠️ PII implications noted -- sensitive fields to be securely stored
    > and GDPR-compliant.

  - Relationships:

    - BuyerProfile ↔ User (1:1)

    - BuyerProfile ↔ TeamMember (1:M)

    - BuyerProfile ↔ Badge (M:M)

    - BuyerProfile ↔ Gig (1:M)

- **Functionality  
  > **

  - Functions exist to:

    - Create buyer profile on first hiring action or registration
      > (createBuyerProfile)

    - Read and update profile information (getBuyerProfile,
      > updateBuyerProfile)

    - Attach team members, track badges, and associate past gigs

- **Migrations  
  > **

  - Drizzle migrations correctly create/update tables with these
    > relationships

SVR-B02 Offer Matching & ranking engine logic

## **📘 SVR-B02 -- Offer Matching & Ranking Engine** {#svr-b02-offer-matching-ranking-engine .unnumbered}

This is the core engine connecting supply (workers) and demand (buyers).
Effective matching ensures buyers quickly find relevant workers, and
workers receive suitable offers, driving platform success.

**System Story**

The system must implement logic (AI and rule-based) to identify and rank
the best worker matches based on buyer requirements, worker skills,
experience, trust metrics, rates, and availability.

###  **Definition of Done (DoD)** {#definition-of-done-dod-8 .unnumbered}

- A server-side function (e.g., findMatchingWorkers) is implemented in
  > gig.server.js.

- It accepts buyer requirements collected via WEB-B01:

  - Role (required)

  - Date/time (required)

  - Exact address (required)

  - Budget or suggested hourly rate (optional)

- It queries the GigWorkerProfile, checking:

  - Skill match (exact or fuzzy via AI/NLP match on tags, titles, and
    > video transcript)

  - Availability via checkWorkerAvailability (SVR-S03), allowing for a
    > 30-minute buffer between gigs

- It filters based on:

  - Verified status

  - Active availability calendar

  - Skill presence or match (exact or near-match)

  - Add to the semantic matching logic: these tags should be recognised
    > and weighted in the AI's ranking engine when buyers request
    > related roles (e.g. waiter, bartender, food runner).

  - Allergen-aware service

  - Basic HACCP

  - EPoS familiarity

  - Personal licence to serve alcohol

  - Fine-dining table-side service

  - \> Example: "Fine-dining table-side" → high match score for premium
    > waiter gigs

- It ranks available workers using the agreed MVP ranking system (see
  > below).

- If **no exact matches** are found:

  - Show the closest skill matches or available users within an extended
    > location range.

  - Return a fallback message encouraging relaxed criteria.

- For each eligible gig worker, the AI engine:

  - Accesses the stored transcript of their video bio (see
    > SVR-B02-DEV05)

  - Embeds the transcript using text-embedding-3-small

  - Includes this vector in the semantic ranking layer, alongside skill
    > tags and gigfolio bio

- If transcript is missing or invalid:

  - That section is skipped, but fallback logic ensures the worker is
    > still eligible for matching based on other criteria

### **🧠 MVP Matching Logic** {#mvp-matching-logic .unnumbered}

**Ranking Factors & Weights (MVP):**

| **Factor**                 | **Weight** | **Notes**                                                                                                                                                                                           |
|----------------------------|------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Last login time            | 10%        | Recency-based decay (encourages platform use)                                                                                                                                                       |
| Proximity                  | 10%        | Tiered based on miles. MVP default: 15 miles                                                                                                                                                        |
| Calendar availability      | 10%        | Checked against gig time. Bonus for all-day or flex availability                                                                                                                                    |
| Response rate & promptness | 10%        | Based on responses within 60 mins                                                                                                                                                                   |
| "Would work again" score   | 5%         | Buyer feedback and fallback to repeat count                                                                                                                                                         |
| Badges earned              | 5%         | Weighted badge logic (Perfect Attendance, Tip Magnet, etc.)                                                                                                                                         |
| Pay rate match             | 5%         | Based on alignment or negotiability within ±15%                                                                                                                                                     |
| Profile completeness       | 5%         | Includes video bio, skills, rates, phone, availability                                                                                                                                              |
| AI/NLP semantic match      | 15%        | Vector search on bio, tags, transcript -- OpenAI/Portkey integrated                                                                                                                                 |
| Freshness bonus            | 5%         | For new users (first 2 months)                                                                                                                                                                      |
| Fairness and burnout test  | 5%         | Based on if the user has been working more than 30 hours a week. If users are working more than 30 hours a week then other users are offered the position first for fairness and to prevent burnout |
| Acceptance                 | 5%         | Based on if this user accepts gigs (if user often rejects offers then they are down weighted)                                                                                                       |
| Appearance                 | 10%        | If the user is ontime and completes the whole shift they get a positive weighting. If the user has canceled (less 5%) or not shown up (less 10%) for three months                                   |

> MVP will use a mix of vector-based matching and basic cosine/token
> comparison initially.

### **🧑‍💻 Developer Implementation Plan** {#developer-implementation-plan .unnumbered}

1.  **Define data models**:

    - GigWorkerProfile, Skill, Badge, Availability, VideoTranscript

    - Index for skill and role tag queries.

2.  **Filtering logic**:

    - Filter verified workers with overlapping availability.

    - Ensure availability includes 30-min buffer pre/post.

3.  **AI/NLP Matching**:

    - MVP: Use OpenAI embeddings or Portkey Vector DB.

    - Match buyer gig description with gigfolio bio, video transcript,
      > and skill tags.

4.  **Scoring algorithm**:

    - Implement weighted scoring matrix.

    - Normalize and combine scores to rank candidates.

5.  **Response handling**:

    - If ranked list is empty:

      - Retry with relaxed skill match or extended location range.

      - Return fallback UI: "No matches found. Would you like to adjust
        > your request?"

6.  **Performance considerations**:

    - Limit to top 3--5 results per request.

    - Add query caching or batching if needed.

### **Developer Story: Fallback Logic for No Matches** {#developer-story-fallback-logic-for-no-matches .unnumbered}

**ID:** SVR-B02-DEV04

**Title:** Apply Relaxed Matching Rules When No Strong Matches Found

**As the** matching engine,

**I want to** return fallback candidates when no exact matches are
found,

**So that** buyers still see potentially relevant and available workers
instead of a blank screen.

### **🎯 Acceptance Criteria** {#acceptance-criteria-15 .unnumbered}

1.  **Default Matching Pass:  
    > **

    - Apply standard eligibility filters:

      - Availability match

      - Skill match (direct tag or mapped synonym)

      - Proximity within set radius (e.g. 15 miles)

      - Minimum trust/score threshold (e.g. 70%)

2.  **If no eligible matches found:  
    > **

    - Run a second pass with relaxed constraints:

      - Expand proximity (e.g. 15 → 25 miles)

      - Allow adjacent or semantically similar skills (from synonym
        > table or AI match score)

      - Lower minimum match score threshold (e.g. from 70 → 55)

3.  **Return fallback matches flagged with matchType:  
    > **

{

\"workerId\": \"xyz123\",

\"matchType\": \"similarSkill\",

\"score\": 62,

\"notes\": \"Tagged as \'event setup\' instead of \'runner\'\"

}

4.  **Frontend uses matchType to show contextual badge/message:  
    > **

    - "Similar experience"

    - "Willing to travel further"

    - "Flexible fit"

5.  **If still no results:  
    > **

    - Return { matches: \[\], status: \"noneFound\" }

    - Allow UI to prompt for adjustment or notification

### **🧠 Data Enhancements** {#data-enhancements .unnumbered}

- Add synonym mapping for adjacent roles in a config file or table:

{

\"barback\": \[\"bartender\", \"runner\"\],

\"host\": \[\"waitstaff\", \"door supervisor\"\],

\"event setup\": \[\"runner\", \"porter\"\]

}

- Optional: Include vector similarity fallback post-MVP

### **📌 Questions & Clarifications --- Answered** {#questions-clarifications-answered-2 .unnumbered}

| **Question**                                  | **Answer**                                                               |
|-----------------------------------------------|--------------------------------------------------------------------------|
| ✅ Confirm MVP filtering and ranking criteria | Included above                                                           |
| ✅ Importance of location?                    | Yes -- 15-mile radius default, scored in tiers                           |
| ✅ Skill match logic?                         | NLP-based vector match on gigfolio and tags (not just exact)             |
| ✅ Approach for Post-MVP?                     | Semantic embeddings + behavioural reinforcement (AI learning from hires) |
| ✅ Vector DB/AI integration?                  | YES -- OpenAI embeddings or Portkey Vector DB included in MVP            |
| ✅ How does availability work?                | Calendar + 30-minute buffer + conflict check                             |
| ✅ If no matches found?                       | Retry with broader criteria and notify buyer (graceful fallback)         |

📘 **SVR-B02-DEV05 -- Video Bio Transcription for Semantic Matching**

🧑‍💻 **Developer Story: Transcribe Video Bios for Use in AI Matching**

As the AI matching engine,

I want to extract and store transcripts from worker video bios,

So that I can perform semantic comparisons between buyer requests and
freelancer skills in a structured way.

✅ **Definition of Done (DoD)**

**Trigger Point:**

- When a new video bio is uploaded or updated, a background process is
  > triggered to generate a transcript.

**Transcription Method:**

- Use a speech-to-text API (e.g. OpenAI Whisper, AssemblyAI, or AWS
  > Transcribe).

- Cap transcription length to 30 seconds; return plain text or lightly
  > structured output.

**Data Storage:**

- Store the transcript text in a videoTranscript field in the
  > GigWorkerProfile or in a separate VideoTranscript table linked by
  > userId and skillId.

**Usage in Ranking:**

- The transcript is included in the AI/NLP matching layer alongside the
  > gigfolio bio and skill tags.

- The embedding pipeline (e.g., OpenAI text-embedding-3-small) creates a
  > vector from the transcript for inclusion in vector search.

🧠 **Developer Notes:**

- Process should be asynchronous (queue job or background worker) to
  > avoid blocking uploads.

- Add fallback UI: if transcription fails, show a banner prompting user
  > to try again or upload a new video.

- Ensure the transcription is stored in a searchable and embeddable
  > format.

- Link to existing embedding logic used in SVR-S04 and SVR-B02.

**📄 Product Brief: Able Offer Ranking System (MVP)**

### **Purpose** {#purpose .unnumbered}

Able's AI Matching System will use a weighted ranking model that goes
beyond simple skill matching to deliver fast, relevant, and fair matches
between gig requests and available gig workers. It will incorporate
availability, user behaviour, trust metrics, and content relevance to
elevate the most suitable freelancers to each buyer's shortlist.

### **🎯 Objectives** {#objectives .unnumbered}

- Prioritise **trustworthy, active, and available** gig workers.

- Ensure **fast fulfilment** of gigs with minimal buyer effort.

- Promote **new users** fairly without compromising quality.

- Increase **user satisfaction** by improving match quality over time.

### **🔍 Matching Flow Overview** {#matching-flow-overview .unnumbered}

1.  **Filter by eligibility:  
    > **

    - Verified gig workers (RTW pending or complete)

    - Skills match buyer's request

    - Marked as available on their calendar

    - Within proximity range (default: 15 miles)

2.  **Score each eligible worker** using weighted criteria

3.  **Sort** top 5 offers for presentation to the buyer in the "Best
    > Match" list.

### **📊 Ranking Factors & Weights** {#ranking-factors-weights .unnumbered}

###  {#section-35 .unnumbered}

<table>
<colgroup>
<col style="width: 24%" />
<col style="width: 10%" />
<col style="width: 65%" />
</colgroup>
<thead>
<tr class="header">
<th><em><strong>Factor</strong></em></th>
<th><em><strong>Weigt</strong></em></th>
<th><em><strong>Description</strong></em></th>
</tr>
<tr class="odd">
<th><em><strong>Last login time</strong></em></th>
<th><em>15%</em></th>
<th><em>Prioritises active workers (recent logins signal intent and
readiness). Score decays over 7 days.</em></th>
</tr>
<tr class="header">
<th><em><strong>Proximity</strong></em></th>
<th><em>15%</em></th>
<th><em>Distance from gig location. Tiered scoring: 5 pts for &lt;1
mile, down to 1 pt for 8–10 miles.</em></th>
</tr>
<tr class="odd">
<th><em><strong>Calendar availability</strong></em></th>
<th><em>10%</em></th>
<th><em>Availability must overlap with gig time. Bonus for full-day or
flexible availability.</em></th>
</tr>
<tr class="header">
<th><em><strong>Response rate</strong></em></th>
<th><em>10%</em></th>
<th><em>% of offers replied to within 1 hour. Prevents recommending
unresponsive users.</em></th>
</tr>
<tr class="odd">
<th><em><strong>“Would work again” score</strong></em></th>
<th><em>10%</em></th>
<th><em>Derived from buyer responses. Uses a yes/no binary score;
fallback to repeat gig count if new.</em></th>
</tr>
<tr class="header">
<th><p><em><strong>Badges earned</strong></em></p>
<p><em><strong>Pay rate match</strong></em></p>
<p><em><strong>Profile completeness</strong></em></p></th>
<th><p><em>5%</em></p>
<p><em>10%</em></p>
<p><em>10%</em></p></th>
<th><p><em>Weighted by badge type (e.g. “Perfect Attendance” &gt; “Tip
Magnet”).</em></p>
<p><em>Compares buyer’s stated budget to worker’s rate. Score is highest
when rates are aligned or negotiable within a reasonable range (e.g.
±15%). Workers who accept negotiable gigs receive a slight
boost.</em></p>
<p><em>Measures completion of:</em></p>
<ul>
<li><blockquote>
<p><em>Video bio<br />
</em></p>
</blockquote></li>
<li><blockquote>
<p><em>Skill hastags<br />
</em></p>
</blockquote></li>
<li><blockquote>
<p><em>Rate, availability, equipment (if relevant)<br />
</em></p>
</blockquote></li>
<li><blockquote>
<p><em>Phone number</em></p>
</blockquote></li>
</ul></th>
</tr>
<tr class="odd">
<th><em><strong>AI/NLP semantic match</strong></em></th>
<th><em>15%</em></th>
<th><em>Matches keywords or similar phrases from buyer’s gig description
against:</em></th>
</tr>
<tr class="header">
<th><em>– Gigfolio bio</em></th>
<th></th>
<th></th>
</tr>
<tr class="odd">
<th><em>– Skill tags</em></th>
<th></th>
<th></th>
</tr>
<tr class="header">
<th><p><em>– Video transcript or title</em></p>
<p><em><strong>FRESHNESS BONUS (for new users after 2 months) (All users
for first two months get ‘Founding freelancer’
badge)</strong></em></p></th>
<th></th>
<th><em>5%</em></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

### **Profile Completeness Notes:** {#profile-completeness-notes .unnumbered}

- Each section is worth points (e.g. 2 pts per section, out of 10 total)

- Can be visualised as a progress bar in the gigfolio

- Also improves conversion: more complete profiles = more gig offers

### **📌 Notes for Implementation** {#notes-for-implementation .unnumbered}

- Initially, keyword matching can be handled with basic NLP
  > (bag-of-words, stemming, synonyms) or cosine similarity on
  > vectorised content.

- In later phases, use semantic embedding (e.g. OpenAI or Cohere API) to
  > compare buyer request against seller profiles/video content.

The AI agent should prioritise **clarity and fairness**, ensuring new
but verified users are not completely buried under more established
ones.

### **🧠 Additional Enhancements (Future Considerations)** {#additional-enhancements-future-considerations .unnumbered}

| **Idea**                          | **Rationale**                                                                                                                   |
|-----------------------------------|---------------------------------------------------------------------------------------------------------------------------------|
| **Diversity penalty logic**       | Prevent over-surfacing the same users. Add a light negative score if a worker has been surfaced too frequently.                 |
| **Freshness boost**               | Prioritise newly joined but fully onboarded users for 2--3 gigs to help them gain traction.                                     |
| **Earnings parity balancing**     | Elevate workers whose earnings have been disproportionately low compared to their time on platform.                             |
| **Feedback-based explainability** | Allow buyers to hover over a match to see why they were recommended (e.g. "2 miles away", "Similar wording in gigfolio").       |
| **Buyer preference learning**     | Over time, learn buyer behaviour to personalise results (e.g., if they tend to hire photographers with hospitality experience). |
| **Fair rotation**                 | Implement a "rotation queue" logic for equally ranked candidates so no one is perpetually buried.                               |

### **📦 MVP Deliverables** {#mvp-deliverables .unnumbered}

- Filter pipeline

- Weighting logic implementation (using a simple scoring algorithm or
  > matrix)

- First-generation keyword matching (token-level comparison)

- Admin-configurable weights for tuning

SVR-B03 Gig Creation & Status

**SVR-B03 -- Gig Creation & Status Management**

Manages the entire lifecycle of a job booking, providing a clear state
machine for gigs, ensuring both parties know the current status, and
enabling subsequent actions like payment or reviews.

**System Story:**

As the system,

- I need to manage the complete lifecycle of a gig from buyer booking
  > through to freelancer acceptance, completion, and potential
  > cancellation to ensure clear status tracking, trigger payments,
  > enable reviews, and provide transparency for both parties.

### **🧱 Definition of Done (DoD)** {#definition-of-done-dod-9 .unnumbered}

- A **Gig model** exists in schema.Drizzle, with fields:

  - title, description, date, startTime, endTime, location, rate

  - status (enum: PENDING, ACCEPTED, REJECTED, IN_PROGRESS, COMPLETED,
    > CANCELLED)

  - moderationStatus (enum or Boolean)

  - Foreign keys: BuyerProfile, GigWorkerProfile, linked Skills

- A createGig function (in gig.server.js) creates new gigs with:

  - Status = PENDING

  - Attached Buyer and selected Worker ID

  - Worker is notified of new offer via SVR-C02

- A updateGigStatus function handles transitions between states with
  > validation to ensure illegal transitions are blocked (e.g., can't
  > accept a COMPLETED gig)

- Each valid status change triggers **real-time notifications** to the
  > relevant party (e.g., buyer notified when offer is accepted)

- Status transitions are reflected in the UI (e.g., buttons for Mark
  > Complete, Cancel, etc.)

- Terms of agreement for gig (or contract) is veiwable and downloadable
  > from main gig view

- Track number of filled slots for mass hire gigs

- Two-sided confirmation is ideal: the gig only becomes eligible for
  > payment processing when both parties mark it as complete.

- If one party marks it as complete but the other doesn't respond within
  > a defined window (e.g. 24 hours), the platform can auto-complete the
  > gig to avoid blocking payments.

- This should be part of the gig status lifecycle in SVR-B03

### **🔁 Status Transition Rules** {#status-transition-rules .unnumbered}

| **Current Status**      | **Action**                     | **Actor**                                          | **New Status** | **Notes**                                                    |
|-------------------------|--------------------------------|----------------------------------------------------|----------------|--------------------------------------------------------------|
| PENDING                 | Accept Gig                     | Worker                                             | ACCEPTED       |                                                              |
| PENDING                 | Reject Gig                     | Worker                                             | REJECTED       |                                                              |
| ACCEPTED                | Mark as In Progress            | Worker OR Buyer                                    | IN_PROGRESS    | Optional pre-completion step                                 |
| ACCEPTED or IN_PROGRESS | Mark as Complete               | Both parties (either initiates, both must confirm) | COMPLETED      | Completion requires both parties to click 'Confirm Complete' |
| PENDING or ACCEPTED     | Cancel gig (before start time) | Buyer or Worker                                    | CANCELLED      | Limited to gigs that haven't started                         |
| COMPLETED               | ---                            | ---                                                | Final state    |                                                              |
| CANCELLED               | ---                            | ---                                                | Final state    |                                                              |

✅ Contract Generation on Offer Acceptance -- Summary

✍️ Purpose

Create a dynamic, plain-language terms of agreement document between
buyer and freelancer when a gig offer is accepted. This serves as a
lightweight contract, veiwable and downloadable (html for MVP unless
free pdf option) from the main gig view by either party

✅ Core Rules

1\. Trigger:

When a gig offer is accepted by the worker, a contract PDF is available
.

2\. Content Must Include:

- Freelancer & Buyer names

- Gig title and brief description

- Date and time of work

- Pay rate and total estimated pay

- Location

Agreed terms:

- That the freelancer is self-employed

- That Able is not a party to the work arrangement

- That both parties agree to resolve issues in good faith

- Cancellation and no-show policy reference

- Dispute resolution route via Able

- Insurance provided by Able

3\. File Format:

- HTML imor ideally PDF with a unique ID and timestamp

- Filename format: Able_Gig_Agreement\_\[gigID\].pdf

4\. Access Rules:

- Available to both buyer and freelancer via main gig view

- Button: "Download Terms of Agreement"

5\. Post-MVP (Optional Enhancements):

- Add e-signature or acceptance log (timestamps already exist)

- Add inline editing of a short clause (e.g., "Please wear black")

- Store versioned templates for legal updates

### **📘 Mass Hiring for Same Role (Basic MVP Support)** {#mass-hiring-for-same-role-basic-mvp-support .unnumbered}

🧑‍💼 User Story -- Mass Hire for Repeat Roles

As a buyer,

- I want to quickly send offers for the same role to multiple top-ranked
  > candidates,

- So that I can fill multiple identical shifts or roles in one action,
  > without repeating the booking process

✅ Acceptance Criteria (MVP)

- Buyer selects:

  - Role

  - Number of hires needed (e.g., "I need 3 bartenders")

  - Date, time, location, and pay (same as usual)

- System uses existing ranking logic (SVR-B02) to:

- Surface the top N available matches

- Allow buyer to:

- Select the number of candidates to send offers to immediately

- OR use Hybrid Mode ("Auto-assign next when declined")

- Offers are sent in parallel or sequence, with live updates in the
  > dashboard showing:

  - Pending

  - Accepted

  - Declined

  - Slots filled / still open

- Once the number of accepted offers = hires needed, no more offers are
  > sent.

- Buyer is notified when the request is fully filled.

🧑‍💻 **Developer Story -- SVR-B03-DEV05: Multi-Hire Flow (MVP)**

- Modify createGigOffer() to accept a numberOfHires parameter.

- Query matching candidates via ranking engine (SVR-B02), limit = 5--10
  > depending on role.

- Send initial offers to top numberOfHires candidates OR fewer depending
  > on buyer setting.

- When an offer is accepted:

  - Create an instance of the gig with that worker attached.

- Once total filled = requested:

  - Mark booking as complete.

  - Cancel outstanding offers if buyer prefers (configurable)

###  {#section-36 .unnumbered}

###  {#section-37 .unnumbered}

### **🧩 Clarifications** {#clarifications .unnumbered}

**1. Is IN_PROGRESS needed?**

Yes. It adds clarity, especially for longer gigs. Its linked to AMEND.
Triggered by manual action.

**2. How is completion confirmed?**

MVP logic:

- Either party can mark gig as **"Gig complete"  
  > **

- Once **both** mark the gig as complete, status transitions to
  > COMPLETED and payment and feedback processes are triggered (SVR-B04)

- Notifications are sent to the other party prompting them to confirm

**3. Who can cancel, and when?**

- Cancellable if status is PENDING or ACCEPTED and **start time hasn't
  > passed  
  > **

- Either buyer or freelancer can initiate cancellation

- UI should indicate any penalties if applicable (future enhancement)

SVR-B04 Payment Processing Trigger

## **📘 SVR-B04 -- Post-Gig Payment Flow & Confirmation** {#svr-b04-post-gig-payment-flow-confirmation .unnumbered}

Automates the financial aspect of the booking, creating necessary
payment records and seamlessly integrating with the external payment
processor (Stripe) to handle the actual transaction securely.

### **User Story: Buyer Completes Gig & Triggers Payment** {#user-story-buyer-completes-gig-triggers-payment .unnumbered}

**As a** buyer,

- **I want** to confirm that the gig is complete,

- **So that** I can review the experience and release payment to the
  > freelancer.

![](media/image14.png){width="2.9555479002624674in"
height="6.557292213473316in"}![](media/image23.png){width="2.9218755468066493in"
height="6.59375in"}

### **💬 Acceptance Criteria** {#acceptance-criteria-16 .unnumbered}

1.  **Completion Trigger:  
    > **

    - After the freelancer taps **"Mark as complete"**, the buyer is
      > notified via the gig screen and email/SMS prompt:  
      >   
      > "Your worker has completed the gig -- please confirm and release
      > payment."

2.  **Buyer Confirmation:  
    > **

    - The buyer visits the gig detail page (WEB-B04).

    - Buyer reviews gig summary and can:

      - Agree with hours & mark gig as complete

      - Add notes or expenses (optional)

      - Choose to adjust end time or add a tip

      - Give feedback

      - Award badges

3.  **Final Payment Screen:  
    > **

    - Shows:

      - Total pay due to freelancer

      - Able fee + VAT (waived if launch promo active - Fee breakdown
        > must check promo (2FREEAble) and zero out Able fee if required
        > (see SVR-PROMO01))

      - Stripe fee

      - Any tip added (no Able fee on Tips)

      - Final total

    - Buyer clicks **"End gig, release payment"  
      > **

    - Stripe Checkout is triggered

    - Payment status is updated from PENDING to PAID

4.  **Feedback Prompt (Optional but encouraged):  
    > **

    - Buyer is asked:

      - "Would you work with this freelancer again?"

      - "Would you like to award them?" (Badges: Team Player, Service
        > Virtuoso, etc.)

      - Review/comments for worker recognition

5.  **Post-Payment State:  
    > **

    - Gig is marked as COMPLETE

    - Receipt is generated

    - Payment record updated with Stripe confirmation ID

    - Both parties receive confirmation

**Definition of Done (DoD):**

- The Payment model exists in schema.Drizzle linked to Gig, User
  > (payer), and User (receiver), with amount, status (enum),
  > stripeSessionId (nullable).

- Backend logic (likely within the booking confirmation step after
  > WEB-B03) automatically creates a Payment record with PENDING status
  > and the correct amount (calculated from gig rate/hours, plus fees).

- A server-side function (e.g., createStripeCheckoutSession in
  > payment.server.js) exists, taking a paymentId.

- This function interacts with the Stripe API to create a Checkout
  > Session, passing necessary details (amount, currency, success/cancel
  > URLs, metadata including paymentId).

- The function updates the Payment record with the generated
  > stripeSessionId.

- The function returns the Stripe session ID and checkout URL to the
  > frontend.

- A Stripe webhook endpoint is set up (Post-MVP, but essential for
  > robust production) to listen for checkout.session.completed events
  > and reliably update payment status via handleSuccessfulPayment.

- The /payment/success route loader calls handleSuccessfulPayment (as a
  > fallback or primary method if webhooks aren\'t MVP).

- Stripe will handle the Able fee and the payment to the freelancer.

###  {#section-38 .unnumbered}

###  {#section-39 .unnumbered}

###  {#section-40 .unnumbered}

### **🧠 Developer Notes** {#developer-notes-9 .unnumbered}

### Fee breakdown must check promo (2FREEAble) and zero out Able fee if required (see SVR-PROMO01)

- Stripe Checkout is created after **buyer confirms completion**, not
  > before

- Feedback is stored in a Feedback object and tied to the worker's
  > profile (SVR-S01)

- Status flow for gig:

  - CREATED → ACCEPTED → IN_PROGRESS → MARKED_COMPLETE → BUYER_CONFIRMED
    > → PAID → COMPLETE

**Stripe Connect Standard** integration, with split payments between
Able and freelancers. Here's the full development story for **Stripe
disbursement logic** (SVR-B04) and a supporting update to the gig worker
onboarding flow.

## **📘Stripe Payment & Split Disbursement Flow** {#stripe-payment-split-disbursement-flow .unnumbered}

### **Developer Story: Handle Stripe Payments + Disbursements (Gig + Tip Split)** {#developer-story-handle-stripe-payments-disbursements-gig-tip-split .unnumbered}

**As a** platform,

- **I want** to collect the platform fee and disburse freelancer wages +
  > tips correctly via Stripe,

- **So that** payment is secure, compliant, and automated.

### **💸 Payment Flow: What Happens on "End gig, release payment"** {#payment-flow-what-happens-on-end-gig-release-payment .unnumbered}

1.  **Create Stripe Checkout Session (post-gig):  
    > **

    - Collect:

      - **Worker pay** (rate × hours)

      - **Tips** (if added)

      - **Able platform fee** (6.5%) + VAT (20%)  
        >   
        > → Effective fee = **7.8%** of gig pay (Fee breakdown must
        > check promo (2FREEAble) and zero out Able fee if required (see
        > SVR-PROMO01))

    - Tips are **excluded from the platform fee  
      > **

2.  **Use Stripe Connect Split Payment Logic:  
    > **

    - Use **destination charges**:

      - Total payment goes to Able's Stripe account

      - Stripe splits earnings automatically:

        - Able receives the **platform fee  
          > **

        - Freelancer receives **gig pay + tip** via **Connect transfer  
          > **

3.  **Amounts:  
    > **

### **💷 Stripe Split Payment Breakdown** {#stripe-split-payment-breakdown .unnumbered}

**Example: £100 gig pay + £10 tip**

| **Component**           | **Recipient**   | **Calculation**                       | **Amount (£)** |
|-------------------------|-----------------|---------------------------------------|----------------|
| **Worker pay**          | Freelancer      | £100.00                               | £100.00        |
| **Tip**                 | Freelancer      | £10.00                                | £10.00         |
| **Able platform fee**   | Able            | £6.50 (6.5% of £100)                  | £6.50          |
| **VAT on Able fee**     | HMRC (via Able) | £1.30 (20% of £6.50)                  | £1.30          |
| **Stripe fee**          | Stripe          | £1.77 (1.5% of total charge to buyer) | £1.77          |
| **Total paid by buyer** | Stripe Checkout | £100 + £10 + £6.50 + £1.30 + £1.77    | **£119.57**    |

### **🔁 Final Disbursements** {#final-disbursements .unnumbered}

- **Freelancer receives:** **£110.00  
  > **

- **Able receives:** **£6.50** (plus £1.30 VAT remitted)

- **Stripe takes:** **£1.77  
  > **

- **Buyer pays total:** **£119.57  
  > **

### **🧾 Stripe Implementation Checklist:** {#stripe-implementation-checklist .unnumbered}

- Enable **Stripe Connect Standard  
  > **

- On freelancer onboarding, require:

  - Stripe onboarding form completion

  - Identity verification

  - UK bank account (or relevant region)

- On gig completion:

  - Create a Checkout Session for the buyer

  - Attach platform fee using application_fee_amount

  - Transfer earnings to freelancer via transfer_data\[destination\] =
    > freelancer_stripe_account_id

- Track disbursements in your database for audit

### **💡 Fallback for Freelancers Without Stripe Setup** {#fallback-for-freelancers-without-stripe-setup .unnumbered}

- Show: *"Before you can be paid, connect your Stripe account."  
  > *

- Block payment release if no connected account exists

- Add email reminder + dashboard banner until complete

SVR-B05 Invoice Generation

## **System Story: SVR-B05 -- Invoice Generation** {#system-story-svr-b05-invoice-generation .unnumbered}

Provides essential financial documentation for buyers (and potentially
workers), necessary for accounting, tax reporting, and record-keeping.

**As the system**,

- I need to generate invoice documents for completed and paid gigs,

- **so that** buyers (and potentially workers) can use them for
  > record-keeping, accounting, and tax purposes.

### **📌 MVP Definition of Done** {#mvp-definition-of-done .unnumbered}

- A server-side function (e.g. generateInvoiceData in payment.server.js)
  > exists.

- It accepts a paymentId for a **COMPLETED** gig.

- It retrieves:

  - Buyer details

  - Worker details

  - Gig details

  - Itemised breakdown (e.g., hours × rate, Able fee, VAT, Stripe fee if
    > displayed)

- Returns this as **structured JSON**.

- In DSH-B05 ("Payments") dashboard, a **"Download Invoice"** button
  > appears for completed payments.

- Clicking it either:

  - Displays this structured data in HTML, or

  - Links to a basic template.

### **🧾 Post-MVP Enhancements** {#post-mvp-enhancements .unnumbered}

- Use a PDF library (pdfkit, puppeteer) to generate actual invoice PDFs.

- Store PDF (e.g. in S3 bucket), with invoiceUrl stored in the Payment
  > model.

- Button now links directly to the PDF download.

### **❓ Questions & Clarifications** {#questions-clarifications .unnumbered}

<table>
<colgroup>
<col style="width: 18%" />
<col style="width: 81%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Question</strong></th>
<th><strong>Current Guidance</strong></th>
</tr>
<tr class="odd">
<th><strong>What must be on the invoice?</strong></th>
<th><p>Your MVP should include:- Able’s legal entity name, address, and
VAT number- Buyer’s billing name (or company)- Gig details
(date/time/role)- Pay, Tip (if added), Able fee + VAT, Stripe fee
(optional), Total- Invoice number (e.g., ABLE-2025-000231)</p>
<p>MOCKUP:</p>
<p>https://drive.google.com/file/d/1W_9faFiB_iPj-Ryg9PP8vszBYiQjNALA/view?usp=sharing</p></th>
</tr>
<tr class="header">
<th><strong>Format required?</strong></th>
<th>JSON now, <strong>PDF essential Post-MVP</strong></th>
</tr>
<tr class="odd">
<th><strong>Where to store PDF?</strong></th>
<th>Use AWS S3 or similar and save invoiceUrl in the DB</th>
</tr>
</thead>
<tbody>
</tbody>
</table>

SVR-B06 Team Member Logic

Enables collaboration for business accounts, allowing multiple employees
to use the platform under one billing entity, while potentially
controlling their actions based on assigned roles.

### **System Story** {#system-story-1 .unnumbered}

As a system, I need to allow buyers to add and manage team members under
a shared BuyerProfile, so that companies can collaborate on hiring and
payments.

### **🧩 Definition of Done (DoD)** {#definition-of-done-dod-10 .unnumbered}

**MVP**

- A TeamMember model is added to the database schema (e.g., drizzle
  > schema), with fields: name, email, role, and linked to a
  > BuyerProfile.

- Server-side functions must:

  - Add a team member to a BuyerProfile (if they don't have an Able
    > account, send them an invite link to register).

  - Remove or deactivate a team member.

  - List team members for a given profile.

- All team members initially have **equal access** under the buyer
  > account (no role distinctions yet).

**Post-MVP**

- Introduce role-based permissions with an enum like ADMIN, HIRER,
  > VIEWER.

- Enforce permission checks on server-side actions:

  - Only ADMIN can manage payments and team.

  - HIRER can view and initiate bookings.

  - VIEWER can view gigs but not initiate.

###  {#section-41 .unnumbered}

###  **Security/Validation** {#securityvalidation .unnumbered}

- Validate ownership: Only the primary BuyerProfile owner (or an ADMIN)
  > can add or remove members.

- All users with access must log in using their own Able account (email
  > invite flow can create a user and link them to the buyer).

### **📌 Questions & Clarifications** {#questions-clarifications-1 .unnumbered}

| **Question**                                  | **Clarification**                                                                                     |
|-----------------------------------------------|-------------------------------------------------------------------------------------------------------|
| How are team members added?                   | Initially via email invite. Clicking the invite allows them to register and link to the BuyerProfile. |
| Do team members need an AbleAI user account?  | Yes -- more robust and secure than using just a TeamMember record.                                    |
| What permissions are needed?                  | MVP: Same access. Post-MVP: Role-based (ADMIN, HIRER, VIEWER).                                        |
| Can team members hire or pay?                 | MVP: Yes, all can. Post-MVP: Only those with permission.                                              |
| Can a BuyerProfile have multiple admins?      | Yes, optional field for owner/admin control logic.                                                    |
| Should admins be able to assign/change roles? | Post-MVP only, to simplify initial development.                                                       |

###  {#section-42 .unnumbered}

###  {#section-43 .unnumbered}

### **🧪 Suggested Developer Tasks** {#suggested-developer-tasks .unnumbered}

| **Task**                          | **Notes**                                                                       |
|-----------------------------------|---------------------------------------------------------------------------------|
| Define TeamMember model in schema | Link to BuyerProfile, fields: name, email, role.                                |
| Add invite flow                   | Invite team members via email. If no account exists, allow creation with token. |
| Team listing endpoint             | GET /api/team-members?buyerId=\...                                              |
| Add/remove endpoints              | POST /api/team-members, DELETE /api/team-members/:id                            |
| (Post-MVP) Add permission checks  | Wrap booking and payment functions in role-check middleware.                    |

SVR-PROMO01 -- Launch Promo Code Handling

incorporate your **"2FREEABLE" launch promo code** into the product.

## **✅ USER & DEV STORY FOR LAUNCH PROMO CODE** {#user-dev-story-for-launch-promo-code .unnumbered}

### **📘**  {#section-44 .unnumbered}

### **SVR-PROMO01 -- Launch Promo Code Handling** {#svr-promo01-launch-promo-code-handling .unnumbered}

#### **🧑‍💼 User Story -- Launch Fee Waiver** {#user-story-launch-fee-waiver .unnumbered}

**As a new buyer,**

I want to redeem the promo code **2FREEABLE** when I sign up or book my
first gig,

So that I pay zero Able fees for the first two months of using the
platform.

### **✅ Definition of Done (DoD)** {#definition-of-done-dod-11 .unnumbered}

- Promo code logic is implemented in backend logic for gig fee
  > calculation (SVR-B04).

- Code 2FREEABLE grants **zero Able fees** for the **first 2 months**
  > after buyer registration.

- Buyer record stores:

  - promoCode: string (nullable)

  - promoActivatedAt: DateTime (nullable)

- Fee calculation logic in SVR-B04:

  - If promoCode = 2FREEABLE and now \< promoActivatedAt + 60 days, Able
    > fee = £0.

  - VAT and Stripe fees still apply (unless overridden for some reason).

- Code can only be redeemed **once per buyer** (enforced via DB
  > constraint or logic).

- Gig payment summary (WEB-B04 and DSH-B05) displays "Promo Applied: No
  > Able Fees for 2 Months" where applicable.

### **🧠 Developer Notes** {#developer-notes-10 .unnumbered}

- Store and check promo usage in the Buyer or User table.

- Backend applies fee waiver only to **Able fee (6.5%)**, not Stripe.

- (Optional Post-MVP): Add analytics dashboard to track promo usage.

- (Optional Post-MVP): Allow future codes via a PromoCode model.

##  {#section-45 .unnumbered}

📲 Cross-Cutting Features

Implement features that are accessible to both user types or support
core functionality.

**MVP vs. Post-MVP:**

- **MVP:**

  - Basic Settings screen (WEB-C01) for changing name/password.

  - Core review submission/storage (SVR-C05) - moderation can be manual
    > DB check initially.

  - Basic notification system (SVR-C02) for critical events (e.g., new
    > offer, gig accepted) via DB flags.

  - Define API Contract v1 (SVR-C01).

  - Full Chat implementation (WEB-C02, SVR-C04).

- **Post-MVP:**

  - Full WebSocket implementation for real-time notifications (WEB-C03,
    > SVR-C03).

  - Link to secondary dashboard profile editor (DSH-C01).

  - Configurable notification preferences in Settings.

  - Profile privacy settings.

  - Full API documentation and potential enforcement.

## MVP {#mvp-2 .unnumbered}

Needed:

- no deep linking on notifications

- no moderation in chats

Desirables:

- changing password is not verified by email

- 

## **🔀 Cross-Cutting Features** {#cross-cutting-features .unnumbered}

**Shared functionality across all user types or core to the platform
experience.**

### **✅**  {#section-46 .unnumbered}

### **MVP Functionality (Updated)** {#mvp-functionality-updated .unnumbered}

1.  **Basic Settings Screen** (WEB-C01)

    - Users can:

      - Update name, email, and password

      - Switch roles (Freelancer ↔ Buyer)

    - Initial interface is minimal, with no avatar or language
      > preference features yet.

2.  **Core Feedback & Review System** (SVR-C05)

    - Two feedback sources:

      - **Able-gig reviews** (from completed gigs):

        - "Would you work with this person again?" + optional badge or
          > comment

        - User can choose to **make this public or keep private  
          > **

      - **External recommendations (WEB-S10):  
        > **

        - Public by default; buyer-facing

    - Reviews are stored and used in ranking and gigfolio display.

3.  **Basic Notification System** (SVR-C02)

    - Notifications for:

      - New offer received

      - Offer accepted/rejected

      - Gig amended

      - Gig marked complete

      - Gig paid

      - New message (chat)

      - Admin or AI prompt for profile completion

    - Delivered via dashboard alerts and email (push optional).

    - DB flags are used for status and dismissibility; no real-time yet.

4.  **API Contract v1** (SVR-C01)

    - Internal API spec defined for all MVP flows

    - Shared as internal reference; full docs enforced Post-MVP

5.  **Scoped Chat (per Gig only)** (WEB-C02, SVR-C04)

    - Chat threads only exist **after an offer is sent  
      > **

    - Tied to a single gig (e.g., /chat/gig/abc123)

    - No full inbox navigation or universal messaging view yet

6.  **Video Bios Are Public for AI Matching  
    > **

    - All freelancers must upload a short, public video bio

    - AI uses the transcript + tags + summary to assist with matching

    - A still image from the video is used as the profile picture

### **❓What Does "No Full Inbox View" Mean?** {#what-does-no-full-inbox-view-mean .unnumbered}

In MVP:

- There's **no unified message inbox** like a Gmail-style view.

- Users **cannot browse all messages across gigs in one place**.

- Instead, chat is only accessible via the **gig detail view** (e.g.,
  > Buyer clicks into Gig A → sees chat for Gig A only).

Post-MVP:

You can offer a full inbox where:

- All conversations are listed (with timestamps, worker names, etc.)

- Messages can be searched, filtered, and previewed

- Group or multi-gig threads could be supported

Would you like me to now revise the Post-MVP section accordingly?

## Post-MVP {#post-mvp-1 .unnumbered}

**Needed:**

- What are the requirements for chat history retention?

- What specific events require real-time WebSocket notifications vs.
  > just email/DB updates?

- Will chat include file/image sharing?

- Rules to implement effective moderation could lead to abuse **  
  > **

**Desirables:**

- What specific settings need to be configurable by users
  > (notifications, profile privacy)?

- Ways to avoid Annoying users with too many or irrelevant notifications

- Define what AI models to use for chat and review

- How will it work Receiving notifications while offline (should appear
  > on next login?)

### **📋 Cross-Cutting Features -- Post-MVP Q&A Summary** {#cross-cutting-features-post-mvp-qa-summary .unnumbered}

| **🔍 Question**                    | **💡 Answer / Approach**                                                                                                                                                                                 |
|------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Chat History Retention**         | Store chats indefinitely by default. Admins can archive or delete for GDPR. Archive older messages after 12 months.                                                                                      |
| **Real-Time WebSocket Events**     | Use WebSockets for:• New chat messages• Offer updates• Gig amendments/completions• Payment confirmation Use email/DB flags for:• AI nudges• Admin messages                                               |
| **Chat File Sharing**              | Allow image and PDF sharing only. Max 5MB. Stored in S3. No unrestricted file types.                                                                                                                     |
| **Moderation Rules**               | Post-MVP: Add flag button per message. Auto-flag profanity or abuse. Store flags with message + gig context. Use OpenAI moderation API or regex keywords. Can be raised vie 'report an issue' otherwise. |
| **Configurable Settings**          | Let users toggle notifications (chat, offers, payments). Let freelancers show/hide name, badge visibility, and review privacy.                                                                           |
| **Notification Fatigue Avoidance** | Suppress duplicates, group low-priority events into digests, allow per-thread mute. AI can detect overload and prompt setting changes.                                                                   |
| **AI Models for Chat/Review**      | Use OpenAI GPT-4-turbo for hiring/chat triage. Use embeddings/summarisation for review keyword extraction. Feed into ranking logic.                                                                      |
| **Offline Notification Behaviour** | All events appear in-app as unseen notifications on next login. Use email fallbacks. Store logs with seen/unseen flag. Re-send on reconnect.                                                             |

WEB-C01 Settings Screen

### **📘 WEB-C01 -- Settings Screen** {#web-c01-settings-screen .unnumbered}

Provides a centralized location within the primary webapp for users to
manage essential account configurations and preferences, and acts as the
gateway to more advanced features in the secondary dashboard.

#### **✅ User Story:** {#user-story-13 .unnumbered}

As an authenticated user in the webapp,

I want a Settings screen to manage my basic account info (name, email,
password),

So I can control my profile, change credentials, manage payments, and
access key dashboards.

![](media/image17.png){width="2.9166666666666665in" height="6.21875in"}

#### **✅ Definition of Done (DoD):** {#definition-of-done-dod-12 .unnumbered}

- A "Settings" screen is accessible via the main app interface (likely
  > via the header/profile icon).

- Displays:

  - Current **Name** and **Email**, with editable fields.

  - **Change Password** function.

  - **Logout** button with redirect to login.

  - Link to **Full Dashboard** (DSH-B01).

- Post-MVP:

  - Notification Preferences (checkboxes for types: offer received, chat
    > message, gig amended, payment confirmed, platform prompt).

  - Profile Privacy settings (public/private for reviews, role toggle
    > visibility).

    - *Download my data  
      > *

    - *Delete my account* (soft-delete)

    - Toggle marketing emails / push.

  - Payment Settings (Buyer: Stripe customer portal, Worker: Stripe
    > Connect onboarding).

- Saving updates writes to database.

#### **🧠 Questions & Clarifications** {#questions-clarifications-2 .unnumbered}

| **Question**                              | **MVP Answer**                               | **Post-MVP Plan**                                    |
|-------------------------------------------|----------------------------------------------|------------------------------------------------------|
| What settings are MVP?                    | Name, Email, Password change, Dashboard Link | All other sections                                   |
| Notification Preferences -- How granular? | N/A for MVP                                  | Toggle per category (offers, chat, payment, prompts) |
| Will role-switching be accessible here?   | Role toggle may live in header               | Yes, persistent toggle stored in profile             |
| Where is logout located?                  | Within Settings or header dropdown           | Same                                                 |

How is payment/payout method management handled? Direct integration or
linking out to Stripe? (Linking out is simpler for MVP).

###  {#section-47 .unnumbered}

### **🧾 For Buyers** {#for-buyers .unnumbered}

- **No need to "go to Stripe" or have a Stripe account.  
  > **

- The buyer simply pays via **Stripe Checkout**, linked in the Able
  > webapp.

- They can use:

  - Debit/credit card

  - Apple/Google Pay

  - Saved wallet (Stripe handles this invisibly)

- Stripe manages the card processing, but the buyer never sees a Stripe
  > dashboard.

✅ So: **Buyers never need to visit Stripe directly** --- just interact
with Stripe Checkout at payment time.

### **💼 For Freelancers (Gig Workers)** {#for-freelancers-gig-workers .unnumbered}

- **Yes**, they **do need to onboard with Stripe Connect**.

- This is required so Able can disburse earnings securely and legally.

- Stripe handles:

  - Identity verification (kyc, anti-fraud)

  - Bank account collection

  - Tax obligations (if needed)

- Able only triggers payouts to connected accounts.

✅ So: **Freelancers must complete Stripe Connect onboarding**, but
**buyers don't**.

### **🧠 For the Settings Page (WEB-C01), this means:** {#for-the-settings-page-web-c01-this-means .unnumbered}

| **User Type** | **Stripe Integration**       | **Placement in Settings**                                                                               |
|---------------|------------------------------|---------------------------------------------------------------------------------------------------------|
| **Buyer**     | ❌ None required             | No payment settings needed here                                                                         |
| **Freelancr** | ✅ Stripe Connect onboarding | Include a section in settings: "Connect your bank to get paid" (links to Stripe Connect onboarding URL) |

WEB-C01.1-Stripe Connect -- Freelancer Settings

### **🧾 Stripe Connect Section -- Freelancer Settings (WEB-C01)** {#stripe-connect-section-freelancer-settings-web-c01 .unnumbered}

#### **🧑‍💻 User Story:** {#user-story-14 .unnumbered}

As a freelancer,

I want to connect my bank account securely via Stripe,

So that I can receive payments directly after completing gigs.

### **✅ Placement** {#placement .unnumbered}

- Shown **only if user role = freelancer  
  > **

- Displayed within the **Settings** page under a section titled:  
  >   
  > **💸 Get Paid with Stripe  
  > **

### **🧩 Components** {#components .unnumbered}

1.  **Heading:  
    >   
    > ** 💸 Get Paid with Stripe

2.  **Content:  
    >   
    > ** *"To receive payments from completed gigs, you must connect
    > your bank account through our payment provider, Stripe. This is
    > secure, free, and only takes a minute."  
    > *

3.  **Button:  
    > **

    - Text: Connect My Bank Account

    - On click: Redirect to stripeConnectLink (generated via backend per
      > user)

4.  **Status Logic:  
    > **

    - If user is already connected:

      - Show ✅ "Bank account connected"

      - Optionally: View or update details → link to Stripe Connect
        > dashboard

    - If not connected:

      - Show ⚠️ "Not connected" with the call to action button

      - Add warning if trying to withdraw or complete gigs:  
        >   
        > *"Before you can receive payment, you must connect your
        > bank."  
        > *

### **🔐 Backend Notes** {#backend-notes .unnumbered}

- Stripe Connect account must be created via API (accountLink flow)

- Store stripeAccountId in user table

- Validate status before gig completion or payout initiation

![](media/image9.png){width="3.151042213473316in"
height="4.709056211723534in"}

WEB-C02 Chat Interface

### **📘 WEB-C02 -- Chat Interface** {#web-c02-chat-interface .unnumbered}

Enables direct communication between buyers and workers for coordination
and clarification

regarding specific gigs, and provides a potential interface for AI
assistance, improving collaboration and reducing misunderstandings.

**User Story:**

As a user (Buyer or Worker) in the Able web app,

- I want a clean and responsive chat interface to communicate with other
  > users and Able AI,

- So that I can coordinate gigs, ask questions, or receive AI assistance
  > quickly and clearly.

![](media/image29.png){width="3.4546839457567806in"
height="5.5031889763779525in"}

###  {#section-48 .unnumbered}

### **✅ Definition of Done (DoD):** {#definition-of-done-dod-13 .unnumbered}

- A dedicated ChatScreen.jsx component exists in the webapp.

- Displays chat messages chronologically with:

  - **Current user's messages**: right-aligned, primary color.

  - **Other user's messages**: left-aligned, neutral color.

  - **Able AI messages**: distinct format using ChatBotMessage or
    > similar.

- Chat UI includes:

  - Text input field.

  - "Send" button.

- Chat messages are saved to the database (SVR-C04) with gig and user
  > context.

- Reloading shows previous messages.

- **(Post-MVP)** WebSocket support for real-time updates (via WEB-C03,
  > SVR-C03).

- Fully mobile responsive.

- Accessible from:

  - Gig detail screen.

  - Dashboard overview (optional).

  - Notifications (e.g., "New Message").

### **💬 Clarifications & Decisions** {#clarifications-decisions .unnumbered}

| **Question**                                 | **Resolution**                                                                                                             |
|----------------------------------------------|----------------------------------------------------------------------------------------------------------------------------|
| **Should MVP chat support more than text?**  | ❌ No -- Text only for MVP. Emojis, images, file sharing are Post-MVP.                                                     |
| **How are conversations initiated?**         | ✅ From the **Gig Detail Page** only. Each chat is tied to a gig.                                                          |
| **Do we need a general AI chat?**            | ✅Yes. new story below                                                                                                     |
| **Can users chat before booking/accepting?** | ✅ Yes, pre-booking chat is allowed for transparency, but AI and ToS remind users not to take conversations off-platform.  |
| **Where is chat accessed post-booking?**     | ✅ From the Gig History and Dashboard.                                                                                     |
| **Can users report chats?**                  | 🟡 Post-MVP. Chat logs stored with moderation flag (SVR-C04). Abuse reports via Issue reporting routed to admin dashboard. |

### **🧠 Suggested Additions** {#suggested-additions .unnumbered}

- **Spam/Abuse Prevention (Post-MVP)**:  
  >   
  > Implement simple AI flagging for phrases like "cash in hand",
  > "WhatsApp me", or repeated contact info.

- **Moderation Reminder**:  
  >   
  > Periodic AI assistant prompt: *"Remember -- keep it safe. All gig
  > payments and reviews must stay on Able."  
  > *

##  {#section-49 .unnumbered}

## **🧑‍💻 WEB-C02-DEV02 -- General AI Assistant Chat** {#web-c02-dev02-general-ai-assistant-chat .unnumbered}

**Purpose:** Implement Persistent General-Purpose AI Chat Interface.
Enable users to interact with the Able AI Assistant for help,
onboarding, and gig support, via a persistent, system-wide chat
interface.

**User Story**

### **As a user** {#as-a-user .unnumbered}

- I want to chat with the Able AI Assistant from anywhere in the
  > platform,

- So that I can get instant help with hiring, gig setup, profile
  > updates, and common issues.

### **✅ Acceptance Criteria:** {#acceptance-criteria-17 .unnumbered}

| **Feature**                | **Requirement**                                                                                                      |
|----------------------------|----------------------------------------------------------------------------------------------------------------------|
| **Persistent Chat Access** | A floating icon or nav menu link opens the AI assistant chat from any page                                           |
| **AI Thread**              | One continuous thread per user, stored in DB (type: \"ai\")                                                          |
| **Chat UI**                | Same layout as gig chat, but clearly marked as "Able Assistant"                                                      |
| **AI Model Integration**   | Uses GPT-4-turbo via Portkey or OpenAI with user context passed as system prompt                                     |
| **Supported Prompts**      | Hiring help, profile guidance, gig rules, getting paid, reporting issues, etc.                                       |
| **Escalation Trigger**     | If user expresses confusion, distress, or dissatisfaction OR types "talk to support" → flag needs_human = true in DB |
| **Security**               | AI cannot access sensitive user data (e.g. payment history), only metadata: name, role, status flags                 |
| **Rate Limit**             | Soft limit of 10 messages per hour (configurable)                                                                    |
| **Storage**                | Messages saved in ChatLog table with metadata: \`{ sender, timestamp, type: "ai"                                     |

**Definition of Done (DOD)  
**

- Chat UI contains **two types of threads**:

  - **Gig-specific threads** between freelancer and buyer (same as
    > before)

  - **AI chat thread** (persistent thread with Able Assistant)

- AI assistant can respond to:

  - "How do I hire someone?"

  - "What's my gigfolio score?"

  - "How do I get more badges?"

  - "I need to report someone."

  - "Do I have the right to work in the UK?"

- Assistant will:

  - Summarise policies

  - Guide to pages (e.g. "Go to your profile settings here")

  - Pass to human support if necessary (via flag)

  - Trigger key flows (e.g. link to Stripe setup if user says "How do I
    > get paid?")

- Assistant is powered by GPT-4-turbo (via OpenAI or Portkey) and
  > includes:

  - Current user context (e.g. name, role, account status)

  - Flags for escalation ("agent needed")

### **💬 Questions & Clarifications** {#questions-clarifications-3 .unnumbered}

| **Topic**                             | **Update**                                                           |
|---------------------------------------|----------------------------------------------------------------------|
| **General AI access?**                | ✅ Yes. Visible in global navigation as "Chat with Able Assistant"   |
| **Tech used?**                        | GPT-4-turbo via Portkey or OpenAI API                                |
| **Is it separate from gig chat?**     | ✅ Yes. One dedicated AI thread, accessible from header or dashboard |
| **Does AI know user context?**        | ✅ Yes. Able ID, role, basic profile, and onboarding status          |
| **Can it escalate to human support?** | ✅ Yes. Flag route if confidence is low or user persists             |
| **How is data stored?**               | Messages saved with timestamp and context (\`type: ai                |

###  {#section-50 .unnumbered}

###  {#section-51 .unnumbered}

###  {#section-52 .unnumbered}

###  {#section-53 .unnumbered}

###  {#section-54 .unnumbered}

###  {#section-55 .unnumbered}

### **⚙️ Tech Requirements** {#tech-requirements .unnumbered}

| **Area**                | **Details**                                                                                                             |
|-------------------------|-------------------------------------------------------------------------------------------------------------------------|
| **Frontend**            | AssistantChat.jsx component with loading state, retry, and markdown rendering                                           |
| **Backend**             | API route /api/chat/assistant handles prompt, adds context, sends to GPT                                                |
| **Context Prompt**      | Inject: user name, role (buyer/worker), profile setup status, and flags (Stripe connected, RTW status)                  |
| **Escalation Handling** | Save needs_human flag for admin dashboard                                                                               |
| **Optional (Post-MVP)** | WebSocket update if assistant has a new message, or push assistant tips contextually (e.g. when on profile edit screen) |

WEB-C03 Notifications - Real-time

### **📘 WEB-C03 -- Real-Time Notifications (via WebSockets)** {#web-c03-real-time-notifications-via-websockets .unnumbered}

Provides immediate feedback and awareness of critical platform events,
enabling users to respond quickly to offers, messages, or status
updates, improving efficiency and engagement. (Post-MVP candidate due to
complexity).

**User Story**

*As a user in the webapp,*

- *I want to receive real-time, in-app notifications for important
  > events (e.g. new offers, gig acceptance, messages),*

- *So that I can respond quickly and stay updated without needing to
  > refresh the app manually.*

![](media/image28.png){width="3.074475065616798in"
height="5.9131003937007875in"}

### **✅ Definition of Done (DoD)** {#definition-of-done-dod-14 .unnumbered}

- WebSocket connection is established on login or app load.

- WebSocket client listens for key events:

  - new_offer

  - gig_accepted

  - new_message

  - gig_amended

  - payment_received

  - review_requested

- When an event is received:

  - A non-intrusive toast appears (auto-dismiss or tappable).

  - Badge icon updates in header (e.g. bell icon).

  - Clicking notification redirects user to appropriate screen.

- WebSocket reconnect logic in place if dropped.

- Notifications stored in DB for read state and backup.

### **🔔 Events Requiring Real-Time Notifications** {#events-requiring-real-time-notifications .unnumbered}

**Critical for MVP**

- New gig offer

- New message (especially if offer is pending)

- Gig status change (e.g. accepted, declined, amended)

- Payment marked complete

**Post-MVP**

- Badge awarded

- Feedback submitted

- Team member actions (if applicable)

### **🎨 Notification UI Recommendations** {#notification-ui-recommendations .unnumbered}

| **Element**      | **Type**    | **Placement**          | **Example**               |
|------------------|-------------|------------------------|---------------------------|
| Toast            | Popup       | Bottom-center or top   | "New gig offer from Lisa" |
| Badge            | Icon bubble | Header nav (bell icon) | Red dot or count (3)      |
| Inbox (Post-MVP) | Full page   | Sidebar or profile tab | List of all notifications |

**Read State:**

- Store read: true/false on each notification in the DB.

- Tapping the notification marks it as read.

- Badges clear on page visit.

### **💬 Questions Answered** {#questions-answered .unnumbered}

**Q: What's the difference between real-time vs. DB updates vs. email?**

- Real-time is used for *time-sensitive user actions* (offers/messages).

- Email or DB is suitable for *summary events* (receipts, reviews).

**Q: Where should the notification appear?**

- Use **toast popups** for immediate awareness.

- Use **header badge** for persistent tracking.

- Add a **notification tab/inbox** post-MVP.

**Q: What happens while offline?**

- Notifications are stored in DB.

- On login, the badge shows unread count.

- Older notifications can be viewed via inbox view (post-MVP).

### **🧠 Developer Notes** {#developer-notes-11 .unnumbered}

- Integrates with SVR-C03 (WebSocket server).

- Events triggered by SVR-C02 notification logic.

- Uses socket.io for real-time push.

- MVP can omit deep linking and inbox.

DSH-C01 Detailed Profile Editing

### **📘 DSH-C01 -- Detailed Profile Editing (Buyer + Worker Dashboards)** {#dsh-c01-detailed-profile-editing-buyer-worker-dashboards .unnumbered}

Provides a dedicated, more powerful interface for users (both Buyers and
Workers) to manage *all* aspects of their profile information when the
simplified webapp view isn\'t sufficient, catering to users who want
detailed control.

#### **✅ User Story** {#user-story-15 .unnumbered}

As a user (buyer or freelancer),

- I want a comprehensive profile editing section in my dashboard,

- So that I can manage all aspects of my profile with more control than
  > the webapp Gigfolio/settings view.

#### **🧱 Definition of Done (DoD)** {#definition-of-done-dod-15 .unnumbered}

- Dedicated pages exist within the secondary dashboard:

  - /dashboard/worker/profile/edit

  - /dashboard/buyer/profile/edit

- Pages contain editable fields for the full profile model:

  - For workers: name, contact info, video bio link, rate, availability,
    > skills, experience, equipment, certifications, Stripe payout info,
    > Gigfolio visibility settings

  - For buyers: name, contact info, company name, billing preferences,
    > VAT number (if needed), team members

- Users can:

  - Add, edit, and remove individual fields or relations (e.g. add a
    > skill, delete equipment)

  - Save changes via validated form submission

- All changes update the database via server actions

- Error handling and success messages are present

### **✅ Developer Questions -- Answered** {#developer-questions-answered .unnumbered}

#### **🔹**  {#section-56 .unnumbered}

#### **Should this be one large form or broken into tabs/sections?** {#should-this-be-one-large-form-or-broken-into-tabssections .unnumbered}

**Answer:**

Break it into clear **sections/tabs**. This improves usability, reduces
cognitive load, and aligns with the density of data workers/buyers are
entering.

**Recommended Tabs:**

**For Freelancers (Gig Worker):**

1.  **Basic Info** -- Name, contact, tagline, rate

2.  **Skills & Equipment** -- Skill tags, certifications, physical
    > equipment

3.  **Availability & Location** -- Calendar view + travel radius

4.  **Video & Visibility** -- Upload new video, select still, privacy
    > toggles

5.  **Payments** -- Stripe Connect onboarding or status

6.  **Profile Completion** -- Progress bar, nudges, badge status

**For Buyers:**

1.  **Basic Info** -- Name, company, contact email

2.  **Team** -- Add/edit team members, roles (Post-MVP)

3.  **Billing & Payment** -- VAT number, invoice preferences

4.  **Notifications** -- Optional post-MVP config

5.  **Security & Access** -- Password change, logout all devices

#### **🔹**  {#section-57 .unnumbered}

#### **Is there profile information only editable in the dashboard (not in the webapp)?** {#is-there-profile-information-only-editable-in-the-dashboard-not-in-the-webapp .unnumbered}

**Answer:**

- in webapp and via aI agent see edit path below

**Buyer-only fields editable only in Dashboard:**

- VAT number & invoice preferences

- Team member management (Post-MVP)

- Billing address for Stripe (if required)

**Why?**

The webapp focuses on speed + mobile accessibility; the dashboard allows
full setup, long-form data entry, and sensitive controls.

#### **🔹 Additional Clarifications (based on your earlier inputs):** {#additional-clarifications-based-on-your-earlier-inputs .unnumbered}

| **Topic**                     | **Confirmed Decision**                                                                        |
|-------------------------------|-----------------------------------------------------------------------------------------------|
| **Role switching**            | ✅ Yes --- use a toggle in header/dashboard view to switch between buyer/freelancer mode      |
| **External reviews**          | ✅ Public by default; freelancers choose which Able reviews are public                        |
| **Profile completion nudges** | ✅ Yes --- especially for video, rate, calendar, and skill tags. Include a % complete tracker |
| **Video bio visibility**      | ❌ No private video bios --- they must remain public for AI ranking integrity                 |
| **Stripe Connect**            | ✅ Must be managed here; embed or deep link to Stripe onboarding/status dashboard             |

### **📘 SVR-C07 -- AI-Assisted Profile Editing via Chat** {#svr-c07-ai-assisted-profile-editing-via-chat .unnumbered}

### **✅ User Story: Conversational Profile Editing with AI** {#user-story-conversational-profile-editing-with-ai .unnumbered}

**As a freelancer on Able**,

- I want to update my profile and Gigfolio by chatting with the Able
  > Assistant,

- So that I can manage my availability, skills, rate, and profile
  > visibility in a fast, intuitive way.

### **🎯 Acceptance Criteria** {#acceptance-criteria-18 .unnumbered}

| **Scenario**                                       | **Expected Outcome**                            |
|----------------------------------------------------|-------------------------------------------------|
| User types "change my rate to £15/hour"            | AI confirms and updates rate field in DB        |
| User says "add bartender and host to my skills"    | AI adds both to skills tag array                |
| User says "I'm available all day on Friday"        | AI updates availability calendar                |
| User says "hide my equipment section"              | AI toggles profile visibility for that section  |
| User says "actually remove barback"                | AI confirms and deletes that tag                |
| AI must ask for confirmation before making changes | Changes only submitted on explicit confirmation |
| All updates are logged for moderation              | Store changes with timestamp + source: ai_agent |

###  {#section-58 .unnumbered}

### **🧑‍💻 Developer Story: Enable Profile Edits via AI Function Calls** {#developer-story-enable-profile-edits-via-ai-function-calls .unnumbered}

**As the backend and AI integration layer**,

- I want to expose secure, scoped profile-editing functions to the AI
  > agent,

- So that the AI can update user data when prompted during conversation.

### **🛠️ Technical Implementation** {#technical-implementation .unnumbered}

| **Layer**               | **Detail**                                                                                                                                                                     |
|-------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **AI Model**            | GPT-4-turbo with function calling (via Portkey or OpenAI)                                                                                                                      |
| **Supported Functions** | updateRate(userId, newRate)addSkill(userId, skillName)removeSkill(userId, skillName)updateAvailability(userId, date, timeSlot)toggleVisibility(userId, sectionName, isVisible) |
| **Security**            | Only callable if user is authenticated and session is active. Validate ownership of userId.                                                                                    |
| **Audit Trail**         | Every change triggered by AI is logged in ProfileChangeLog with { userId, field, newValue, source: \"ai_agent\", timestamp }                                                   |
| **Frontend**            | No UI changes needed immediately --- feedback shown in chat thread                                                                                                             |
| **Fallbacks**           | If AI is unsure, respond: *"I'm not 100% sure how to change that. Would you like to open your dashboard to update it manually?"*                                               |

SVR-C01 API Contract

### **📘 SVR-C01 -- API Contract v1** {#svr-c01-api-contract-v1 .unnumbered}

Ensures clear communication and predictable interactions between
different parts of the system or between the backend and potential
future clients (like native mobile apps). Facilitates parallel
development and testing.

**System Story:**

To ensure consistent communication and predictable integration between
front-end, back-end, and future mobile apps,

- Able requires a formalised API contract describing endpoints and data
  > structures.

- Even if Next uses direct server calls now, a defined contract supports
  > testing, versioning, and eventual decoupling.

### **✅ Definition of Done (DoD)** {#definition-of-done-dod-16 .unnumbered}

- A single API contract document exists (.md, OpenAPI/Swagger, or
  > Postman).

- For each endpoint, the following must be specified:

  - HTTP method (GET, POST, PUT, DELETE)

  - URL path (/api/users/:userId, etc.)

  - Required authentication/authorization

  - Request body schema

  - URL or query parameters

  - Success response format (JSON + status codes like 200, 201)

  - Error responses (400, 403, 404, 500, etc.)

- The contract covers the following **core resources**:

  - Auth

  - Users

  - Profiles (GigWorkerProfile, BuyerProfile)

  - Gigs

  - Reviews

  - Payments

  - Calendar/Availability

  - Chat

- The actual backend implementation conforms to this specification.

- Contract is **versioned and updated** as new endpoints or models
  > evolve (e.g., /v1/api/gigs → /v2/api/gigs for major changes).

### **🧩 Developer Questions Answered** {#developer-questions-answered-1 .unnumbered}

#### **1. What format will the API contract take?** {#what-format-will-the-api-contract-take .unnumbered}

- **Recommended:** Swagger/OpenAPI using a tool like [[Swagger
  > Editor]{.underline}](https://editor.swagger.io/) for collaboration.

- Markdown (in Git) is acceptable for MVP as long as it follows
  > consistent schema definitions.

- Postman collections can supplement the documentation but should not
  > replace the main contract.

#### **2. How strictly will it be followed if the frontend uses server functions (e.g. Next)?** {#how-strictly-will-it-be-followed-if-the-frontend-uses-server-functions-e.g.-next .unnumbered}

- For MVP, the API contract acts as a **reference standard** to:

  - Align data shapes between teams

  - Ensure endpoints are testable and reusable by mobile

- Later phases may move toward a stricter separation and enforcement.

> For now: **contract-first thinking is helpful** even with tight
> integration.

### **🧠 Additional Clarifications & Recommendations** {#additional-clarifications-recommendations .unnumbered}

- The /api path namespace should be reserved exclusively for API traffic
  > --- not used for pages or Next loaders.

- Include **sample requests/responses** in the contract, e.g.:

POST /api/gigs

{

\"role\": \"waiter\",

\"date\": \"2025-07-12\",

\"startTime\": \"10:00\",

\"endTime\": \"16:00\",

\"location\": \"123 High Street, Peckham\",

\"rate\": 15.0

}

Response: 201 Created

{

\"gigId\": \"abc123\",

\"status\": \"PENDING\",

\"workerMatchCount\": 5

}

- Include headers where applicable (e.g., Authorization: Bearer
  > \<token\>).

- Consider tagging endpoints with metadata (e.g., @requiresAuth,
  > @public).

### **📚 Suggested Structure (OpenAPI YAML Example)** {#suggested-structure-openapi-yaml-example .unnumbered}

paths:

/api/gigs:

post:

summary: Create a new gig

tags:

\- Gigs

requestBody:

required: true

content:

application/json:

schema:

\$ref: \'#/components/schemas/NewGig\'

responses:

\'201\':

description: Created

\'400\':

description: Validation Error

components:

schemas:

NewGig:

type: object

properties:

role:

type: string

date:

type: string

format: date

startTime:

type: string

endTime:

type: string

location:

type: string

rate:

type: number

### **🔄 Integration Tips** {#integration-tips .unnumbered}

- **Stripe, Auth0, and Chat** modules should have their own
  > mini-contract sections or links.

- Clearly define any custom headers or tokens (for future mobile usage).

- Consider integrating auto-generated API docs from code annotations
  > (e.g., tRPC, zod-to-openapi) to keep the contract in sync.

SVR-C02 Notification Logic

## **📘 SVR-C02 -- Notification Logic** {#svr-c02-notification-logic .unnumbered}

Keeps users informed and engaged by proactively alerting them to events
that require their attention or are relevant to their activity, driving
timely actions like accepting offers or responding to messages. The
system must determine when to generate notifications (in-app, email,
push) based on platform events and user preferences.

### **✅ System Story** {#system-story-2 .unnumbered}

As a platform,

- I want to trigger and display notifications based on critical system
  > events,

- So that users are promptly informed and can take timely action.

### **💡 Definition of Done (DoD)** {#definition-of-done-dod-17 .unnumbered}

- **Trigger Logic**:

  - Key backend events (e.g., gig status update, message sent, offer
    > created, payment completed) are hooked with a createNotification()
    > service.

  - Server logic records a notification object in the DB.

  - (Post-MVP) Logic also emits a WebSocket event if user is online, or
    > queues email if not.

- **Database & Storage**:

  - Define a Notification model with:

    - id, recipientId, type (gig_offer, message, status_change, etc.)

    - message (e.g., "New offer: Bartender on 23 June")

    - readStatus (unread, read)

    - relatedItemId (e.g., gigId)

    - createdAt

- **UI Display**:

  - MVP: in-app banner or toast, stored in DB

  - Post-MVP: Real-time updates via WebSockets (SVR-C03)

  - Clicking opens relevant screen (e.g., gig detail, chat)

- **Read Tracking**:

  - Read state toggled when notification is viewed.

  - Badge counter updates accordingly.

### **🛎️ MVP Notification Triggers** {#mvp-notification-triggers .unnumbered}

<table>
<colgroup>
<col style="width: 27%" />
<col style="width: 21%" />
<col style="width: 17%" />
<col style="width: 33%" />
</colgroup>
<thead>
<tr class="header">
<th><strong>Event</strong></th>
<th><strong>Notification Type</strong></th>
<th><strong>Recipient</strong></th>
<th><strong>Example Message</strong></th>
</tr>
<tr class="odd">
<th>Gig offer sent</th>
<th>gig_offer</th>
<th>Freelancer</th>
<th>“You’ve been offered a new gig: Bartender”</th>
</tr>
<tr class="header">
<th>Gig accepted/rejected</th>
<th>gig_response</th>
<th>Buyer</th>
<th>“Jessie has accepted your offer”</th>
</tr>
<tr class="odd">
<th>New chat message</th>
<th>chat_message</th>
<th>Buyer or Worker</th>
<th>“New message from Sam about the gig”</th>
</tr>
<tr class="header">
<th>Gig marked complete</th>
<th>gig_status</th>
<th>Counterparty</th>
<th>“This gig has been marked complete”</th>
</tr>
<tr class="odd">
<th>Gig confirmed &amp; payment due</th>
<th>payment_due</th>
<th>Buyer</th>
<th>“Confirm and release payment for gig”</th>
</tr>
<tr class="header">
<th>Gig paid</th>
<th>payment_complete</th>
<th>Worker</th>
<th>“You’ve been paid for the gig”</th>
</tr>
<tr class="odd">
<th><p>Badge or review received</p>
<p>Notify user 5 days before 2FREEABLE promo ends (see SVR-PROMO01</p>
<p>Notify buyer when fallback candidate is queued and allow to
veto</p></th>
<th><p>recognition</p>
<p>message</p>
<p>Message</p></th>
<th><p>Worker</p>
<p>buyer</p>
<p>Buyer.</p></th>
<th><p>“You received a new badge from a buyer”</p>
<p>Your free trial ends in 5 days - please let us know through Able if
you have any feedback and we look forward to working with you into the
future!</p>
<p>Your first choice can't make it but X is available - you have 15 mins
to veto before we automatically offer them this shift!</p></th>
</tr>
</thead>
<tbody>
</tbody>
</table>

### **📨 Delivery Channels** {#delivery-channels .unnumbered}

| **Channel**                   | **MVP** | **Post-MVP**           |
|-------------------------------|---------|------------------------|
| In-app (toast, banner, badge) | ✅      | ✅ (WebSocket refresh) |
| Email                         | ✅      | ✅                     |
| Push                          | ✅      | ✅                     |
| SMS (critical fallback)       | ❌      | Optional later         |

### **🎨 In-App UI** {#in-app-ui .unnumbered}

- Badge icon (e.g., 🔔) in header with count.

- Toast or banner near top of screen for time-sensitive alerts.

- Inbox-style list on /notifications (Post-MVP).

- Clicking a toast/badge clears readStatus and deep-links to context.

### **🧠 Post-MVP Enhancements** {#post-mvp-enhancements-1 .unnumbered}

- WebSocket live updates for real-time UX.

- Configurable user preferences (toggle on/off per category).

- Push notifications for mobile (optional with PWA).

- AI summarisation of past notifications (e.g., "3 offers you haven't
  > opened").

**gig offer notification templates** for both email and in-app use,

## **📧 Gig Offer Email Template** {#gig-offer-email-template .unnumbered}

**Subject Line:**

> 📣 New Gig Offer -- \[Role\] on \[Date\] at \[Time\]

**Preview Text:**

> This gig matches your profile and availability. Don't miss it.

**Email Body:**

> Hi \[First Name\],
>
> You've just been offered a gig that matches your skills and
> availability:
>
> **📍 Role:** \[e.g. Bartender\]
>
> **📅 Date:** \[e.g. Saturday, 8 July\]
>
> **⏰ Time:** \[e.g. 6pm -- Midnight\]
>
> **📍 Location:** \[e.g. The Glasshouse, Shoreditch\]
>
> **💷 Pay:** £\[Rate\]/hour + tips
>
> 🔔 **This offer is time-sensitive.** It may be passed to someone else
> if not accepted soon.
>
> 👉 **Click here to view and respond now »**
>
> Stay awesome,
>
> --- The Able Team

## **🔔**  {#section-59 .unnumbered}

## **In-App Banner/Toast Notification** {#in-app-bannertoast-notification .unnumbered}

**Message:**

> 🎯 *New Gig Offer: Bartender on Saturday at 6pm --- tap to view and
> respond*

**Behaviour:**

- Tappable

- Dismisses only when user accepts/declines

- Optionally animates briefly to catch attention

## **🔁**  {#section-60 .unnumbered}

## **Reminder Email (If Not Responded in 1 Hour)** {#reminder-email-if-not-responded-in-1-hour .unnumbered}

**Subject Line:**

> ⏰ Don't miss your gig offer -- response needed soon

**Body:**

> Just a quick reminder --- your offer for **\[Role\] on \[Date\]** is
> still waiting.
>
> We don't want you to miss out, but it might be offered to someone else
> soon.
>
> 👉 **View & Respond Now**
>
> Thanks for being part of Able!

## **⏳ Offer Rotation Rule (MVP)** {#offer-rotation-rule-mvp .unnumbered}

- **Response window:  
  >   
  > ** ✅ Gig offers remain **exclusive to one freelancer for 3 hours**
  > (default).  
  >   
  > ⏱️ Optional override: 5 hours for longer gigs or late-night offers.

- **After that time:  
  > **

  - Offer is marked **"unresponded"  
    > **

  - Automatically sent to the next-highest ranked available worker

  - Original worker can still respond, but priority moves on

- **User-facing message:  
  >   
  > ** *"This gig is time-sensitive and may be passed on to others after
  > 3 hours if unclaimed."  
  > *

- **Email reminders (optional):  
  >   
  > ** Send at 60 minutes to encourage action before handoff.

SVR-C03 WebSocket Server

## **📘 SVR-C03 -- WebSocket Server** {#svr-c03-websocket-server .unnumbered}

Enables real-time features like instant notifications and live chat,
significantly enhancing the user experience by making the application
feel more dynamic and responsive compared to relying solely on polling
or manual refreshes. (Post-MVP candidate).

### **✅ System Story** {#system-story-3 .unnumbered}

As a system,

- I want to establish WebSocket connections between server and clients,

- So that users can receive real-time updates for chat, gig offers, and
  > status changes without refreshing the page.

### **💡 Definition of Done (DoD)** {#definition-of-done-dod-18 .unnumbered}

- A WebSocket server (using socket.io) is set up and running.

- Client connects successfully on login and reconnects if dropped.

- Authentication is performed using session token or access token at
  > handshake.

- WebSocket logic supports:

  - Per-user rooms (e.g., user:123)

  - Per-gig chat rooms (e.g., gig:abc123)

- Server listens for internal events from SVR-C02 (e.g., new message,
  > new offer).

- Emits those events to the correct room/user over WebSocket.

- Events include structured payload (type, timestamp, related entity).

- WebSocket message receipt triggers toast or badge on the frontend.

###  {#section-61 .unnumbered}

###  {#section-62 .unnumbered}

### **🔔 Events to Support via WebSocket (Post-MVP)** {#events-to-support-via-websocket-post-mvp .unnumbered}

| **Event**         | **Emitted To**    | **Payload Includes**              | **Priority** |
|-------------------|-------------------|-----------------------------------|--------------|
| new_message       | user:\<receiver\> | gigId, sender, message preview    | High         |
| new_offer         | user:\<worker\>   | gigId, job summary, timestamp     | High         |
| gig_status_update | user:\<buyer\>    | gigId, new status, worker details | Med          |
| payment_complete  | user:\<worker\>   | gigId, amount, receipt link       | Med          |
| ai_suggestion     | user:\<buyer\>    | text message or prompt from AI    | Low          |

### **🧠 Developer Clarifications -- Answered** {#developer-clarifications-answered .unnumbered}

**Q: Will the WebSocket server be integrated or separate?**

👉 For MVP and early scaling, integrate into the Next server process. If
the load grows, separate into a Node.js service using socket.io.

**Q: What authentication method?**

👉 Use session token or JWT passed during connection handshake and
validate against current session in Redis or database.

**Q: How will scalability be handled?**

👉 Use rooms for grouping events. For horizontal scaling later:

- Redis pub/sub or a message broker like NATS

- Sticky sessions or session-sharing (e.g., with Redis)

- Load balancing via a WebSocket-aware proxy (e.g., NGINX)

### **✨ MVP vs. Post-MVP Scope** {#mvp-vs.-post-mvp-scope .unnumbered}

| **Feature**                     | **MVP** | **Post-MVP** |
|---------------------------------|---------|--------------|
| WebSocket server running        | ❌      | ✅           |
| Chat messages sent in real-time | ❌      | ✅           |
| Toast/badge in UI on event      | ❌      | ✅           |
| Email fallback for all alerts   | ✅      | ✅           |
| Notification model via DB       | ✅      | ✅           |

SVR-C04 Chat Message Storage

## **✅ Chat Message Storage**  {#chat-message-storage .unnumbered}

Persists communication history between buyers and workers related to
specific jobs, providing a record for reference, dispute resolution, and
enabling users to view past conversations.

### **📘 System Story** {#system-story-4 .unnumbered}

- The system must persist communication history between buyers and
  > workers for specific gigs.

- This record enables users to reference past discussions, resolve
  > disputes, and maintain transparency.

### **✅ Definition of Done (DoD)** {#definition-of-done-dod-19 .unnumbered}

#### **📥 Message Capture and Storage** {#message-capture-and-storage .unnumbered}

- All chat messages are saved in a ChatMessage table.

- Required fields:

  - id: UUID

  - gigId: FK → Gig

  - senderId: FK → User

  - receiverId: FK → User

  - message: Text

  - createdAt: Timestamp

  - moderationStatus: Enum (APPROVED, PENDING_REVIEW, FLAGGED)

  - flagReason: Optional string (e.g. "off-platform solicitation")

  - confidenceScore: Optional float (0--1)

A Chat model is defined in schema.Drizzle, with the following:

| **Field**            | **Type**                                 | **Description**                      |
|----------------------|------------------------------------------|--------------------------------------|
| id                   | UUID                                     | Unique ID for the message            |
| message              | String                                   | The chat message content             |
| createdAt            | DateTime                                 | Timestamp of the message             |
| senderId             | FK → User                                | Who sent the message                 |
| receiverId           | FK → User                                | ✅ **Yes -- should be included**     |
| gigId                | FK → Gig                                 | The gig this conversation is tied to |
| moderationStatus     | Enum (APPROVED, PENDING_REVIEW, FLAGGED) | Result of AI moderation              |
| flagReason: Optional | string                                   | e.g. "off-platform solicitation"     |
| confidenceScore      | Optional float                           | 0--1                                 |

Additional notes:

- Database migration must create this table.

- Server-side function to **save** messages with full validation.

- Server-side function to **retrieve** chat history by gigId, ordered by
  > createdAt.

### **❓ Questions & Clarifications -- Answered** {#questions-clarifications-answered-3 .unnumbered}

#### **1. Should receiverId be stored?** {#should-receiverid-be-stored .unnumbered}

✅ **Yes.**

While gigId + senderId implies the context, storing receiverId:

- **Simplifies querying** (e.g. all messages received by a user)

- **Enables moderation targeting  
  > **

- Is essential if, in the future, multiple users are attached to a gig
  > (e.g. buyer team members or assistants)

- Aligns with most standard messaging models

**Decision:** Include receiverId as a required field.

#### **2. Are read receipts needed (read/unread status)?** {#are-read-receipts-needed-readunread-status .unnumbered}

❌ **No, not for MVP.**

While helpful, they add complexity:

- Require per-user state tracking per message

- Need real-time or polling updates

- Affect UI design (e.g. "seen" indicators)

You can revisit read receipts in a **Post-MVP** release once messaging
and WebSocket infrastructure is stable.

### **🧠 Bonus: AI Moderation Integration (Already Aligned)** {#bonus-ai-moderation-integration-already-aligned .unnumbered}

- Keep moderationStatus, flagReason, and optionally confidenceScore.

- Messages flagged as FLAGGED are hidden from receiver by default and
  > shown only after admin review.

SVR-C05 Review/Recommendation Storage

## **📘 SVR-C05 -- Review & Recommendation Storage** {#svr-c05-review-recommendation-storage .unnumbered}

Persists user feedback, which is crucial for building the reputation
system that buyers and workers rely on to make informed decisions.
Stores both internal reviews linked to gigs and potentially external
recommendations.

### **✅ System Story** {#system-story-5 .unnumbered}

The system must persist user feedback to support trust and transparency.
It must store both:

- **Internal gig reviews**: Written after completed gigs, capturing
  > performance and trust signals between buyers and workers.

- **External recommendations**: Collected from third parties during
  > setup, used to validate user skills and reputation early in their
  > journey.

These two types have different data structures and contexts and should
be stored distinctly or with clear flags.

###  {#section-63 .unnumbered}

### **💾 Review Model (Internal)** {#review-model-internal .unnumbered}

Fields (linked to gigs):

- id

- authorId (User)

- targetId (User)

- gigId (Gig)

- wouldWorkAgain (Boolean)

- badges (Array of enums e.g. team_player, star_performer)

- comment (Text, nullable)

- createdAt

- moderationStatus (Pending/Approved/Rejected)

### **📬 Recommendation Model (External)** {#recommendation-model-external .unnumbered}

Submitted via public form using a shareable link. Fields:

- id

- authorName

- authorEmail (optional)

- relationshipType (e.g. "Worked together", "Manager", "Mentor")

- targetId (User)

- skillTag (e.g. bartending, event_setup)

- recommendationText

- createdAt

- moderationStatus

Each freelancer must provide **one external recommendation per skill**
during onboarding.

### **🛠 Definition of Done (DoD)** {#definition-of-done-dod-20 .unnumbered}

- Two models created in schema: Review and Recommendation OR a shared
  > table with type flags and nullable fields.

- Server functions:

  - Create internal reviews (prevent duplicates per gig+author)

  - Create external recommendations

  - Fetch all reviews for a user (grouped by type)

  - Fetch gig-specific reviews

- Admin queue shows reviews and recommendations pending moderation.

###  {#section-64 .unnumbered}

### **🤖 Moderation & Display** {#moderation-display .unnumbered}

- Both types pass through AI or admin moderation before display.

- Users can toggle visibility of internal reviews.

- External recommendations are always public and tied to specific skills
  > in the gigfolio.

- Only **approved** reviews and recommendations are shown in the public
  > profile.

###  {#section-65 .unnumbered}

Here are clear, reasoned answers to each of the questions to finalise
the data structure and review storage strategy for **SVR-C05**:

### **Q1: Are external recommendations stored differently from internal gig reviews?** {#q1-are-external-recommendations-stored-differently-from-internal-gig-reviews .unnumbered}

**Answer:**

No --- they can be stored in the **same Review table**, using:

- A type field (\"internal\" or \"external\")

- Nullable fields like gigId, would work with again rating, and badges
  > where not applicable

**Why:**

- Simplifies querying and display logic

- Keeps the moderation workflow consistent

- Enables unified retrieval of all trust data for a given user

### **Q2: Confirm all fields needed for a review or recommendation** {#q2-confirm-all-fields-needed-for-a-review-or-recommendation .unnumbered}

| **Field**        | **Internal Review**      | **External Recommendation**                              |
|------------------|--------------------------|----------------------------------------------------------|
| id               | ✅                       | ✅                                                       |
| type             | \"internal\"             | \"external\"                                             |
| authorId         | ✅ (user leaving review) | 🔁 Optional / replace with authorName + relationshipType |
| targetId         | ✅                       | ✅                                                       |
| gigId            | ✅                       | ❌ null                                                  |
| wouldWorkAgain   | ✅                       | ✅                                                       |
| badges           | ✅                       | ❌                                                       |
| comment          | ✅                       | ✅ recommendationText                                    |
| relationshipType | ❌                       | ✅                                                       |
| skillTag         | ❌                       | ✅                                                       |
| moderationStatus | ✅                       | ✅                                                       |
| createdAt        | ✅                       | ✅                                                       |

You may choose to split authorId into two fields for external reviews:
authorName (string) and authorEmail (optional), if you're not requiring
a platform login.

### **Q3: Should both models go into one table with a type = "internal" \| "external" flag or stay separate?** {#q3-should-both-models-go-into-one-table-with-a-type-internal-external-flag-or-stay-separate .unnumbered}

**Answer:**

✅ **Use one table**, with type = \"internal\" \| \"external\"

Nullable fields and validation rules will vary based on the type. This
gives:

- Cleaner aggregation

- Unified moderation logic

- Flexibility to expand types (e.g., \"platform-endorsed\")

###   {#section-66 .unnumbered}

### **Q4: Should rating be optional for internal reviews to allow qualitative-only feedback?** {#q4-should-rating-be-optional-for-internal-reviews-to-allow-qualitative-only-feedback .unnumbered}

**Answer:**

❌ No --- **keep** would work with again rating **required** for
internal reviews.

It's essential for:

- AI ranking logic (SVR-B02)

- Filtering and trust scoring

- Gig history summaries for the buyer

Users must leave a would work with again rating and a review even if its
only one word

### **Q5: Do external recommendations need a reply/acknowledgment field from the freelancer?** {#q5-do-external-recommendations-need-a-replyacknowledgment-field-from-the-freelancer .unnumbered}

**Answer:**

Yes please - will drive users into the site

acknowledgedAt or response field to let freelancers:

- Thank their referee

- Comment on the recommendation (if needed)

But for MVP: **external reviews** public by default.

SVR-C06 Chat Moderation & Rule Violation Detection

### **📘 SVR-C06 -- Chat Moderation & Rule Violation Detection** {#svr-c06-chat-moderation-rule-violation-detection .unnumbered}

### **User Story: Flag Messages That Violate Platform Rules** {#user-story-flag-messages-that-violate-platform-rules .unnumbered}

**As the system**,

- I want to automatically monitor chat messages for violations like
  > payment circumvention, contact sharing, or abuse,

- **so that** I can protect users, uphold trust, and prevent revenue
  > leakage.

### **🎯 Acceptance Criteria** {#acceptance-criteria-19 .unnumbered}

- Chat messages are automatically scanned **on send** (not on page
  > load).

- A set of **keyword and regex filters** catch phrases like:

  - "pay cash", "bank transfer", "WhatsApp", "@gmail.com", "+44"

- Messages containing **violations** are:

  - Logged with timestamp, sender ID, gig ID, and matched rule

  - Flagged to admin dashboard for review

- Optional: User receives a gentle warning if trigger phrase detected:  
  >   
  > *"Reminder: To protect both sides, all communication and payment
  > must stay on Able."  
  > *

- Flagged messages do **not block sending**, only notify and log

- Admins can view all flagged messages in moderation queue with context

### **💡 Definition of Done (DoD)** {#definition-of-done-dod-21 .unnumbered}

#### **🧠 AI Moderation** {#ai-moderation .unnumbered}

- After saving, each message is immediately processed by the Able AI
  > agent (using OpenAI moderation API or GPT-4 via Portkey).

- Based on risk category, the AI assigns:

  - APPROVED: Message is safe

  - PENDING_REVIEW: Message is ambiguous or borderline

  - FLAGGED: Strong violation (e.g. "WhatsApp me", "cash in hand")

- AI stores flagReason and optional confidenceScore.

- Flagged messages are:

  - Hidden from the recipient until reviewed

  - Logged for admin moderation

  - May trigger an auto-reply from the Able Assistant:  
    >   
    > *"Let's keep things safe --- taking gigs off-platform is against
    > our Terms."  
    > *

####  {#section-67 .unnumbered}

####  {#section-68 .unnumbered}

#### **📤 Real-Time Emission (Post-MVP)** {#real-time-emission-post-mvp .unnumbered}

- If message is APPROVED, it is emitted via WebSocket (see SVR-C03).

- If FLAGGED, it is suppressed from real-time delivery.

- If PENDING_REVIEW, status is logged and queued for review.

### **🗃️ Data Model -- ChatMessage** {#data-model-chatmessage .unnumbered}

###  **Table** {#table .unnumbered}

| **Field**        | **Type**         | **Description**                   |
|------------------|------------------|-----------------------------------|
| id               | UUID             | Unique message ID                 |
| gigId            | UUID (FK)        | Related gig                       |
| senderId         | UUID (FK)        | User sending the message          |
| receiverId       | UUID (FK)        | User receiving the message        |
| message          | Text             | Body of the message               |
| createdAt        | Timestamp        | Time sent                         |
| moderationStatus | Enum             | APPROVED, PENDING_REVIEW, FLAGGED |
| flagReason       | Text (nullable)  | e.g. "cash offer"                 |
| confidenceScore  | Float (nullable) | Confidence level of AI judgment   |

### **📚 Example AI Moderation Use Cases** {#example-ai-moderation-use-cases .unnumbered}

| **Example Message**                  | **Outcome**    | **FlagReason**       |
|--------------------------------------|----------------|----------------------|
| "Can I pay you cash?"                | FLAGGED        | "Off-platform offer" |
| "You're a f\*\*\*ing idiot"          | FLAGGED        | "Abusive language"   |
| "Want to swap numbers just in case?" | PENDING_REVIEW | "Possible contact"   |
| "What time should I arrive?"         | APPROVED       | ---                  |

### **👨‍⚖️ Admin Moderation Tools (Post-MVP)** {#admin-moderation-tools-post-mvp .unnumbered}

- Dashboard view of flagged messages

- Bulk approve/decline options

- Option to warn, suspend, or remove users based on repeated abuse

### **🔐 Security & Rate Limits** {#security-rate-limits .unnumbered}

- Enforce character limits (e.g. max 1,000 chars)

- Save IP or device fingerprint (if needed for abuse detection)

- Rate-limit messages per gig per minute

### **🧑‍💻 Developer Story: Rule Violation Detection Engine** {#developer-story-rule-violation-detection-engine .unnumbered}

**As a developer**,

- I want to scan outgoing messages for risky content using keywords,
  > patterns, and moderation APIs,

- **so that** I can trigger moderation flags without interrupting the
  > user experience.

### **🛠️ Technical Implementation** {#technical-implementation-1 .unnumbered}

| **Layer**              | **Details**                                                                                                                                                                      |
|------------------------|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Phase 1 (MVP)**      | • Use regex and keyword triggers (\`regex: /+44                                                                                                                                  |
| **Phase 2 (Post-MVP)** | • Integrate OpenAI Moderation API for abuse detection (harassment, hate speech, etc.) • Add support for **auto-responses** or soft warnings                                      |
| **Phase 3 (Growth)**   | • Train a vector-based classifier (OpenAI or Cohere) to detect nuanced circumvention language • Combine message content, user reputation, and recurrence score to escalate flags |

🧑‍🏫 Admin Panel Functionality

Provide Admins with the tools to manage users, moderate content, oversee
operations, and configure the platform.

## **✅ MVP Admin Functionality (Minimum but Sufficient)** {#mvp-admin-functionality-minimum-but-sufficient .unnumbered}

These are the **essential tools** your team needs at launch to run Able
safely, resolve issues, and manage the core platform --- nothing extra,
just high-leverage control:

| **Function**                                         | **Recommendation**                 | **Reason**                                                                               |
|------------------------------------------------------|------------------------------------|------------------------------------------------------------------------------------------|
| **Admin login + basic layout** (DSH-ADM01)           | ✅ MVP                             | Enables secure entry into admin environment.                                             |
| **User list + view/ban/disable** (DSH-ADM02)         | ✅ MVP                             | Essential for managing abuse, flagging, and support.                                     |
| **Gig list with view-only** (DSH-ADM03)              | ✅ MVP                             | Allows you to trace, verify, or investigate gigs.                                        |
| **Core permission logic** (SVR-ADM01)                | ✅ MVP                             | Prevents misuse --- ensures only admins can access sensitive features.                   |
| **Review moderation queue** (DSH-ADM04)              | ✅ **Pull into MVP**               | Since reviews power trust & rankings, you must approve or reject them before visibility. |
| **Chat moderation queue** (\`DSH-ADM04 extended)\*\* | ✅ **Pull into MVP**               | Required if you're AI-flagging abusive/cash solicitation messages. Minimal view is fine. |
| **Payment list view** (DSH-ADM05)                    | ❌ Defer if using Stripe dashboard | Use Stripe dashboard for payments tracking to save build time.                           |

### **⚖️ Final MVP Set (Revised)** {#final-mvp-set-revised .unnumbered}

- ✅ Admin login (ADM01)

- ✅ User list (view + ban/disable) (ADM02)

- ✅ Gig list (read-only) (ADM03)

- ✅ Review moderation queue (ADM04)

- ✅ Chat moderation queue (ADM04)

- ✅ Core permissions (SVR-ADM01)

> Stripe dashboard covers payments temporarily.

## **🕐 Post-MVP Features We Can Defer** {#post-mvp-features-we-can-defer .unnumbered}

| **Feature**                               | **Why Post-MVP**                                   |
|-------------------------------------------|----------------------------------------------------|
| Advanced filtering/sorting/search         | Not essential for early-stage data volumes.        |
| Admin logs (DSH-ADM08)                    | Nice for auditing, but not critical if few admins. |
| Analytics dashboard (DSH-ADM06)           | You can run manual exports or basic metrics first. |
| AI prompt config (DSH-ADM07)              | Needed only once you're tuning AI behaviour.       |
| Bulk actions                              | Rarely needed with low early user volume.          |
| QA tools & mock data controls (DSH-ADM10) | Skip unless doing internal A/B or test seeding.    |

## **🧠 Questions to Clarify Now** {#questions-to-clarify-now .unnumbered}

### **🟡 Q:**  {#q .unnumbered}

### **What criteria should flag a chat/review?** {#what-criteria-should-flag-a-chatreview .unnumbered}

A:

- Chat: contains off-platform offers, contact info, abuse

- Review: contains links, offensive language, or repeated low-score
  > spam  
  >   
  > → Use AI moderation status field: flagged vs. pending_review

### **🟡 Q:**  {#q-1 .unnumbered}

### **What should Admin Logs track (DSH-ADM08)?** {#what-should-admin-logs-track-dsh-adm08 .unnumbered}

A: When built, it should capture:

- User bans/reactivations

- Review approval/rejection

- Manual data edits

- Gig deletion/amendments

### **🟡 Q:**  {#q-2 .unnumbered}

### **Are bulk actions needed early on?** {#are-bulk-actions-needed-early-on .unnumbered}

A: No --- better to handle 1:1. Add bulk ban/archive later if spam
volume grows.

### **🟡 Q:**  {#q-3 .unnumbered}

### **What reports are needed (DSH-ADM06)?** {#what-reports-are-needed-dsh-adm06 .unnumbered}

A: Post-MVP: start with exports of:

- Active users

- Completed gigs

- Outstanding payments

- Reviews by status

DSH-ADM01 Admin Dashboard

## **📊 DSH-ADM01 -- Admin Dashboard** {#dsh-adm01-admin-dashboard .unnumbered}

Provides administrators with a high-level, immediate snapshot of
platform health, pending tasks (moderation), and key performance
indicators, enabling them to prioritize actions and monitor operations
efficiently.

### **✅ User Story** {#user-story-16 .unnumbered}

**As an Admin user**,

I want a dashboard overview with key platform metrics, moderation
queues, and quick access to management sections,

**So that** I can monitor operations, prioritise action, and maintain
platform quality.

### **✅ Definition of Done (DoD)** {#definition-of-done-dod-22 .unnumbered}

- /admin route displays a tailored admin dashboard layout.

- Summary cards show key metrics:

  - Total users (active/inactive)

  - Active gigs

  - Pending payments

  - Moderation queues:

    - 🟠 Chats flagged

    - 🟡 Reviews pending

    - 🔴 Profiles needing verification

- Quick links to:

  - User Management

  - Gig Oversight

  - Chat & Review Moderation

  - Stripe Dashboard (if payment list deferred)

- Cards/badges indicate time-sensitive tasks (e.g., "4 chats flagged in
  > last 24h").

- Metrics shown vary by role:

  - **Super Admin**: all metrics, all links

  - **Admin**: gig/user metrics, limited payment data

  - **QA**: moderation only, anonymised data

- Loads within 2 seconds on standard connection.

- Mobile layout supports core monitoring (basic list view).

### **🧠 Developer Notes** {#developer-notes-12 .unnumbered}

- Use role-based config for dashboard modules (role = SUPER_ADMIN \|
  > ADMIN \| QA).

- Initial implementation pulls counts only; full filtering/sorting
  > deferred to analytics (DSH-ADM06).

- All links respect permission logic from requirePermission().

- Prioritise performance: pre-calculate daily summaries via cron or
  > caching if needed.

### **🟡 Questions & Clarifications -- Answered** {#questions-clarifications-answered-4 .unnumbered}

| **Question**                                             | **Recommendation**                                                                             |
|----------------------------------------------------------|------------------------------------------------------------------------------------------------|
| What are the most critical KPIs for each role?           | See tailored metrics list above per role.                                                      |
| Should dashboard include time filters (24h/7d)?          | No for MVP --- save for DSH-ADM06. Use text hints ("past 7 days") on summary cards if helpful. |
| Should content moderation tasks show counts/urgency?     | Yes --- pending moderation queues should be highlighted with badge colours/icons.              |
| Should flagged video bios appear here?                   | No --- review flagged bios via Profile Moderation queue (potential Post-MVP).                  |
| Should review/chat moderation links load filtered pages? | Yes --- link to /admin/reviews?status=pending and /admin/chats?status=flagged directly.        |

### **✅ Recommended Enhancements** {#recommended-enhancements .unnumbered}

- Add a "Today's Activity" module: new users, gigs created, offers sent.

- Optionally include AI moderation summary:

  - "12 reviews auto-approved"

  - "3 chats require manual review"

- Quick action panel: "Approve All Clear Chats" (if safe to batch).

- Soft call-to-action to export CSV or access analytics page (Post-MVP).

DSH-ADM02 User Management

### **👥 DSH-ADM02 -- User Management** {#dsh-adm02-user-management .unnumbered}

**Purpose:**

Enables administrators to oversee the user base, manage account statuses
for security or policy reasons, and assist users with account-related
issues ensuring platform integrity and user support.

### **✅ User Story** {#user-story-17 .unnumbered}

As an **Admin or Super Admin**,

I want to **view, search, filter, and manage user accounts**,

So that I can monitor user activity, and take moderation or support
actions when needed.

### **📋 Definition of Done (DoD)** {#definition-of-done-dod-23 .unnumbered}

- A dedicated User Management page exists at **/admin/users  
  > **

- Displays a **paginated table** of all registered users

- The table includes:

  - Full Name  
    > Email (or masked if QA role)

  - User Role (Buyer / Worker / Both)

  - Account Status (Active / Disabled / Banned)

  - Created Date

  - Pending / verified status for RTW

- Includes **search** functionality by name and email

- Includes **filtering** options by Role and Status

🔒 **Role-Specific Capabilities:**

- **Super Admin**:

  - Can Ban / Unban users

  - Can Disable / Enable accounts

  - (Optional Post-MVP): Can edit user profile fields such as name/email

- **Admin**:

  - Can view user list but cannot take moderation actions

- **QA**:

  - Can view users with limited fields (e.g., masked PII like full
    > email)

🧭 Clicking a user row:

- Leads to a **user detail view or profile preview (Post-MVP)  
  > **

⚙️ Ban/Disable logic:

- Updates relevant flags in UserFlags model (SVR-ADM01)

### **💬 Questions & Clarifications** {#questions-clarifications-4 .unnumbered}

### **Should Super Admins Have Inline Edit Rights for Core Profile Data?** {#should-super-admins-have-inline-edit-rights-for-core-profile-data .unnumbered}

**Answer: Not in MVP.**

🔒 **Why:**

- **Trust & auditability:** Changing user identity fields (e.g., name,
  > email) behind the scenes breaks user trust and complicates audit
  > trails.

- **Security:** It increases the risk of abuse or errors --- especially
  > with AI systems depending on consistent user identifiers.

- **Workflow integrity:** If a name or email is changed without the
  > user's action, Stripe onboarding, verification records, or
  > references may become invalid or mismatched.

### **✅ MVP Recommendation:** {#mvp-recommendation .unnumbered}

- **Super Admins can view core profile fields.  
  > **

- **Changes must be user-initiated** through the platform (e.g., via a
  > request to support, handled separately).

- Optionally, allow Super Admin to **flag** profile data for correction
  > (e.g. typo in name), triggering an AI or user-facing prompt.

<!-- -->

- Is a **detailed user view page** required for MVP, or is the table
  > sufficient?

  - Table is sufficient for MVP

- **What level of visibility** should QA users have?

  - restricted view, masking sensitive fields like full email or phone
    > number.

DSH-ADM03 Gig Management

### **📘 DSH-ADM03 -- Gig Management** {#dsh-adm03-gig-management .unnumbered}

Allows administrative oversight of all job postings and bookings,
enabling support, dispute resolution, and the ability to correct or
moderate gig details if necessary.

**User Story**

As an Admin/Super Admin,

I want to view and moderate/edit details of all gigs on the platform,

So that I can support users, resolve disputes, and ensure policy
compliance.

### **✅ Definition of Done (DoD)** {#definition-of-done-dod-24 .unnumbered}

- A dedicated Gig Management page (/admin/gigs) exists.

- Displays a **paginated, filterable** table of all gigs.

- Table includes key data:

  - Gig title

  - Buyer name

  - Worker name

  - Date/Time

  - Status (e.g., ACCEPTED, IN_PROGRESS, COMPLETE)

  - Rate

  - Moderation status (pending, approved, rejected)

- Search/filtering options:

  - Filter by gig status, buyer, worker, date range.

- Clicking a gig opens a **detailed gig view** with full metadata and
  > linked chat/review history (MVP: basic read-only modal or page).

- (Admin/Super Admin): Ability to **Approve/Reject** flagged gigs where
  > moderationStatus = \'pending\' (linked to SVR-ADM02).

- (Super Admin -- Post-MVP): Ability to **edit core gig details**,
  > including:

  - Rate

  - Start/end time

  - Assigned worker

  - Gig title and description

- (QA): Read-only access, no action buttons.

### **💬 Answers to Open Questions** {#answers-to-open-questions .unnumbered}

1.  **What triggers a gig to have moderationStatus = \'pending\'?  
    >   
    > ** ✅ Initially:

    - Manual flagging by users (Buyer or Worker).

    - Automatic flagging via AI/regex for cash offers or inappropriate
      > content in gig description.  
      >   
      > Post-MVP:

    - Trigger via suspicious keywords or user reputation score.

2.  **What fields should Super Admins be able to edit (Post-MVP)?  
    >   
    > ** ✅ Editable fields should include:

    - Gig title & description (typos, policy violations)

    - Assigned worker (in dispute scenarios)

    - Start/end time and rate (to resolve discrepancies)

    - Notes or internal tags for moderation/audit

3.  **Is a detailed gig view needed for MVP, or is the table enough?  
    >   
    > ** ✅ Yes, a basic detailed view is needed:

    - Allows admins to inspect full gig details before
      > approving/rejecting.

    - Could be a modal or dedicated page depending on build ease.

    - Should include links to related chat and review records for full
      > context.

DSH-ADM04 Content Moderation - Reviews/Chats

### **📘 DSH-ADM04 -- Content Moderation (Reviews & Chats)** {#dsh-adm04-content-moderation-reviews-chats .unnumbered}

Essential for maintaining platform quality and safety by allowing
administrators to filter out inappropriate, spammy, or harmful
user-generated content according to community guidelines.

**User Story**

As an Admin or Super Admin,

I want access to dedicated moderation queues for user-generated content
(reviews and chat messages),

So that I can protect the community, uphold platform standards, and
ensure trust.

### **✅ Definition of Done (DoD)** {#definition-of-done-dod-25 .unnumbered}

**Interface & Functionality**

- Two pages exist in the Admin panel:  
  >   
  > /admin/reviews and /admin/chats.

- Each page shows a default view of items with moderationStatus =
  > \'pending\'.

- Filters available to view:  
  >   
  > pending, approved, rejected, and optionally flagged.

- Content displayed includes:

  - For Reviews;, badge(s), reviewer name, text, gig ID (if internal),
    > skill tag (if external), and moderation status.

  - For Chats: sender name, receiver, timestamp, full message text,
    > related gig, flag reason if flagged by AI.

- Approve / Reject buttons for each content item.

- Status is updated in the database and content visibility adjusted
  > accordingly.

- QA role: **read-only** view of moderation queues.

- Soft delete logic: rejected content is hidden from all public views
  > but retained for audit.

### **🧠 Developer Notes** {#developer-notes-13 .unnumbered}

- **Backend routes** for approving/rejecting content are covered in
  > SVR-ADM02.

- Chat and review records include:

  - moderationStatus: pending, approved, rejected, flagged

  - flagReason (e.g., "cash offer", "offensive language")

  - confidenceScore (if flagged by AI)

- AI Moderation is handled by SVR-C06:

  - All chat messages are scanned using regex and/or OpenAI's Moderation
    > API.

  - Reviews are flagged if they contain abusive language, off-platform
    > links, or appear spammy.

  - System assigns:

    - FLAGGED if clear violation

    - PENDING_REVIEW if uncertain

    - APPROVED if clean

- Admins can override AI decisions at any time.

- Messages flagged by AI are **not shown in real-time chat** until
  > approved.

### **❓ Questions & Clarifications** {#questions-clarifications-5 .unnumbered}

1.  **What criteria flag content for review?  
    > **

    - Chat: contact info, cash/payment terms, offensive terms, AI
      > Moderation API

    - Reviews: links, insults, repeated 1-star reviews (anti-abuse
      > pattern)

2.  **Can Admins edit content before approval?  
    > **

    - ❌ No --- standard is approve/reject only. Editing introduces
      > liability and moderation bias.

3.  **What happens to rejected content?  
    > **

    - Soft-deleted (hidden from user view) but retained in the database
      > with status rejected.

4.  **Is batch moderation required?  
    > **

    - ✅ Post-MVP: bulk approve/reject for high-volume cases. MVP =
      > single action per item.

DSH-ADM05 Payment Oversight

📘 **DSH-ADM05 -- Payment Oversight**

Provides financial oversight for the platform, enabling support teams to
investigate payment issues, verify transactions, and (for authorized
roles) manage refunds or disputes.

### **✅ User Story** {#user-story-18 .unnumbered}

As an Admin or Super Admin,

I want to view and inspect all platform payment records,

So that I can monitor financial flows, support dispute resolution, and
ensure payment integrity.

### **✅ Definition of Done (DoD)** {#definition-of-done-dod-26 .unnumbered}

A dedicated Payments page is accessible at /admin/payments.

**Displays:**

- A paginated table of all payment records (excluding test records by
  > default).

- Key columns:  
  >   
  > • **Payer (Buyer)  
  >   
  > ** • **Receiver (Freelancer)  
  >   
  > ** • **Gig Title  
  >   
  > ** • **Amount Paid  
  >   
  > ** • **Payment Status** (Pending, Paid, Failed, Refunded)  
  >   
  > • **Date of Payment  
  >   
  > ** • **Stripe Session ID** (optional, linkable)

**Filtering/Searching:**

- By:  
  >   
  > • Status  
  >   
  > • Date Range  
  >   
  > • User (Payer/Receiver email or name)

**Permissions:**

- **Super Admin:  
  >   
  > ** • View full payment details  
  >   
  > • See all Stripe metadata  
  >   
  > • (Post-MVP) Initiate refund from Stripe via API or dashboard link  
  >   
  > • View linked gig and user profiles

- **Admin:  
  >   
  > ** • View-only access to core fields  
  >   
  > • Cannot perform Stripe actions  
  >   
  > • Cannot see raw Stripe metadata

- **QA:  
  >   
  > ** • View payments where isTesting = true  
  >   
  > • Amounts optionally masked or test label shown

### **🧠 Questions & Clarifications --- Answered** {#questions-clarifications-answered-5 .unnumbered}

| **❓ Question**                                                        | **✅ Answer**                                                                                                                                             |
|------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------|
| **What level of payment detail should Admin vs Super Admin see?**      | Super Admins get full financial details; Admins get limited view with no sensitive Stripe metadata; QA sees only mock/test payments.                      |
| **Is direct refund initiation from the admin panel required for MVP?** | ❌ Not required for MVP --- use Stripe dashboard if needed. ✅ Post-MVP: can build refund initiation via API for Super Admins only.                       |
| **How are payment disputes handled and reflected here?**               | MVP: flag the payment manually with a status field (e.g., "Disputed"). Post-MVP: integrate with Stripe dispute API to fetch status updates automatically. |
| **Should the page support linking to Stripe dashboard directly?**      | ✅ Yes --- link via Stripe Session ID for investigation. Super Admins only.                                                                               |

DSH-ADM06 Analytics View

### **📊 DSH-ADM06 -- Analytics View** {#dsh-adm06-analytics-view .unnumbered}

**Purpose:**

Provides data-driven insights into platform performance, user behaviour,
and financial trends to inform business decisions, identify bottlenecks,
and track growth.

### **✅ User Story** {#user-story-19 .unnumbered}

**As an** Admin or Super Admin,

**I want** to access detailed platform analytics (user growth, gig
volume, revenue, AI usage)

**So that** I can understand trends, monitor KPIs, and support platform
scaling decisions.

### **🎯 Definition of Done (DoD)** {#definition-of-done-dod-27 .unnumbered}

- A dedicated **Analytics page** exists at /admin/analytics (or possibly
  > used as the main admin dashboard DSH-ADM01).

- Key charts and metrics displayed:

  - 📈 **User Registration Trends** (line chart)

  - 📊 **Gig Volume & Completion Rates** (line or bar chart)

  - 💸 **Revenue Trends** (based on completed, non-test Stripe payments)

  - 🧠 **AI Usage Stats** (e.g., % of successful AI matches,
    > fallback/override usage --- *Post-MVP*)

  - **promo** Track number of buyers using 2FREEABLE promo (see
    > SVR-PROMO01)

- Filtering by **date range** (e.g., last 7 days, last 30 days).

- Role-specific permissions:

  - **Super Admin**: Can view all data and export reports (Post-MVP).

  - **Admin/QA**: Can view metrics but not export. QA may see test data
    > or labelled segments.

### **🟡 Post-MVP Features** {#post-mvp-features .unnumbered}

- **CSV or Excel export** of filtered reports.

- **Segment filters** by skill type, region, or user role.

- AI usage breakdown (e.g., suggestions accepted vs. edited).

- Cross-feature correlations (e.g., gig completion rate vs. review
  > volume).

### **🔍 Questions & Clarifications** {#questions-clarifications-6 .unnumbered}

| **Question**                               | **Recommendation**                                                                                                                             |
|--------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------|
| ❓ What are the most critical MVP metrics? | ✅ Stick to: user registrations, active users, gigs posted/completed, total payments made, review count, recommendation count, badges awarded. |
| ❓ Where does AI usage data come from?     | ✅ Log every AI suggestion (e.g., ranking, gig match, prompt use) to a new AIInteractionLog table --- later query for analytics.               |
| ❓ What format is needed for exports?      | ✅ CSV initially, scoped by date range and filtered metric.                                                                                    |
| ❓ Should charts show test data?           | ✅ QA-only view may include test data, but clearly labelled. Admin/Super Admin views should exclude isTesting = true.                          |

### **💡 Notes** {#notes .unnumbered}

- For MVP, you could **defer full visual charts** and start with a basic
  > **summary table** per metric.

- Exporting should be **disabled for QA** roles to prevent leakage of
  > sensitive data.

- Avoid exposing PII unless absolutely required --- counts and trends
  > are sufficient for most admin needs.

- AI usage logging must be **designed at the service layer** so this
  > feature doesn't block launch.

DSH-ADM07 AI Prompt Management

### **📘 DSH-ADM07 -- AI Prompt Management** {#dsh-adm07-ai-prompt-management .unnumbered}

**User Story**

As a Super Admin,

I want an interface to view, edit, and create the AI prompts used
throughout the platform (e.g., chatbot responses, suggestions),

So that I can fine-tune Able's AI behaviour without needing code
changes.

### **✅ Definition of Done (DoD)** {#definition-of-done-dod-28 .unnumbered}

- A dedicated AI Prompts page (/admin/ai-prompts) exists and is
  > accessible only to Super Admins.

- The page displays a table of all prompts stored in the AiPrompt table,
  > showing:

  - promptKey (string, unique ID)

  - promptText (the actual instruction)

  - lastUpdatedAt (timestamp)

- Super Admins can:

  - Edit the promptText for existing keys.

  - Add new prompts using a form (entering both key and text).

- Changes are stored in the database and fetched dynamically by the AI
  > logic at runtime (no server redeploy needed).

- (Post-MVP): Option to delete prompts, with a confirmation modal.

- (Post-MVP): Prompt versioning enabled with rollback/view history
  > support.

### **⚙️ Technical Notes** {#technical-notes .unnumbered}

- Prompts are stored in an AiPrompt table.

- Backend fetches prompts by key at runtime (e.g.,
  > getPrompt(\"chat_intro\")).

- Prompt keys should follow a naming convention (e.g., chat_intro_buyer,
  > flagged_msg_warning).

- Avoid empty or duplicate keys. Validation required on both fields.

- All AI features using prompts must fall back gracefully if a key is
  > missing or misconfigured.

### **❓ Questions & Clarifications (Answered)** {#questions-clarifications-answered-6 .unnumbered}

| **Question**                         | **Decision**                                                                  |
|--------------------------------------|-------------------------------------------------------------------------------|
| How are prompts fetched?             | Fetched by key at runtime via a helper function.                              |
| Should prompt keys be validated?     | Yes -- must be unique, non-empty, and follow a naming convention.             |
| Do we need versioning/history?       | Not for MVP, but strongly recommended for Post-MVP.                           |
| Can prompts break things if deleted? | Yes. For MVP, deletion should be blocked or gated behind Post-MVP guardrails. |

DSH-ADM08 Admin Log Viewer

### **DSH-ADM08 -- Admin Log Viewer** {#dsh-adm08-admin-log-viewer .unnumbered}

**Purpose**

Provides an essential audit trail of administrative actions, enhancing
security, accountability, and troubleshooting capabilities by showing
who did what and when within the admin panel.

### **🧑‍💼 User Story** {#user-story-20 .unnumbered}

As an Admin or Super Admin,

I want to view a comprehensive log of actions taken by administrators
within the admin panel,

So that I can audit changes, investigate issues, and ensure
accountability across the platform.

### **✅ Definition of Done (DoD)** {#definition-of-done-dod-29 .unnumbered}

- A dedicated **Admin Logs** page is accessible at /admin/logs.

- Page displays a **paginated table** of records from the AdminLog
  > database table.

- Each log entry includes:

  - Admin Name (linked to admin user)

  - Action Performed (e.g., "Ban User", "Update Gig", "Edit Prompt")

  - Target Resource (table + record ID)

  - Timestamp (UTC)

- The table includes **filtering options**:

  - Admin User

  - Action Type

  - Target Table

  - Date Range

- (Post-MVP): Full-text search across actions and targets.

- (Post-MVP): Ability to click on a log item to view full change
  > metadata (previous value → new value).

- (QA users): View-only access may be limited or masked depending on
  > permissions.

### **📌 Additional Requirements** {#additional-requirements .unnumbered}

- Logging is implemented via a shared helper (e.g., createAdminLog) used
  > across all action handlers that perform significant admin actions.

- Logs are **immutable** (no update/delete).

- (Optional future): Logs may include a diff of before/after values
  > (e.g., name changed from X → Y).

- (Optional future): Export logs as CSV for legal/compliance reviews.

### **🤖 Examples of Significant Actions to Log** {#examples-of-significant-actions-to-log .unnumbered}

- Ban or unban a user

- Disable or enable account

- Approve or reject content (e.g., reviews, chats, prompts)

- Edit profile video or AI prompt

- Trigger refund or payment adjustment

- Modify gig or booking data

- Promote/demote another admin

### **❓Questions & Clarifications** {#questions-clarifications-7 .unnumbered}

Absolutely --- here are direct, clear answers to the **DSH-ADM08**
questions:

### **❓**  {#section-69 .unnumbered}

### **Should log entries include data diffs (before/after values)?** {#should-log-entries-include-data-diffs-beforeafter-values .unnumbered}

**Answer:**

➡️ **Not in MVP.**

Capturing diffs increases implementation complexity and database load.

✅ Recommended for **Post-MVP**, especially for audit-critical fields
like gig rates, user status, and payments.

**Suggestion:**

Log only the action type + target (e.g. "Changed user name") in MVP. Add
before/after later with a changeDetails JSON field.

### **❓**  {#section-70 .unnumbered}

### **What is the log retention policy?** {#what-is-the-log-retention-policy .unnumbered}

**Answer:**

➡️ **Retain logs for at least 1 year in MVP**.

This supports internal accountability and early operational reviews.

**Post-MVP:**

- Consider extending to 5+ years if needed for tax, Stripe, or legal
  > inquiries.

- Add archive logic or export-to-storage mechanism if needed at scale.

### **❓**  {#section-71 .unnumbered}

### **Should QA logs be separated or merged with full logs but filtered by isTesting=true?** {#should-qa-logs-be-separated-or-merged-with-full-logs-but-filtered-by-istestingtrue .unnumbered}

**Answer:**

✅ **Merged, with clear flagging.**

Add a testMode: true/false field to log entries. QA users see only their
logs or logs related to testMode: true.

This avoids confusion and simplifies the schema while maintaining
clarity.

### **❓**  {#section-72 .unnumbered}

### **Should Super Admins be able to view/edit logs of other Super Admins?** {#should-super-admins-be-able-to-viewedit-logs-of-other-super-admins .unnumbered}

**Answer:**

✅ **View: Yes.**

They must be able to audit all actions, including those by peers.

❌ **Edit: No.**

Logs should be **immutable** once written to maintain audit integrity.

✅ Post-MVP: consider a "note" or "explanation" field instead of edits.

- 

DSH-ADM09 Admin User Settings

### **🧑‍💼 DSH-ADM09 -- Admin User Settings** {#dsh-adm09-admin-user-settings .unnumbered}

**Purpose:**

Allows Super Admins to provision, promote, demote, disable, or re-enable
Admin and QA accounts, helping to control platform access and
responsibilities.

### **User Story** {#user-story-21 .unnumbered}

As a **Super Admin**,

I want a settings area to manage admin users (Admin and QA roles),

So that I can securely control who has backend access and what level of
privileges they have.

### **✅ Definition of Done (DoD)** {#definition-of-done-dod-30 .unnumbered}

- A dedicated Admin Settings page exists at /admin/settings,
  > **accessible only to Super Admins**.

- The page:

  - Displays a list/table of current admin users (Super Admin, Admin,
    > QA).

  - Provides a **form to create a new admin user**, including:

    - Name

    - Email

    - Temporary Password

    - Role selection (Admin or QA)

    - ⚠️ Uses secure register logic (SVR-A01).

  - Allows role modification for existing Admin or QA users.

  - Allows enabling/disabling admin accounts using UserFlags
    > (SVR-ADM01).

  - (Post-MVP): Ability to delete Admin accounts safely (with checks on
    > logs/associations).

### **❓ Questions & Clarifications -- Answered** {#questions-clarifications-answered-7 .unnumbered}

**Q1: How should the initial password for a new admin be handled?**

🔐 Best practice:

- Generate a secure temporary password (e.g., random alphanumeric
  > string).

- Email the password to the new admin with a prompt to **reset upon
  > first login**.

- Force a password reset workflow on first login to enhance security.

**Q2: Can Super Admins manage other Super Admins?**

🛑 Recommendation:

- **No**, Super Admin accounts should not be editable or demotable by
  > other Super Admins by default.

- Protects against lockouts or misuse unless there's a clear escalation
  > workflow.

- If needed, this capability could be gated behind a **two-person action
  > or elevated approval flow** in the future.

**Q3: Should the same page be used to promote regular users to Admins?**

🚫 No, keep separation clear. This settings page should only manage
existing admin accounts. Promotions from regular user to admin should be
**intentional and rare**, likely via a manual DB update or separate
Super Admin tool (Post-MVP).

DSH-ADM10 QA Tools

### **📘 Epic: DSH-ADM10 -- QA Tools** {#epic-dsh-adm10-qa-tools .unnumbered}

**Purpose:**

Enables the QA team to generate controlled, isolated test data for
feature verification and regression testing, without contaminating
production records.

### **🧑‍💼 User Story** {#user-story-22 .unnumbered}

As a **QA Admin**,

I want a secure panel for generating mock data and simulating test
conditions,

So that I can validate platform behaviour without relying on production
traffic.

### **✅ Definition of Done (DoD)** {#definition-of-done-dod-31 .unnumbered}

- A dedicated route (/admin/qa-tools) is implemented and accessible only
  > to users with the QA role.

- The page provides secure buttons/forms to:

  - ✅ Create **Mock Payment** with buyer/worker references and a
    > specified amount (required for MVP).

    - These entries use isTesting = true flag.

  - ⏳ (Post-MVP) Create **Test Users** (pre-filled buyer or worker
    > accounts).

  - ⏳ (Post-MVP) Create **Test Gigs** linked to test users.

  - ⏳ (Post-MVP) **Simulate Events**, e.g., "Trigger Gig Completed
    > Notification for Gig X".

- A recent activity section shows previously generated mock payments
  > (including timestamp and entities involved).

- All actions here may:

  - Be logged separately,

  - Or be excluded from standard AdminLog, to avoid polluting analytics.

- Test items should clearly indicate test-only status in both admin and
  > user interfaces.

### **❓ Questions & Clarifications -- Now Answered** {#questions-clarifications-now-answered .unnumbered}

| **Question**                                                             | **Answer**                                                                                                                                                                               |
|--------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **What specific test data tools are essential for MVP QA?**              | Only **mock payments** are critical for MVP testing (e.g., validating Stripe webhook logic, payout summaries). Other tools are optional for now.                                         |
| **How should test data be distinguished from real data?**                | Use an isTesting: true flag across models (User, Gig, Payment). This flag should be consistently checked across frontend views, dashboards, and analytics to grey out/hide test entries. |
| **Should test actions be logged?**                                       | Yes, but optionally separate from main admin logs. Could use a separate QaLog table, or a log type = \"qa\" if merged into AdminLog.                                                     |
| **Can QA simulate notifications (e.g., trigger "Gig Completed" alert)?** | Not needed for MVP, but a "Simulate Event" panel is ideal Post-MVP for regression and flow testing (e.g., Gig updates, Payment received).                                                |

DSH-ADM11 Review / Intervene AI-Resolved Issues

## **📘 DSH-ADM11 -- Review / Intervene AI-Resolved Issues** {#dsh-adm11-review-intervene-ai-resolved-issues .unnumbered}

### **🧑‍💻 User Story -- AI-First Support Flow** {#user-story-ai-first-support-flow .unnumbered}

### **As a member of the Able support team,** {#as-a-member-of-the-able-support-team .unnumbered}

### I want the AI assistant to handle reported gig issues first, {#i-want-the-ai-assistant-to-handle-reported-gig-issues-first .unnumbered}

### So that common problems are resolved automatically and only complex cases are escalated to humans. {#so-that-common-problems-are-resolved-automatically-and-only-complex-cases-are-escalated-to-humans. .unnumbered}

###  {#section-73 .unnumbered}

### **✅ Definition of Done (DoD)** {#definition-of-done-dod-32 .unnumbered}

### A dashboard view exists at /admin/ai-resolutions.  {#a-dashboard-view-exists-at-adminai-resolutions.}

### Displays a table of reported issues with:  {#displays-a-table-of-reported-issues-with}

### User info (submitter)  {#user-info-submitter}

### Linked gig  {#linked-gig}

### Issue type (payment, no-show, safety, etc.)  {#issue-type-payment-no-show-safety-etc.}

### AI-generated response summary  {#ai-generated-response-summary}

### Resolution status: resolved_by_ai, escalated, pending_review  {#resolution-status-resolved_by_ai-escalated-pending_review}

### Timestamps and chat transcript ID  {#timestamps-and-chat-transcript-id}

### Admins can:  {#admins-can}

### Filter by status or issue type  {#filter-by-status-or-issue-type}

### View full transcript between user and AI  {#view-full-transcript-between-user-and-ai}

### Override outcome (mark as reopened, resolved_human, or escalate)  {#override-outcome-mark-as-reopened-resolved_human-or-escalate}

### Add notes and reassign to support agent  {#add-notes-and-reassign-to-support-agent}

### All actions logged (see DSH-ADM08).  {#all-actions-logged-see-dsh-adm08.}

### Escalations trigger notifications to the support inbox or staff queue.  {#escalations-trigger-notifications-to-the-support-inbox-or-staff-queue.}

###  {#section-74 .unnumbered}

### **🤖 AI Handling Logic (MVP Scope)** {#ai-handling-logic-mvp-scope .unnumbered}

### **User Reports Issue ** {#user-reports-issue}

### Via form or "Chat with Able" button.  {#via-form-or-chat-with-able-button.}

### Categories: payment, lateness, cancellation, behaviour, safety.  {#categories-payment-lateness-cancellation-behaviour-safety.}

### **AI Intervention (AbleBot) ** {#ai-intervention-ablebot}

### Uses intent classification + policy templates.  {#uses-intent-classification-policy-templates.}

### Responds with next steps based on issue category.  {#responds-with-next-steps-based-on-issue-category.}

### Can confirm backend status (e.g. gig marked complete, payment pending).  {#can-confirm-backend-status-e.g.-gig-marked-complete-payment-pending.}

### Offers resolution: info, refund flow, policy explanation, or escalate.  {#offers-resolution-info-refund-flow-policy-explanation-or-escalate.}

### If accepted by the user, issue is marked resolved_by_ai.  {#if-accepted-by-the-user-issue-is-marked-resolved_by_ai.}

### **Escalation Triggers ** {#escalation-triggers}

### User requests escalation  {#user-requests-escalation}

### Sentiment is negative or urgent  {#sentiment-is-negative-or-urgent}

### AI fails to resolve in 3--5 messages  {#ai-fails-to-resolve-in-35-messages}

### **System Updates ** {#system-updates}

### Issue record created with fields:  {#issue-record-created-with-fields}

### resolution_type: ai / manual  {#resolution_type-ai-manual}

### status: resolved_by_ai, escalated, etc.  {#status-resolved_by_ai-escalated-etc.}

### chat_transcript_id  {#chat_transcript_id}

### ai_handled: true  {#ai_handled-true}

###  {#section-75 .unnumbered}

### **🕵️ Admin Controls** {#admin-controls .unnumbered}

### Admins can:  {#admins-can-1}

### View full chat thread  {#view-full-chat-thread}

### Override AI decisions  {#override-ai-decisions}

### Add human notes and change status  {#add-human-notes-and-change-status}

### Message user via support chat  {#message-user-via-support-chat}

### Apply manual adjustments (pay, awards, etc.)  {#apply-manual-adjustments-pay-awards-etc.}

### Resolution can be updated to:  {#resolution-can-be-updated-to}

### reopened  {#reopened}

### in_progress  {#in_progress}

### resolved_human  {#resolved_human}

###  {#section-76 .unnumbered}

### **📌 Developer Considerations** {#developer-considerations .unnumbered}

### Use single IssueReport table with:  {#use-single-issuereport-table-with}

### status, resolution_type, chat_transcript_id, ai_handled  {#status-resolution_type-chat_transcript_id-ai_handled}

### AI responses saved alongside user chat for audit  {#ai-responses-saved-alongside-user-chat-for-audit}

### Monthly review of false resolutions and escalation time (Post-MVP)  {#monthly-review-of-false-resolutions-and-escalation-time-post-mvp}

### UI should visually separate AI-handled and human-handled threads  {#ui-should-visually-separate-ai-handled-and-human-handled-threads}

###  {#section-77 .unnumbered}

### **📌 Key Clarifications & Recommendations** {#key-clarifications-recommendations .unnumbered}

### **Q1: What triggers an issue to be routed here?** {#q1-what-triggers-an-issue-to-be-routed-here .unnumbered}

### Gig workers can tap **"Report an issue"** on completed gigs.  {#gig-workers-can-tap-report-an-issue-on-completed-gigs.}

### Categories include: underpaid, unsafe condition, abusive buyer, etc.  {#categories-include-underpaid-unsafe-condition-abusive-buyer-etc.}

### These are parsed by AI and routed to /admin/ai-resolutions.  {#these-are-parsed-by-ai-and-routed-to-adminai-resolutions.}

### **Q2: What determines when AI marks an issue as resolved?** {#q2-what-determines-when-ai-marks-an-issue-as-resolved .unnumbered}

### The resolution is marked resolved_by_ai only if:  {#the-resolution-is-marked-resolved_by_ai-only-if}

### AI suggests an action (e.g., flag buyer, notify admin, issue refund)  {#ai-suggests-an-action-e.g.-flag-buyer-notify-admin-issue-refund}

### AND the worker accepts the outcome (implicit or explicit)  {#and-the-worker-accepts-the-outcome-implicit-or-explicit}

### **Q3: Should admins be able to override or edit AI outcomes?** {#q3-should-admins-be-able-to-override-or-edit-ai-outcomes .unnumbered}

### ✅ Yes. Super Admins and designated Support Admins can: {#yes.-super-admins-and-designated-support-admins-can .unnumbered}

### Reopen and modify outcome  {#reopen-and-modify-outcome}

### Flag abuse of the reporting system  {#flag-abuse-of-the-reporting-system}

### Add explanatory notes  {#add-explanatory-notes}

### **Q4: What level of visibility is needed for these logs?** {#q4-what-level-of-visibility-is-needed-for-these-logs .unnumbered}

### All outcomes should be visible in the **Admin Logs (DSH-ADM08)**, including:  {#all-outcomes-should-be-visible-in-the-admin-logs-dsh-adm08-including}

### Initial AI response  {#initial-ai-response}

### Admin overrides or escalations  {#admin-overrides-or-escalations}

### Final resolution status  {#final-resolution-status}

### **Q5: How is abuse of the AI system handled?** {#q5-how-is-abuse-of-the-ai-system-handled .unnumbered}

### If the AI detects repeated false reports or malicious input:  {#if-the-ai-detects-repeated-false-reports-or-malicious-input}

### It can flag the user for review  {#it-can-flag-the-user-for-review}

### Admins can mark a report as "malicious" and suspend reporting rights  {#admins-can-mark-a-report-as-malicious-and-suspend-reporting-rights}

###  {#section-78 .unnumbered}

###  {#section-79 .unnumbered}

### **Admin/Support User Story -- AI-First Issue Handling Flow** {#adminsupport-user-story-ai-first-issue-handling-flow .unnumbered}

**Title:** Use AI to Handle Reported Gig Issues Before Human Escalation

**As a** member of the Able support team,

**I want** the AI agent to act as the first point of contact when a gig
worker reports an issue,

**So that** common problems can be resolved quickly and human
intervention is only required when necessary.

### **✅ Acceptance Criteria:** {#acceptance-criteria-20 .unnumbered}

#### **Step 1: AI Issue Handling (Default Path)** {#step-1-ai-issue-handling-default-path .unnumbered}

1.  **User submits issue via form or chat (see previous story).  
    > **

2.  AI Assistant (AbleBot) appears immediately in the chat window:

    - Acknowledges the issue type (e.g., "Looks like you're facing a
      > payment issue. Let me help.")

    - Suggests relevant next steps based on issue category:

      - **Payment issue:** Confirms payment timeline, checks if gig is
        > marked complete, or if buyer has approved.

      - **Schedule/no-show:** Explains cancellation policies, late
        > arrival rules, or no-show protocol.

      - **Dispute or behaviour issue:** Shares conflict resolution
        > process or encourages calm documentation before escalation.

      - **Safety issue:** Urgently flags risk, reassures user, and
        > begins auto-escalation with minimal delay.

3.  If the issue appears resolved:

    - AI logs the exchange.

    - Updates issue status to **"Resolved by AI"**.

    - Offers user the option to **reopen or escalate** if they're
      > unsatisfied.

#### **Step 2: Human Escalation (if user persists)** {#step-2-human-escalation-if-user-persists .unnumbered}

1.  If the user **explicitly requests escalation**, or the AI cannot
    > resolve the issue:

    - A support ticket is created with all chat logs, original issue,
      > attachments.

    - Status changes to **"Pending Human Review"**.

    - A support team member is notified and picks up the case in the
      > admin dashboard.

2.  User receives:

    - A confirmation: *"I've raised this to our human support team.
      > We'll be in touch shortly."  
      > *

    - Optional estimated response time (e.g. "within 24 hours").

### **🤖 AI Logic Notes (for MVP scope):** {#ai-logic-notes-for-mvp-scope .unnumbered}

- Use intent classification to categorise issue types from user input.

- Reference Able's internal policies for each issue category to drive
  > responses.

- Escalation triggers:

  - User explicitly asks to speak to someone.

  - Message sentiment includes frustration or urgency.

  - AI fails to handle issue within 3--5 messages.

### **🧠 Developer Considerations:** {#developer-considerations-1 .unnumbered}

- Integrate AI via existing chatbot component (see Chat with Able in
  > UI).

- Save all AI responses and user messages to a support_thread for
  > context.

- Allow AI to check backend status (e.g., gig completed? marked paid?)
  > if permissions allow.

Here's a **sample AI conversation flow** for a common gig worker issue:
a **payment delay**. This assumes the AI assistant ("AbleBot") has
access to relevant gig and payment status data.

### **🤖 Sample AI Conversation Flow** {#sample-ai-conversation-flow .unnumbered}

**Issue Type:** Payment Issue

**User Path:** Submits issue via form or clicks "Chat with Able"

**AbleBot:**

Hi there! I see you're reporting a **payment issue**. Let's get that
sorted.

Can you confirm which gig this is about?

**Worker:**

It's the bartender gig at Central Station on Monday.

**AbleBot:**

Thanks! I found that gig in your history. ✅

Let me quickly check the payment status...

*(AI pings backend and sees the gig was marked complete yesterday, but
buyer hasn't paid yet.)*

**AbleBot:**It looks like the gig is marked complete, but the **buyer
hasn't processed the payment yet.**

That's usually required before payment can be issued.

Here's what you can do:

- Wait for the buyer to pay (they've been notified).

- If you think this is a mistake, I can raise it to our team.

Would you like me to do that?

**Worker:**

Yes, raise it please.

**AbleBot:**

Done ✅

I've raised this to our support team and shared your gig details.

You'll hear back within **24 hours**. In the meantime, you can check
your gig status anytime from your dashboard.

Is there anything else I can help you with?

**System Notes:**

- Issue is logged as:

  - type: payment

  - status: escalated_to_support

  - AI_handled: true

  - chat_transcript_id: \[UUID\]

- Escalation notification goes to support inbox/dashboard.

**Admin User Story -- Review AI-Resolved Issues & Intervene If
Necessary**

**ID:** ADM-SUP02-AI

**Title:** Review and Manage Gig Issues Resolved by AI

**As a** support team member,

**I want to** view and audit issues marked as resolved by the AI
assistant,

**So that** I can ensure quality, handle exceptions, and intervene if
the worker wasn't truly helped.

### **✅ Acceptance Criteria** {#acceptance-criteria-21 .unnumbered}

#### **🧾 1. View AI-Resolved Issues** {#view-ai-resolved-issues .unnumbered}

- Admin dashboard includes a **filter for issues marked "Resolved by
  > AI."  
  > **

- Each entry includes:

  - User details (worker ID, gig ID, buyer ID)

  - Issue type

  - Time and date of report

  - Status: resolved_by_ai

  - **Full chat transcript** between worker and AI

  - Any attached files or structured fields (e.g. hours, role, pay)

#### **🕵️‍♀️ 2. Review and Override AI Resolutions** {#review-and-override-ai-resolutions .unnumbered}

- Admin can click **"Review Resolution"** to:

  - Read full context

  - Add internal notes

  - Mark the resolution as:

    - **Valid / No Action Needed  
      > **

    - **Needs Follow-up** (updates status to reopened)

- If "Needs Follow-up" is selected:

  - Issue is assigned to a support agent

  - Worker receives a message:  
    >   
    > *"A member of the Able team is now reviewing your issue."  
    > *

#### **✏️ 3. Manual Interventions & Follow-up** {#manual-interventions-follow-up .unnumbered}

- Admin/support agent can:

  - Message worker directly through in-app chat

  - Apply adjustments (e.g. pay corrections, buyer penalties, manual
    > awards)

  - Reclassify issue or escalate to legal/compliance if serious

- Status changes to in_progress, then resolved_human once completed.

### **🧠 Developer Notes** {#developer-notes-14 .unnumbered}

- Keep AI-handled issues **in the same table** as other support issues,
  > with a resolution_type field (ai, manual, pending).

- Audit trail is key: log any admin edits, overrides, or decisions with
  > timestamps and staff IDs.

- Optional: run **monthly review of AI resolution success rate**, false
  > resolutions, and average escalation time.

SVR-ADM01 Admin Data Access

## **📘 SVR-ADM01 -- Admin Data Access** {#svr-adm01-admin-data-access .unnumbered}

### **🧑‍💻 System Story** {#system-story-6 .unnumbered}

The backend must provide secure, role-based endpoints and loaders for
the admin panel, ensuring that all admin interactions (viewing,
updating, or deleting data) are correctly permission-gated and logged.

### **✅ Definition of Done (DoD)** {#definition-of-done-dod-33 .unnumbered}

- All Next loaders and actions in /admin/\... routes are implemented.

- All server actions use **Drizzle** to:

  - Fetch relevant data for the admin UI (e.g., users, gigs, chats,
    > payments).

  - Modify records with strong validation and error handling.

- All sensitive actions run a helper like requirePermission() to check:

  - User is authenticated

  - User has required role (SUPER_ADMIN, ADMIN, QA)

  - User has access to requested resource

- Role-based restrictions:

  - SUPER_ADMIN: full access (all records, all actions)

  - ADMIN: view + moderate (no destructive actions)

  - QA: view-only for test data; no PII or real data access

- Data fetching includes necessary joins (e.g., User with Profile, Gig
  > with Buyer).

- Error handling and permission failures result in clean, user-friendly
  > errors.

- PII fields (emails, phone numbers) are excluded or masked for QA
  > users.

### **❓ Questions & Clarifications -- Answered** {#questions-clarifications-answered-8 .unnumbered}

**Q1: Confirm the exact data access needs for each admin role on each
resource.**

| **Resource**     | **SUPER_ADMIN**          | **ADMIN**          | **QA**                      |
|------------------|--------------------------|--------------------|-----------------------------|
| Users            | View, Ban/Unban, Disable | View-only, no edit | View-only (test users only) |
| Gigs             | Full view/edit           | View-only          | View-only (test gigs only)  |
| Reviews/Chats    | Approve/Reject           | Approve/Reject     | View-only                   |
| Payments         | View + Refund (Stripe)   | View-only          | ❌ No access                |
| AI Prompt Config | Full access              | ❌ None            | ❌ None                     |
| Logs             | Full view                | View-only          | Restricted or no access     |
| Test Data (QA)   | ✅ Full access           | ⚠️ Optional        | ✅ Full access              |

> You can adjust this table to suit future business rules, but this
> gives developers clear implementation parameters.

SVR-ADM02 Moderation Logic

## **📘 SVR-ADM02 -- Moderation Logic** {#svr-adm02-moderation-logic .unnumbered}

### **Purpose:**  {#purpose-1 .unnumbered}

### Provides the backend mechanism for the content moderation workflow, allowing admin decisions (approve/reject) to be persisted and reflected in the visibility or status of user-generated content or platform items. {#provides-the-backend-mechanism-for-the-content-moderation-workflow-allowing-admin-decisions-approvereject-to-be-persisted-and-reflected-in-the-visibility-or-status-of-user-generated-content-or-platform-items. .unnumbered}

### **🧠 System Story** {#system-story-7 .unnumbered}

- The backend must provide a robust moderation system to control the
  > visibility and trustworthiness of user-generated content.

- Admins must be able to approve or reject content, and moderation
  > status must be respected by all public-facing components.

- The system needs flags (moderationStatus) on relevant models (Reviews,
  > Chats, Profiles) and backend logic to handle the approve/reject
  > actions from the admin panel.

### **✅ Definition of Done (DoD)** {#definition-of-done-dod-34 .unnumbered}

- A moderationStatus field (string enum) is added to key Drizzle models:

  - ✅ Review

  - ✅ ChatMessage

  - ✅ Gig

  - ✅ GigWorkerProfile (for bio/video intro, etc.)

- Enum values:

  - \'pending\'

  - \'approved\'

  - \'rejected\'

  - (optional Post-MVP: \'flagged\')

- Default value on all models is \'pending\'.

- Admin panel actions (e.g. in DSH-ADM03, DSH-ADM04) can:

  - Update the moderationStatus to \'approved\' or \'rejected\'

  - Log the action (SVR-ADM03)

- Public and buyer-facing frontend queries:

  - Filter to only display records where moderationStatus = \'approved\'

  - Rejected or pending content must never be visible in the user
    > interface or AI-driven summaries

### **❓ Questions & Clarifications -- Answered** {#questions-clarifications-answered-9 .unnumbered}

| **Question**                                                     | **Answer**                                                                                                                                                                              |
|------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Which specific models require a moderationStatus?**            | ✅ Review, ChatMessage, Gig, and GigWorkerProfile (specifically the public-facing parts such as video bio and written bio)                                                              |
| **What is the default visibility of content before moderation?** | ❌ Not visible --- content with moderationStatus = \'pending\' is hidden from all public or matched views. AI agents can read pending content but must not recommend it until approved. |
| **Do we need a 'flagged' status in MVP?**                        | ❌ Not required for MVP --- flagged items should remain as pending with a flagReason. Add a separate moderation flag or sentiment field if needed post-MVP.                             |
| **Should edits reset moderation status?**                        | ✅ Yes. Any meaningful edit to content (review, profile bio, gig description) should reset moderationStatus to \'pending\'.                                                             |
| **How are moderation changes logged?**                           | ✅ Every status change is recorded via createAdminLog() (SVR-ADM03), including who approved/rejected it, when, and optionally why.                                                      |

### **🛠️ Developer Notes** {#developer-notes-15 .unnumbered}

- moderationStatus logic should be implemented consistently across:

  - Admin dashboard actions

  - Content creation and update flows

  - Public content queries

- Add a helper like isApproved(content) to centralise visibility checks

- Ensure rejection or deletion does not physically remove the record
  > from the DB

SVR-ADM03 Admin Action Logging

## **📘 SVR-ADM03 -- Admin Action Logging** {#svr-adm03-admin-action-logging .unnumbered}

Creates an immutable audit trail, crucial for security investigations,
accountability, and understanding how administrative changes impacted
the platform or specific users.

### **🧠 System Story** {#system-story-8 .unnumbered}

To ensure platform accountability and traceability, the system must log
all significant administrative actions, such as content moderation,
account management, and configuration changes, into a structured,
immutable audit trail.

All significant actions performed via the admin panel must be logged in
the AdminLog table.

### **✅ Definition of Done (DoD)** {#definition-of-done-dod-35 .unnumbered}

- A new AdminLog model is created in schema.Drizzle, including:

  - id (UUID)

  - adminId (FK to User table)

  - action (String enum or label: e.g., \"ban_user\",
    > \"approve_review\")

  - targetTable (e.g., \"User\", \"Review\")

  - targetId (UUID)

  - timestamp (DateTime)

  - (Optional Post-MVP): details field (JSON or String -- for
    > before/after diff)

- A reusable helper function (e.g., createAdminLog()) is created and
  > used in every action or loader within /admin/\... that:

  - Changes data (update, delete, status change)

  - Triggers a platform-side or user-visible effect (e.g., approving
    > content)

- All admin routes performing a significant action must call
  > createAdminLog() once the mutation is successful.

- Log entries are non-editable and stored permanently unless compliance
  > rules require otherwise.

### **❓ Questions & Clarifications -- Answered** {#questions-clarifications-answered-10 .unnumbered}

**Q1: What constitutes a "significant action" that must be logged?**

✅ Answer:

Any data-altering admin action, including:

- User bans, disables, role changes

- Gig status changes or reassignment

- Approval/rejection of reviews or chat messages

- Creation or deletion of AI prompts

- Refund initiation or payment override

- Escalation of support issues

**Q2: Should log entries include the previous state or changed values?**

🟡 Answer:

Not for MVP.

However, a details field can be added **Post-MVP** to store before/after
changes (e.g., "Rate changed from £14 → £18").

This can be implemented using:

- Manual value diffing in critical action handlers

- Or a helper to generate change summaries from payloads

**Q3: How should log entries be displayed?**

✅ Answer:

Via the /admin/logs panel (see DSH-ADM08), showing:

- Action label

- Admin name

- Target ID/table

- Timestamp

- Filter options (date, admin, type)

### **🛠️ Developer Notes** {#developer-notes-16 .unnumbered}

- Logging is synchronous and reliable (i.e., don't skip it on mutation
  > success).

- Logs must never be exposed to unauthorised users (QA may be
  > restricted).

- Optional: provide a reason field for moderation logs (e.g., "spam",
  > "abusive content")

AI usage policy MVP

This assumes we use open ai which seems like the most cost effective
option

## **⚙️ Able AI Usage Policy (MVP Scope)** {#able-ai-usage-policy-mvp-scope .unnumbered}

This document defines where AI is used across the platform, which OpenAI
tools are applied, and how developers should implement and manage each
AI-powered feature.

### **🧠 AI Features in MVP** {#ai-features-in-mvp .unnumbered}

| **Feature Area**                           | **Use Case**                                    | **Tool**                  | **Frequency**                  | **Cost Control**                | **Notes**                                        |
|--------------------------------------------|-------------------------------------------------|---------------------------|--------------------------------|---------------------------------|--------------------------------------------------|
| **Buyer AI Chat** (WEB-B01)                | Role/time/location parsing, friendly onboarding | gpt-3.5-turbo             | 1--2 prompts per hire          | Limit 3 prompts/session         | Use short system prompt; store structured result |
| **Freelancer Gigfolio Analysis** (SVR-B02) | Match buyer gig with seller bio/tags/recs       | text-embedding-3-small    | 1 embed per profile, 1 per gig | Cache embeddings; re-run weekly | Use pgvector or Pinecone                         |
| **AI Matching (Ranking)**                  | Compare embeddings (gig vs. freelancer)         | cosine similarity         | real-time                      | Local computation               | Only top-ranked freelancers queried              |
| **Chat Moderation** (SVR-C04)              | Flag off-platform offers/abuse                  | OpenAI **Moderation API** | Every message                  | Free API                        | Flag only, suppress in frontend if flagged       |
| **Review Summarisation** (WEB-S09)         | Extract keywords/traits for display             | gpt-3.5-turbo             | 1 call per review              | Batch if needed                 | 1-time call per review                           |
| **Badge/Feedback AI Review** (Future)      | Auto-tag feedback with sentiment                | (planned)                 | ---                            | ---                             | Optional Post-MVP logic                          |

### **🛡️ Developer Implementation Checklist** {#developer-implementation-checklist .unnumbered}

#### **✅ Use**  {#use .unnumbered}

#### **gpt-3.5-turbo** {#gpt-3.5-turbo .unnumbered}

####  **for:** {#for .unnumbered}

- Buyer chat (/start-hire)

- Review summarisation

- Anything requiring human-like dialogue or rewriting

➡️ **Set max tokens to \~500**, temperature = 0.5

➡️ Limit requests per user/session (3--5 per session)

#### **✅ Use**  {#use-1 .unnumbered}

#### **text-embedding-3-small** {#text-embedding-3-small .unnumbered}

####  **for:** {#for-1 .unnumbered}

- All gigfolio content (bio + tags + transcript)

- External recs (summarised)

- Buyer gig descriptions

➡️ Store all vectors in Postgres pgvector or vector DB

➡️ Recalculate freelancer embeddings weekly or on profile update

➡️ Compare via cosine similarity

➡️ **Cost: \$0.00002/token (\~\$0.001 per profile)**

#### **✅ Use OpenAI Moderation API for:** {#use-openai-moderation-api-for .unnumbered}

- All chat messages sent between users

- Optional: Reviews before moderation

➡️ If flagged:

- Don't show the message

- Set moderationStatus = \"flagged\" in DB

- Log flagReason and confidenceScore

### **🧮 Budgeting Assumptions for MVP** {#budgeting-assumptions-for-mvp .unnumbered}

| **Category**                                        | **Monthly Volume**              | **Est. Cost**                     |
|-----------------------------------------------------|---------------------------------|-----------------------------------|
| GPT-3.5 messages (buyer onboarding + summarisation) | 5,000 prompts                   | \~\$5--8                          |
| Embeddings                                          | 1,000 profiles + 500 gigs/month | \~\$1--2                          |
| Moderation API                                      | 10,000 messages                 | Free                              |
| Total                                               | ---                             | **\~\$10--15/month** at MVP scale |

**OpenAI** and **Relevance AI** are powerful but designed for different
stages of development and levels of abstraction. Here's a side-by-side
breakdown tailored to **Able's AI-first hiring platform** and your goal
of launching with cost efficiency, deep trust logic, and fast iteration.

## **🧠 TL;DR Recommendation** {#tldr-recommendation .unnumbered}

**Start with OpenAI** for:

- Lower cost

- Full control

- Flexibility to fine-tune and optimise

**Consider Relevance AI** post-MVP if:

- You want to speed up development with pre-built workflows

- You're okay with less transparency and a bit more vendor lock-in

## **⚖️**  {#section-80 .unnumbered}

## **OpenAI vs Relevance AI** {#openai-vs-relevance-ai .unnumbered}

| **Feature**                     | **OpenAI**                                                                 | **Relevance AI**                                                      |
|---------------------------------|----------------------------------------------------------------------------|-----------------------------------------------------------------------|
| **Core Function**               | Foundation model API provider (GPT, embeddings, moderation)                | End-to-end AI workflow engine with UI, vector search, automations     |
| **Use Cases**                   | Chat, ranking, summarisation, moderation (custom logic)                    | Prebuilt workflows: gig ranking, chatbot, surveys, analysis           |
| **Flexibility**                 | ✅ **Very high** -- full control over prompts, embeddings, ranking weights | ⚠️ Limited -- workflows and automations abstract away details         |
| **Speed to Build**              | 🟡 Medium -- dev team builds your logic                                    | ✅ Faster -- plug-and-play templates, no AI prompt engineering needed |
| **Control & Transparency**      | ✅ Full access to all data & logic                                         | ⚠️ Black-box scoring unless custom-built                              |
| **Cost Control**                | ✅ Transparent per-token/pricing                                           | ❌ Higher costs, unclear pricing tiers for usage scaling              |
| **Pricing**                     | \$1--\$15/mo (MVP scale)                                                   | Starts free, then jumps quickly (custom quote for scaling)            |
| **Embeddings**                  | Latest text-embedding-3-small or gpt-4 as needed                           | Embedding support under the hood, but not transparent                 |
| **Chat**                        | GPT-based, highly customisable                                             | Prebuilt AI agents + live chat integrations                           |
| **Data Storage**                | You host (e.g. Supabase, pgvector, Pinecone)                               | They host -- vector storage included                                  |
| **Moderation**                  | Yes, via OpenAI tools                                                      | Unknown/limited moderation control                                    |
| **Fine-tuning/Personalisation** | Manual prompt chains + memory                                              | Easier personalisation via UI builder                                 |
| **Vendor Lock-in**              | Low                                                                        | ⚠️ High -- hard to migrate out later                                  |
| **Best for**                    | Devs who want to own logic and scale AI affordably                         | Ops teams who want AI automation without technical overhead           |

## **🧠 Able-Specific Considerations** {#able-specific-considerations .unnumbered}

| **Priority**                   | **Winner**       | **Why**                                                                                              |
|--------------------------------|------------------|------------------------------------------------------------------------------------------------------|
| AI-first trust scoring         | **OpenAI**       | You've already defined a structured ranking system --- OpenAI gives you full control to implement it |
| Cost-conscious MVP             | **OpenAI**       | Relevance is more expensive to scale and harder to tune for small features                           |
| Fast UI/chat tools             | **Relevance AI** | Good if your team has no capacity to build anything conversational or UI-connected                   |
| Seamless Stripe/UX integration | **OpenAI**       | You control how and when payment or chat logic connects                                              |
| Long-term flexibility          | **OpenAI**       | No platform constraints --- swap tools or scale infra as needed                                      |

## **✅ Conclusion** {#conclusion .unnumbered}

| **Phase**             | **Recommendation**                                                                                                                                                                   |
|-----------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **MVP (Now--Launch)** | ✅ **Use OpenAI directly** --- more affordable, transparent, and aligned with your detailed spec                                                                                     |
| **Post-MVP**          | Consider layering **Relevance AI** tools for things like: badge automation, interview agents, dynamic surveys, or workforce analytics --- if you want to delegate AI ops to non-devs |
