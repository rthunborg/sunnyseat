# Desktop venue layout

_Started 2026-04-29 11:37 UTC_

---

## User

Can you make the desktop prototype look more similar to my two figma components "venue-detail-desktop and map-primary-desktop"? For example the date-time picker should be wider on the map and the venue details pane that opens on the right should be less wide and also you should be able to scroll down inside it to be able to give sun/shade feedback, leave a review, see comments etc, like we can in the mobile prototype. For reference you can also look at "venue-detail-component-desktop" figma component.

## Assistant

I'll explore the Figma components and current desktop file, then update the prototype to match.

_[tool: fig_ls]_

_[tool: fig_ls]_

_[tool: fig_ls]_

_[tool: list_files]_

_[tool: read_file]_

_[tool: list_files]_

_[tool: list_files]_

I noticed the system reminder about copyrighted UI — I'll keep producing original SunnySeat designs (which is what we've been doing), just matching your own Figma source. Let me explore the relevant files.

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

Now let's see the Figma references:

_[tool: read_file]_

Let me read it correctly through the fig vfs:

_[tool: fig_read]_

_[tool: fig_read]_

_[tool: fig_read]_

_[tool: snip]_

_[tool: fig_read]_

_[tool: read_file]_

_[tool: snip]_

_[tool: read_file]_

_[tool: read_file]_

_[tool: read_file]_

Now I have a clear picture of what's needed. Let me make the changes:

