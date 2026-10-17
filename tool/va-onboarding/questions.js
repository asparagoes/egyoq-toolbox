window.ONBOARDING = {
  documentTitle: 'Creative & Operations Virtual Assistant — Onboarding Proposal',
  employerName: 'Jad Zeineddine',
  employerRole: 'Employer / founder',
  virtualAssistantName: 'Aselver Abucay',
  virtualAssistantRole: 'Creative & Operations Virtual Assistant',
  sections: [
    {
      id: 'intro',
      title: 'Introduction',
      intro: 'This opening page explains the purpose of the proposal and the parties involved.',
      introMode: true,
      items: []
    },
    {
      id: 'working',
      title: 'Working arrangement',
      intro: 'Availability, compensation, boundaries, and day-to-day expectations.',
      items: [
        {
          id: 'fee',
          title: 'Weekly arrangement',
          body: 'The Virtual Assistant proposes a fixed USD 180 weekly fee for the mutually agreed scope and approximately 10–15 hours of flexible weekly availability. Material changes to scope, availability, or compensation would be discussed and agreed upon beforehand.'
        },
        {
          id: 'exam',
          title: 'Examination weeks and absences',
          body: 'The Virtual Assistant proposes giving advance notice when reasonably possible of academic commitments affecting availability, so assignments and deadlines can be adjusted together.'
        },
        {
          id: 'capacity',
          title: 'Competing tasks and workload',
          body: 'When delegated work exceeds the agreed 10–15-hour weekly capacity, the Virtual Assistant proposes recommending a priority order and moving lower-priority items to another week instead of assuming extra hours.'
        },
        {
          id: 'daily',
          title: 'Daily communication',
          body: 'The Virtual Assistant proposes checking iMessage daily when reasonably available, without guaranteed immediate replies or continuous on-call coverage.'
        },
        {
          id: 'meetings',
          title: 'Meetings',
          body: 'The Virtual Assistant proposes meeting only when necessary and scheduling calls in advance around both parties’ availability.'
        }
      ]
    },
    {
      id: 'scope',
      title: 'Responsibilities and decision-making',
      intro: 'The Virtual Assistant’s suggested duties, boundaries, and independence for routine work.',
      checklist: true,
      items: [
        {
          id: 'scope-overview',
          title: 'Overall scope',
          body: 'The Virtual Assistant proposes supporting the Employer’s personal, executive, administrative, creative, and professional priorities within the agreed weekly capacity. The duty table below shows the preferred starting responsibility levels.'
        },
        {
          id: 'autonomy',
          title: 'Routine decision-making',
          body: 'The Virtual Assistant proposes handling authorized routine work independently while preparing recommendations for consequential decisions, unusual customer matters, external commitments, spending, or sensitive actions.'
        },
        {
          id: 'calendar',
          title: 'Calendar and scheduling',
          body: 'The Virtual Assistant proposes assisting with scheduling coordination, confirmations, and reminders after the Employer authorizes access or delegation. Existing systems such as zcal may continue to be used.'
        },
        {
          id: 'personal-boundaries',
          title: 'Personal assistance boundaries',
          body: 'The Virtual Assistant is comfortable handling clearly assigned and appropriate personal tasks within professional boundaries, available hours, and granted permissions.'
        },
        {
          id: 'priority-ownership',
          title: 'Priority ownership',
          body: 'The Virtual Assistant proposes recommending priorities using urgency, deadlines, and impact, while the Employer retains final authority over significant changes or conflicts.'
        }
      ]
    },
    {
      id: 'access',
      title: 'Systems, access and collaborators',
      intro: 'Confirm existing tools, permissions, collaborators, and how missing details will be shared.',
      facts: true,
      items: [
        {
          id: 'business-inbox',
          title: 'Email and inbox access',
          body: 'The Virtual Assistant proposes beginning with business email and communication access relevant to delegated responsibilities. Personal email or private accounts would only be requested when specifically needed and expressly authorized.'
        },
        {
          id: 'sensitive-info',
          title: 'Sensitive information',
          body: 'The Virtual Assistant proposes receiving explicit permission before accessing, sharing, or recording sensitive personal, customer, or business information. Private information should remain outside broadly shared trackers.'
        },
        {
          id: 'existing-systems',
          title: 'Use existing systems first',
          body: 'The Virtual Assistant proposes reviewing the Employer’s existing tools, workflows, and collaborators before recommending extra software, automation, or structural changes.'
        }
      ]
    },
    {
      id: 'workflow',
      title: 'Communication and organization',
      intro: 'Proposed tracker setup, progress reporting, approval recording, and timing conventions.',
      sampleTracker: true,
      items: [
        {
          id: 'tracker',
          title: 'Early tracker setup',
          body: 'The Virtual Assistant proposes setting up a lightweight private Google Sheets tracker at the start of onboarding, covering tasks, approvals, follow-ups, creative projects, and deadlines. A sample tracker layout is shown below for illustration.'
        },
        {
          id: 'updates',
          title: 'Progress updates',
          body: 'The Virtual Assistant proposes sending brief updates after meaningful tasks, plus a concise weekly summary. Detailed notes and pending approvals can remain in the tracker.'
        },
        {
          id: 'approval-records',
          title: 'Approval records',
          body: 'The Virtual Assistant proposes collecting approvals through iMessage and recording the decision and date in the tracker, so the Employer does not need to manage the spreadsheet directly.'
        },
        {
          id: 'timezones',
          title: 'Time zones and deadlines',
          body: 'The Virtual Assistant proposes showing deadlines in both Asia/Manila and America/Chicago time whenever useful, noting Illinois daylight-saving changes when relevant.'
        }
      ]
    },
    {
      id: 'creative',
      title: 'Creative coordination and expenses',
      intro: 'Creative coordination, outreach support, minor design work, project fees, and expense handling.',
      items: [
        {
          id: 'creative-coordination',
          title: 'Creative coordination',
          body: 'The Virtual Assistant proposes helping with design briefs, brand checks, creative quality review, deadline monitoring, and — where useful — suggesting visual concepts or content direction.'
        },
        {
          id: 'designer-revisions',
          title: 'Routine designer revisions',
          body: 'The Virtual Assistant proposes requesting routine revisions directly from an authorized designer when the requested changes stay within the approved brief, scope, and timeline. Major direction changes would return to the Employer for approval.'
        },
        {
          id: 'minor-design',
          title: 'Minor hands-on design work',
          body: 'The Virtual Assistant proposes including up to two hours of minor design work within regular weekly capacity. This covers simple edits, resizing, and light production support, not major original projects.'
        },
        {
          id: 'separate-projects',
          title: 'Separately priced design projects',
          body: 'For substantial original design work, the Virtual Assistant proposes providing a written quotation before starting. The quotation should state deliverables, the agreed fee, timeline, and included revisions.'
        },
        {
          id: 'creator-outreach',
          title: 'Creator outreach and publication',
          body: 'The Virtual Assistant proposes researching creators and drafting outreach first. External outreach or public posting would begin after the Employer authorizes the approach, with potential standing permission for routine content later.'
        },
        {
          id: 'expenses',
          title: 'Expenses',
          body: 'The Virtual Assistant proposes that approved expenses be paid directly by the Employer when practical, or reimbursed after advance approval if the Virtual Assistant makes a purchase.'
        }
      ]
    },
    {
      id: 'confirm',
      title: 'Onboarding and confirmations',
      intro: 'Immediate next steps, access details, start information, and final review before submission.',
      finalFacts: true,
      items: [
        {
          id: 'month-one',
          title: 'Initial onboarding approach',
          body: 'The Virtual Assistant proposes starting by organizing systems and trackers immediately while also handling current delegated tasks. The first formal review can happen approximately 30 days after onboarding begins.'
        },
        {
          id: 'light-testing',
          title: 'Light app testing when requested',
          body: 'Occasional app or website testing may be handled as light support work when requested. The previously discussed Wise onboarding / payout setup can be treated as a completed task report, not an ongoing heavy testing obligation.'
        },
        {
          id: 'final-confirmation',
          title: 'Final confirmation',
          body: 'The Employer may use this section to record the proposed start date, payment details, immediate priorities, follow-ups, and any final notes before submitting the completed response summary.'
        }
      ]
    }
  ],
  duties: [
    ['calendar', 'Personal calendar, meeting reminders and scheduling coordination', 'Primary'],
    ['admin', 'Email, messages, general administration and follow-ups', 'Primary'],
    ['research', 'Personal and business research and recommendations', 'Primary'],
    ['docs', 'Organizing tasks, files, documents and priorities', 'Primary'],
    ['inquiries', 'Routine customer or business inquiries using approved information', 'Primary'],
    ['brand', 'Brand checking, design briefs and coordinating designers', 'Primary'],
    ['social', 'Social media, creator research and outreach coordination', 'Primary'],
    ['testing', 'Occasional app or website testing when requested', 'As needed'],
    ['collab', 'Coordinating existing employees or contractors', 'As needed']
  ],
  trackerSample: {
    columns: ['Task', 'Category', 'Priority', 'Deadline', 'Approval', 'Status'],
    rows: [
      ['Confirm access needs', 'Operations', 'High', 'Mon 10:00 AM CDT / Mon 11:00 PM PHT', 'Needed', 'Pending employer reply'],
      ['Prepare creator shortlist', 'Marketing', 'Medium', 'Wed 4:00 PM CDT / Thu 5:00 AM PHT', 'Not needed', 'In progress'],
      ['Review designer draft', 'Creative', 'High', 'Thu 1:00 PM CDT / Fri 2:00 AM PHT', 'Needed for final post', 'Ready for review']
    ]
  }
};
