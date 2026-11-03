export const ROLE_CATEGORIES = {
  "Operations": [
    "General Event Support", "Site Lead", "Site Manager", "Finish Line Lead", "Start Line Lead", "Course Lead", 
    "Vendor Manager", "Project Manager", "Equipment Operator", "Forklift Operator", "Truck Driver (nonCDL)", 
    "Truck Driver (CDL)", "Electrician/Power", "Volunteer Coordinator", "Expo Lead", "Expo Support", "Warehouse Coordinator"
  ],
  "Technology": [
    "Timer (Mylaps)", "Timer (Chronotrack)", "Timer (Race Result)", "Registration Support (Run Signup)", 
    "Registration Support (Race Roster)", "Registration Support (Haku)", "Sound/Audio"
  ],
  "Marketing/PR/Communications": [
    "Race Announcer", "Public Relations", "Communications Lead", "Marketing Support", "Content Creator", 
    "Social Media Influencer Coordinator", "Social Media Influencer", "Photographer - Content", 
    "Photographer - Individual Runner", "Community Outreach"
  ]
};

// A flat array of all roles, useful for quick validation checks
export const ALL_ROLES = Object.values(ROLE_CATEGORIES).flat();