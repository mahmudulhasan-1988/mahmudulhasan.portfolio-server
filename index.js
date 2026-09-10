import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
const DB_NAME = process.env.DB_NAME || 'portfolio_db';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin123secret';
const IMGBB_API_KEY = process.env.IMGBB_API_KEY || '';

// Middleware
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// In-Memory Fallback Data Store (Used if MongoDB is not reachable locally)
let dbClient = null;
let db = null;
let isMongoConnected = false;

// Default Mock Data for Seeding / Fallback
const defaultBio = {
  name: "Mahmudul Hasan",
  title: "Full-Stack Software Engineer & Creative Developer",
  designation: "Senior Full-Stack Engineer",
  avatar: "https://i.ibb.co.com/pv83jvbS/PP-Hasan.png",
  bio: "Passionate engineer with 5+ years of experience building high-performance web applications, scalable Node/Express backends, and beautiful user interfaces.",
  location: "Jamirdia, Square Mastarbari, Valuka, Mymensingh, Bangladesh.",
  email: "engr.mharif24@gmail.com",
  phone: "+880 01811562080",
  whatsapp: "01811562080",
  github: "https://github.com/mahmudulhasan-1988",
  linkedin: "https://www.linkedin.com/in/mahmudulhasan1988",
  twitter: "https://twitter.com",
  facebook: "https://www.facebook.com/arif.chowdhury.5243",
  resumeUrl: "/sample-resume.pdf",
  aboutMe: {
    journey: "My programming journey began at Programming Hero, when I wrote my first HTML & CSS code to create a website with a simple HTML. What started as a mere curiosity quickly grew into a deep passion for software engineering. Over the years, I have completed my degree in Computer Science, contributed to open-source tools, and built production-grade microservices serving thousands of daily active users. I am previously a Hardware and Networking Expart. I have over 15 years of experience in Hardware and Networking. I work for a company as a Hardware, Networking & Software Department Head",
    workEnjoyed: "I thrive on solving complex backend architecture challenges—such as optimizing database query performance, building resilient RESTful APIs, and crafting fluid frontend user experiences using Next.js, Tailwind CSS, and DaisyUI.",
    hobbies: [
      { name: "Competitive Tennis", description: "Weekend matches & staying active outdoors", icon: "Activity" },
      { name: "Digital Painting", description: "Creating concept art & UI illustrations", icon: "Palette" },
      { name: "Landscape Photography", description: "Capturing natural scenery and urban architecture", icon: "Camera" },
      { name: "Music Production", description: "Synthesizing lo-fi beats and ambient soundscapes", icon: "Headphones" }
    ]
  },
  education: [
    {
      degree: 'Bachelor of Science in Computer Science & Engineering (B.Sc)',
      institution: 'Daffodil International University, Dhaka',
      period: '2007 – 2010',
      gpa: '3.14 / 4.0 (Magna Cum Laude)',
      highlights: 'Specialized in Distributed Systems, Database Optimization, and Software Architecture. Served as Lead Tech VP of the ACM Student Chapter.',
      keyCourses: ['Data Structures & Algorithms', 'Database Systems', 'Web Architecture', 'Distributed Systems'],
    },
    {
      degree: 'Higher Secondary Certificate (HSC)',
      institution: 'Savar Cantonment Public School & College, Dhaka',
      period: '2004 – 2006',
      gpa: '4.60 / 5.0 (Full Marks in Science)',
      highlights: 'Top 1% in State Mathematics and Computer Programming Olympiad.',
      keyCourses: ['Advanced Mathematics', 'Physics', 'Computer Fundamentals'],
    },
    {
      degree: 'Secondary School Certificate (SSC)',
      institution: 'Savar Cantonment Public School & College, Dhaka',
      period: '2002 – 2004',
      gpa: '3.56 / 5.0 (Full Marks in Science)',
      highlights: 'Top 1% in State Mathematics and Computer Programming Olympiad.',
      keyCourses: ['Advanced Mathematics', 'Physics', 'Computer Fundamentals'],
    },
  ],
  stats: {
    projectsCompleted: 28,
    yearsExperience: 5,
    happyClients: 19,
    codeCommits: "3.4k+"
  }
};

