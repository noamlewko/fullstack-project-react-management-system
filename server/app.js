// server/app.js
// Main server entry: auth, projects, workers/suppliers, options, questionnaires + sync

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const mongoose = require("mongoose");
const fs = require("fs");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v2: cloudinary } = require("cloudinary");

// Models
const User = require("./models/User");
const ProjectModel = require("./models/Project");
const OptionModel = require("./models/Option");
const QuestionnaireTemplate = require("./models/QuestionnaireTemplate");

// Auth middlewares
const { isAuthenticated, isDesigner } = require("./middlewares/auth");

const app = express();
const port = process.env.PORT || 3000;

/* =========================================================
 * Cloudinary
 * ========================================================= */

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/* =========================================================
 * MongoDB connection
 * ========================================================= */

if (!process.env.MONGO_URI) {
  throw new Error("Missing MONGO_URI in environment variables");
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB", err));

/* =========================================================
 * Global middlewares
 * ========================================================= */

app.use(express.json());

/* =========================================================
 * File uploads (images)
 * ========================================================= */

// Local uploads folder (only used for static serving if you ever write files there)
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files from /uploads/... (optional)
app.use("/uploads", express.static(uploadsDir));

// We upload directly to Cloudinary using memory storage
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Upload image to Cloudinary and return a public URL.
 * Expects a multipart form-data with "image".
 */
app.post("/upload-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

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

    res.json({ imageUrl: result.secure_url });
  } catch (err) {
    console.error("Error uploading image:", err);
    res.status(500).json({ message: "Error uploading image" });
  }
});

/* =========================================================
 * Auth routes (register / login)
 * ========================================================= */

/**
 * Register a new user.
 * Body: { username, password, role }
 */
