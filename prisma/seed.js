const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial data for Student360 AI...');

  // Password hash for 'password123'
  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Create Super Admin User
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@student360.edu' },
    update: {},
    create: {
      email: 'admin@student360.edu',
      passwordHash: hashedPassword,
      fullName: 'Dr. Arthur Pendelton (Super Admin)',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });
  console.log('Admin user created/verified:', adminUser.email);

  // 2. Create Faculty User
  const facultyUser = await prisma.user.upsert({
    where: { email: 'faculty@student360.edu' },
    update: {},
    create: {
      email: 'faculty@student360.edu',
      passwordHash: hashedPassword,
      fullName: 'Prof. Rajesh Kumar (Faculty Advisor)',
      role: 'FACULTY',
      isActive: true,
    },
  });
  console.log('Faculty user created/verified:', facultyUser.email);

  // 3. Create Departments
  const deptCSE = await prisma.department.upsert({
    where: { code: 'CSE' },
    update: {},
    create: {
      code: 'CSE',
      name: 'Computer Science & Engineering',
      hodName: 'Dr. Sarah Jenkins',
    },
  });

  const deptECE = await prisma.department.upsert({
    where: { code: 'ECE' },
    update: {},
    create: {
      code: 'ECE',
      name: 'Electronics & Communication Engineering',
      hodName: 'Dr. Michael Chang',
    },
  });

  const deptAIDS = await prisma.department.upsert({
    where: { code: 'AIDS' },
    update: {},
    create: {
      code: 'AIDS',
      name: 'Artificial Intelligence & Data Science',
      hodName: 'Dr. Anita Roy',
    },
  });

  // 4. Create Batches
  const batch2022 = await prisma.batch.upsert({
    where: { name: '2022-2026' },
    update: { isCurrent: true },
    create: {
      name: '2022-2026',
      admissionYear: 2022,
      expectedGraduationYear: 2026,
      isCurrent: true,
    },
  });

  const batch2023 = await prisma.batch.upsert({
    where: { name: '2023-2027' },
    update: {},
    create: {
      name: '2023-2027',
      admissionYear: 2023,
      expectedGraduationYear: 2027,
      isCurrent: false,
    },
  });

  // 5. Create Sections
  const secA = await prisma.section.upsert({
    where: {
      departmentId_batchId_name: {
        departmentId: deptCSE.id,
        batchId: batch2022.id,
        name: 'Section A',
      },
    },
    update: {},
    create: {
      name: 'Section A',
      departmentId: deptCSE.id,
      batchId: batch2022.id,
    },
  });

  // 6. Create Courses
  const c1 = await prisma.course.upsert({
    where: { code: 'CS501' },
    update: {},
    create: {
      code: 'CS501',
      title: 'Database Management Systems',
      credits: 4,
      semester: 5,
      departmentId: deptCSE.id,
    },
  });

  const c2 = await prisma.course.upsert({
    where: { code: 'CS502' },
    update: {},
    create: {
      code: 'CS502',
      title: 'Full Stack Web Architecture',
      credits: 3,
      semester: 5,
      departmentId: deptCSE.id,
    },
  });

  // Create Base Academic Year
  const ay2025 = await prisma.academicYear.upsert({
    where: { yearCode: '2025-2026' },
    update: { isCurrent: true },
    create: {
      yearCode: '2025-2026',
      name: 'Academic Year 2025-2026',
      startDate: '2025-06-01',
      endDate: '2026-05-31',
      status: 'ACTIVE',
      isCurrent: true,
      notes: 'Initial Base Academic Year for Student360 AI',
    },
  });
  console.log('Base Academic Year 2025-2026 created/verified');

  // 7. Create Student User & Profile
  const studentUser = await prisma.user.upsert({
    where: { email: 'student@student360.edu' },
    update: {},
    create: {
      email: 'student@student360.edu',
      passwordHash: hashedPassword,
      fullName: 'Alex R. Mercer',
      role: 'STUDENT',
      isActive: true,
    },
  });

  const studentProfile = await prisma.studentProfile.upsert({
    where: { userId: studentUser.id },
    update: { admissionAcademicYearId: ay2025.id },
    create: {
      userId: studentUser.id,
      registerNo: '7376221CS101',
      rollNo: '22CS101',
      admissionNo: 'ADM2022CS01',
      fullName: 'Alex R. Mercer',
      gender: 'Male',
      dob: '2004-06-12',
      bloodGroup: 'O+',
      email: 'student@student360.edu',
      phone: '+91 9876543210',
      aadharNo: '9876 5432 1098',
      fatherName: 'Richard Mercer',
      motherName: 'Eleanor Mercer',
      guardianPhone: '+91 9876543211',
      emergencyPhone: '+91 9876543210',
      addressLine1: '42 Innovation Parkway',
      addressLine2: 'Block C, Apartment 3B',
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      pincode: '641004',
      departmentId: deptCSE.id,
      batchId: batch2022.id,
      sectionId: secA.id,
      academicYear: '2025-2026',
      admissionAcademicYearId: ay2025.id,
      currentSemester: 6,
      entryType: 'REGULAR',
      admissionQuota: 'GOVERNMENT',
      residenceType: 'HOSTELER',
      admissionDate: '2022-08-15',
      academicStatus: 'PURSUING',
      cgpa: 8.85,
      attendancePercentage: 92.4,
    },
  });

  // 8. Add Academic Records
  await prisma.academicRecord.upsert({
    where: { id: 'demo-rec-1' },
    update: {},
    create: {
      id: 'demo-rec-1',
      studentId: studentProfile.id,
      courseId: c1.id,
      semester: 5,
      internalMarks: 46.5,
      externalMarks: 45.0,
      totalMarks: 91.5,
      grade: 'O',
      credits: 4,
      result: 'PASS',
    },
  });

  await prisma.academicRecord.upsert({
    where: { id: 'demo-rec-2' },
    update: {},
    create: {
      id: 'demo-rec-2',
      studentId: studentProfile.id,
      courseId: c2.id,
      semester: 5,
      internalMarks: 44.0,
      externalMarks: 42.0,
      totalMarks: 86.0,
      grade: 'A+',
      credits: 3,
      result: 'PASS',
    },
  });

  // 9. Add Internship
  await prisma.internship.upsert({
    where: { id: 'demo-internship-1' },
    update: {},
    create: {
      id: 'demo-internship-1',
      studentId: studentProfile.id,
      companyName: 'TechCorp Innovation Labs',
      role: 'Full Stack Engineering Intern',
      location: 'Bengaluru (Hybrid)',
      startDate: '2025-06-01',
      endDate: '2025-08-31',
      stipendAmount: '₹35,000 / month',
      status: 'APPROVED',
      workSummary: 'Exceeded expectations in Next.js development.',
    },
  });

  // 10. Add Skills
  const skills = [
    { name: 'TypeScript', category: 'Technical', proficiency: 'Expert', verified: true },
    { name: 'Next.js & React', category: 'Technical', proficiency: 'Expert', verified: true },
    { name: 'PostgreSQL & Prisma', category: 'Technical', proficiency: 'Intermediate', verified: true },
    { name: 'Docker & Kubernetes', category: 'Tool', proficiency: 'Intermediate', verified: false },
  ];

  for (const s of skills) {
    await prisma.skill.create({
      data: {
        studentId: studentProfile.id,
        ...s,
      },
    });
  }

  // 11. Add Project
  await prisma.project.create({
    data: {
      studentId: studentProfile.id,
      title: 'AI Automated Resume Screening Tool',
      description: 'Built a NLP powered resume analyzer that scores candidates based on job descriptions.',
      category: 'Capstone Project',
      techStack: 'Python, FastAPI, React, PostgreSQL',
      githubUrl: 'https://github.com/alexmercer/ai-resume-screener',
      liveUrl: 'https://ai-screener-demo.vercel.app',
      guideName: 'Prof. Rajesh Kumar',
      guideRating: 4.9,
    },
  });

  // 12. Add Notifications
  await prisma.notification.create({
    data: {
      userId: studentUser.id,
      title: 'Internship NOC Approved',
      message: 'Your NOC request for TechCorp Innovation Labs has been approved by Faculty HOD.',
      type: 'SUCCESS',
    },
  });

  // 13. Seed Default Career Role Profiles
  const defaultRoles = [
    {
      roleName: 'Data Analyst',
      description: 'Collects, processes, and performs statistical analyses of data to help organizations make informed business decisions.',
      coreSkills: 'SQL, Python, Excel, Data Visualization, Statistics',
      recommendedSkills: 'Power BI, Tableau, Data Wrangling, ETL, Git',
      optionalSkills: 'R, BigQuery, Snowflake, Communication',
      suggestedProjectDomains: 'Data Analytics, Business Intelligence, Data Visualization',
      suggestedInternshipDomains: 'Data Analytics, Data Science, Software Development',
    },
    {
      roleName: 'Data Scientist',
      description: 'Extracts actionable insights from complex structured and unstructured data using machine learning algorithms and advanced analytics.',
      coreSkills: 'Python, SQL, Machine Learning, Statistics, Pandas, NumPy',
      recommendedSkills: 'Scikit-Learn, Data Wrangling, Deep Learning, Data Visualization, Git',
      optionalSkills: 'PyTorch, TensorFlow, Big Data, Spark, A/B Testing',
      suggestedProjectDomains: 'Data Science, Machine Learning, Predictive Modeling',
      suggestedInternshipDomains: 'Data Science, Research, Machine Learning',
    },
    {
      roleName: 'Machine Learning Engineer',
      description: 'Designs, builds, and deploys scalable machine learning models and infrastructure for production environments.',
      coreSkills: 'Python, PyTorch, TensorFlow, Machine Learning, MLOps, SQL',
      recommendedSkills: 'Scikit-Learn, Docker, Model Deployment, Deep Learning, Data Pipelines',
      optionalSkills: 'Kubernetes, ONNX, C++, CUDA, Cloud Computing',
      suggestedProjectDomains: 'Machine Learning, Artificial Intelligence, Computer Vision, NLP',
      suggestedInternshipDomains: 'Machine Learning, Artificial Intelligence, Research',
    },
    {
      roleName: 'AI Engineer',
      description: 'Builds AI solutions utilizing generative AI models, natural language processing, vector databases, and neural networks.',
      coreSkills: 'Python, Generative AI, LLMs, PyTorch, Prompt Engineering, API Integration',
      recommendedSkills: 'LangChain, Vector Databases, RAG, Fine-Tuning, Docker',
      optionalSkills: 'FastAPI, TypeScript, Model Evaluation, Cloud Computing',
      suggestedProjectDomains: 'Artificial Intelligence, Machine Learning, Natural Language Processing',
      suggestedInternshipDomains: 'Artificial Intelligence, Machine Learning, Software Development',
    },
    {
      roleName: 'Software Developer',
      description: 'Engineers reliable software systems, applying robust computer science algorithms, system design, and software lifecycle principles.',
      coreSkills: 'Data Structures, Algorithms, Java, C++, Python, Object-Oriented Programming, Git',
      recommendedSkills: 'SQL, Software Design, Unit Testing, System Design, REST API',
      optionalSkills: 'Docker, CI/CD, Agile Methodologies, Linux',
      suggestedProjectDomains: 'Software Development, Web Development, Systems Programming',
      suggestedInternshipDomains: 'Software Development, Web Development',
    },
    {
      roleName: 'Full Stack Developer',
      description: 'Architects end-to-end web applications covering interactive modern frontends, robust REST APIs, and database schemas.',
      coreSkills: 'JavaScript, TypeScript, React, Next.js, Node.js, HTML, CSS, SQL',
      recommendedSkills: 'PostgreSQL, Express, REST API, Git, Tailwind CSS, Docker',
      optionalSkills: 'GraphQL, Redis, AWS, CI/CD, Testing',
      suggestedProjectDomains: 'Full Stack Development, Web Development, Cloud Computing',
      suggestedInternshipDomains: 'Full Stack Development, Web Development, Software Development',
    },
    {
      roleName: 'Cloud Engineer',
      description: 'Manages cloud infrastructure, deployment pipelines, containerization, and serverless architectures.',
      coreSkills: 'AWS, Docker, Linux, Cloud Architecture, Networking, Security',
      recommendedSkills: 'Kubernetes, Terraform, CI/CD, Bash Scripting, Python, Infrastructure as Code',
      optionalSkills: 'Azure, GCP, Monitoring, Ansible, Serverless',
      suggestedProjectDomains: 'Cloud Computing, DevOps, Systems Architecture',
      suggestedInternshipDomains: 'Cloud Computing, Software Development, Cyber Security',
    },
    {
      roleName: 'Cyber Security Analyst',
      description: 'Protects institutional networks, software systems, and data assets against cyber threats, vulnerabilities, and breaches.',
      coreSkills: 'Network Security, Cybersecurity Fundamentals, Ethical Hacking, Linux, Cryptography',
      recommendedSkills: 'Wireshark, Vulnerability Assessment, SIEM, Penetration Testing, Incident Response',
      optionalSkills: 'Python Scripting, CISSP Concepts, Cloud Security, Forensic Analysis',
      suggestedProjectDomains: 'Cyber Security, Network Engineering, Systems Security',
      suggestedInternshipDomains: 'Cyber Security, Cloud Computing, Research',
    },
    {
      roleName: 'Mobile App Developer',
      description: 'Crafts responsive cross-platform or native mobile applications for iOS and Android platforms.',
      coreSkills: 'React Native, Flutter, Kotlin, Swift, Mobile UI Design, REST API',
      recommendedSkills: 'State Management, Firebase, Git, SQLite, App Store Deployment',
      optionalSkills: 'TypeScript, GraphQL, CI/CD for Mobile, Push Notifications',
      suggestedProjectDomains: 'Mobile Development, Full Stack Development, UI/UX',
      suggestedInternshipDomains: 'Mobile Development, Software Development, UI/UX',
    },
  ];

  for (const role of defaultRoles) {
    await prisma.careerRoleProfile.upsert({
      where: { roleName: role.roleName },
      update: role,
      create: role,
    });
  }

  console.log('Default Career Role Profiles seeded successfully!');
  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