const defaultSkills = [
  { name: "JavaScript (ES6+)", category: "Frontend", level: 95, icon: "Code2" },
  { name: "React.js / Next.js", category: "Frontend", level: 92, icon: "Layout" },
  { name: "Tailwind CSS & DaisyUI", category: "Frontend", level: 90, icon: "Palette" },
  { name: "Node.js & Express.js", category: "Backend", level: 90, icon: "Server" },
  { name: "MongoDB & Aggregations", category: "Database", level: 85, icon: "Database" },
  { name: "RESTful APIs & WebSockets", category: "Backend", level: 88, icon: "Cpu" },
  { name: "Git & GitHub Actions", category: "Tools & DevOps", level: 85, icon: "GitBranch" },
  { name: "Docker & Cloud Deployments", category: "Tools & DevOps", level: 80, icon: "Box" }
];


let memoryStore = {
  bio: { ...defaultBio },
  skills: [...defaultSkills.map((s, idx) => ({ ...s, _id: `skill_${idx}` }))],
  messages: []
};

// MongoDB Connection Helper
async function connectToMongo() {
  try {
    dbClient = new MongoClient(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
      socketTimeoutMS: 30000,
      tls: MONGODB_URI.includes('mongodb.net') ? true : undefined,
    });
    await dbClient.connect();
    // Verify connectivity
    await dbClient.db('admin').command({ ping: 1 });
    db = dbClient.db(DB_NAME);
    isMongoConnected = true;
    console.log(`[MongoDB Atlas] Connected successfully to database: ${DB_NAME}`);

    // Seed database if empty
    await seedMongoDatabase();
  } catch (err) {
    isMongoConnected = false;
    console.log(`[MongoDB] Unable to connect (${err.message}). Using In-Memory Store as fallback.`);
  }
}

async function seedMongoDatabase() {
  if (!db) return;
  try {
    const projectsColl = db.collection('projects');
    const skillsColl = db.collection('skills');
    const expColl = db.collection('experiences');
    const bioColl = db.collection('bio');

    const projectCount = await projectsColl.countDocuments();
    if (projectCount === 0) {
      await projectsColl.insertMany(defaultProjects.map(p => ({
        ...p,
        _id: new ObjectId(p._id)
      })));
      console.log("[MongoDB Native] Seeded projects collection.");
    }

    const skillCount = await skillsColl.countDocuments();
    if (skillCount === 0) {
      await skillsColl.insertMany(defaultSkills);
      console.log("[MongoDB Native] Seeded skills collection.");
    }

    const expCount = await expColl.countDocuments();
    if (expCount === 0) {
      await expColl.insertMany(defaultExperiences.map(e => ({
        ...e,
        _id: new ObjectId(e._id)
      })));
      console.log("[MongoDB Native] Seeded experiences collection.");
    }

    const bioCount = await bioColl.countDocuments();
    if (bioCount === 0) {
      await bioColl.insertOne(defaultBio);
      console.log("[MongoDB Native] Seeded bio collection.");
    }
  } catch (err) {
    console.error("[MongoDB Native Seed Error]", err.message);
  }
}

// Initialize connection
connectToMongo();

// ==========================================
// SINGLE-FILE EXPRESS API ROUTES
// ==========================================

// 1. Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    mongoConnected: isMongoConnected,
    database: isMongoConnected ? DB_NAME : 'in-memory-fallback',
    mode: 'Single-File Express Native MongoDB'
  });
});

