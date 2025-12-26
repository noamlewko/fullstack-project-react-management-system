// app.js – cleaned + merged version (projects, workers, suppliers, options, questionnaires)
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
console.log("JWT_SECRET value:", process.env.JWT_SECRET);

const { v2: cloudinary } = require("cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const express = require("express");
const mongoose = require("mongoose");
const fs = require("fs");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("./models/User");
const ProjectModel = require("./models/Project");
const OptionModel = require("./models/Option");
const QuestionnaireTemplate = require("./models/QuestionnaireTemplate");

// Auth middlewares (single source)
const { isAuthenticated, isDesigner } = require("./middlewares/auth");

const app = express();
const port = process.env.PORT || 3000;

/* ============================================================
 * MongoDB connection
 * ============================================================ */
if (!process.env.MONGO_URI) {
  throw new Error("Missing MONGO_URI in environment variables");
}
mongoose.connect(process.env.MONGO_URI)

  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB", err));

/* ============================================================
 * Global middlewares
 * ============================================================ */
app.use(express.json());

/* ============================================================
 * File uploads (images)
 * ============================================================ */
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files from /uploads/...
app.use("/uploads", express.static(uploadsDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) =>
    cb(null, `${Date.now()}-${file.originalname}`),
});

const upload = multer({ storage: multer.memoryStorage() });


app.post("/upload-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    // up buffer to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "designer-client-proj" }, 
        (error, uploaded) => {
          if (error) reject(error);
          else resolve(uploaded);
        }
      );
      stream.end(req.file.buffer);
    });

    // URL Prodection
    res.json({ imageUrl: result.secure_url });
  } catch (err) {
    console.error("Error uploading image:", err);
    res.status(500).json({ message: "Error uploading image" });
  }
});


/* ============================================================
 * Auth routes (register / login)
 * ============================================================ */

