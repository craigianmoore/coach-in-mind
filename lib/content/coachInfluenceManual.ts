// Full text of "Navigating Difficult Conversations & Scenarios" (the
// coach-influence-manual.pdf), restructured as data so the /help/manual
// page can render it with a jump-to-section menu instead of a flat PDF.
// The PDF itself stays available as a download from the same page — this
// is a second, more usable presentation of the same content, not a
// replacement for it.

export type Scenario = {
  title: string;
  situation: string;
  tips: string[];
  saying: string;
};

export type ManualSection = {
  id: string;
  number: number;
  title: string;
  intro: string;
  scenarios: Scenario[];
  footnote?: { text: string };
};

export const CALM_STEPS = [
  {
    step: "Clarify",
    meaning:
      "Get the facts before reacting. Ask questions rather than assume — most conflicts are worse in someone's head than in reality.",
  },
  {
    step: "Acknowledge",
    meaning:
      "Name the emotion or concern, even if you disagree with the conclusion. People calm down when they feel heard.",
  },
  {
    step: "Limit",
    meaning:
      "Be clear about what you can and can't change, and hold the boundary — kindly, but without wavering.",
  },
  {
    step: "Move forward",
    meaning:
      "Agree on a next step, however small, so the conversation ends with a path rather than a stalemate.",
  },
];

export const QUICK_REFERENCE_CHECKLIST = [
  "Have I got the facts, or just one side of the story?",
  "Am I the right person to have this conversation, or does it belong with the committee, official, or another party?",
  "Is now the right time and place, or should this wait until emotions have settled?",
  "Have I acknowledged the other person's concern, even if I don't agree with their conclusion?",
  "Is there a boundary I need to hold clearly and kindly?",
  "What's the next step, and have I said it out loud so both sides leave with the same understanding?",
  "Do I need to document this conversation or loop in the club afterwards?",
  "If I'm asking a question, do I have a solution that's fair and equitable and addresses the issue?",
];