**Plan:**
1. **VenueDetail panel** — narrower (390px to match the Figma component), scrollable inside, add: details list (öppettider/adress), feedback CTA ("Stämmer sol-prognosen?" Sol nu / Skugga), review CTA, comments/reviews list
2. **TimeScrubber on map** — make it wider (matching the Figma's 958px panel) and adopt the Figma's wider date-time picker layout (date pill + slider + tick labels)

Let me update both:

_[tool: write_file]_

_[tool: snip]_

Now update the App so the panel is narrower (390 not 460), and update the TimeScrubber to be wider with a more spread-out date pill matching the Figma:

_[tool: str_replace_edit]_

_[tool: write_file]_

## Assistant

Now update the TimeScrubber to match Figma's wider date-time picker:

_[tool: write_file]_

_[tool: snip]_

_[tool: read_file]_

_[tool: snip]_

_[tool: snip]_

_[tool: snip]_

_[tool: str_replace_edit]_

_[tool: snip]_

_[tool: done]_

_[tool: snip]_

_[tool: fork_verifier_agent]_

Updated the desktop prototype to match your Figma references:

- **VenueDetail panel** is now 390px wide (down from 460), fully scrollable, with: hero + sun pill + heart/share/close, title with "SOL NU" pill, description, "Soltider idag" timeline card with current-time marker, tags, details list (öppettider, adress with "öppna i kartor", exponering), Visa rutt button, "Stämmer sol-prognosen?" feedback (Sol nu / Skugga buttons), "Hjälp andra hitta solen" review CTA, and a list of recent reviews.
- **Date-time picker on the map** is now wider (full width minus sidebar/panel) with the Figma layout: date pill on the left (chevrons + "Lördag 14 juni" + Säsongskortet badge + calendar), time on the right, and a thin gradient slider with capsule thumb across the full width plus 06/09/12/15/18/21 ticks.

## User

Verifier agent check completed

## Assistant

_[tool: snip]_

All set — the desktop prototype now matches your Figma references for the VenueDetail panel (390px, with feedback + review CTAs and reviews list) and the wider full-width date-time picker.

## User

Can we also create a desktop prototype but for the flow when we have a paid user?

## Assistant

I'll build a paid-user version. Let me first check the current free prototype and look at any "paid" / Säsongskortet / pro flows in the Figma to make sure I capture the right differences.

_[tool: fig_ls]_

_[tool: list_files]_

There's already a `SunnySeat Desktop Premium.html` in the project. Let me check its current state and the Figma to see what needs updating.

_[tool: read_file]_

_[tool: fig_ls]_

_[tool: list_files]_

Good — there's a Premium HTML, but it just reuses the Free `App` with a `flavor="premium"` prop. Let me check what `flavor` actually does, and look at the premium-specific Figma frames.

_[tool: grep]_

_[tool: fig_ls]_

_[tool: fig_ls]_

Good — premium flavor already toggles isPremium=true. Let me look at the premium-planner desktop to see what the unlocked planner panel should look like, and the premium-planner-upsell to understand the differences.

_[tool: fig_screenshot]_

_[tool: read_file]_

_[tool: snip]_

_[tool: fig_screenshot]_

<answer in progress>

_[tool: snip]_

_[tool: fig_ls]_

_[tool: fig_ls]_

Let me focus on the key thing — I want to render the desktop premium variant well. Let me see the existing premium HTML and the App's flavor handling, then look at TopBar/Sidebar to ensure premium-specific UI (e.g., account chip, favorites tab unlocked).

_[tool: read_file]_

The premium HTML reuses the same App with isPremium=true, which already removes paywall blocks for favorites/planner/calendar. So functionally premium works. But to make the prototype actually showcase the paid flow, I should:

1. Open the planner by default to show the unlocked premium planner
2. Add a "Säsongskortet aktivt" account chip in the TopBar for premium
3. Make sure "Mina favoriter" tab is unlocked in the sidebar
4. Update the Premium HTML so it actually demonstrates the paid experience prominently

Let me check the TopBar and Sidebar quickly to see if we need account-chip work.

_[tool: read_file]_

Let me update the TopBar to accept an `isPremium` prop showing a "Säsongskortet" chip + avatar, and wire the Premium HTML to default-open the planner so you actually land on the premium experience. Plan:

1. Add `isPremium` prop to TopBar — when true, render a Säsongskortet chip + initials avatar instead of just generic icons.
2. Add a "Soltidsplaneraren" button in TopBar that opens the planner (visible always; for premium leads to the unlocked planner, for free triggers paywall — but on premium we'll show it nicely).
3. App passes `isPremium` to TopBar and exposes `onPlanner` opening the planner side panel.
4. Premium HTML keeps `flavor="premium"` and that's it — but I'll also tweak the App so on premium the planner can be opened from TopBar.
5. Update Tweaks default to keep current toggles.

Let me also check that Sidebar shows favorites unlocked for premium.

_[tool: read_file]_

Good — Sidebar already shows the lock icon only when `favLocked={!isPremium}`, so it'll be unlocked for premium. Now let me make the changes:

1. Add an "Soltidsplaneraren" button + Säsongskortet account chip to TopBar (with `isPremium` prop)
2. Wire App to pass `isPremium` and an `onPlanner` handler
3. Premium HTML stays as-is, but I'll bump the planner to open by default so the page actually shows the unlocked planner experience visually.

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Now let me make the Premium HTML auto-open the planner panel so the paid experience is the visible default. I'll also tweak the App to accept an initial `showPlanner` prop.

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

Let me also verify the LockedPlanner renders properly when unlocked (no paywall overlay) and update the title there for premium so it doesn't say "Premium" pill.

_[tool: str_replace_edit]_

_[tool: done]_

<answer in progress>

_[tool: snip]_

_[tool: fork_verifier_agent]_

Done — `SunnySeat Desktop Premium.html` is the paid-user variant. What's different from Free:

- **TopBar**: a "Soltidsplaneraren" CTA (filled black/gold instead of the locked Pro chip) and a Säsongskortet account chip with avatar.
- **Sidebar**: "Favoriter" tab is unlocked (no padlock badge); favoriting a venue actually toggles the heart instead of triggering the paywall.
- **VenueDetail**: heart works as a real favorite toggle.
- **Soltidsplaneraren panel**: opens fully unlocked — all 4 stops sharp (no blur), no upsell overlay, "Aktivt" pill instead of "Premium".
- **Date picker / calendar**: clicking the calendar icon doesn't trigger the paywall.

Toggle the Tweaks panel (top-right) → "Premium (Säsongskortet)" off to A/B against the free flow in the same window.

## User

In both desktop prototypes, in the header menu component, remove the button saying "Soltidsplaneraren" and also remove the "login" button, we do not have any login functionality. After that, make sure that clicking the setting button opens up the settings menu like it does in our mobile prototypes. Also, for the free user desktop prototype, make sure to implement the payment flow.

## Assistant

Got it. Let me look at the mobile settings to mirror it on desktop, and check the existing payment flow.

_[tool: grep]_

_[tool: list_files]_

_[tool: read_file]_

<answer in progress>

_[tool: snip]_

_[tool: read_file]_

_[tool: grep]_

Now let me look at the mobile App's full payment flow + processing screen + how PaymentFailed integrates, so I can mirror it on desktop.

_[tool: read_file]_

_[tool: read_file]_

<answer in progress>

_[tool: snip]_

Now I have the picture. Plan:

1. **TopBar**: remove the "Soltidsplaneraren" CTA button and the "Logga in" account chip (only show the Säsongskortet chip when premium). Settings icon stays.
2. **App**: wire `onSettings` on TopBar → opens settings modal. Add a desktop SettingsSheet modal (mirror mobile but desktop-sized).
3. **Free payment flow**: Paywall → "Aktivera" → processing screen → either success (becomes premium with confirmation) or fail → PaymentFailed modal with retry.

Let me build a desktop Flows file with SettingsSheet + Processing + PaymentFailed + a Success confirmation.

_[tool: write_file]_

Now update TopBar to drop the Planner button + Logga in chip, App to wire settings + payment flow, and the HTML files to load the new Flows file.

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

<answer in progress>

_[tool: snip]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

_[tool: str_replace_edit]_

<answer in progress>

_[tool: snip]_

_[tool: done]_

<answer in progress>

_[tool: snip]_

_[tool: fork_verifier_agent]_

<answer in progress>

_[tool: snip]_

Done — applied to both desktop prototypes:

- **TopBar**: removed the "Soltidsplaneraren" CTA and the "Logga in" chip. Right cluster is just filter / location / settings, plus the Säsongskortet chip when premium.
- **Settings**: clicking the gear icon now opens a desktop Settings modal mirroring the mobile one — Säsongskortet upgrade row, Återställ köp, Skicka feedback, Om SunnySeat.
- **Free payment flow**: Paywall → "Aktivera Säsongskortet" → **Processing** modal (Swish spinner, 3-step progress: Open Swish → Confirming → Activating) → **Success** modal ("Säsongskortet aktiverat", premium activated and topbar chip appears). Cancelling during processing routes to a **Payment failed** modal with retry that re-opens the paywall.

## User

Verifier agent check completed

## Assistant

## Assistant

