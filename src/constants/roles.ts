export const JOB_ROLES = {
  Operations: [
    "Event Director",
    "General Event Support",
    "Site Lead",
    "Site Manager",
    "Finish Line Lead",
    "Start Line Lead",
    "Course Lead",
    "Vendor Manager",
    "Project Manager",
    "Forklift Operator",
    "Truck Driver (CDL)",
    "Electrician",
    "Course Measurer",
  ],
  Technology: [
    "Timer (Mylaps)",
    "Timer (Chronotrack)",
    "Timer (Race Result)",
    "Registration Support",
    "Sound/Audio Engineer",
    "IT Support",
  ],
  Marketing: [
    "Race Announcer",
    "Public Relations",
    "Content Creator",
    "Influencer Coordinator",
    "Photographer",
    "Community Outreach",
    "Running Coach",
  ]
}

// Helper to get a flat list of all roles for search/filtering
export const ALL_ROLES = Object.values(JOB_ROLES).flat()