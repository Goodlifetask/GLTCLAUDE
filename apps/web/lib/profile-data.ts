// ─── Profile Categories & Tasks ──────────────────────────────────────────────
// Source: profiles.docx (17 categories + sub-types) and
//         profile-tasks.docx (daily/weekly/monthly/yearly tasks per category)

export interface ProfileCategory {
  id: string;
  label: string;
  emoji: string;
  subTypes: string[];
}

export interface ProfileTasks {
  daily:   string[];
  weekly:  string[];
  monthly: string[];
  yearly:  string[];
}

// ─── 17 Profile Categories with all sub-types ────────────────────────────────

export const PROFILE_CATEGORIES: ProfileCategory[] = [
  {
    id: 'students',
    label: 'Students',
    emoji: '🎓',
    subTypes: [
      'Preschool student',
      'Elementary school student',
      'Middle school student',
      'High school student',
      'Vocational student',
      'College student',
      'Undergraduate student',
      'Graduate student',
      'PhD / Doctoral student',
      'Medical student',
      'Law student',
      'Engineering student',
      'Online student',
      'International student',
      'Part-time student',
    ],
  },
  {
    id: 'office',
    label: 'Office / Corporate',
    emoji: '💼',
    subTypes: [
      'Office employee',
      'Government employee',
      'Private sector employee',
      'Corporate professional',
      'Manager',
      'Senior manager',
      'Executive',
      'Consultant',
      'Analyst',
      'Administrative assistant',
      'Human resources professional',
      'Finance professional',
      'Accountant',
      'Auditor',
      'Marketing professional',
      'Sales professional',
      'Customer support representative',
    ],
  },
  {
    id: 'tech',
    label: 'Technology & IT',
    emoji: '💻',
    subTypes: [
      'Software developer',
      'Web developer',
      'Mobile app developer',
      'DevOps engineer',
      'Cloud engineer',
      'Network engineer',
      'Cybersecurity analyst',
      'System administrator',
      'Database administrator',
      'IT support specialist',
      'Data scientist',
      'AI engineer',
      'Machine learning engineer',
      'IT project manager',
    ],
  },
  {
    id: 'healthcare',
    label: 'Healthcare',
    emoji: '🏥',
    subTypes: [
      'Doctor',
      'Nurse',
      'Surgeon',
      'Pharmacist',
      'Dentist',
      'Medical technician',
      'Lab technician',
      'Radiologist',
      'Therapist',
      'Physiotherapist',
      'Paramedic',
    ],
  },
  {
    id: 'education',
    label: 'Education',
    emoji: '📚',
    subTypes: [
      'Teacher',
      'Professor',
      'Lecturer',
      'School principal',
      'Teaching assistant',
      'Academic researcher',
      'Tutor',
      'Education administrator',
    ],
  },
  {
    id: 'trades',
    label: 'Skilled Trades',
    emoji: '🔧',
    subTypes: [
      'Electrician',
      'Plumber',
      'Carpenter',
      'Mechanic',
      'Welder',
      'Construction worker',
      'Technician',
      'HVAC technician',
    ],
  },
  {
    id: 'business',
    label: 'Business & Entrepreneur',
    emoji: '🚀',
    subTypes: [
      'Business owner',
      'Entrepreneur',
      'Startup founder',
      'Investor',
      'Venture capitalist',
      'Small business owner',
      'Franchise owner',
    ],
  },
  {
    id: 'freelance',
    label: 'Freelancer / Self-Employed',
    emoji: '🧑‍💻',
    subTypes: [
      'Freelance developer',
      'Freelance designer',
      'Freelance writer',
      'Consultant',
      'Contractor',
      'Gig worker',
    ],
  },
  {
    id: 'creative',
    label: 'Creative',
    emoji: '🎨',
    subTypes: [
      'Artist',
      'Graphic designer',
      'Photographer',
      'Filmmaker',
      'Musician',
      'Actor',
      'Animator',
      'Content creator',
      'YouTuber',
    ],
  },
  {
    id: 'government',
    label: 'Government & Public Service',
    emoji: '🏛️',
    subTypes: [
      'Civil servant',
      'Police officer',
      'Firefighter',
      'Military personnel',
      'Judge',
      'Lawyer',
      'Public administrator',
      'Diplomat',
    ],
  },
  {
    id: 'agriculture',
    label: 'Agriculture & Rural',
    emoji: '🌾',
    subTypes: [
      'Farmer',
      'Agricultural worker',
      'Rancher',
      'Fisherman',
      'Forestry worker',
    ],
  },
  {
    id: 'service',
    label: 'Service Industry',
    emoji: '🛎️',
    subTypes: [
      'Retail worker',
      'Cashier',
      'Waiter / Waitress',
      'Chef',
      'Cook',
      'Hotel staff',
      'Delivery driver',
      'Taxi driver',
    ],
  },
  {
    id: 'job_seeking',
    label: 'Job Seeking',
    emoji: '🔍',
    subTypes: [
      'Job seeker',
      'Unemployed worker',
      'Career changer',
    ],
  },
  {
    id: 'homemaker',
    label: 'Homemaker / Caregiver',
    emoji: '🏠',
    subTypes: [
      'Stay-at-home parent',
      'Homemaker',
      'Caregiver',
    ],
  },
  {
    id: 'retired',
    label: 'Retired',
    emoji: '🌅',
    subTypes: [
      'Retired professional',
      'Retired government employee',
      'Retired military',
      'Retired business owner',
    ],
  },
  {
    id: 'volunteer',
    label: 'Volunteer & Non-profit',
    emoji: '🤝',
    subTypes: [
      'Volunteer worker',
      'NGO staff',
      'Community organizer',
      'Charity worker',
    ],
  },
  {
    id: 'special',
    label: 'Intern / Trainee',
    emoji: '📋',
    subTypes: [
      'Intern',
      'Apprentice',
      'Trainee',
      'Part-time worker',
      'Seasonal worker',
    ],
  },
];

