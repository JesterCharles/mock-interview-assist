# Phase 27: Unified App Shell - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-16
**Phase:** 27-unified-app-shell
**Areas discussed:** Associate sidebar nav, Sidebar header content, TopBar adaptation, Migration strategy

---

## Associate Sidebar Nav

### Nav Items
| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard + Interviews | Two items only | |
| Dashboard + Interviews + Profile | Three items with profile | |
| Dashboard + Interviews + Curriculum | Three items with curriculum | ✓ |

**User's choice:** Dashboard + Interviews + Curriculum
**Notes:** Curriculum gets its own sidebar entry from the start.

### Interview Destination
| Option | Description | Selected |
|--------|-------------|----------|
| Direct to /interview/new | Trainer setup wizard | |
| Interview list + start button | History view with action | |
| Keep mailto CTA | Book with trainer link | |

**User's choice:** Other — "isn't interview/new for trainers?? we want the public version of the interview at '/'"
**Notes:** Key distinction: associate Interviews links to `/` (public automated interview), NOT `/interview/new` (trainer-only).

### Curriculum Timing
| Option | Description | Selected |
|--------|-------------|----------|
| Add nav item now, placeholder page | Shell complete from day one | ✓ |
| Add in Phase 30 | Avoid placeholder | |

**User's choice:** Add nav item now with placeholder page

### Group Labels
| Option | Description | Selected |
|--------|-------------|----------|
| No groups — flat list | Only 3 items, no noise | ✓ |
| Single group label | One label wrapping all items | |
| Two groups | Split like trainer | |

**User's choice:** No groups — flat list

### Collapse Toggle
| Option | Description | Selected |
|--------|-------------|----------|
| Yes — same toggle | Consistent behavior | ✓ |
| No — always expanded | Simpler | |

**User's choice:** Yes — same toggle

### Icons
| Option | Description | Selected |
|--------|-------------|----------|
| LayoutDashboard + Play + BookOpen | Matches existing patterns | ✓ |
| Home + Mic + Calendar | Alternative feel | |
| You decide | Claude picks | |

**User's choice:** LayoutDashboard + PlayCircle + BookOpen

---

## Sidebar Header Content

### Header Display
| Option | Description | Selected |
|--------|-------------|----------|
| Cohort name only | Minimal, per SHELL-02 | ✓ |
| Associate name + cohort | More personal | |
| Cohort badge + readiness score | Glanceable status | |

**User's choice:** Cohort name only

### No Cohort State
| Option | Description | Selected |
|--------|-------------|----------|
| Nothing — header area empty | Clean | ✓ |
| Muted text: 'No cohort assigned' | Explicit empty state | |
| Hidden with CTA | Actionable empty state | |

**User's choice:** Nothing — header area empty

---

## TopBar Adaptation

### Center Nav
| Option | Description | Selected |
|--------|-------------|----------|
| No center nav | Wordmark left + theme/avatar right | ✓ |
| Dashboard + Interviews | Mirror sidebar | |
| Same as trainer but restricted | Parallel structure | |

**User's choice:** No center nav

### Right Zone
| Option | Description | Selected |
|--------|-------------|----------|
| ThemeToggle + AvatarMenu only | No CohortSwitcher | ✓ |
| Cohort label + ThemeToggle + AvatarMenu | Read-only badge | |
| ThemeToggle + Sign Out button | Skip avatar menu | |

**User's choice:** ThemeToggle + AvatarMenu only

### Wordmark Link
| Option | Description | Selected |
|--------|-------------|----------|
| /associate/[slug]/dashboard | Associate home | ✓ |
| / | Landing page | |
| You decide | Claude picks | |

**User's choice:** /associate/[slug]/dashboard

---

## Migration Strategy

### Signin/Landing
| Option | Description | Selected |
|--------|-------------|----------|
| Standalone — no shell | Pre-auth, centered content | ✓ |
| TopBar only, no sidebar | Light chrome | |
| Full shell | Consistent but odd | |

**User's choice:** Standalone — no shell

### Navbar Cleanup
| Option | Description | Selected |
|--------|-------------|----------|
| Delete both | Clean cut | ✓ |
| Keep Navbar for / and /signin | Simplified ConditionalNavbar | |
| Keep as fallback | Remove later | |

**User's choice:** Delete both (ConditionalNavbar + Navbar)

### Interview/Review Routes
| Option | Description | Selected |
|--------|-------------|----------|
| Yes — trainer shell | TopBar + sidebar, consistent | ✓ |
| Standalone — no shell | Full-screen focused | |
| TopBar only, no sidebar | Focused with navigation | |

**User's choice:** Yes — trainer shell

## Claude's Discretion

- Role-aware TopBar implementation approach
- Associate sidebar config structure
- Slug passing mechanism for sidebar routes
- Curriculum placeholder page design

## Deferred Ideas

None