export const MANUAL_SECTIONS: ManualSection[] = [
  {
    id: "parents",
    number: 1,
    title: "Parents",
    intro:
      "Parents are almost always coming from a place of care for their child, even when it doesn't feel that way in the moment. The goal is to protect that relationship while protecting your program.",
    scenarios: [
      {
        title: '"My child isn\'t getting enough game time"',
        situation:
          "A parent approaches you, often after a match, unhappy about their child's minutes on the field.",
        tips: [
          "Listen fully before explaining anything — let them finish.",
          "Explain your selection principles in general terms (development stage, position balance, session performance) rather than comparing children directly.",
          "Offer a specific, private time to discuss their child's development rather than resolving it pitch-side.",
          "Follow up with something concrete afterwards, even if the answer is unchanged.",
        ],
        saying:
          "I hear you, and I want [child]'s development to be on track too. Let's grab five minutes after training this week so I can walk you through what I'm seeing and what we're working on.",
      },
      {
        title: "A parent is coaching or criticising loudly from the sideline",
        situation:
          "During a match, a parent is calling out instructions, corrections, or criticism that contradicts your coaching or unsettles players.",
        tips: [
          "Address it at the next break in play or half-time — not while the parent is mid-shout, which turns it into a public standoff.",
          "Speak to them one-on-one, briefly and calmly, rather than announcing a rule to the whole sideline.",
          "Reconnect it to the child's experience: mixed messages from the sideline make it harder for kids to focus and enjoy the game.",
          "If it continues, involve the team manager or club committee using the club's code of conduct rather than escalating personally.",
        ],
        saying:
          "I know you want the best for him out there — when there are two voices coaching at once it actually makes it harder for the kids to focus. Let me do the coaching and you do the cheering, and we'll both get more out of him.",
      },
      {
        title: "A parent challenges a team selection or position decision",
        situation:
          "A parent disagrees with where their child is being played, or with the team their child has been placed in.",
        tips: [
          "Separate the decision from the person — explain the criteria used (grading process, positional needs, session observations), not a judgement on the child.",
          "Where the decision sits with the club (grading panel, committee) rather than you personally, be clear about that without deflecting responsibility unfairly.",
          "Invite them to a conversation about pathway and development rather than re-litigating the single decision.",
          "Document the conversation briefly for your own records if the disagreement is heated or repeated.",
        ],
        saying:
          "That decision was based on [criteria], and I know it's not the outcome you were hoping for. What I can do is talk you through what [child] needs to work on to push for a change next time we review.",
      },
      {
        title: "An aggressive or confrontational parent after a loss",
        situation:
          "A parent approaches you visibly angry after a defeat, raising their voice or being personal in their criticism.",
        tips: [
          "Stay calm and lower your own voice rather than matching their energy — it de-escalates faster than any argument.",
          "Name what you're seeing without accusation: \"I can see you're frustrated.\"",
          "If the conversation is not calming down, disengage: agree to talk once everyone (including you) has had time to cool off.",
          "Report serious incidents to the club committee per your code of conduct — you don't have to manage this alone.",
        ],
        saying:
          "I can see how frustrated you are, and I get it — nobody likes a loss like that. I'm not going to have this conversation while we're both fired up. Can we talk tomorrow once we've both had a chance to reset?",
      },
    ],
  },
  {
    id: "players",
    number: 2,
    title: "Players",
    intro:
      "Player issues are usually a symptom, not the problem itself — disengagement, conflict, and knock-backs are almost always about something underneath. Get curious before you get corrective.",
    scenarios: [
      {
        title: "A player seems disengaged or isn't trying",
        situation:
          "A player who's usually switched on turns up flat, going through the motions or visibly uninterested.",
        tips: [
          "Check in privately rather than calling it out in front of the group — a quiet word protects their dignity and gets you an honest answer.",
          "Ask open questions (\"how's things going for you at the moment?\") rather than leading with the behaviour itself.",
          "Rule out the obvious first: fatigue, school stress, an issue at home, or a mismatch between the session and their level.",
          "Agree on one small, visible goal for the next session so there's a fresh marker to aim for.",
        ],
        saying:
          "You've seemed a bit flat the last couple of weeks — everything alright? No pressure, just want to make sure I'm supporting you the right way.",
      },
      {
        title: "Conflict between two players on the team",
        situation:
          "Two players are clashing — on the field, in the group chat, or in the way they interact at training.",
        tips: [
          "Speak to each player separately first to understand both sides before bringing them together.",
          "Focus the joint conversation on how they need to function as teammates, not on relitigating who was right.",
          "Set one or two concrete, observable expectations going forward (e.g. how they communicate on the field).",
          "Keep half an eye on it over the following weeks rather than assuming one conversation fixes it.",
        ],
        saying:
          "I want you two working well together on the field regardless of what's going on outside it. Let's agree on how that looks in training this week, and I'll check back in with you both on Friday.",
      },
      {
        title: "A player consistently arrives late or misses sessions",
        situation:
          "A player's attendance or punctuality is becoming a pattern, affecting both their development and team planning.",
        tips: [
          "Ask before assuming — transport, family commitments, and work rosters are common and legitimate causes.",
          "Set a clear, fair expectation together, rather than a unilateral rule delivered after the fact.",
          "If the club has an attendance policy tied to selection, explain it plainly and early, not as a surprise later.",
          "Recognise improvement when it happens — it reinforces that you noticed the effort, not just the failure.",
        ],
        saying:
          "I've noticed you've missed a few sessions lately — is everything okay, or is there something making it hard to get here? Let's find a way that works for both of us.",
      },
      {
        title: "A player pushes back on feedback or instruction",
        situation:
          "A player argues, sulks, or dismisses feedback rather than engaging with it, sometimes in front of the group.",
        tips: [
          "Stay measured — an audience makes pushback feel like a challenge to your authority, but it usually isn't personal.",
          "Ask them to explain their view briefly; sometimes the pushback reveals a genuine misunderstanding worth addressing.",
          "Restate the standard calmly rather than repeating it more forcefully — volume rarely wins the point.",
          "Follow up privately afterwards if the moment felt bigger than the incident deserved.",
        ],
        saying:
          "I hear you don't love that instruction — tell me what you're seeing out there. Once you've explained it, here's why I still want it done this way for now.",
      },
      {
        title: "A player is struggling with confidence after mistakes",
        situation:
          "A player who has made a visible error (a costly mistake, a missed chance) is visibly deflated and starting to withdraw.",
        tips: [
          "Address it immediately with a short, factual reset (\"next job\") rather than letting it sit unspoken.",
          "Separate the person from the mistake explicitly — mistakes are part of playing, not a verdict on ability.",
          "Give them a low-stakes chance to succeed again soon after, so the mistake isn't the last thing that happens.",
          "Follow up privately if the dip in confidence continues beyond the session.",
        ],
        saying:
          "That happens to everyone — even the best players in the world. Shake it off, next job. I want to see you go again like it never happened.",
      },
    ],
  },
  {
    id: "committee",
    number: 3,
    title: "Committee Members",
    intro:
      "Committees are usually volunteers juggling their own pressures — budgets, member complaints, and competing priorities. Bring them evidence and options, not just problems.",
    scenarios: [
      {
        title: "The committee questions your coaching methods or session content",
        situation:
          "A committee member raises concerns about your approach, sometimes based on second-hand parent complaints rather than direct observation.",
        tips: [
          "Ask what specifically prompted the concern — a pattern of feedback is different from a single complaint.",
          "Explain your approach in plain terms and, where possible, tie it to the coach education framework or club philosophy.",
          "Invite them to observe a session directly rather than relying on second-hand accounts.",
          "Stay open to genuine feedback — not every challenge is political, and some will be fair.",
        ],
        saying:
          "Happy to talk through it — what specifically has come up? And if it's useful, come along to a session and see it firsthand rather than going on what's been relayed to you.",
      },
      {
        title: "A budget or resource request is declined",
        situation:
          "Equipment, extra sessions, or a course you wanted funded gets knocked back.",
        tips: [
          "Ask for the reasoning rather than treating it as final and unexplained — committees often have constraints you don't see.",
          "Reframe the request with the outcome it supports (player retention, safety, accreditation) rather than just the cost.",
          "Look for a smaller or staged version of the request if the full ask isn't viable this cycle.",
          "Keep the relationship intact — this cycle's \"no\" is often next cycle's \"yes\" if trust is maintained.",
        ],
        saying:
          "Understood — can you talk me through what drove that decision? If budget's the constraint, is there a smaller version of this we could fund this season and revisit the rest next year?",
      },
      {
        title: "Pressure to select a player for reasons unrelated to football",
        situation:
          "You sense — or are told outright — that a selection decision should reflect something other than football criteria (e.g. a sponsor's or committee member's child).",
        tips: [
          "Stay anchored to your stated selection criteria and be ready to explain them plainly if challenged.",
          "Raise the pressure directly and calmly with whoever is applying it, rather than quietly absorbing it.",
          "Loop in the club's coaching or technical director if the pressure continues — this protects you and the process.",
          "Document decisions and reasoning so selections are defensible if questioned later.",
        ],
        saying:
          "I understand the interest, but selection has to be based on what I'm seeing at training and in games — that's what keeps it fair for every family in the program.",
      },
      {
        title: "Being asked to take on more than agreed (scope creep)",
        situation:
          "You're asked to run extra sessions, take on another team, or handle admin beyond what was agreed at the start of the season.",
        tips: [
          "Restate what was originally agreed before responding to the new ask — it resets the baseline for both of you.",
          "Ask what the added expectation would displace, since your time isn't unlimited even as a volunteer or contractor.",
          "Where you can help, offer a scaled or time-limited version rather than an open-ended yes.",
          "It's fine to say no to protect your own sustainability — an over-extended coach helps nobody for long.",
        ],
        saying:
          "When we started this season we agreed on [X]. I'm keen to help where I can, but I want to be upfront that taking on [Y] as well isn't sustainable without something else coming off my plate.",
      },
    ],
  },
  {
    id: "sponsors",
    number: 4,
    title: "Sponsors",
    intro:
      "Sponsors keep clubs running, and that relationship matters — but it should never come at the cost of the football program's integrity or fairness to other families.",
    scenarios: [
      {
        title: "A sponsor expects special treatment for their child",
        situation:
          "A sponsor, directly or through the committee, signals an expectation of extra game time or a particular position for their child.",
        tips: [
          "Thank them for their support genuinely and separately from the football conversation — the two shouldn't be linked.",
          "Hold the same selection criteria you'd apply to any player and be prepared to explain them if asked.",
          "If the pressure is applied through the committee rather than directly, ask the committee to help hold the line.",
          "Keep the relationship warm even while declining the request — sponsors leave over feeling dismissed, not over a fair no.",
        ],
        saying:
          "We really value the club's partnership with you, and that's completely separate from how the team gets picked — every player, including [child], gets selected on the same footing.",
      },
      {
        title: "A sponsor wants visibility or recognition at an event you're running",
        situation:
          "A sponsor expects a mention, presence, or acknowledgement at training, presentation day, or another coach-run event.",
        tips: [
          "Plan for it rather than being caught off guard — a 30-second acknowledgement costs little and builds goodwill.",
          "Loop in whoever manages the sponsor relationship at the club, so expectations are aligned before the event.",
          "Keep it proportionate — a mention or banner is reasonable; disrupting the session or presentation usually isn't.",
          "Say thank you specifically and publicly; sponsors rarely ask for more than to feel genuinely valued.",
        ],
        saying:
          "We'd love to recognise [sponsor] at presentation day — I'll make sure there's a moment for that as part of the program.",
      },
      {
        title: "A sponsor complains that results are affecting their brand",
        situation:
          "A sponsor raises concern that the team's on-field performance reflects poorly on their association with the club.",
        tips: [
          "Acknowledge the concern without agreeing to change your coaching priorities on the back of it.",
          "Reframe what the sponsorship is actually supporting — development, participation, community presence — not just results.",
          "Involve the committee, since managing the sponsor relationship sits with them, not solely with you.",
          "Where possible, give them a positive story to attach to instead — player progress, participation numbers, community reach.",
        ],
        saying:
          "I get why results matter to you, but this program is about developing these kids long-term, and that's actually a strong story for [sponsor] to be part of. Let me share some of what's genuinely improving.",
      },
    ],
  },
  {
    id: "other-coaches",
    number: 5,
    title: "Other Coaches",
    intro:
      "Fellow coaches are colleagues even when they're across the field from you. Most friction resolves faster through a direct, private conversation than through parents, players, or committees relaying it for you.",
    scenarios: [
      {
        title: "Disagreement with an opposition coach's conduct on the day",
        situation:
          "An opposition coach is coaching aggressively from the sideline, arguing with officials, or behaving in a way that's affecting the game.",
        tips: [
          "Address it directly and calmly with them at a natural break, rather than through players, parents, or the referee alone.",
          "Keep your own sideline conduct exemplary regardless — it's the strongest message you can send.",
          "Involve the match official or ground official if it escalates, rather than getting drawn into an argument yourself.",
          "Report significant incidents through the proper club or competition channel afterwards.",
        ],
        saying:
          "Mate, can we both dial it back a notch? Good game for both sides depends on it, and I know neither of us wants it to boil over.",
      },
      {
        title: "A colleague coach undermines your methods in front of players or parents",
        situation:
          "Another coach at your club criticises your approach or contradicts your instructions where players or parents can hear.",
        tips: [
          "Raise it privately and specifically — describe what happened rather than a general complaint about their attitude.",
          "Assume good intent first; it's often a genuine difference in philosophy rather than deliberate undermining.",
          "Agree on a simple rule going forward: disagreements get raised between coaches, not in front of the group.",
          "Escalate to the technical director or committee only if it continues after a direct conversation.",
        ],
        saying:
          "When you corrected that in front of the group yesterday it undercut what I'd asked for — can we agree that if we see it differently, we sort it out between us first?",
      },
      {
        title: "Coordinating with an assistant coach who has a different philosophy",
        situation:
          "You and an assistant or co-coach disagree on approach — intensity, game style, or how much structure to give players.",
        tips: [
          "Have the philosophy conversation away from the players, early in the season rather than reactively.",
          "Find the areas of genuine agreement first — most philosophies overlap more than they differ.",
          "Agree on who has final say on specific decisions (selection, tactics) to avoid mixed messages to the team.",
          "Revisit the arrangement periodically rather than assuming one conversation settles it for the season.",
        ],
        saying:
          "I think we're actually aligned on most of this — let's nail down where we want to be consistent, so the players get one clear message, not two.",
      },
      {
        title: "Players are being approached by coaches from other clubs",
        situation:
          "You learn that another club's coach has been in contact with one of your players about switching clubs.",
        tips: [
          "Confirm the facts calmly before reacting — second-hand accounts of these situations are often incomplete.",
          "Keep the conversation with your own player and family focused on their development and happiness at your club, not on the other party.",
          "Raise legitimate tampering concerns through the correct club or league channel rather than confronting the other coach directly.",
          "Accept that some player movement is a normal part of junior football, and respond with the program you offer, not conflict.",
        ],
        saying:
          "I heard you'd been chatting with another club — no dramas either way, I just want to check in on how you're finding things here and if there's anything we can do better.",
      },
    ],
  },
  {
    id: "new-coaches",
    number: 6,
    title: "New & Inexperienced Coaches",
    intro:
      "Every experienced coach was once running their first session with no real idea what they were doing — that's completely normal, not a sign you're in the wrong role. The scenarios below are about building genuine confidence early rather than pretending to have answers you don't have yet.",
    scenarios: [
      {
        title: "Feeling overwhelmed by session planning",
        situation:
          "A new coach isn't sure how to structure a session, how much to plan, or what 'good' actually looks like at training.",
        tips: [
          "Start with a simple, repeatable session structure (warm-up, technical block, small-sided game, cool-down) rather than reinventing the plan every week.",
          "Borrow and adapt — accredited coaching courses, other coaches' plans, and club resources exist precisely so you're not starting from a blank page.",
          "Plan slightly less than you think you'll need — new coaches consistently overestimate how much fits in an hour.",
          "Review briefly after each session what worked and what didn't, so the next plan improves rather than starting fresh again.",
        ],
        saying:
          "I'm still building my session library, so if you've got plans that have worked well for this age group, I'd genuinely appreciate seeing them.",
      },
      {
        title: "Lacking confidence in front of parents or experienced coaches",
        situation:
          "A new coach feels judged or unsure of themselves when experienced coaches, parents, or committee members are watching or offering opinions.",
        tips: [
          "Remember that competence is built through reps — nobody expects a new coach to look like a twenty-year veteran in week one.",
          "Ask questions openly rather than pretending to know something you don't; it builds trust faster than bluffing ever does.",
          "Find one experienced coach or mentor at the club you can check in with regularly, rather than trying to work everything out alone.",
          "Keep instructions to players simple and confident, even while you're still developing — hesitant delivery undermines players' trust more than a simple plan does.",
        ],
        saying:
          "I'm still building my experience, so I'll probably ask a few questions along the way — I'd rather get it right than pretend I've got it all figured out.",
      },
      {
        title: "Not knowing the club's processes, rules, or expectations",
        situation:
          "A new coach isn't sure what forms need completing, what the code of conduct requires, or what the club expects around communication, safety, or reporting.",
        tips: [
          "Ask for an onboarding conversation or induction pack in your first weeks rather than working it out by trial and error.",
          "Keep a simple running list of questions as they come up and take them to a committee member or coordinator in one go rather than one at a time.",
          "Confirm the essentials early — child safety requirements, incident reporting, communication expectations with parents — since these matter most if something goes wrong.",
          "Don't assume silence means you're doing it right; check in proactively in the first month.",
        ],
        saying:
          "Could someone talk me through what's expected of me as a new coach here — forms, reporting, communication expectations — so I get it right from the start?",
      },
      {
        title: "Making a visible mistake early on and worrying about credibility",
        situation:
          "A new coach makes an obvious error — a tactical mistake, a poorly run drill, a miscommunication — in front of players or parents.",
        tips: [
          "Own it plainly and move on — a brief, matter-of-fact acknowledgement lands far better than over-apologising or pretending it didn't happen.",
          "Remember one mistake rarely defines how players or parents see you over a full season; consistency over time is what actually builds credibility.",
          "Use it as a genuine learning point rather than a verdict on your ability — every coach has a list of these from their first season.",
          "Talk it through with a mentor or fellow coach rather than carrying it alone.",
        ],
        saying:
          "That one's on me — I'll fix it up for next week. Appreciate your patience while I'm still finding my feet.",
      },
      {
        title: "Wanting mentorship or support but unsure how to ask",
        situation:
          "A new coach would value guidance from a more experienced coach but feels awkward reaching out or doesn't want to seem like they can't cope.",
        tips: [
          "Ask directly and early — most experienced coaches respond well to being asked for help; it rarely reads as weakness.",
          "Be specific about what you want help with (session planning, managing a difficult parent, tactical setup) rather than a vague general ask.",
          "Look beyond your own club if needed — accredited coach education pathways and mentoring programs exist specifically for this stage of a coaching career.",
          "Keep the relationship two-way where you can — even a new coach brings fresh ideas and energy an experienced coach can value.",
        ],
        saying:
          "Would you be open to me checking in with you every couple of weeks while I'm getting established? I'd really value someone experienced to bounce things off.",
      },
    ],
    footnote: {
      text: "For new or inexperienced coaches, visit Football Victoria's CCC Program for structured support, coach education, and accreditation pathways.",
    },
  },
  {
    id: "female-coaches",
    number: 7,
    title: "Female Coaches in a Traditionally Male Environment",
    intro:
      "Football coaching, especially at senior and representative levels, still carries a male-dominated culture in many clubs — from the coaches' box to the committee table. None of the scenarios below are about female coaches needing to change who they are; they're about having a ready response when the environment hasn't caught up yet.",
    scenarios: [
      {
        title: "Male players questioning her authority early on",
        situation:
          "A female coach takes over a boys' or men's team and senses (or hears directly) scepticism about whether she can coach them.",
        tips: [
          "Lead with competence in the first sessions — clear, well-run training earns credibility faster than any explanation could.",
          "Address doubt directly if it surfaces openly, rather than letting it sit unspoken in the group.",
          "Hold the same standards for every player from day one — consistency is what actually builds respect over a season.",
          "Avoid over-proving yourself by being harsher or more distant than your natural style — the goal is credibility, not conformity to a stereotype of what a 'tough' coach looks like.",
        ],
        saying:
          "I know I might not be what you pictured when you heard you had a new coach. Judge me on what happens out here each week — that's all I'm asking.",
      },
      {
        title: "Being talked over or undermined in coaching or committee meetings",
        situation:
          "A female coach finds her points are talked over, repeated back by a male colleague and credited to him, or generally given less weight in the room.",
        tips: [
          "Name it in the moment, plainly and without apology: \"I'd like to finish the point I was making.\"",
          "Follow up decisions and contributions in writing (email, meeting notes) so there's a clear record of who raised what.",
          "Build allies before the meeting — a colleague who will back you up in the room changes the dynamic quickly.",
          "Raise a persistent pattern directly with the club's leadership rather than absorbing it meeting after meeting.",
        ],
        saying: "I wasn't finished — I'll pick up where I left off. As I was saying...",
      },
      {
        title: "Inappropriate comments or 'banter' from parents, players, or other coaches",
        situation:
          "Comments framed as jokes or banter cross the line into being about her gender rather than her coaching.",
        tips: [
          "Respond early and matter-of-factly the first time it happens — letting it go once often invites more of it.",
          "Separate genuine humour from comments that undermine your role and be clear that only the latter is the problem.",
          "Use the club's code of conduct as the standard you're holding people to, not just a personal preference.",
          "Escalate to the committee if it continues after you've addressed it directly — you shouldn't have to manage it alone.",
        ],
        saying: "That one's not landing as a joke — I'd rather we keep it about the football.",
      },
      {
        title: "Being the only woman in the coaching group or on the committee",
        situation:
          "A female coach is regularly the only woman in the room for coaching meetings, committee sessions, or coach education courses at the club.",
        tips: [
          "Seek out a peer network beyond the club — other female coaches, a coach mentor, or a state or league-level women-in-football group — so the club isn't your only sounding board.",
          "Raise directly with the club if isolation is affecting your ability to do the role well; most committees underestimate this until it's named.",
          "Where you can, help open the door for the next female coach or committee member — a lone seat is harder to hold than two.",
          "Give yourself credit for the technical and coaching skill that got you the role — it wasn't given to you as a gesture.",
        ],
        saying:
          "I'd value having another female coach or committee voice in these conversations — is that something the club can actively work towards this season?",
      },
      {
        title: "Navigating one-on-one interactions and physical boundaries with male players",
        situation:
          "A female coach wants clear, sensible boundaries around things like injury attention, changeroom access, or one-on-one conversations with male players, without it becoming awkward for either side.",
        tips: [
          "Set simple, visible defaults early — e.g. injury checks with a second adult present, one-on-one chats in open, visible spaces — and apply them consistently regardless of player gender.",
          "Frame this as standard good practice for any coach, not as something unique to being a woman coaching men — it normalises the boundary rather than singling it out.",
          "Loop in the club's welfare officer or committee to confirm these defaults align with the club's broader safeguarding policy.",
          "Trust the boundary rather than second-guessing it under social pressure to seem 'relaxed' about it.",
        ],
        saying:
          "Standard practice for me with any player — if we need to talk through something one-on-one, let's do it pitchside where anyone can see, not tucked away somewhere.",
      },
      {
        title: "Assumptions that she's better suited to a support role than head coach",
        situation:
          "A club defaults to offering her team manager, assistant, or junior grade roles despite her qualifications and experience matching or exceeding what's expected for a head coaching position.",
        tips: [
          "Ask directly what criteria were used for the role allocation, rather than accepting an unexplained default.",
          "Point to your actual coaching qualifications, experience, and results as the relevant criteria — the same yardstick used for any candidate.",
          "Put your interest in the appropriate role in writing so it can't be quietly overlooked in an informal conversation.",
          "If the pattern persists despite raising it, treat it as a genuine signal about whether the club is the right fit for your coaching career.",
        ],
        saying:
          "I want to make sure I'm being considered for the head coach role on the same basis as any other candidate — can you talk me through how that decision's being made?",
      },
    ],
    footnote: {
      text: "For female coaches, visit Football Victoria's CoacHER Program for further support, community, and development pathways.",
    },
  },
  {
    id: "goalkeeping-coaches",
    number: 8,
    title: "Goalkeeping Coaches",
    intro:
      "Goalkeeping coaches are often planned for as an afterthought in facility and program design, working with a handful of players in the corner of a much bigger picture. Their needs are genuinely different from an outfield session, and it's worth treating them that way rather than squeezing them into leftover space.",
    scenarios: [
      {
        title: "Being allocated a leftover or inadequate space",
        situation:
          "The main pitch and popular training areas are allocated to full squads first, leaving GK coaches to find whatever corner is left over — often too small or badly positioned.",
        tips: [
          "Raise the specific space requirements early in pre-season planning, not on the night training clashes happen.",
          "Make the case in practical terms: a smaller group doesn't mean a smaller need — shot-stopping, distribution, and crosses all need real depth and width to train properly.",
          "Where full-size goals or dedicated GK zones aren't available every week, agree on a fair rotation with other coaches rather than always drawing the short straw.",
          "Flag it to the club if the same compromise keeps recurring — it's a scheduling and facilities issue, not something to keep absorbing quietly.",
        ],
        saying:
          "I only need a smaller group's worth of space, but it does need to be a proper goal-depth area — can we lock in the same corner of the ground each week instead of finding out on the night?",
      },
      {
        title: "Safety around people walking behind the goals",
        situation:
          "The area behind goals is often a thoroughfare — other teams cutting through, parents walking dogs, kids playing — creating a real risk during shot-stopping or distribution drills.",
        tips: [
          "Walk the space before each session with an eye specifically on what's happening behind the goal line, not just the training area itself.",
          "Use cones, signage, or simple verbal awareness with parents and passers-by to keep the area behind goals clear during live shooting drills.",
          "Position drills so the goalkeeper (and anyone shooting) is aware of foot traffic and pause play if someone walks into the zone rather than assuming they'll notice.",
          "Raise it with the venue or club if the same walkway is a recurring hazard — a fence, signage, or a scheduling change may be a simple fix.",
        ],
        saying:
          "Can we keep the space directly behind the goals clear while we're doing shooting work today — it's a live ball area and I want to make sure everyone walking through stays safe.",
      },
      {
        title: "Needing specialist equipment that isn't budgeted for",
        situation:
          "Goalkeeping work often requires items outfield sessions don't — proper GK gloves for testing fit, portable or small-sided goals, GK-specific balls, agility hurdles, and reaction/reflex tools — and these are easy for a general club budget to overlook.",
        tips: [
          "Put together a simple, itemised list of genuinely necessary GK equipment when budgets are being set, rather than requesting piece by piece through the season.",
          "Explain the purpose briefly against each item (e.g. \"crossing/distribution work needs a second smaller goal\") so the committee can see it's functional, not a wish list.",
          "Look after loaned or club equipment visibly and log its condition — it builds the case for the next request.",
          "Where budget is tight, prioritise the one or two items with the biggest training impact rather than asking for everything at once.",
        ],
        saying:
          "Here's a short list of what I actually need to run proper GK sessions this season, with a line on why each item matters — happy to prioritise if the full list isn't feasible this year.",
      },
      {
        title: "Being folded into full-squad training without a separate space or time",
        situation:
          "The GK coach is expected to run meaningful goalkeeper-specific work at the same time and in the same space as the full squad session, without a genuine slot of their own.",
        tips: [
          "Agree on a specific time and space allocation with the head coach before the season starts, not session by session.",
          "Show the head coach what's actually lost when GK work is squeezed in — technical detail that needs focused reps, not incidental minutes between drills.",
          "Where a fully separate slot isn't possible, negotiate a clearly protected portion of the session (e.g. the first or last 20 minutes) rather than an undefined overlap.",
          "Keep the head coach in the loop on what's being worked on, so GK development is seen as part of the team's program, not a separate silo.",
        ],
        saying:
          "I can get good work done in a focused 20-minute block rather than trying to run it alongside the full session — can we pencil that into the plan each week?",
      },
      {
        title: "Overlapping access with other groups training at the same time",
        situation:
          "Multiple teams or age groups are training at overlapping times, and the ground area or goals a GK coach needs are being used by someone else.",
        tips: [
          "Get the season's overall training schedule early and flag GK space needs against it, rather than discovering the clash in week one.",
          "Where clashes are unavoidable, agree a fair rotation across the season with the other coaches involved rather than defaulting to whoever asks first each week.",
          "Keep a small kit of portable equipment (cones, a pop-up goal) so sessions aren't entirely dependent on a specific fixed area being free.",
          "Escalate to whoever manages ground bookings if the clash is a recurring structural issue rather than a one-off.",
        ],
        saying:
          "I know the far end's in high demand at that time — can we set a simple weekly rotation for goal access so it's not first-in-best-dressed every session?",
      },
    ],
  },
  {
    id: "weather",
    number: 9,
    title: "Weather & Conditions",
    intro:
      "Weather calls are safety calls first. Nobody remembers the session you modified — they remember the one where someone got hurt because it wasn't.",
    scenarios: [
      {
        title: "Extreme heat before or during training",
        situation:
          "Forecast or on-the-day temperatures are high enough to raise heat stress risk, especially for younger age groups.",
        tips: [
          "Check your competition body's heat policy in advance rather than deciding on the day from scratch.",
          "Have a modified plan ready — shorter blocks, more shade breaks, reduced intensity — rather than an all-or-nothing cancel decision.",
          "Communicate the change early to parents so pick-up and logistics aren't disrupted at the last minute.",
          "Watch individual players, not just the thermometer — heat affects players differently.",
        ],
        saying:
          "Given the heat today we're shortening the session and adding water breaks every 10 minutes — safety comes first, we'll still get good work in.",
      },
      {
        title: "Storms or lightning during a session",
        situation: "Lightning or a serious storm develops while players are on the field.",
        tips: [
          "Apply the 30-30 rule as a baseline: suspend activity if thunder follows lightning within 30 seconds, and wait 30 minutes after the last strike before resuming.",
          "Move players indoors or to vehicles immediately rather than waiting to finish a drill.",
          "Communicate clearly and calmly — an authoritative, unhurried tone prevents panic.",
          "Don't resume just to finish the session — the risk doesn't reduce because you're short on time.",
        ],
        saying:
          "Everyone off the field now and into the clubrooms — we'll wait this out properly before we think about going back on.",
      },
      {
        title: "Waterlogged or unsafe ground conditions",
        situation: "Heavy rain has left the ground boggy, slippery, or with standing water, raising injury risk.",
        tips: [
          "Inspect the ground yourself rather than relying solely on a scheduled game/training going ahead by default.",
          "Have an indoor or reduced-contact alternative session ready so a cancellation isn't a wasted night for players and parents.",
          "Communicate the decision early, with a reason, so it doesn't read as arbitrary.",
          "Escalate borderline calls to the venue or competition authority rather than carrying the decision alone.",
        ],
        saying:
          "I've had a look at the ground and it's not safe underfoot tonight — we'll run a technical session in the clubrooms instead so it's not a wasted trip.",
      },
      {
        title: "Poor air quality (e.g. bushfire smoke)",
        situation: "Smoke haze or poor air quality readings raise concern about training or playing outdoors.",
        tips: [
          "Check the current air quality rating for your area rather than judging purely by visibility or smell.",
          "Apply your association's air quality policy thresholds consistently rather than case-by-case.",
          "Modify rather than cancel where thresholds allow — reduce intensity and duration.",
          "Prioritise players with known respiratory conditions in any borderline decision.",
        ],
        saying:
          "Air quality's marginal tonight, so we're keeping it low intensity and shorter than usual — anyone who's asthmatic, let me know straight away if you're not feeling right.",
      },
    ],
  },
  {
    id: "rules-officials",
    number: 10,
    title: "Competition Rules & Officials",
    intro:
      "You won't win every decision, and you don't need to. Your conduct toward officials is one of the most closely watched things you do as a coach — players copy it directly.",
    scenarios: [
      {
        title: "Disagreeing with a referee's decision during a match",
        situation: "A decision goes against your team that you believe was clearly wrong.",
        tips: [
          "Let it go in the moment — arguing mid-play rarely changes the decision and often costs you more (cards, momentum, tone).",
          "If there's a legitimate process (captain query, formal complaint post-match), use it rather than relitigating on the field.",
          "Model the reaction you want from your players — calm disagreement, not visible disgust or shouting.",
          "Raise a pattern of concerning decisions through the correct competition channel afterwards, not in the moment.",
        ],
        saying:
          "Not our call today — play on. We'll deal with anything that needs raising after the game, not out here.",
      },
      {
        title: "Uncertainty about competition rules (e.g. substitutions, grading, eligibility)",
        situation: "You're unsure of a rule mid-match or mid-season and need to make a call.",
        tips: [
          "Check the competition handbook or rules document before the season so you're not learning it live under pressure.",
          "When genuinely unsure on the day, ask the official or the opposition coach to confirm rather than guessing and risking a breach.",
          "Keep a saved copy or note of key rules (subs, grading thresholds, finals eligibility) somewhere quick to check.",
          "Follow up with your club or the competition body afterwards to clarify anything that was genuinely ambiguous.",
        ],
        saying:
          "I want to double check that before we go ahead — can we confirm the ruling with the referee so we're both playing it the same way?",
      },
      {
        title: "Opposition fielding a suspected ineligible player",
        situation:
          "You believe the opposition has a player who doesn't meet grading, age, or registration requirements for the match.",
        tips: [
          "Raise it through the correct in-game process (captain, official) calmly rather than confronting the opposition coach directly.",
          "Avoid making it personal or public — this is a compliance issue, not a character issue, on the day.",
          "Follow up in writing with the competition body after the match if it isn't resolved on the day.",
          "Keep your own team's paperwork and eligibility airtight so you're never on the other side of this conversation.",
        ],
        saying:
          "I've got a concern about eligibility for one of their players — can we flag that with the official now, and I'll follow it up formally afterwards if needed.",
      },
      {
        title: "Managing a card (yellow/red) situation afterwards",
        situation: "One of your players receives a card, and parents or the player want to discuss it after the match.",
        tips: [
          "Get the facts from the official's perspective, not just your player's account, before forming a view.",
          "Address the on-field discipline expectation with the player directly, separate from whether you think the call was harsh.",
          "Support the player emotionally, especially if it's their first card — it can feel much bigger to them than it is.",
          "Handle any formal tribunal or reporting process promptly and by the book.",
        ],
        saying:
          "Regardless of whether we agreed with the call, let's talk about what led to it so it doesn't happen again — and don't let it get in your head, plenty of good players have picked up a card.",
      },
    ],
  },
  {
    id: "club-expectations",
    number: 11,
    title: "Club Expectations",
    intro:
      "Every club has a spoken philosophy and an unspoken culture, and they don't always match. Get clarity early rather than discovering the gap mid-season.",
    scenarios: [
      {
        title: "Pressure for results clashes with a development philosophy",
        situation:
          "You're coaching for long-term development, but sense (or are told) the club wants results now.",
        tips: [
          "Clarify the club's actual philosophy directly with the committee or technical director rather than assuming from gossip.",
          "Where there's a genuine gap, name it early and ask how the club wants it resolved, rather than quietly picking a side.",
          "Show the development story in terms the club cares about — retention, pathway progress, representative selections.",
          "Decide, if the mismatch is fundamental and unresolved, whether this is the right club fit for your coaching values.",
        ],
        saying:
          "I want to make sure I'm coaching to what the club actually wants — is the priority development at this age group, or results? I'll coach accordingly, I just want us aligned.",
      },
      {
        title: "Being asked to run more than you signed up for",
        situation: "You're asked to take extra sessions, cover another team, or handle admin beyond your original role.",
        tips: [
          "Refer back to what was agreed at the start of the season as the reference point for the conversation.",
          "Ask what's driving the gap — is it a one-off, or a structural shortage the club needs to solve properly?",
          "Offer a bounded yes (this week, this month) rather than an open-ended commitment if you do want to help.",
          "It's reasonable to decline without guilt — burnt-out coaches leave, and that costs the club far more.",
        ],
        saying:
          "Happy to help out this week, but I want to flag that this isn't sustainable long-term for me — can we talk about what the club's plan is if this keeps coming up?",
      },
      {
        title: "Facilities or equipment don't match expectations",
        situation: "You were told certain grounds, lighting, goals, or equipment would be available, and they aren't.",
        tips: [
          "Raise the gap specifically and early with whoever manages facilities, rather than working around it silently all season.",
          "Adapt your session plan for what you actually have while the issue is being resolved, rather than running an unsafe or ineffective session.",
          "Put the request in writing so there's a record if it needs to be escalated.",
          "Keep parents and players informed if a facilities issue affects the session quality, so it doesn't look like a coaching shortfall.",
        ],
        saying:
          "We were told we'd have full-size goals and lights for this timeslot — neither's turned up two weeks running. Can someone confirm what's actually available so I can plan properly?",
      },
      {
        title: "Navigating club culture and politics as a newer coach",
        situation:
          "You're new to the club and sense unspoken rules, factions, or history you don't yet understand.",
        tips: [
          "Ask a trusted, experienced person at the club to give you the honest lay of the land rather than guessing.",
          "Stay neutral in existing disputes until you understand the full picture — it's easy to be pulled into a side unknowingly.",
          "Lead with consistency and fairness in your own conduct; it builds trust faster than trying to read the politics.",
          "Give it a full season before forming firm judgements about how the club operates.",
        ],
        saying:
          "I'm still getting a feel for how things work here — is there anything I should know about how things have played out before, so I don't step on anything unknowingly?",
      },
    ],
  },
  {
    id: "family-balance",
    number: 12,
    title: "Family & Personal Balance",
    intro:
      "Volunteer and part-time coaches burn out more often from what happens off the field than on it. Protecting your own time and headspace isn't selfish — it's what lets you keep coaching well.",
    scenarios: [
      {
        title: "Coaching commitments clash with family time",
        situation:
          "Training nights, matches, or admin are eating into time you'd otherwise spend with family, and it's causing friction at home.",
        tips: [
          "Set the season's commitment clearly with your family up front, rather than letting it creep session by session.",
          "Protect a small number of non-negotiable family times and communicate them to the club early.",
          "Where possible, involve family in parts of the football commitment (matches, presentation days) rather than treating it as entirely separate time.",
          "Revisit the balance at natural break points in the season rather than only when it's already causing tension.",
        ],
        saying:
          "I know this season's asking a lot of family time — let's map out which nights are truly fixed for football so we can protect the rest properly.",
      },
      {
        title: "Managing burnout across a long season",
        situation:
          "You're feeling worn down by the cumulative weight of sessions, matches, admin, and difficult conversations.",
        tips: [
          "Notice the early signs (dreading sessions, irritability, disrupted sleep) rather than waiting until you're empty.",
          "Delegate what genuinely doesn't need to be you — admin, comms, equipment — to free capacity for the parts only you can do.",
          "Build small recovery points into the season rather than only resting at the very end.",
          "Talk to the club early if the workload is unsustainable — most committees would rather adjust than lose a coach mid-season.",
        ],
        saying:
          "I'm feeling stretched thin at the moment — can we look at what could come off my plate for the next few weeks so I can keep doing the coaching part well?",
      },
      {
        title: "Bringing stress home after a difficult training or match day",
        situation:
          "A tough day at the club — a conflict, a loss, a hard conversation — is following you home and affecting your mood with family.",
        tips: [
          "Build a short decompression routine between the club and home — even ten minutes changes how you walk in the door.",
          "Debrief with someone removed from the situation (a partner, friend, fellow coach) rather than carrying it silently.",
          "Separate what's actually yours to fix from what belongs to the club, the player, or the parent involved.",
          "If a particular relationship or situation is consistently draining you, address it directly rather than absorbing it week after week.",
        ],
        saying:
          "Give me ten minutes when I get home before we dive into anything — today was a tough one at training and I want to reset before I'm properly present.",
      },
      {
        title: "Balancing paid work, coaching, and family expectations",
        situation:
          "Juggling a job, volunteer or paid coaching commitments, and family life is starting to feel unsustainable.",
        tips: [
          "Map out an honest weekly view of where your hours actually go — it's easier to negotiate change with the full picture in front of you.",
          "Identify which commitments are genuinely fixed versus which have some flexibility and negotiate the flexible ones first.",
          "Communicate proactively with your employer, club, and family rather than letting each side assume they have priority.",
          "Reassess at least once a season whether the current balance is one you can sustain, not just survive.",
        ],
        saying:
          "I want to be upfront that I can't sustain this exact workload indefinitely — let's look at what needs to change so I can keep showing up properly for all three.",
      },
    ],
  },
];
