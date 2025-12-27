// models/Project.js
const mongoose = require("mongoose");

/**
 * Project model
 *
 * Holds all project data: workers, suppliers, plan/notes, color selections,
 * client linking (invites), and project-level questionnaire instances + answers.
 */

/* =========================================================
 * Sub-docs: Workers & Suppliers
 * ========================================================= */

const WorkerSchema = new mongoose.Schema(
  {
    workerName: { type: String, default: "" },
    role: { type: String, default: "" },
    phone: { type: String, default: "" },
    cost: { type: Number, default: 0 },
    description: { type: String, default: "" },
  },
  { _id: true }
);

const SupplierSchema = new mongoose.Schema(
  {
    storeName: { type: String, default: "" },
    supplierName: { type: String, default: "" },
    product: { type: String, default: "" },
    price: { type: Number, default: 0 },
    contactName: { type: String, default: "" },
    phone: { type: String, default: "" },
  },
  { _id: true }
);

/* =========================================================
 * Sub-docs: Questionnaire Answers (saved per project instance)
 * ========================================================= */

/**
 * Single question answer inside a project questionnaire instance.
 * We store IDs as strings because we support mapping between template IDs
 * and project-instance IDs (stable UI keys).
 */
const QuestionnaireAnswerSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true },
    questionText: { type: String, default: "" },

    selectedOptions: [
      {
        optionId: { type: String, default: "" },
        name: { type: String, default: "" },
        imageUrl: { type: String, default: "" },
      },
    ],

    freeText: { type: String, default: "" },
  },
  { _id: false }
);

/* =========================================================
 * Sub-docs: Project Questionnaire Instance
 * ========================================================= */

/**
 * A template "snapshot" stored inside a project.
 * - templateId: the original template reference
 * - questions/options: copied so project can be customized
 * - answers: saved per project
 * - isCustomized: used to decide if safe-sync should skip it
 */
const ProjectQuestionnaireSchema = new mongoose.Schema(
  {
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "QuestionnaireTemplate",
      required: true,
    },

    title: { type: String, default: "" },
    description: { type: String, default: "" },
    roomType: { type: String, default: "" },

    syncedAt: { type: Date, default: null },
    isCustomized: { type: Boolean, default: false },

    questions: [
      {
        // Exists only if this question originally came from the template
        sourceQuestionId: {
          type: mongoose.Schema.Types.ObjectId,
          required: false,
        },

        text: { type: String, default: "" },
        multiple: { type: Boolean, default: true },

        options: [
          {
            // Exists only if this option originally came from the template
            sourceOptionId: {
              type: mongoose.Schema.Types.ObjectId,
              required: false,
            },

            text: { type: String, default: "" },
            imageUrl: { type: String, default: "" },
          },
        ],
      },
    ],

    answers: { type: [QuestionnaireAnswerSchema], default: [] },
  },
  { _id: true }
);

/* =========================================================
 * Sub-docs: Color & Material Selections
 * ========================================================= */

const ColorSelectionSchema = new mongoose.Schema(
  {
    roomName: { type: String, required: true },
    wallColor: { type: String, default: "" },
    furnitureColor: { type: String, default: "" },
    floorColor: { type: String, default: "" },
    materialType: { type: String, default: "" },
    finishType: { type: String, default: "" },
  },
  { _id: false }
);

/* =========================================================
 * Project Schema
 * ========================================================= */

const ProjectSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    budget: { type: Number, default: 0 },

    clientUsername: { type: String, required: true },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    /**
     * Invitation flow:
     * - Designers create a project and invite a client.
     * - Client must accept before being added to associatedClients.
     */
    pendingInvites: [
      {
        clientId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        invitedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        status: {
          type: String,
          enum: ["pending", "accepted", "rejected"],
          default: "pending",
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],

    associatedClients: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    workers: { type: [WorkerSchema], default: [] },
    suppliers: { type: [SupplierSchema], default: [] },

    designPlan: { type: String, default: "" },
    notes: { type: String, default: "" },

    // Project questionnaire instances (template snapshots + project-only edits)
    designQuestionnaires: { type: [ProjectQuestionnaireSchema], default: [] },

    // Color/material preferences per room
    colorSelections: { type: [ColorSelectionSchema], default: [] },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Project", ProjectSchema);