// 2. Portfolio Bio & Profile Data
app.get('/api/portfolio', async (req, res) => {
  try {
    if (isMongoConnected) {
      const bio = await db.collection('bio').findOne({});
      return res.json(bio || defaultBio);
    }
    return res.json(memoryStore.bio);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Bio / Portfolio Data
app.put('/api/portfolio', async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates._id;
    if (isMongoConnected) {
      const existing = await db.collection('bio').findOne({});
      if (existing) {
        await db.collection('bio').updateOne({ _id: existing._id }, { $set: updates });
      } else {
        await db.collection('bio').insertOne({ ...defaultBio, ...updates });
      }
      const updated = await db.collection('bio').findOne({});
      return res.json(updated);
    } else {
      memoryStore.bio = { ...memoryStore.bio, ...updates };
      return res.json(memoryStore.bio);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Education Endpoints
app.get('/api/education', async (req, res) => {
  try {
    let bioObj = null;
    if (isMongoConnected) {
      bioObj = await db.collection('bio').findOne({});
    }
    if (!bioObj) bioObj = memoryStore.bio || defaultBio;
    return res.json(bioObj.education || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/education', async (req, res) => {
  try {
    const { degree, institution, period, gpa, highlights, keyCourses } = req.body;
    if (!degree || !institution) {
      return res.status(400).json({ error: 'Degree and institution are required' });
    }
    const newEdu = {
      degree,
      institution,
      period: period || '',
      gpa: gpa || '',
      highlights: highlights || '',
      keyCourses: Array.isArray(keyCourses)
        ? keyCourses
        : (keyCourses ? keyCourses.split(',').map(c => c.trim()) : [])
    };

    if (isMongoConnected) {
      const existing = await db.collection('bio').findOne({});
      const currentEdu = existing?.education || [...defaultBio.education];
      currentEdu.unshift(newEdu);
      if (existing) {
        await db.collection('bio').updateOne({ _id: existing._id }, { $set: { education: currentEdu } });
      } else {
        await db.collection('bio').insertOne({ ...defaultBio, education: currentEdu });
      }
      return res.status(201).json(newEdu);
    } else {
      if (!memoryStore.bio.education) memoryStore.bio.education = [];
      memoryStore.bio.education.unshift(newEdu);
      return res.status(201).json(newEdu);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/education/:index', async (req, res) => {
  try {
    const idx = parseInt(req.params.index, 10);
    const { degree, institution, period, gpa, highlights, keyCourses } = req.body;

    const updatedItem = {
      degree,
      institution,
      period: period || '',
      gpa: gpa || '',
      highlights: highlights || '',
      keyCourses: Array.isArray(keyCourses)
        ? keyCourses
        : (keyCourses ? keyCourses.split(',').map(c => c.trim()) : [])
    };

    if (isMongoConnected) {
      const existing = await db.collection('bio').findOne({});
      const currentEdu = existing?.education || [...defaultBio.education];
      if (idx < 0 || idx >= currentEdu.length) {
        return res.status(404).json({ error: 'Education item not found at index' });
      }
      currentEdu[idx] = { ...currentEdu[idx], ...updatedItem };
      await db.collection('bio').updateOne({ _id: existing._id }, { $set: { education: currentEdu } });
      return res.json(currentEdu[idx]);
    } else {
      if (!memoryStore.bio.education) memoryStore.bio.education = [...defaultBio.education];
      if (idx < 0 || idx >= memoryStore.bio.education.length) {
        return res.status(404).json({ error: 'Education item not found at index' });
      }
      memoryStore.bio.education[idx] = { ...memoryStore.bio.education[idx], ...updatedItem };
      return res.json(memoryStore.bio.education[idx]);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/education/:index', async (req, res) => {
  try {
    const idx = parseInt(req.params.index, 10);
    if (isMongoConnected) {
      const existing = await db.collection('bio').findOne({});
      const currentEdu = existing?.education || [...defaultBio.education];
      if (idx < 0 || idx >= currentEdu.length) {
        return res.status(404).json({ error: 'Education item not found at index' });
      }
      currentEdu.splice(idx, 1);
      await db.collection('bio').updateOne({ _id: existing._id }, { $set: { education: currentEdu } });
      return res.json({ message: 'Education deleted successfully' });
    } else {
      if (!memoryStore.bio.education) memoryStore.bio.education = [...defaultBio.education];
      if (idx < 0 || idx >= memoryStore.bio.education.length) {
        return res.status(404).json({ error: 'Education item not found at index' });
      }
      memoryStore.bio.education.splice(idx, 1);
      return res.json({ message: 'Education deleted successfully' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// 3. Get All Skills
app.get('/api/skills', async (req, res) => {
  try {
    if (isMongoConnected) {
      const skills = await db.collection('skills').find({}).toArray();
      return res.json(skills);
    }
    return res.json(memoryStore.skills);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add New Skill (Admin)
app.post('/api/skills', async (req, res) => {
  try {
    const { name, category, level, icon } = req.body;
    if (!name || !category) {
      return res.status(400).json({ error: 'Name and category are required' });
    }
    const newSkill = { name, category, level: Number(level) || 80, icon: icon || 'Code2' };

    if (isMongoConnected) {
      const result = await db.collection('skills').insertOne(newSkill);
      return res.status(201).json({ ...newSkill, _id: result.insertedId });
    } else {
      const skillWithId = { ...newSkill, _id: `skill_${Date.now()}` };
      memoryStore.skills.push(skillWithId);
      return res.status(201).json(skillWithId);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Skill (Admin)
app.put('/api/skills/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, level, icon } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (category) updates.category = category;
    if (level !== undefined) updates.level = Number(level);
    if (icon) updates.icon = icon;

    if (isMongoConnected) {
      await db.collection('skills').updateOne({ _id: new ObjectId(id) }, { $set: updates });
      const updated = await db.collection('skills').findOne({ _id: new ObjectId(id) });
      return res.json(updated);
    } else {
      const index = memoryStore.skills.findIndex(s => s._id === id);
      if (index === -1) return res.status(404).json({ error: 'Skill not found' });
      memoryStore.skills[index] = { ...memoryStore.skills[index], ...updates };
      return res.json(memoryStore.skills[index]);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Skill (Admin)
app.delete('/api/skills/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (isMongoConnected) {
      await db.collection('skills').deleteOne({ _id: new ObjectId(id) });
    } else {
      memoryStore.skills = memoryStore.skills.filter(s => s._id !== id);
    }
    res.json({ message: 'Skill deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Projects Routes
// GET /api/projects
app.get('/api/projects', async (req, res) => {
  try {
    const { category, featured } = req.query;
    let query = {};
    if (category && category !== 'All') {
      query.category = category;
    }
    if (featured === 'true') {
      query.featured = true;
    }

    if (isMongoConnected) {
      const projects = await db.collection('projects').find(query).sort({ createdAt: -1 }).toArray();
      return res.json(projects);
    } else {
      let filtered = [...memoryStore.projects];
      if (category && category !== 'All') {
        filtered = filtered.filter(p => p.category === category);
      }
      if (featured === 'true') {
        filtered = filtered.filter(p => p.featured);
      }
      return res.json(filtered);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET Single Project
app.get('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (isMongoConnected) {
      const project = await db.collection('projects').findOne({ _id: new ObjectId(id) });
      if (!project) return res.status(404).json({ error: 'Project not found' });
      return res.json(project);
    } else {
      const project = memoryStore.projects.find(p => p._id === id);
      if (!project) return res.status(404).json({ error: 'Project not found' });
      return res.json(project);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST Create Project (Admin)
app.post('/api/projects', async (req, res) => {
  try {
    const { title, description, longDescription, category, tags, image, liveUrl, githubUrl, featured } = req.body;
    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    const newProject = {
      title,
      description,
      longDescription: longDescription || description,
      category: category || 'Full Stack',
      tags: Array.isArray(tags) ? tags : (tags ? tags.split(',').map(t => t.trim()) : ['JavaScript']),
      image: image || 'https://i.ibb.co.com/pv83jvbS/PP-Hasan.png',
      liveUrl: liveUrl || '#',
      githubUrl: githubUrl || '#',
      featured: Boolean(featured),
      createdAt: new Date().toISOString()
    };

    if (isMongoConnected) {
      const result = await db.collection('projects').insertOne(newProject);
      return res.status(201).json({ ...newProject, _id: result.insertedId });
    } else {
      const projectWithId = { ...newProject, _id: `proj_${Date.now()}` };
      memoryStore.projects.unshift(projectWithId);
      return res.status(201).json(projectWithId);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT Update Project (Admin)
app.put('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = { ...req.body };
    delete updates._id;

    if (updates.tags && !Array.isArray(updates.tags)) {
      updates.tags = updates.tags.split(',').map(t => t.trim());
    }

    if (isMongoConnected) {
      await db.collection('projects').updateOne({ _id: new ObjectId(id) }, { $set: updates });
      const updated = await db.collection('projects').findOne({ _id: new ObjectId(id) });
      return res.json(updated);
    } else {
      const index = memoryStore.projects.findIndex(p => p._id === id);
      if (index === -1) return res.status(404).json({ error: 'Project not found' });
      memoryStore.projects[index] = { ...memoryStore.projects[index], ...updates };
      return res.json(memoryStore.projects[index]);
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE Project (Admin)
app.delete('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (isMongoConnected) {
      await db.collection('projects').deleteOne({ _id: new ObjectId(id) });
    } else {
      memoryStore.projects = memoryStore.projects.filter(p => p._id !== id);
    }
    res.json({ message: 'Project deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Work Experience Routes
app.get('/api/experience', async (req, res) => {
  try {
    if (isMongoConnected) {
      const exp = await db.collection('experiences').find({}).toArray();
      return res.json(exp);
    }
    return res.json(memoryStore.experiences);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 6. Contact Form Submissions
// POST /api/contact
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required fields.' });
    }

    const newMessage = {
      name,
      email,
      subject: subject || 'General Inquiry',
      message,
      createdAt: new Date().toISOString(),
      read: false
    };

    if (isMongoConnected) {
      const result = await db.collection('messages').insertOne(newMessage);
      console.log(`[MongoDB Native] New contact message saved. ID: ${result.insertedId}`);
      return res.status(201).json({ message: 'Message sent successfully!', messageId: result.insertedId });
    } else {
      const msgWithId = { ...newMessage, _id: `msg_${Date.now()}` };
      memoryStore.messages.unshift(msgWithId);
      console.log(`[In-Memory Store] New contact message saved.`);
      return res.status(201).json({ message: 'Message sent successfully!', messageId: msgWithId._id });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/messages (Admin view)
app.get('/api/messages', async (req, res) => {
  try {
    if (isMongoConnected) {
      const messages = await db.collection('messages').find({}).sort({ createdAt: -1 }).toArray();
      return res.json(messages);
    }
    return res.json(memoryStore.messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/messages/:id (Admin view)
app.delete('/api/messages/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (isMongoConnected) {
      await db.collection('messages').deleteOne({ _id: new ObjectId(id) });
    } else {
      memoryStore.messages = memoryStore.messages.filter(m => m._id !== id);
    }
    res.json({ message: 'Message deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 7. Admin Simple Authentication API
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === 'admin123' || password === ADMIN_SECRET) {
    return res.json({
      success: true,
      token: 'admin-session-token-' + Date.now(),
      user: { name: 'Admin', role: 'administrator' }
    });
  }
  return res.status(401).json({ success: false, error: 'Invalid admin credentials' });
});

// 8. ImgBB Image Upload Proxy
// Accepts: { image: "base64string", name: "optional-name" }
// Returns: { url, deleteUrl, success }
app.post('/api/upload-image', async (req, res) => {
  try {
    const { image, name } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Image data (base64) is required.' });
    }

    const apiKey = IMGBB_API_KEY || process.env.IMGBB_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'ImgBB API key not configured on server.' });
    }

    // Build form data for ImgBB API
    const formData = new URLSearchParams();
    formData.append('key', apiKey);
    formData.append('image', image);
    if (name) formData.append('name', name);

    const imgbbRes = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData,
    });

    const imgbbData = await imgbbRes.json();

    if (imgbbData.success) {
      return res.json({
        success: true,
        url: imgbbData.data.url,
        displayUrl: imgbbData.data.display_url,
        deleteUrl: imgbbData.data.delete_url,
        thumbUrl: imgbbData.data.thumb?.url || imgbbData.data.url,
      });
    } else {
      return res.status(400).json({ success: false, error: imgbbData.error?.message || 'ImgBB upload failed.' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Image upload failed: ' + err.message });
  }
});

// Start Server
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`==================================================`);
    console.log(`🚀 Portfolio Single-File API Server running on port ${PORT}`);
    console.log(`🔗 API Base: http://localhost:${PORT}/api`);
    console.log(`📊 Health Endpoint: http://localhost:${PORT}/api/health`);
    console.log(`🖼️  ImgBB Upload: http://localhost:${PORT}/api/upload-image`);
    console.log(`🍃 MongoDB Atlas: ${isMongoConnected ? 'Connected' : 'Connecting...'}`);
    console.log(`==================================================`);
  });
}

export default app;