// ─── Tasks per category (from profile-tasks.docx) ────────────────────────────

export const PROFILE_TASKS: Record<string, ProfileTasks> = {
  students: {
    daily:   ['Attend classes', 'Study / homework', 'Participate in discussions', 'Read textbooks', 'Use learning platforms'],
    weekly:  ['Complete assignments', 'Group projects', 'Quizzes / tests', 'Meet teachers or tutors'],
    monthly: ['Unit exams', 'Project submissions', 'Progress reviews'],
    yearly:  ['Final exams', 'Academic promotions', 'Course registration'],
  },
  office: {
    daily:   ['Check email', 'Attend meetings', 'Complete work tasks', 'Communicate with team', 'Update reports'],
    weekly:  ['Team meetings', 'Progress updates', 'Project reviews'],
    monthly: ['Performance reports', 'Department meetings', 'Budget review'],
    yearly:  ['Performance evaluations', 'Salary review', 'Strategic planning'],
  },
  tech: {
    daily:   ['Write code / configure systems', 'Troubleshoot issues', 'Monitor systems', 'Review logs', 'Team collaboration'],
    weekly:  ['Sprint meetings', 'Code reviews', 'System updates', 'Security checks'],
    monthly: ['System maintenance', 'Security patching', 'Infrastructure review'],
    yearly:  ['Technology upgrades', 'Security audits', 'Architecture planning'],
  },
  healthcare: {
    daily:   ['Patient consultations', 'Medical procedures', 'Update medical records', 'Prescriptions'],
    weekly:  ['Patient follow-ups', 'Medical meetings', 'Case reviews'],
    monthly: ['Training updates', 'Health program reviews'],
    yearly:  ['Medical certification renewal', 'Hospital audits'],
  },
  education: {
    daily:   ['Teach classes', 'Prepare lessons', 'Grade assignments'],
    weekly:  ['Staff meetings', 'Student evaluations'],
    monthly: ['Parent meetings', 'Academic progress reports'],
    yearly:  ['Curriculum planning', 'Final exams', 'Academic results'],
  },
  trades: {
    daily:   ['Repair equipment', 'Install systems', 'Diagnose problems'],
    weekly:  ['Maintenance checks', 'Equipment inspections'],
    monthly: ['Safety inspections', 'Tool maintenance'],
    yearly:  ['Certification renewal', 'Safety training'],
  },
  business: {
    daily:   ['Manage operations', 'Meet clients', 'Review finances', 'Manage staff'],
    weekly:  ['Sales review', 'Business strategy discussions'],
    monthly: ['Financial reports', 'Payroll', 'Inventory review'],
    yearly:  ['Tax filing', 'Business planning', 'Investment decisions'],
  },
  freelance: {
    daily:   ['Client work', 'Communication with clients', 'Marketing services'],
    weekly:  ['Proposal writing', 'Project updates'],
    monthly: ['Invoices', 'Financial tracking'],
    yearly:  ['Taxes', 'Business development planning'],
  },
  service: {
    daily:   ['Serve customers', 'Operate equipment', 'Process transactions'],
    weekly:  ['Inventory checks', 'Staff scheduling'],
    monthly: ['Sales reporting', 'Staff performance reviews'],
    yearly:  ['Training', 'Certification renewal'],
  },
  agriculture: {
    daily:   ['Feed animals', 'Monitor crops', 'Maintain equipment'],
    weekly:  ['Field inspections', 'Equipment repair'],
    monthly: ['Crop treatment', 'Market planning'],
    yearly:  ['Planting / harvesting seasons', 'Farm planning'],
  },
  government: {
    daily:   ['Public service delivery', 'Administrative work'],
    weekly:  ['Department meetings', 'Case reviews'],
    monthly: ['Policy updates', 'Reporting'],
    yearly:  ['Budget planning', 'Government reviews'],
  },
  homemaker: {
    daily:   ['Cooking', 'Cleaning', 'Childcare', 'Household management'],
    weekly:  ['Grocery shopping', 'Laundry', 'Home maintenance'],
    monthly: ['Budget management', 'Home supplies'],
    yearly:  ['Family planning', 'Major home cleaning'],
  },
  retired: {
    daily:   ['Personal health activities', 'Social interaction', 'Hobbies'],
    weekly:  ['Community activities', 'Family visits'],
    monthly: ['Financial management', 'Medical checkups'],
    yearly:  ['Health screenings', 'Travel or family events'],
  },
  // Categories without dedicated tasks data — still useful as profiles
  creative:    { daily: [], weekly: [], monthly: [], yearly: [] },
  job_seeking: { daily: [], weekly: [], monthly: [], yearly: [] },
  volunteer:   { daily: [], weekly: [], monthly: [], yearly: [] },
  special:     { daily: [], weekly: [], monthly: [], yearly: [] },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function getCategoryById(id: string): ProfileCategory | undefined {
  return PROFILE_CATEGORIES.find((c) => c.id === id);
}

export function getTasksForCategory(id: string): ProfileTasks {
  return PROFILE_TASKS[id] ?? { daily: [], weekly: [], monthly: [], yearly: [] };
}

export const FREQ_LABELS: Record<string, string> = {
  daily:   'Daily',
  weekly:  'Weekly',
  monthly: 'Monthly',
  yearly:  'Yearly',
};