// Register new user
app.post("/api/register", async (req, res) => {
  try {
    const { username, password, role } = req.body;

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await new User({ username, password: hashedPassword, role }).save();

    res.json({ message: "User registered successfully" });
  } catch (err) {
    console.error("Error in registration:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Login
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res
        .status(400)
        .json({ message: "Invalid username or password" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res
        .status(400)
        .json({ message: "Invalid username or password" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ message: "Login successful", token, role: user.role });
  } catch (err) {
    console.error("Error in login:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ============================================================
 * Projects CRUD (with workers, suppliers, color selections)
 * ============================================================ */

// Create project (Designer creates project + sends a PENDING invite to client)
// IMPORTANT: Client is NOT linked automatically anymore. Client must accept the invite.
app.post(
  "/api/projects",
  isAuthenticated,
  isDesigner,
  async (req, res) => {
    try {
      const {
        name,
        startDate,
        endDate,
        budget,
        clientUsername,
        workers,
        suppliers,
        workerList,
        supplierList,
        colorSelections, // color & material selections
      } = req.body;

      console.log(
        "BODY /api/projects -> workers:",
        req.body.workers,
        "workerList:",
        req.body.workerList
      );
      console.log(
        "BODY /api/projects -> suppliers:",
        req.body.suppliers,
        "supplierList:",
        req.body.supplierList
      );

      const workersData = Array.isArray(workers)
        ? workers
        : Array.isArray(workerList)
        ? workerList
        : [];

      const suppliersData = Array.isArray(suppliers)
        ? suppliers
        : Array.isArray(supplierList)
        ? supplierList
        : [];

      const colorSelectionsData = Array.isArray(colorSelections)
        ? colorSelections
        : [];

      // Find client user by username
      const client = await User.findOne({ username: clientUsername });
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Create project WITHOUT linking client yet (must be accepted)
      const project = await new ProjectModel({
        name,
        startDate,
        endDate,
        budget,
        clientUsername,
        createdBy: req.user.id,

        // Client will be linked only AFTER accept
        associatedClients: [],

        // New: pending invitation for the client
        pendingInvites: [
          {
            clientId: client._id,
            invitedBy: req.user.id, // designer id
            status: "pending",
            createdAt: new Date(),
          },
        ],

        workers: workersData,
        suppliers: suppliersData,
        colorSelections: colorSelectionsData,
      }).save();

      res.json({ project });
    } catch (err) {
      console.error("Error creating project:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);


// Update project
app.put(
  "/api/projects/:id",
  isAuthenticated,
  isDesigner,
  async (req, res) => {
    try {
      const { id } = req.params;
      const {
        name,
        startDate,
        endDate,
        budget,
        clientUsername,
        workers,
        suppliers,
        workerList,
        supplierList,
        designPlan,
        notes,
        colorSelections, // color & material selections
      } = req.body;

      const workersData = Array.isArray(workers)
        ? workers
        : Array.isArray(workerList)
        ? workerList
        : [];

      const suppliersData = Array.isArray(suppliers)
        ? suppliers
        : Array.isArray(supplierList)
        ? supplierList
        : [];

      const project = await ProjectModel.findById(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (name !== undefined) project.name = name;
      if (startDate !== undefined) project.startDate = startDate;
      if (endDate !== undefined) project.endDate = endDate;
      if (budget !== undefined) project.budget = budget;
      if (clientUsername !== undefined) project.clientUsername = clientUsername;

      if (workers !== undefined || workerList !== undefined) {
        project.workers = workersData;
      }

      if (suppliers !== undefined || supplierList !== undefined) {
        project.suppliers = suppliersData;
      }

      if (designPlan !== undefined) project.designPlan = designPlan;
      if (notes !== undefined) project.notes = notes;

      // Update color & material selections if provided
      if (colorSelections !== undefined) {
        if (Array.isArray(colorSelections)) {
          project.colorSelections = colorSelections.map((sel) => ({
            roomName: sel.roomName || "Room",
            wallColor: sel.wallColor || "",
            furnitureColor: sel.furnitureColor || "",
            floorColor: sel.floorColor || "",
            materialType: sel.materialType || "",
            finishType: sel.finishType || "",
          }));
        } else {
          project.colorSelections = [];
        }

        project.markModified("colorSelections");
      }

      await project.save();
      res.json({ project });
    } catch (err) {
      console.error("Error updating project:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Delete project
app.delete(
  "/api/projects/:id",
  isAuthenticated,
  isDesigner,
  async (req, res) => {
    try {
      const { id } = req.params;
      const project = await ProjectModel.findByIdAndDelete(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json({ message: "Project deleted successfully" });
    } catch (err) {
      console.error("Error deleting project:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// List projects for current user (designer or client)
app.get("/api/projects", isAuthenticated, async (req, res) => {
  try {
    const { role, id } = req.user;
    let projects = [];

    if (role === "designer") {
      projects = await ProjectModel.find({ createdBy: id })
      .populate("pendingInvites.clientId", "username")
      .lean();
    } else if (role === "client") {
      projects = await ProjectModel.find({ associatedClients: id });
    }

    res.json(projects);
  } catch (err) {
    console.error("Error fetching projects:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Get single project (with role-based access)
app.get("/api/projects/:id", isAuthenticated, async (req, res) => {
  try {
    const { id: projId } = req.params;
    const { role, id: userId } = req.user;

    const filter = { _id: projId };
    if (role === "designer") filter.createdBy = userId;
    if (role === "client") filter.associatedClients = userId;

    // Build the query first
    let query = ProjectModel.findOne(filter);

    // Only designers need to see invite statuses (pending/accepted/rejected)
    if (role === "designer") {
      query = query.populate("pendingInvites.clientId", "username");
    }

    const project = await query.lean();

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json(project);
  } catch (err) {
    console.error("Error fetching project:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ============================================================
 * Project Invitations (designer <-> client approval)
 * ============================================================ */

/**
 * Designer sends a project invitation to a client (by username).
 * - Only the project owner (designer) can invite.
 * - Creates a "pending" invite inside the project.
 */
app.post(
  "/api/projects/:id/invite",
  isAuthenticated,
  isDesigner,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { clientUsername } = req.body;

      if (!clientUsername) {
        return res.status(400).json({ message: "clientUsername is required" });
      }

      // Only the designer who created the project can invite
      const project = await ProjectModel.findOne({
        _id: id,
        createdBy: req.user.id,
      });

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Find client user
      const client = await User.findOne({ username: clientUsername });
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      // If already linked -> no need to invite
      const alreadyLinked = (project.associatedClients || []).some(
        (cid) => String(cid) === String(client._id)
      );
      if (alreadyLinked) {
        return res.status(400).json({ message: "Client already linked" });
      }

      // If already invited and pending -> prevent duplicates
      const alreadyPending = (project.pendingInvites || []).some(
        (inv) =>
          String(inv.clientId) === String(client._id) &&
          inv.status === "pending"
      );
      if (alreadyPending) {
        return res.status(400).json({ message: "Invite already pending" });
      }

      project.pendingInvites = project.pendingInvites || [];
      project.pendingInvites.push({
        clientId: client._id,
        invitedBy: req.user.id,
        status: "pending",
        createdAt: new Date(),
      });

      project.markModified("pendingInvites");
      await project.save();

      res.json({ message: "Invite sent" });
    } catch (err) {
      console.error("Invite error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/**
 * Client fetches all pending invites that belong to them.
 * Returns a list of projects that have a pending invite for this client.
 */
app.get("/api/invites", isAuthenticated, async (req, res) => {
  try {
    // Only clients should use this endpoint
    if (req.user.role !== "client") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const projects = await ProjectModel.find({
      pendingInvites: { $elemMatch: { clientId: req.user.id, status: "pending" } },
    })
      .select("_id name createdBy clientUsername")
      .lean();

    res.json(projects);
  } catch (err) {
    console.error("Fetch invites error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * Client accepts or rejects an invite for a project.
 * - action must be "accept" or "reject"
 * - On accept: client is added to associatedClients
 * - Invite status becomes "accepted" or "rejected"
 */
app.post("/api/projects/:id/invite/:action", isAuthenticated, async (req, res) => {
  try {
    if (req.user.role !== "client") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const { id, action } = req.params;

    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({ message: "Invalid action" });
    }

    const project = await ProjectModel.findById(id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    // Find the pending invite for this client
    const invite = (project.pendingInvites || []).find(
      (inv) =>
        String(inv.clientId) === String(req.user.id) &&
        inv.status === "pending"
    );

    if (!invite) {
      return res.status(400).json({ message: "No pending invite found" });
    }

    // Update invite status
    invite.status = action === "accept" ? "accepted" : "rejected";

    // If accepted -> link the client to the project
    if (action === "accept") {
      project.associatedClients = project.associatedClients || [];
      const alreadyLinked = project.associatedClients.some(
        (cid) => String(cid) === String(req.user.id)
      );
      if (!alreadyLinked) {
        project.associatedClients.push(req.user.id);
      }
    }

    project.markModified("pendingInvites");
    await project.save();

    res.json({ message: `Invite ${invite.status}` });
  } catch (err) {
    console.error("Accept/reject invite error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* ============================================================
 * Workers API (per project)
 * ============================================================ */

// List workers for a project
app.get("/api/projects/:id/workers", isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;

    const project = await ProjectModel.findById(id).lean();
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json(project.workers || []);
  } catch (err) {
    console.error("Workers list error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Add worker to project
app.post(
  "/api/projects/:id/workers",
  isAuthenticated,
  isDesigner,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { workerName, role, phone, cost, description } = req.body;

      const project = await ProjectModel.findById(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      project.workers.push({ workerName, role, phone, cost, description });
      await project.save();

      res.status(201).json(project.workers[project.workers.length - 1]);
    } catch (err) {
      console.error("Add worker error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Update worker inside project
app.put(
  "/api/projects/:projectId/workers/:workerId",
  isAuthenticated,
  isDesigner,
  async (req, res) => {
    try {
      const { projectId, workerId } = req.params;
      const { workerName, role, phone, cost, description } = req.body;

      const project = await ProjectModel.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const worker = project.workers.id(workerId);
      if (!worker) {
        return res.status(404).json({ message: "Worker not found" });
      }

      if (workerName !== undefined) worker.workerName = workerName;
      if (role !== undefined) worker.role = role;
      if (phone !== undefined) worker.phone = phone;
      if (cost !== undefined) worker.cost = cost;
      if (description !== undefined) worker.description = description;

      await project.save();
      res.json(worker);
    } catch (err) {
      console.error("Update worker error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Delete worker from project
app.delete(
  "/api/projects/:projectId/workers/:workerId",
  isAuthenticated,
  isDesigner,
  async (req, res) => {
    try {
      const { projectId, workerId } = req.params;

      const project = await ProjectModel.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const worker = project.workers.id(workerId);
      if (!worker) {
        return res.status(404).json({ message: "Worker not found" });
      }

      worker.deleteOne();
      await project.save();

      res.json({ message: "Worker deleted successfully" });
    } catch (err) {
      console.error("Delete worker error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/* ============================================================
 * Suppliers API (per project)
 * ============================================================ */

// List suppliers for a project
app.get("/api/projects/:id/suppliers", isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;

    const project = await ProjectModel.findById(id).lean();
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    res.json(project.suppliers || []);
  } catch (err) {
    console.error("Suppliers list error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Add supplier to project
app.post(
  "/api/projects/:id/suppliers",
  isAuthenticated,
  isDesigner,
  async (req, res) => {
    try {
      const { id } = req.params;
      let {
        storeName,
        supplierName,
        product,
        price,
        contactName,
        phone,
      } = req.body;

      const project = await ProjectModel.findById(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      price = isNaN(parseFloat(price)) ? 0 : parseFloat(price);

      project.suppliers.push({
        storeName,
        supplierName,
        product,
        price,
        contactName,
        phone,
      });

      await project.save();

      res.status(201).json(project.suppliers[project.suppliers.length - 1]);
    } catch (err) {
      console.error("Add supplier error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Update supplier inside project
app.put(
  "/api/projects/:projectId/suppliers/:supplierId",
  isAuthenticated,
  isDesigner,
  async (req, res) => {
    try {
      const { projectId, supplierId } = req.params;
      let {
        storeName,
        supplierName,
        product,
        price,
        contactName,
        phone,
      } = req.body;

      const project = await ProjectModel.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const supplier = project.suppliers.id(supplierId);
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }

      if (storeName !== undefined) supplier.storeName = storeName;
      if (supplierName !== undefined) supplier.supplierName = supplierName;
      if (product !== undefined) supplier.product = product;
      if (price !== undefined) {
        supplier.price = isNaN(parseFloat(price)) ? 0 : parseFloat(price);
      }
      if (contactName !== undefined) supplier.contactName = contactName;
      if (phone !== undefined) supplier.phone = phone;

      await project.save();
      res.json(supplier);
    } catch (err) {
      console.error("Update supplier error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Delete supplier from project
app.delete(
  "/api/projects/:projectId/suppliers/:supplierId",
  isAuthenticated,
  isDesigner,
  async (req, res) => {
    try {
      const { projectId, supplierId } = req.params;

      const project = await ProjectModel.findById(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const supplier = project.suppliers.id(supplierId);
      if (!supplier) {
        return res.status(404).json({ message: "Supplier not found" });
      }

      supplier.deleteOne();
      await project.save();

      res.json({ message: "Supplier deleted successfully" });
    } catch (err) {
      console.error("Delete supplier error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/* ============================================================
 * Global Design Options (for designer)
 * ============================================================ */

// Get all design options for current designer
app.get(
  "/api/options",
  isAuthenticated,
  isDesigner,
  async (req, res) => {
    try {
      const doc = await OptionModel.findOne({
        createdBy: req.user.id,
      }).lean();

      if (!doc) {
        return res.json({ designPreferences: [] });
      }

      res.json({
        designPreferences: doc.designPreferences || [],
      });
    } catch (err) {
      console.error("Error fetching options:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Save all design options for current designer

app.post(
  "/api/options",
  isAuthenticated,
  isDesigner,
  async (req, res) => {
    try {
      const { designPreferences } = req.body;

      // Ensure we always work with an array
      const rawPrefs = Array.isArray(designPreferences)
        ? designPreferences
        : [];

      /**
       * Normalize incoming designPreferences to match the Mongoose schema:
       *
       * Incoming shape from frontend (current behavior):
       * [
       *   {
       *     topicName: "Living room style",
       *     options: ["Modern", "Scandinavian", ...]  // strings
       *   },
       *   ...
       * ]
       *
       * Schema expects:
       * [
       *   {
       *     topicName: "Living room style",
       *     options: [
       *       { name: "Modern", imageUrl: "" },
       *       { name: "Scandinavian", imageUrl: "" },
       *       ...
       *     ]
       *   },
       *   ...
       * ]
       *
       * So we convert each string option into an object { name, imageUrl }.
       * If the option is already an object, we keep its fields safely.
       */
      const normalizedPrefs = rawPrefs.map((topic) => {
        const topicName = topic?.topicName || "";

        const optionsArray = Array.isArray(topic?.options)
          ? topic.options
          : [];

        const normalizedOptions = optionsArray.map((opt) => {
          // If the option is a simple string → wrap it into { name, imageUrl }
          if (typeof opt === "string") {
            return {
              name: opt,
              imageUrl: "",
            };
          }

          // If it's already an object, keep only the known fields
          return {
            name: opt?.name || "",
            imageUrl: opt?.imageUrl || "",
          };
        });

        return {
          topicName,
          options: normalizedOptions,
        };
      });

      // Find existing document for this designer
      let doc = await OptionModel.findOne({
        createdBy: req.user.id,
      });

      if (!doc) {
        // Create new document for this designer
        doc = await new OptionModel({
          createdBy: req.user.id,
          designPreferences: normalizedPrefs,
        }).save();
      } else {
        // Update existing document
        doc.designPreferences = normalizedPrefs;
        await doc.save();
      }

      res.json({
        designPreferences: doc.designPreferences || [],
      });
    } catch (err) {
      console.error("Error saving options:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);


/* ============================================================
 * Project Design Questionnaires (instances on project)
 * ============================================================ */

// Assign questionnaire template to project
app.post(
  "/api/projects/:id/questionnaire/assign",
  isAuthenticated,
  isDesigner,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { templateId } = req.body;

      const project = await ProjectModel.findOne({
        _id: id,
        createdBy: req.user.id,
      });

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // If templateId is empty → clear all questionnaires on project
      if (!templateId) {
        project.designQuestionnaires = [];
        await project.save();
        return res.json({ project });
      }

      const template = await QuestionnaireTemplate.findOne({
        _id: templateId,
        createdBy: req.user.id,
      }).lean();

      if (!template) {
        return res.status(404).json({ message: "Template not found" });
      }

      const existingIndex = project.designQuestionnaires.findIndex(
        (q) => String(q.templateId) === String(template._id)
      );

      const newInstance = {
        templateId: template._id,
        title: template.title,
        description: template.description || "",
        roomType: template.roomType || "",
        questions: template.questions || [],
        answers: [],
      };

      if (existingIndex >= 0) {
        project.designQuestionnaires[existingIndex] = newInstance;
      } else {
        project.designQuestionnaires.push(newInstance);
      }

      await project.save();
      res.json({ project });
    } catch (err) {
      console.error("Error assigning questionnaire:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Save client answers for a questionnaire on project
app.post(
  "/api/projects/:id/questionnaire/answers",
  isAuthenticated,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { answers, templateId } = req.body;

      const { role, id: userId } = req.user;

      // Ensure designer/client only access their own projects
      const filter =
        role === "designer"
          ? { _id: id, createdBy: userId }
          : { _id: id, associatedClients: userId };

      const project = await ProjectModel.findOne(filter);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (
        !project.designQuestionnaires ||
        project.designQuestionnaires.length === 0
      ) {
        return res
          .status(400)
          .json({ message: "No questionnaire assigned to this project" });
      }

      const instance =
        project.designQuestionnaires.find(
          (q) => String(q.templateId) === String(templateId)
        ) || project.designQuestionnaires[0];

      const safeAnswers = Array.isArray(answers) ? answers : [];

      instance.answers = safeAnswers
        .filter(
          (a) =>
            a &&
            (a.freeText ||
              (Array.isArray(a.selectedOptions) &&
                a.selectedOptions.length > 0))
        )
        .map((a) => ({
          questionId: a.questionId ? String(a.questionId) : "",
          questionText: a.questionText || "",
          selectedOptions: Array.isArray(a.selectedOptions)
            ? a.selectedOptions.map((opt) => ({
                optionId: String(opt.optionId || ""),
                optionText: opt.optionText || "",
              }))
            : [],
          freeText: a.freeText || "",
        }));

      await project.save();
      res.json({ project });
    } catch (err) {
      console.error("Error saving questionnaire answers:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Remove a questionnaire instance from a project
app.delete(
  "/api/projects/:projectId/questionnaires/:instanceId",
  isAuthenticated,
  isDesigner,
  async (req, res) => {
    try {
      const { projectId, instanceId } = req.params;

      const project = await ProjectModel.findOne({
        _id: projectId,
        createdBy: req.user.id,
      });

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (!Array.isArray(project.designQuestionnaires)) {
        return res
          .status(404)
          .json({ message: "No questionnaires on this project" });
      }

      let idx = project.designQuestionnaires.findIndex(
        (q) => String(q._id) === String(instanceId)
      );

      // Fallback: sometimes frontend may send templateId instead of instance _id
      if (idx === -1) {
        idx = project.designQuestionnaires.findIndex(
          (q) => String(q.templateId) === String(instanceId)
        );
      }

      if (idx === -1) {
        return res
          .status(404)
          .json({ message: "Questionnaire instance not found" });
      }

      project.designQuestionnaires.splice(idx, 1);

      await project.save();
      res.json({ project });
    } catch (err) {
      console.error("Error removing questionnaire instance:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/* ============================================================
 * Questionnaire Templates – CRUD
 * ============================================================ */

// List all templates for current designer
app.get(
  "/api/questionnaires/templates",
  isAuthenticated,
  isDesigner,
  async (req, res) => {
    try {
      const templates = await QuestionnaireTemplate.find({
        createdBy: req.user.id,
      }).lean();

      res.json(templates);
    } catch (err) {
      console.error("Error fetching questionnaire templates:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Create new questionnaire template
app.post(
  "/api/questionnaires/templates",
  isAuthenticated,
  isDesigner,
  async (req, res) => {
    try {
      const { title, description, roomType, questions } = req.body;

      const tmpl = await new QuestionnaireTemplate({
        title: title || "Untitled questionnaire",
        description: description || "",
        roomType: roomType || "",
        questions: Array.isArray(questions) ? questions : [],
        createdBy: req.user.id,
      }).save();

      res.status(201).json(tmpl);
    } catch (err) {
      console.error("Error creating questionnaire template:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Update existing questionnaire template
app.put(
  "/api/questionnaires/templates/:id",
  isAuthenticated,
  isDesigner,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { title, description, roomType, questions } = req.body;

      const tmpl = await QuestionnaireTemplate.findOne({
        _id: id,
        createdBy: req.user.id,
      });

      if (!tmpl) {
        return res.status(404).json({ message: "Template not found" });
      }

      if (title !== undefined) tmpl.title = title;
      if (description !== undefined) tmpl.description = description;
      if (roomType !== undefined) tmpl.roomType = roomType;
      if (questions !== undefined && Array.isArray(questions)) {
        tmpl.questions = questions;
      }

      await tmpl.save();
      res.json(tmpl);
    } catch (err) {
      console.error("Error updating questionnaire template:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// Delete questionnaire template
app.delete(
  "/api/questionnaires/templates/:id",
  isAuthenticated,
  isDesigner,
  async (req, res) => {
    try {
      const { id } = req.params;

      const tmpl = await QuestionnaireTemplate.findOneAndDelete({
        _id: id,
        createdBy: req.user.id,
      });

      if (!tmpl) {
        return res.status(404).json({ message: "Template not found" });
      }

      res.json({ message: "Template deleted successfully" });
    } catch (err) {
      console.error("Error deleting questionnaire template:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/* ============================================================
 * Start server
 * ============================================================ */


if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/build")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/build", "index.html"));
  });
}

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