app.post("/api/register", async (req, res) => {
  try {
    const { username, password, role } = req.body;

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: "Username already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await new User({ username, password: hashedPassword, role }).save();

    res.json({ message: "User registered successfully" });
  } catch (err) {
    console.error("Error in registration:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * Login.
 * Body: { username, password }
 * Returns: token + role
 */
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ message: "Invalid username or password" });
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      return res.status(400).json({ message: "Invalid username or password" });
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

/* =========================================================
 * Projects CRUD (with workers, suppliers, plan/notes, colors)
 * ========================================================= */

/**
 * Create project (designer only).
 * IMPORTANT: client is invited (pending), not automatically linked.
 */
app.post("/api/projects", isAuthenticated, isDesigner, async (req, res) => {
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
      colorSelections,
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

    const colorSelectionsData = Array.isArray(colorSelections)
      ? colorSelections
      : [];

    const client = await User.findOne({ username: clientUsername });
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    const project = await new ProjectModel({
      name,
      startDate,
      endDate,
      budget,
      clientUsername,
      createdBy: req.user.id,

      associatedClients: [],
      pendingInvites: [
        {
          clientId: client._id,
          invitedBy: req.user.id,
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
});

/**
 * Update project (designer only).
 * Supports: workers/suppliers lists, plan, notes, colorSelections.
 */
app.put("/api/projects/:id", isAuthenticated, isDesigner, async (req, res) => {
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
      colorSelections,
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
    if (!project) return res.status(404).json({ message: "Project not found" });

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
});

/**
 * Delete project (designer only).
 */
app.delete("/api/projects/:id", isAuthenticated, isDesigner, async (req, res) => {
  try {
    const { id } = req.params;

    const project = await ProjectModel.findByIdAndDelete(id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    res.json({ message: "Project deleted successfully" });
  } catch (err) {
    console.error("Error deleting project:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * List projects for current user.
 * - Designer: projects created by them (+ pending invite usernames)
 * - Client: projects where they are linked (associatedClients)
 */
app.get("/api/projects", isAuthenticated, async (req, res) => {
  try {
    const { role, id } = req.user;
    let projects = [];

    if (role === "designer") {
      projects = await ProjectModel.find({ createdBy: id })
        .populate("pendingInvites.clientId", "username")
        .lean();
    } else if (role === "client") {
      projects = await ProjectModel.find({ associatedClients: id }).lean();
    }

    res.json(projects);
  } catch (err) {
    console.error("Error fetching projects:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * Get a single project (role-based access).
 * Designers can also see pending invite details.
 */
app.get("/api/projects/:id", isAuthenticated, async (req, res) => {
  try {
    const { id: projId } = req.params;
    const { role, id: userId } = req.user;

    const filter = { _id: projId };
    if (role === "designer") filter.createdBy = userId;
    if (role === "client") filter.associatedClients = userId;

    let query = ProjectModel.findOne(filter);
    if (role === "designer") {
      query = query.populate("pendingInvites.clientId", "username");
    }

    const project = await query.lean();
    if (!project) return res.status(404).json({ message: "Project not found" });

    res.json(project);
  } catch (err) {
    console.error("Error fetching project:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================================================
 * Project invitations (designer -> client approval)
 * ========================================================= */

/**
 * Designer sends invitation to a client (by username).
 * Only the project owner can invite.
 */
app.post("/api/projects/:id/invite", isAuthenticated, isDesigner, async (req, res) => {
  try {
    const { id } = req.params;
    const { clientUsername } = req.body;

    if (!clientUsername) {
      return res.status(400).json({ message: "clientUsername is required" });
    }

    const project = await ProjectModel.findOne({ _id: id, createdBy: req.user.id });
    if (!project) return res.status(404).json({ message: "Project not found" });

    const client = await User.findOne({ username: clientUsername });
    if (!client) return res.status(404).json({ message: "Client not found" });

    const alreadyLinked = (project.associatedClients || []).some(
      (cid) => String(cid) === String(client._id)
    );
    if (alreadyLinked) {
      return res.status(400).json({ message: "Client already linked" });
    }

    const alreadyPending = (project.pendingInvites || []).some(
      (inv) => String(inv.clientId) === String(client._id) && inv.status === "pending"
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
});

/**
 * Client fetches their pending invites.
 */
app.get("/api/invites", isAuthenticated, async (req, res) => {
  try {
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
 * Client accepts or rejects an invite.
 * - accept: client is added to associatedClients
 * - reject: only status changes
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
    if (!project) return res.status(404).json({ message: "Project not found" });

    const invite = (project.pendingInvites || []).find(
      (inv) => String(inv.clientId) === String(req.user.id) && inv.status === "pending"
    );
    if (!invite) {
      return res.status(400).json({ message: "No pending invite found" });
    }

    invite.status = action === "accept" ? "accepted" : "rejected";

    if (action === "accept") {
      project.associatedClients = project.associatedClients || [];
      const alreadyLinked = project.associatedClients.some(
        (cid) => String(cid) === String(req.user.id)
      );
      if (!alreadyLinked) project.associatedClients.push(req.user.id);
    }

    project.markModified("pendingInvites");
    await project.save();

    res.json({ message: `Invite ${invite.status}` });
  } catch (err) {
    console.error("Accept/reject invite error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================================================
 * Workers API (per project)
 * ========================================================= */

/**
 * List workers for a project.
 */
app.get("/api/projects/:id/workers", isAuthenticated, async (req, res) => {
  try {
    const project = await ProjectModel.findById(req.params.id).lean();
    if (!project) return res.status(404).json({ message: "Project not found" });

    res.json(project.workers || []);
  } catch (err) {
    console.error("Workers list error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * Add worker to project (designer only).
 */
app.post("/api/projects/:id/workers", isAuthenticated, isDesigner, async (req, res) => {
  try {
    const { workerName, role, phone, cost, description } = req.body;

    const project = await ProjectModel.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    project.workers.push({ workerName, role, phone, cost, description });
    await project.save();

    res.status(201).json(project.workers[project.workers.length - 1]);
  } catch (err) {
    console.error("Add worker error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * Update worker inside project (designer only).
 */
app.put(
  "/api/projects/:projectId/workers/:workerId",
  isAuthenticated,
  isDesigner,
  async (req, res) => {
    try {
      const { projectId, workerId } = req.params;
      const { workerName, role, phone, cost, description } = req.body;

      const project = await ProjectModel.findById(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });

      const worker = project.workers.id(workerId);
      if (!worker) return res.status(404).json({ message: "Worker not found" });

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

/**
 * Delete worker from project (designer only).
 */
app.delete(
  "/api/projects/:projectId/workers/:workerId",
  isAuthenticated,
  isDesigner,
  async (req, res) => {
    try {
      const { projectId, workerId } = req.params;

      const project = await ProjectModel.findById(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });

      const worker = project.workers.id(workerId);
      if (!worker) return res.status(404).json({ message: "Worker not found" });

      worker.deleteOne();
      await project.save();

      res.json({ message: "Worker deleted successfully" });
    } catch (err) {
      console.error("Delete worker error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/* =========================================================
 * Suppliers API (per project)
 * ========================================================= */

/**
 * List suppliers for a project.
 */
app.get("/api/projects/:id/suppliers", isAuthenticated, async (req, res) => {
  try {
    const project = await ProjectModel.findById(req.params.id).lean();
    if (!project) return res.status(404).json({ message: "Project not found" });

    res.json(project.suppliers || []);
  } catch (err) {
    console.error("Suppliers list error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * Add supplier to project (designer only).
 */
app.post("/api/projects/:id/suppliers", isAuthenticated, isDesigner, async (req, res) => {
  try {
    const project = await ProjectModel.findById(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });

    let { storeName, supplierName, product, price, contactName, phone } = req.body;
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
});

/**
 * Update supplier inside project (designer only).
 */
app.put(
  "/api/projects/:projectId/suppliers/:supplierId",
  isAuthenticated,
  isDesigner,
  async (req, res) => {
    try {
      const { projectId, supplierId } = req.params;
      let { storeName, supplierName, product, price, contactName, phone } = req.body;

      const project = await ProjectModel.findById(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });

      const supplier = project.suppliers.id(supplierId);
      if (!supplier) return res.status(404).json({ message: "Supplier not found" });

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

/**
 * Delete supplier from project (designer only).
 */
app.delete(
  "/api/projects/:projectId/suppliers/:supplierId",
  isAuthenticated,
  isDesigner,
  async (req, res) => {
    try {
      const { projectId, supplierId } = req.params;

      const project = await ProjectModel.findById(projectId);
      if (!project) return res.status(404).json({ message: "Project not found" });

      const supplier = project.suppliers.id(supplierId);
      if (!supplier) return res.status(404).json({ message: "Supplier not found" });

      supplier.deleteOne();
      await project.save();

      res.json({ message: "Supplier deleted successfully" });
    } catch (err) {
      console.error("Delete supplier error:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/* =========================================================
 * Global design options (designer only)
 * ========================================================= */

/**
 * Get all saved design preferences for the current designer.
 */
app.get("/api/options", isAuthenticated, isDesigner, async (req, res) => {
  try {
    const doc = await OptionModel.findOne({ createdBy: req.user.id }).lean();
    if (!doc) return res.json({ designPreferences: [] });

    res.json({ designPreferences: doc.designPreferences || [] });
  } catch (err) {
    console.error("Error fetching options:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * Save all design preferences for the current designer.
 * Normalizes string options into { name, imageUrl } objects.
 */
app.post("/api/options", isAuthenticated, isDesigner, async (req, res) => {
  try {
    const { designPreferences } = req.body;
    const rawPrefs = Array.isArray(designPreferences) ? designPreferences : [];

    const normalizedPrefs = rawPrefs.map((topic) => {
      const topicName = topic?.topicName || "";
      const optionsArray = Array.isArray(topic?.options) ? topic.options : [];

      const normalizedOptions = optionsArray.map((opt) => {
        if (typeof opt === "string") {
          return { name: opt, imageUrl: "" };
        }
        return { name: opt?.name || "", imageUrl: opt?.imageUrl || "" };
      });

      return { topicName, options: normalizedOptions };
    });

    let doc = await OptionModel.findOne({ createdBy: req.user.id });

    if (!doc) {
      doc = await new OptionModel({
        createdBy: req.user.id,
        designPreferences: normalizedPrefs,
      }).save();
    } else {
      doc.designPreferences = normalizedPrefs;
      await doc.save();
    }

    res.json({ designPreferences: doc.designPreferences || [] });
  } catch (err) {
    console.error("Error saving options:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/* =========================================================
 * Questionnaire helpers (merge/sync behavior)
 * ========================================================= */

/**
 * Merge template questions into an existing project instance,
 * while keeping project question/option _id stable (do not regenerate).
 *
 * Used for: "assign template to project" update flow.
 */
function mergeInstanceQuestionsKeepingIds(existingQuestions = [], templateQuestions = []) {
  const existingBySource = new Map(
    existingQuestions.map((q) => [String(q.sourceQuestionId || q._id), q])
  );

  return (templateQuestions || []).map((tq) => {
    const sourceQ = String(tq._id);
    const existingQ = existingBySource.get(sourceQ);

    if (!existingQ) {
      return {
        sourceQuestionId: tq._id,
        text: tq.text,
        multiple: tq.multiple,
        options: (tq.options || []).map((opt) => ({
          sourceOptionId: opt._id,
          text: opt.text,
          imageUrl: opt.imageUrl || "",
        })),
      };
    }

    const existingOptionsBySource = new Map(
      (existingQ.options || []).map((o) => [String(o.sourceOptionId || o._id), o])
    );

    const mergedOptions = (tq.options || []).map((to) => {
      const sourceO = String(to._id);
      const existingO = existingOptionsBySource.get(sourceO);

      if (!existingO) {
        return {
          sourceOptionId: to._id,
          text: to.text,
          imageUrl: to.imageUrl || "",
        };
      }

      return {
        ...(existingO.toObject?.() || existingO),
        sourceOptionId: existingO.sourceOptionId || to._id,
        text: to.text,
        imageUrl: to.imageUrl || "",
      };
    });

    return {
      ...(existingQ.toObject?.() || existingQ),
      sourceQuestionId: existingQ.sourceQuestionId || tq._id,
      text: tq.text,
      multiple: tq.multiple,
      options: mergedOptions,
    };
  });
}

/**
 * Merge template into an instance, but KEEP project-only additions:
 * - Project-only questions: no sourceQuestionId
 * - Project-only options: no sourceOptionId
 *
 * Used for: "sync template to projects" endpoint.
 */
function mergeTemplateIntoInstanceKeepProjectOnly(existingQuestions = [], templateQuestions = []) {
  const existingBySource = new Map(
    (existingQuestions || [])
      .filter((q) => q.sourceQuestionId)
      .map((q) => [String(q.sourceQuestionId), q])
  );

  const mergedFromTemplate = (templateQuestions || []).map((tq) => {
    const sourceQ = String(tq._id);
    const existingQ = existingBySource.get(sourceQ);

    if (!existingQ) {
      return {
        sourceQuestionId: tq._id,
        text: tq.text,
        multiple: tq.multiple,
        options: (tq.options || []).map((to) => ({
          sourceOptionId: to._id,
          text: to.text,
          imageUrl: to.imageUrl || "",
        })),
      };
    }

    const existingOptionsBySource = new Map(
      (existingQ.options || [])
        .filter((o) => o.sourceOptionId)
        .map((o) => [String(o.sourceOptionId), o])
    );

    const mergedOptionsFromTemplate = (tq.options || []).map((to) => {
      const sourceO = String(to._id);
      const existingO = existingOptionsBySource.get(sourceO);

      if (!existingO) {
        return {
          sourceOptionId: to._id,
          text: to.text,
          imageUrl: to.imageUrl || "",
        };
      }

      return {
        ...(existingO.toObject?.() || existingO),
        sourceOptionId: existingO.sourceOptionId || to._id,
        text: to.text,
        imageUrl: to.imageUrl || "",
      };
    });

    const projectOnlyOptions = (existingQ.options || []).filter((o) => !o.sourceOptionId);

    return {
      ...(existingQ.toObject?.() || existingQ),
      sourceQuestionId: existingQ.sourceQuestionId || tq._id,
      text: tq.text,
      multiple: tq.multiple,
      options: [...mergedOptionsFromTemplate, ...projectOnlyOptions],
    };
  });

  const projectOnlyQuestions = (existingQuestions || []).filter((q) => !q.sourceQuestionId);
  return [...mergedFromTemplate, ...projectOnlyQuestions];
}

/* =========================================================
 * Project questionnaires (instances on project)
 * ========================================================= */

/**
 * Assign a questionnaire template to a project.
 * - If instance doesn't exist: create it (answers start empty)
 * - If instance exists: update instance questions WITHOUT clearing answers
 */
app.post(
  "/api/projects/:id/questionnaire/assign",
  isAuthenticated,
  isDesigner,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { templateId } = req.body;

      const project = await ProjectModel.findOne({ _id: id, createdBy: req.user.id });
      if (!project) return res.status(404).json({ message: "Project not found" });

      // Clear all questionnaires
      if (!templateId) {
        project.designQuestionnaires = [];
        await project.save();
        return res.json({ project });
      }

      const template = await QuestionnaireTemplate.findOne({
        _id: templateId,
        createdBy: req.user.id,
      }).lean();
      if (!template) return res.status(404).json({ message: "Template not found" });

      const existing = (project.designQuestionnaires || []).find(
        (q) => String(q.templateId) === String(template._id)
      );

      // Create new instance
      if (!existing) {
        project.designQuestionnaires.push({
          templateId: template._id,
          title: template.title,
          description: template.description || "",
          roomType: template.roomType || "",
          questions: (template.questions || []).map((q) => ({
            text: q.text,
            multiple: q.multiple,
            sourceQuestionId: q._id,
            options: (q.options || []).map((opt) => ({
              text: opt.text,
              imageUrl: opt.imageUrl || "",
              sourceOptionId: opt._id,
            })),
          })),
          answers: [],
          isCustomized: false,
          syncedAt: new Date(),
        });

        await project.save();
        return res.json({ project });
      }

      // Update existing instance WITHOUT resetting answers
      existing.title = template.title;
      existing.description = template.description || "";
      existing.roomType = template.roomType || "";

      existing.questions = mergeInstanceQuestionsKeepingIds(
        existing.questions || [],
        template.questions || []
      );

      existing.syncedAt = new Date();
      project.markModified("designQuestionnaires");

      await project.save();
      return res.json({ project });
    } catch (err) {
      console.error("Error assigning questionnaire:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/**
 * Save answers for a questionnaire instance inside a project.
 * Supports both designer and client (role-based project access).
 */
app.post("/api/projects/:id/questionnaire/answers", isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    const { answers, templateId } = req.body;

    const { role, id: userId } = req.user;

    const filter =
      role === "designer"
        ? { _id: id, createdBy: userId }
        : { _id: id, associatedClients: userId };

    const project = await ProjectModel.findOne(filter);
    if (!project) return res.status(404).json({ message: "Project not found" });

    if (!project.designQuestionnaires || project.designQuestionnaires.length === 0) {
      return res.status(400).json({ message: "No questionnaire assigned to this project" });
    }

    const instance =
      project.designQuestionnaires.find((q) => String(q.templateId) === String(templateId)) ||
      project.designQuestionnaires[0];

    const safeAnswers = Array.isArray(answers) ? answers : [];

    instance.answers = safeAnswers
      .filter(
        (a) =>
          a &&
          (a.freeText ||
            (Array.isArray(a.selectedOptions) && a.selectedOptions.length > 0))
      )
      .map((a) => ({
        questionId: a.questionId ? String(a.questionId) : "",
        questionText: a.questionText || "",
        selectedOptions: Array.isArray(a.selectedOptions)
          ? a.selectedOptions.map((opt) => ({
              optionId: String(opt.optionId || ""),
              name: opt.name || opt.optionText || "",
              imageUrl: opt.imageUrl || "",
            }))
          : [],
        freeText: a.freeText || "",
      }));

    instance.markModified("answers");
    project.markModified("designQuestionnaires");

    await project.save();
    res.json({ project });
  } catch (err) {
    console.error("Error saving questionnaire answers:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * Remove a questionnaire instance from a project (designer only).
 */
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

      if (!project) return res.status(404).json({ message: "Project not found" });
      if (!Array.isArray(project.designQuestionnaires)) {
        return res.status(404).json({ message: "No questionnaires on this project" });
      }

      let idx = project.designQuestionnaires.findIndex(
        (q) => String(q._id) === String(instanceId)
      );

      // Fallback: frontend may send templateId sometimes
      if (idx === -1) {
        idx = project.designQuestionnaires.findIndex(
          (q) => String(q.templateId) === String(instanceId)
        );
      }

      if (idx === -1) {
        return res.status(404).json({ message: "Questionnaire instance not found" });
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

/**
 * Update a questionnaire instance INSIDE a project (project-only edit).
 * This does not change the original template.
 */
app.put(
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

      if (!project) return res.status(404).json({ message: "Project not found" });

      const instance = project.designQuestionnaires.id(instanceId);
      if (!instance) return res.status(404).json({ message: "Questionnaire instance not found" });

      const { title, description, roomType, questions } = req.body;

      if (title !== undefined) instance.title = title;
      if (description !== undefined) instance.description = description;
      if (roomType !== undefined) instance.roomType = roomType;
      if (questions !== undefined && Array.isArray(questions)) instance.questions = questions;

      instance.isCustomized = true;

      await project.save();
      res.json({ project });
    } catch (err) {
      console.error("Error updating questionnaire instance:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

/* =========================================================
 * Questionnaire templates CRUD
 * ========================================================= */

/**
 * List templates for current designer.
 */
app.get("/api/questionnaires/templates", isAuthenticated, isDesigner, async (req, res) => {
  try {
    const templates = await QuestionnaireTemplate.find({ createdBy: req.user.id }).lean();
    res.json(templates);
  } catch (err) {
    console.error("Error fetching questionnaire templates:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * Create new template (designer only).
 */
app.post("/api/questionnaires/templates", isAuthenticated, isDesigner, async (req, res) => {
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
});

/**
 * Update existing template (designer only).
 */
app.put("/api/questionnaires/templates/:id", isAuthenticated, isDesigner, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, roomType, questions } = req.body;

    const tmpl = await QuestionnaireTemplate.findOne({ _id: id, createdBy: req.user.id });
    if (!tmpl) return res.status(404).json({ message: "Template not found" });

    if (title !== undefined) tmpl.title = title;
    if (description !== undefined) tmpl.description = description;
    if (roomType !== undefined) tmpl.roomType = roomType;
    if (questions !== undefined && Array.isArray(questions)) tmpl.questions = questions;

    await tmpl.save();
    res.json(tmpl);
  } catch (err) {
    console.error("Error updating questionnaire template:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * Delete template (designer only).
 */
app.delete("/api/questionnaires/templates/:id", isAuthenticated, isDesigner, async (req, res) => {
  try {
    const { id } = req.params;

    const tmpl = await QuestionnaireTemplate.findOneAndDelete({
      _id: id,
      createdBy: req.user.id,
    });

    if (!tmpl) return res.status(404).json({ message: "Template not found" });

    res.json({ message: "Template deleted successfully" });
  } catch (err) {
    console.error("Error deleting questionnaire template:", err);
    res.status(500).json({ message: "Server error" });
  }
});

/**
 * Sync a template into all projects that use it.
 * mode:
 *  - safe: skip customized instances
 *  - force: update all instances and reset isCustomized=false
 */
app.post(
  "/api/questionnaires/templates/:templateId/sync-projects",
  isAuthenticated,
  isDesigner,
  async (req, res) => {
    try {
      const { templateId } = req.params;
      const mode = req.body?.mode === "force" ? "force" : "safe";

      const template = await QuestionnaireTemplate.findOne({
        _id: templateId,
        createdBy: req.user.id,
      }).lean();

      if (!template) return res.status(404).json({ message: "Template not found" });

      const projects = await ProjectModel.find({
        createdBy: req.user.id,
        "designQuestionnaires.templateId": template._id,
      });

      let updatedCount = 0;
      let skippedCustomized = 0;

      for (const project of projects) {
        let changed = false;

        for (const inst of project.designQuestionnaires) {
          if (String(inst.templateId) !== String(template._id)) continue;

          if (mode === "safe" && inst.isCustomized) {
            skippedCustomized++;
            continue;
          }

          inst.title = template.title;
          inst.description = template.description || "";
          inst.roomType = template.roomType || "";

          // Sync template-based questions, but keep project-only additions
          inst.questions = mergeTemplateIntoInstanceKeepProjectOnly(
            inst.questions || [],
            template.questions || []
          );

          inst.syncedAt = new Date();

          if (mode === "force") {
            inst.isCustomized = false;
          }

          project.markModified("designQuestionnaires");
          changed = true;
        }

        if (changed) {
          await project.save();
          updatedCount++;
        }
      }

      res.json({
        message: "Sync completed",
        mode,
        updatedProjects: updatedCount,
        skippedCustomized,
      });
    } catch (err) {
      console.error("Sync error:", err);
      res.status(500).json({ message: err.message || "Server error" });
    }
  }
);

/* =========================================================
 * Production build (React)
 * ========================================================= */

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../client/build")));

  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../client/build", "index.html"));
  });
}

/* =========================================================
 * Start server
 * ========================================================= */

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
